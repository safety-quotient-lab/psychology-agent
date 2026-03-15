package main

import (
	"fmt"
	"os/exec"
	"strings"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

// Runner executes commands either locally or via SSH depending on config.
// When AGENT_SSH_HOST is "localhost" or "127.0.0.1", commands run locally
// via sh -c (no SSH overhead). Otherwise, commands route through SSH.
type Runner struct {
	Host  string
	Port  int
	Local bool
}

// NewRunner constructs a Runner from config. Detects local mode automatically.
func NewRunner(cfg *config.Config) *Runner {
	local := cfg.SSHHost == "localhost" || cfg.SSHHost == "127.0.0.1" || cfg.SSHHost == ""
	return &Runner{
		Host:  cfg.SSHHost,
		Port:  cfg.SSHPort,
		Local: local,
	}
}

// Run executes a command and returns stdout.
// Local mode: sh -c. Remote mode: ssh.
func (r *Runner) Run(command string) (string, error) {
	var cmd *exec.Cmd
	if r.Local {
		cmd = exec.Command("sh", "-c", command)
	} else {
		args := []string{
			"-p", fmt.Sprintf("%d", r.Port),
			"-o", "ConnectTimeout=5",
			r.Host,
			command,
		}
		cmd = exec.Command("ssh", args...)
	}
	out, err := cmd.CombinedOutput()
	return strings.TrimSpace(string(out)), err
}
