package main

import (
	"flag"
	"fmt"
	"strings"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

func init() {
	register(Command{
		Name:    "budget show",
		Summary: "Display autonomy budgets for all agents",
		Run:     cmdBudgetShow,
	})
	register(Command{
		Name:    "budget reset",
		Summary: "Reset spent counters (--cutoff N to set limit)",
		Run:     cmdBudgetReset,
	})
	register(Command{
		Name:    "budget shadow",
		Summary: "Toggle shadow mode: budget shadow on|off [agent]",
		Run:     cmdBudgetShadow,
	})
}

func cmdBudgetShow(args []string, cfg *config.Config, out *Output) error {
	ssh := NewRunner(cfg)
	agents, err := LoadAgentEntries(cfg)
	if err != nil {
		return err
	}

	type row struct {
		ID      string `json:"id"`
		Spent   string `json:"spent"`
		Cutoff  string `json:"cutoff"`
		Shadow  string `json:"shadow"`
		Audit   string `json:"last_audit"`
	}
	var rows []row

	for _, a := range agents {
		result, _ := ssh.Run(fmt.Sprintf(
			"sqlite3 -separator '|' %s \"SELECT budget_spent, budget_cutoff, shadow_mode, last_audit FROM autonomy_budget WHERE agent_id='%s';\" 2>/dev/null || echo '?|?|?|?'",
			a.DBPath, a.ID,
		))
		parts := strings.SplitN(result, "|", 4)
		r := row{ID: a.ID, Spent: "?", Cutoff: "?", Shadow: "?", Audit: "?"}
		if len(parts) >= 4 {
			r.Spent = parts[0]
			r.Cutoff = parts[1]
			if r.Cutoff == "0" {
				r.Cutoff = "∞"
			}
			r.Shadow = parts[2]
			r.Audit = parts[3]
		}
		rows = append(rows, r)
	}

	if out.JSON {
		out.PrintJSON(rows)
		return nil
	}

	w := out.Table("AGENT", "SPENT", "CUTOFF", "SHADOW", "LAST_AUDIT")
	for _, r := range rows {
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\t%s\n", r.ID, r.Spent, r.Cutoff, r.Shadow, r.Audit)
	}
	w.Flush()
	return nil
}

func cmdBudgetReset(args []string, cfg *config.Config, out *Output) error {
	fs := flag.NewFlagSet("budget reset", flag.ExitOnError)
	cutoff := fs.Int("cutoff", -1, "set budget cutoff (0=unlimited, -1=keep current)")
	fs.Parse(args)

	ssh := NewRunner(cfg)
	agents, err := LoadAgentEntries(cfg)
	if err != nil {
		return err
	}

	ts := time.Now().UTC().Format("2006-01-02T15:04:05")
	cutoffClause := ""
	if *cutoff >= 0 {
		cutoffClause = fmt.Sprintf(", budget_cutoff = %d", *cutoff)
	}

	for _, a := range agents {
		query := fmt.Sprintf(
			"UPDATE autonomy_budget SET budget_spent = 0%s, consecutive_blocks = 0, last_audit = '%s', updated_at = '%s' WHERE agent_id = '%s';",
			cutoffClause, ts, ts, a.ID,
		)
		_, err := ssh.Run(fmt.Sprintf("sqlite3 %s \"%s\" 2>&1", a.DBPath, query))
		status := "reset"
		if err != nil {
			status = "FAILED"
		}
		if out.JSON {
			out.PrintJSON(map[string]string{"agent": a.ID, "status": status})
		} else {
			fmt.Printf("  %s: %s\n", a.ID, status)
		}
	}
	return nil
}

func cmdBudgetShadow(args []string, cfg *config.Config, out *Output) error {
	if len(args) < 1 {
		return fmt.Errorf("usage: meshctl budget shadow on|off [agent]")
	}

	mode := args[0]
	var shadowVal int
	switch mode {
	case "on":
		shadowVal = 1
	case "off":
		shadowVal = 0
	default:
		return fmt.Errorf("expected 'on' or 'off', got %q", mode)
	}

	ssh := NewRunner(cfg)
	agents, err := LoadAgentEntries(cfg)
	if err != nil {
		return err
	}

	// Optional agent filter
	filterAgent := ""
	if len(args) > 1 {
		filterAgent = args[1]
	}

	ts := time.Now().UTC().Format("2006-01-02T15:04:05")
	for _, a := range agents {
		if filterAgent != "" && a.ID != filterAgent {
			continue
		}
		query := fmt.Sprintf(
			"UPDATE autonomy_budget SET shadow_mode = %d, updated_at = '%s' WHERE agent_id = '%s';",
			shadowVal, ts, a.ID,
		)
		_, err := ssh.Run(fmt.Sprintf("sqlite3 %s \"%s\" 2>&1", a.DBPath, query))
		status := fmt.Sprintf("shadow=%s", mode)
		if err != nil {
			status = "FAILED"
		}
		fmt.Printf("  %s: %s\n", a.ID, status)
	}
	return nil
}
