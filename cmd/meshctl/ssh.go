package main

import (
	"fmt"
	"os/exec"
	"strings"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

// SSHRunner executes commands on the remote agent host.
type SSHRunner struct {
	Host string
	Port int
}

// NewSSHRunner constructs an SSHRunner from config.
func NewSSHRunner(cfg *config.Config) *SSHRunner {
	return &SSHRunner{
		Host: cfg.SSHHost,
		Port: cfg.SSHPort,
	}
}

// Run executes a single command on the remote host and returns stdout.
func (s *SSHRunner) Run(command string) (string, error) {
	args := []string{
		"-p", fmt.Sprintf("%d", s.Port),
		"-o", "ConnectTimeout=5",
		s.Host,
		command,
	}
	cmd := exec.Command("ssh", args...)
	out, err := cmd.CombinedOutput()
	return strings.TrimSpace(string(out)), err
}
