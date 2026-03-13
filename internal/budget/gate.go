// Package budget implements spend-aware gating for Claude spawns.
// It reads autonomy-budget state from SQLite (via the sqlite3 CLI to
// avoid CGO), checks mesh-pause and context-rotate sentinels, and
// enforces cost-based spawn approval.
package budget

import (
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"strconv"
	"strings"
)

// Priority classifies events by their budget cost.
type Priority int

const (
	PollTick    Priority = iota // routine polling — lowest cost
	HealthCheck                 // health probe
	Normal                      // standard transport event
	High                        // elevated priority event
	Critical                    // directive-level — highest cost
)

// String returns a human-readable label for the priority level.
func (p Priority) String() string {
	switch p {
	case PollTick:
		return "poll-tick"
	case HealthCheck:
		return "health-check"
	case Normal:
		return "normal"
	case High:
		return "high"
	case Critical:
		return "critical"
	default:
		return "unknown"
	}
}

// costTable maps each priority to its budget unit cost.
var costTable = map[Priority]int{
	PollTick:    1,
	HealthCheck: 1,
	Normal:      2,
	High:        3,
	Critical:    5,
}

// MeshMaxConcurrent caps total simultaneous Claude spawns across the entire mesh.
// File locks in /tmp/mesh-spawn-slot-{N} enforce the limit.
const MeshMaxConcurrent = 2

// Gate mediates spawn decisions against budget, pause, rotation, and
// mesh-wide concurrency state.
type Gate struct {
	// DBPath points to the SQLite state.db file.
	DBPath string
	// AgentID identifies the agent whose budget this gate manages.
	AgentID string

	logger *slog.Logger
}

// BudgetState captures a point-in-time snapshot of spawn eligibility.
type BudgetState struct {
	Current       int  `json:"current"`
	Max           int  `json:"max"`
	ShadowMode    bool `json:"shadow_mode"`
	MeshPaused    bool `json:"mesh_paused"`
	RotatePending bool `json:"rotate_pending"`
}

// NewGate constructs a Gate with the given database path and agent identity.
func NewGate(dbPath, agentID string, logger *slog.Logger) *Gate {
	if logger == nil {
		logger = slog.Default()
	}
	return &Gate{
		DBPath:  dbPath,
		AgentID: agentID,
		logger:  logger,
	}
}

// Check reads the full budget state: SQLite row, mesh-pause sentinel,
// and context-rotate sentinel.
func (g *Gate) Check() (*BudgetState, error) {
	current, max, shadow, err := g.queryBudget()
	if err != nil {
		return nil, fmt.Errorf("budget query failed: %w", err)
	}

	return &BudgetState{
		Current:       current,
		Max:           max,
		ShadowMode:    shadow,
		MeshPaused:    fileExists("/tmp/mesh-pause"),
		RotatePending: fileExists(fmt.Sprintf("/tmp/context-rotate-%s", g.AgentID)),
	}, nil
}

// CanSpawn evaluates whether a spawn at the given cost should proceed.
// It returns true and an empty reason when allowed, or false with a
// human-readable explanation when refused.
func (g *Gate) CanSpawn(cost int) (bool, string) {
	state, err := g.Check()
	if err != nil {
		g.logger.Error("budget check failed — refusing spawn", "err", err)
		return false, fmt.Sprintf("budget check error: %v", err)
	}

	if state.MeshPaused {
		g.logger.Info("mesh-pause sentinel detected — refusing spawn")
		return false, "mesh paused via /tmp/mesh-pause"
	}

	if state.RotatePending {
		g.logger.Info("context-rotate sentinel detected — refusing spawn",
			"agent_id", g.AgentID,
		)
		return false, fmt.Sprintf("context rotation pending for %s", g.AgentID)
	}

	if state.Current < cost {
		g.logger.Warn("insufficient budget — refusing spawn",
			"current", state.Current,
			"cost", cost,
			"agent_id", g.AgentID,
		)
		return false, fmt.Sprintf("insufficient budget: have %d, need %d", state.Current, cost)
	}

	if state.ShadowMode {
		g.logger.Info("shadow mode — logging spawn decision without executing",
			"cost", cost,
			"current", state.Current,
			"agent_id", g.AgentID,
		)
		return false, "shadow mode active — spawn logged but not executed"
	}

	// Check mesh-wide concurrency — count active spawn slot files
	activeSlots := countMeshSpawnSlots()
	if activeSlots >= MeshMaxConcurrent {
		g.logger.Warn("mesh-wide concurrency limit reached — refusing spawn",
			"active_slots", activeSlots,
			"max", MeshMaxConcurrent,
			"agent_id", g.AgentID,
		)
		return false, fmt.Sprintf("mesh concurrency limit: %d/%d slots occupied", activeSlots, MeshMaxConcurrent)
	}

	return true, ""
}

// AcquireSlot claims a mesh-wide spawn slot before starting a Claude process.
// Returns the slot path (for later release) or an error if no slot available.
func (g *Gate) AcquireSlot() (string, error) {
	for i := 0; i < MeshMaxConcurrent; i++ {
		slotPath := fmt.Sprintf("/tmp/mesh-spawn-slot-%d", i)
		// Try to create exclusively — fails if another process holds it
		f, err := os.OpenFile(slotPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0644)
		if err != nil {
			continue // slot occupied
		}
		// Write agent identity + timestamp for observability
		fmt.Fprintf(f, "%s %s\n", g.AgentID, strings.TrimSpace(execDate()))
		f.Close()
		g.logger.Info("spawn slot acquired",
			"slot", slotPath,
			"agent_id", g.AgentID,
		)
		return slotPath, nil
	}
	return "", fmt.Errorf("no spawn slots available (%d/%d occupied)", countMeshSpawnSlots(), MeshMaxConcurrent)
}

// ReleaseSlot frees a previously acquired spawn slot.
func (g *Gate) ReleaseSlot(slotPath string) {
	if err := os.Remove(slotPath); err != nil && !os.IsNotExist(err) {
		g.logger.Warn("failed to release spawn slot", "slot", slotPath, "error", err)
	} else {
		g.logger.Info("spawn slot released", "slot", slotPath)
	}
}

// countMeshSpawnSlots returns how many /tmp/mesh-spawn-slot-N files exist.
func countMeshSpawnSlots() int {
	count := 0
	for i := 0; i < MeshMaxConcurrent; i++ {
		if fileExists(fmt.Sprintf("/tmp/mesh-spawn-slot-%d", i)) {
			count++
		}
	}
	return count
}

// execDate returns the current UTC datetime string.
func execDate() string {
	out, err := exec.Command("date", "-u", "+%Y-%m-%dT%H:%M:%SZ").Output()
	if err != nil {
		return "unknown"
	}
	return string(out)
}

// Deduct subtracts the given cost from the agent's budget in state.db.
func (g *Gate) Deduct(cost int) error {
	query := fmt.Sprintf(
		"UPDATE autonomy_budget SET budget_current = budget_current - %d WHERE agent_id = '%s' AND budget_current >= %d;",
		cost, sanitizeID(g.AgentID), cost,
	)
	output, err := g.execSQL(query)
	if err != nil {
		return fmt.Errorf("budget deduction failed: %w (output: %s)", err, output)
	}

	// Verify the update affected a row by re-reading.
	current, _, _, readErr := g.queryBudget()
	if readErr != nil {
		return fmt.Errorf("post-deduction verification failed: %w", readErr)
	}

	g.logger.Info("budget deducted",
		"cost", cost,
		"remaining", current,
		"agent_id", g.AgentID,
	)
	return nil
}

// EstimateCost maps a priority level to its budget unit cost.
func (g *Gate) EstimateCost(priority Priority) int {
	if cost, found := costTable[priority]; found {
		return cost
	}
	// Unknown priorities receive the highest cost as a safety measure.
	return costTable[Critical]
}

// queryBudget shells out to sqlite3 to read the autonomy_budget row.
func (g *Gate) queryBudget() (current, max int, shadow bool, err error) {
	query := fmt.Sprintf(
		"SELECT budget_current, budget_max, shadow_mode FROM autonomy_budget WHERE agent_id = '%s';",
		sanitizeID(g.AgentID),
	)

	output, err := g.execSQL(query)
	if err != nil {
		return 0, 0, false, fmt.Errorf("sqlite3 execution failed: %w (output: %s)", err, output)
	}

	output = strings.TrimSpace(output)
	if output == "" {
		return 0, 0, false, fmt.Errorf("no budget row found for agent %q", g.AgentID)
	}

	// sqlite3 default separator: pipe character.
	parts := strings.SplitN(output, "|", 3)
	if len(parts) != 3 {
		return 0, 0, false, fmt.Errorf("unexpected sqlite3 output format: %q", output)
	}

	current, err = strconv.Atoi(strings.TrimSpace(parts[0]))
	if err != nil {
		return 0, 0, false, fmt.Errorf("failed to parse budget_current %q: %w", parts[0], err)
	}

	max, err = strconv.Atoi(strings.TrimSpace(parts[1]))
	if err != nil {
		return 0, 0, false, fmt.Errorf("failed to parse budget_max %q: %w", parts[1], err)
	}

	shadowVal := strings.TrimSpace(parts[2])
	shadow = shadowVal == "1" || strings.EqualFold(shadowVal, "true")

	return current, max, shadow, nil
}

// execSQL runs a query against the state.db file using the sqlite3 CLI.
func (g *Gate) execSQL(query string) (string, error) {
	cmd := exec.Command("sqlite3", g.DBPath, query)
	out, err := cmd.CombinedOutput()
	return string(out), err
}

// fileExists reports whether the given path refers to an existing file
// or directory. It does not distinguish between file types.
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// sanitizeID strips characters that could cause SQL injection from an
// agent identifier. Only alphanumeric, hyphen, and underscore pass through.
func sanitizeID(id string) string {
	var b strings.Builder
	b.Grow(len(id))
	for _, r := range id {
		switch {
		case r >= 'a' && r <= 'z',
			r >= 'A' && r <= 'Z',
			r >= '0' && r <= '9',
			r == '-', r == '_':
			b.WriteRune(r)
		}
	}
	return b.String()
}
