// Package spawner manages Claude process lifecycle with instrumentation.
// It enforces concurrency limits, timeout budgets, and circuit-breaker
// protection against cascading spawn failures.
package spawner

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"strings"
	"sync/atomic"
	"time"
)

// DefaultTimeout governs how long a spawn may run before cancellation.
const DefaultTimeout = 5 * time.Minute

// DefaultMaxConcurrent caps parallel spawns to prevent resource exhaustion.
const DefaultMaxConcurrent = 3

// retryBackoff defines the delay before a single retry attempt.
const retryBackoff = 10 * time.Second

// circuitCooldown defines how long the circuit breaker stays open
// after consecutive failures reach the threshold.
const circuitCooldown = 5 * time.Minute

// circuitThreshold — after this many consecutive failures the breaker opens.
const circuitThreshold int32 = 3

// Spawner manages Claude child-process invocations with observability.
type Spawner struct {
	// Command holds the executable path — "claude" or a wrapper script.
	Command string
	// AgentID identifies the owning agent for log segmentation.
	AgentID string
	// MaxConcurrent caps how many spawns may run simultaneously.
	MaxConcurrent int
	// Timeout caps a single spawn's wall-clock duration.
	Timeout time.Duration

	active      int32      // atomic — currently running spawns
	consecutive int32      // atomic — consecutive failure count
	circuitOpen int64      // atomic — unix timestamp when circuit opened (0 = closed)
	totalSpawns int64      // atomic — lifetime spawn attempts
	totalFails  int64      // atomic — lifetime failures
	logger      *slog.Logger
}

// SpawnResult captures every observable detail of a completed spawn.
type SpawnResult struct {
	Prompt    string        `json:"prompt"`
	ExitCode  int           `json:"exit_code"`
	Stdout    string        `json:"stdout"`
	Stderr    string        `json:"stderr"`
	Duration  time.Duration `json:"duration_ns"`
	StartedAt time.Time     `json:"started_at"`
	Error     error         `json:"error,omitempty"`
}

// SpawnerStats reports aggregate spawner health.
type SpawnerStats struct {
	TotalSpawns     int64  `json:"total_spawns"`
	TotalFailures   int64  `json:"total_failures"`
	Active          int    `json:"active"`
	CircuitOpen     bool   `json:"circuit_open"`
	CircuitOpenedAt int64  `json:"circuit_opened_at,omitempty"`
	ConsecutiveFail int32  `json:"consecutive_failures"`
	AgentID         string `json:"agent_id"`
}

// New constructs a Spawner with sensible defaults.
// The caller may override Command, MaxConcurrent, and Timeout after creation.
func New(agentID string, logger *slog.Logger) *Spawner {
	if logger == nil {
		logger = slog.Default()
	}
	return &Spawner{
		Command:       "claude",
		AgentID:       agentID,
		MaxConcurrent: DefaultMaxConcurrent,
		Timeout:       DefaultTimeout,
		logger:        logger,
	}
}

// CanSpawn returns true when the spawner accepts new work — the circuit
// breaker remains closed and the concurrency cap has room.
func (s *Spawner) CanSpawn() bool {
	if s.circuitTripped() {
		return false
	}
	return int(atomic.LoadInt32(&s.active)) < s.MaxConcurrent
}

// ActiveCount reports how many spawns run right now.
func (s *Spawner) ActiveCount() int {
	return int(atomic.LoadInt32(&s.active))
}

// Stats returns a snapshot of aggregate spawner health.
func (s *Spawner) Stats() SpawnerStats {
	openTS := atomic.LoadInt64(&s.circuitOpen)
	return SpawnerStats{
		TotalSpawns:     atomic.LoadInt64(&s.totalSpawns),
		TotalFailures:   atomic.LoadInt64(&s.totalFails),
		Active:          s.ActiveCount(),
		CircuitOpen:     s.circuitTripped(),
		CircuitOpenedAt: openTS,
		ConsecutiveFail: atomic.LoadInt32(&s.consecutive),
		AgentID:         s.AgentID,
	}
}

// Spawn executes `claude -p` (or the configured command) with the given
// prompt. It enforces the timeout, records metadata, and retries once
// on failure after a backoff delay.
func (s *Spawner) Spawn(ctx context.Context, prompt string, flags ...string) (*SpawnResult, error) {
	if !s.CanSpawn() {
		reason := "concurrency limit reached"
		if s.circuitTripped() {
			reason = "circuit breaker open — pausing spawns"
		}
		return nil, fmt.Errorf("spawn refused: %s", reason)
	}

	// First attempt.
	result, err := s.doSpawn(ctx, prompt, flags...)
	if err == nil && result.ExitCode == 0 {
		return result, nil
	}

	// Retry once after backoff.
	s.logger.Warn("spawn failed, retrying after backoff",
		"agent_id", s.AgentID,
		"exit_code", result.ExitCode,
		"err", err,
	)

	select {
	case <-ctx.Done():
		return result, ctx.Err()
	case <-time.After(retryBackoff):
	}

	if !s.CanSpawn() {
		return result, fmt.Errorf("spawn retry refused: spawner unavailable after backoff")
	}

	retryResult, retryErr := s.doSpawn(ctx, prompt, flags...)
	if retryErr != nil {
		return retryResult, retryErr
	}
	return retryResult, nil
}

// doSpawn performs a single spawn attempt with full instrumentation.
func (s *Spawner) doSpawn(ctx context.Context, prompt string, flags ...string) (*SpawnResult, error) {
	atomic.AddInt64(&s.totalSpawns, 1)
	atomic.AddInt32(&s.active, 1)
	defer atomic.AddInt32(&s.active, -1)

	timeout := s.Timeout
	if timeout == 0 {
		timeout = DefaultTimeout
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	args := buildArgs(prompt, flags)
	cmd := exec.CommandContext(ctx, s.Command, args...)

	var stdoutBuf, stderrBuf strings.Builder
	cmd.Stdout = &stdoutBuf
	cmd.Stderr = &stderrBuf

	startedAt := time.Now()
	runErr := cmd.Run()
	duration := time.Since(startedAt)

	exitCode := 0
	if runErr != nil {
		if exitErr, ok := runErr.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = -1
		}
	}

	result := &SpawnResult{
		Prompt:    prompt,
		ExitCode:  exitCode,
		Stdout:    stdoutBuf.String(),
		Stderr:    stderrBuf.String(),
		Duration:  duration,
		StartedAt: startedAt,
		Error:     runErr,
	}

	// Track consecutive failures for the circuit breaker.
	if exitCode != 0 || runErr != nil {
		atomic.AddInt64(&s.totalFails, 1)
		newConsec := atomic.AddInt32(&s.consecutive, 1)
		if newConsec >= circuitThreshold {
			s.openCircuit()
		}
		s.logger.Error("spawn completed with failure",
			"agent_id", s.AgentID,
			"exit_code", exitCode,
			"duration", duration,
			"err", runErr,
		)
	} else {
		atomic.StoreInt32(&s.consecutive, 0)
		s.logger.Info("spawn completed successfully",
			"agent_id", s.AgentID,
			"duration", duration,
		)
	}

	s.writeLog(result)
	return result, runErr
}

// circuitTripped returns true when the circuit breaker remains in the
// open state (cooldown has not yet elapsed).
func (s *Spawner) circuitTripped() bool {
	openedAt := atomic.LoadInt64(&s.circuitOpen)
	if openedAt == 0 {
		return false
	}
	if time.Since(time.Unix(openedAt, 0)) >= circuitCooldown {
		// Cooldown elapsed — close the circuit and reset counters.
		atomic.StoreInt64(&s.circuitOpen, 0)
		atomic.StoreInt32(&s.consecutive, 0)
		s.logger.Info("circuit breaker closed after cooldown", "agent_id", s.AgentID)
		return false
	}
	return true
}

// openCircuit activates the circuit breaker.
func (s *Spawner) openCircuit() {
	now := time.Now().Unix()
	// Only set if not already open.
	atomic.CompareAndSwapInt64(&s.circuitOpen, 0, now)
	s.logger.Warn("circuit breaker opened — spawning paused",
		"agent_id", s.AgentID,
		"cooldown", circuitCooldown,
	)
}

// writeLog appends a JSON record to the spawn log file.
func (s *Spawner) writeLog(r *SpawnResult) {
	path := fmt.Sprintf("/tmp/meshd-spawns-%s.jsonl", s.AgentID)
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		s.logger.Error("failed to open spawn log", "path", path, "err", err)
		return
	}
	defer f.Close()

	record := struct {
		PromptHash string        `json:"prompt_hash"`
		ExitCode   int           `json:"exit_code"`
		DurationMs int64         `json:"duration_ms"`
		StartedAt  time.Time     `json:"started_at"`
		HasError   bool          `json:"has_error"`
		StderrLen  int           `json:"stderr_len"`
	}{
		PromptHash: promptHash(r.Prompt),
		ExitCode:   r.ExitCode,
		DurationMs: r.Duration.Milliseconds(),
		StartedAt:  r.StartedAt,
		HasError:   r.Error != nil,
		StderrLen:  len(r.Stderr),
	}

	line, err := json.Marshal(record)
	if err != nil {
		s.logger.Error("failed to marshal spawn log entry", "err", err)
		return
	}
	line = append(line, '\n')
	if _, err := f.Write(line); err != nil {
		s.logger.Error("failed to write spawn log entry", "path", path, "err", err)
	}
}

// buildArgs assembles the argument list for `claude -p`.
func buildArgs(prompt string, flags []string) []string {
	args := make([]string, 0, 2+len(flags))
	args = append(args, "-p", prompt)
	args = append(args, flags...)
	return args
}

// promptHash produces a short SHA-256 prefix for log correlation
// without storing the full prompt text on disk.
func promptHash(prompt string) string {
	h := sha256.Sum256([]byte(prompt))
	return fmt.Sprintf("%x", h[:8])
}
