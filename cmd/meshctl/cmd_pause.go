package main

import (
	"fmt"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

func init() {
	register(Command{
		Name:    "pause",
		Summary: "Pause mesh — creates /tmp/mesh-pause sentinel",
		Run:     cmdPause,
	})
	register(Command{
		Name:    "unpause",
		Summary: "Unpause mesh — removes /tmp/mesh-pause sentinel",
		Run:     cmdUnpause,
	})
}

func cmdPause(args []string, cfg *config.Config, out *Output) error {
	ssh := NewSSHRunner(cfg)
	ts := time.Now().UTC().Format(time.RFC3339)
	_, err := ssh.Run(fmt.Sprintf("echo 'paused by meshctl %s' > /tmp/mesh-pause", ts))
	if err != nil {
		return fmt.Errorf("failed to create pause sentinel: %w", err)
	}
	out.Print("Mesh paused")
	return nil
}

func cmdUnpause(args []string, cfg *config.Config, out *Output) error {
	ssh := NewSSHRunner(cfg)
	_, err := ssh.Run("rm -f /tmp/mesh-pause")
	if err != nil {
		return fmt.Errorf("failed to remove pause sentinel: %w", err)
	}
	out.Print("Mesh unpaused")
	return nil
}
