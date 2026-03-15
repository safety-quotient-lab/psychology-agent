package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

func init() {
	register(Command{
		Name:    "db init",
		Summary: "Bootstrap state.db from schema.sql (--force to overwrite existing)",
		Run:     cmdDBInit,
	})
	register(Command{
		Name:    "db backup",
		Summary: "Backup state.db files",
		Run:     cmdDBBackup,
	})
}

func cmdDBInit(args []string, cfg *config.Config, out *Output) error {
	dbPath := cfg.BudgetDBPath
	force := false
	for _, a := range args {
		switch a {
		case "--force":
			force = true
		default:
			dbPath = a
		}
	}

	// Guard: refuse to clobber non-empty state.db without --force
	if info, err := os.Stat(dbPath); err == nil && info.Size() > 0 && !force {
		return fmt.Errorf("REFUSED: %s exists and contains data (%d bytes). Use --force to overwrite", dbPath, info.Size())
	}

	bootstrapPath := filepath.Join(cfg.RepoRoot, "scripts", "bootstrap-state-db.sh")
	cmdArgs := []string{bootstrapPath}
	if force {
		cmdArgs = append(cmdArgs, "--force")
	}
	cmdArgs = append(cmdArgs, dbPath)

	cmd := exec.Command("bash", cmdArgs...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("bootstrap failed: %w\n%s", err, output)
	}

	fmt.Print(string(output))
	return nil
}

func cmdDBBackup(args []string, cfg *config.Config, out *Output) error {
	runner := NewRunner(cfg)
	agents, err := LoadAgentEntries(cfg)
	if err != nil {
		return err
	}

	ts := time.Now().UTC().Format("2006-01-02")

	for _, a := range agents {
		// Guard: refuse to backup 0-byte files (prevents overwriting good backups with empty ones)
		// Use runner to stat the file (works both locally and via SSH)
		sizeOut, _ := runner.Run(fmt.Sprintf("wc -c < %s 2>/dev/null || echo 0", a.DBPath))
		if sizeOut == "0" || sizeOut == "" {
			if out.JSON {
				out.PrintJSON(map[string]string{"agent": a.ID, "status": "SKIPPED (0 bytes)"})
			} else {
				fmt.Printf("  %s: SKIPPED (state.db empty or missing)\n", a.ID)
			}
			continue
		}

		backupDir := filepath.Dir(a.DBPath) + "/backups"
		backupFile := fmt.Sprintf("%s/state.db.%s", backupDir, ts)

		cmd := fmt.Sprintf("mkdir -p %s && cp %s %s 2>&1 && echo 'ok' || echo 'FAILED'",
			backupDir, a.DBPath, backupFile)
		result, _ := runner.Run(cmd)

		// Prune old backups (keep 7)
		runner.Run(fmt.Sprintf("ls -t %s/state.db.* 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null", backupDir))

		if out.JSON {
			out.PrintJSON(map[string]string{"agent": a.ID, "backup": backupFile, "status": result, "size": sizeOut})
		} else {
			fmt.Printf("  %s: %s → %s (%s bytes)\n", a.ID, result, backupFile, sizeOut)
		}
	}
	return nil
}
