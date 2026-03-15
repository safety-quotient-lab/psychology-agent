package main

import (
	"fmt"
	"os/exec"
	"path/filepath"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

func init() {
	register(Command{
		Name:    "deploy",
		Summary: "Deploy compositor Worker to Cloudflare (--dry-run to check)",
		Run:     cmdDeploy,
	})
}

func cmdDeploy(args []string, cfg *config.Config, out *Output) error {
	dryRun := false
	for _, a := range args {
		if a == "--dry-run" {
			dryRun = true
		}
	}

	interagentDir := filepath.Join(cfg.RepoRoot, "interagent")

	if dryRun {
		fmt.Printf("Would deploy from: %s\n", interagentDir)
		fmt.Println("Run without --dry-run to deploy")
		return nil
	}

	fmt.Printf("Deploying compositor from %s...\n", interagentDir)
	cmd := exec.Command("wrangler", "deploy")
	cmd.Dir = interagentDir
	output, err := cmd.CombinedOutput()
	fmt.Print(string(output))
	if err != nil {
		return fmt.Errorf("deploy failed: %w", err)
	}
	return nil
}
