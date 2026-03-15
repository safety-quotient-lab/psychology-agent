package main

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

func init() {
	register(Command{
		Name:    "db init",
		Summary: "Bootstrap state.db from schema.sql",
		Run:     cmdDBInit,
	})
	register(Command{
		Name:    "db backup",
		Summary: "Backup state.db files (--all for all agents)",
		Run:     cmdDBBackup,
	})
}

func cmdDBInit(args []string, cfg *config.Config, out *Output) error {
	dbPath := cfg.BudgetDBPath
	if len(args) > 0 {
		dbPath = args[0]
	}

	schemaPath := filepath.Join(cfg.RepoRoot, "scripts", "schema.sql")
	bootstrapPath := filepath.Join(cfg.RepoRoot, "scripts", "bootstrap-state-db.sh")

	cmd := exec.Command("bash", bootstrapPath, dbPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("bootstrap failed: %w\n%s", err, output)
	}

	fmt.Print(string(output))
	_ = schemaPath // used by bootstrap script internally
	return nil
}

func cmdDBBackup(args []string, cfg *config.Config, out *Output) error {
	ssh := NewRunner(cfg)
	agents, err := LoadAgentEntries(cfg)
	if err != nil {
		return err
	}

	ts := time.Now().UTC().Format("2006-01-02")

	for _, a := range agents {
		backupDir := filepath.Dir(a.DBPath) + "/backups"
		backupFile := fmt.Sprintf("%s/state.db.%s", backupDir, ts)

		cmd := fmt.Sprintf("mkdir -p %s && cp %s %s 2>&1 && echo 'ok' || echo 'FAILED'",
			backupDir, a.DBPath, backupFile)
		result, _ := ssh.Run(cmd)

		// Prune old backups (keep 7)
		ssh.Run(fmt.Sprintf("ls -t %s/state.db.* 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null", backupDir))

		if out.JSON {
			out.PrintJSON(map[string]string{"agent": a.ID, "backup": backupFile, "status": result})
		} else {
			fmt.Printf("  %s: %s → %s\n", a.ID, result, backupFile)
		}
	}
	return nil
}
