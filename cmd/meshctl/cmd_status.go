package main

import (
	"fmt"
	"strings"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

func init() {
	register(Command{
		Name:    "status",
		Summary: "Mesh overview — agents, budgets, spawns, pause state",
		Run:     cmdStatus,
	})
}

func cmdStatus(args []string, cfg *config.Config, out *Output) error {
	ssh := NewRunner(cfg)
	agents, err := LoadAgentEntries(cfg)
	if err != nil {
		return err
	}

	// Check mesh-pause
	pauseOut, _ := ssh.Run("cat /tmp/mesh-pause 2>/dev/null || echo '__none__'")
	paused := pauseOut != "__none__"

	// Check spawn slots
	slotsOut, _ := ssh.Run("ls /tmp/mesh-spawn-slot-* 2>/dev/null | wc -l")
	reserveOut, _ := ssh.Run("test -f /tmp/mesh-reserve-unlock && echo 'yes' || echo 'no'")

	// Check meshd processes
	meshdOut, _ := ssh.Run("pgrep -c meshd 2>/dev/null || echo '0'")

	// Budgets per agent
	type agentRow struct {
		ID      string `json:"id"`
		Role    string `json:"role"`
		Spent   string `json:"spent"`
		Cutoff  string `json:"cutoff"`
		Shadow  string `json:"shadow"`
	}
	var rows []agentRow

	for _, a := range agents {
		result, _ := ssh.Run(fmt.Sprintf(
			"sqlite3 -separator '|' %s \"SELECT budget_spent, budget_cutoff, shadow_mode FROM autonomy_budget WHERE agent_id='%s';\" 2>/dev/null || echo '?|?|?'",
			a.DBPath, a.ID,
		))
		parts := strings.SplitN(result, "|", 3)
		spent, cutoff, shadow := "?", "?", "?"
		if len(parts) == 3 {
			spent = parts[0]
			cutoff = parts[1]
			if cutoff == "0" {
				cutoff = "∞"
			}
			shadow = parts[2]
		}
		rows = append(rows, agentRow{
			ID:     a.ID,
			Role:   a.Role,
			Spent:  spent,
			Cutoff: cutoff,
			Shadow: shadow,
		})
	}

	if out.JSON {
		out.PrintJSON(map[string]any{
			"mesh_paused":    paused,
			"active_slots":   strings.TrimSpace(slotsOut),
			"reserve_active": reserveOut == "yes",
			"meshd_processes": strings.TrimSpace(meshdOut),
			"agents":         rows,
		})
		return nil
	}

	// Human-readable
	pauseLabel := "active"
	if paused {
		pauseLabel = "PAUSED (" + pauseOut + ")"
	}
	fmt.Printf("Mesh:     %s\n", pauseLabel)
	fmt.Printf("Slots:    %s active (reserve: %s)\n", strings.TrimSpace(slotsOut), reserveOut)
	fmt.Printf("meshd:    %s processes\n", strings.TrimSpace(meshdOut))
	fmt.Println()

	w := out.Table("AGENT", "ROLE", "SPENT", "CUTOFF", "SHADOW")
	for _, r := range rows {
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\t%s\n", r.ID, r.Role, r.Spent, r.Cutoff, r.Shadow)
	}
	w.Flush()

	return nil
}
