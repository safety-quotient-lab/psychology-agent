package main

import (
	"fmt"
	"os/exec"
	"path/filepath"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

func init() {
	register(Command{
		Name:    "usage",
		Summary: "API spend report (--all for all-time, --agent NAME to filter)",
		Run:     cmdUsage,
	})
}

func cmdUsage(args []string, cfg *config.Config, out *Output) error {
	usageScript := filepath.Join(cfg.RepoRoot, "scripts", "usage-report.sh")
	cmd := exec.Command("bash", append([]string{usageScript}, args...)...)
	output, err := cmd.CombinedOutput()
	fmt.Print(string(output))
	if err != nil {
		return fmt.Errorf("usage report failed: %w", err)
	}
	return nil
}
