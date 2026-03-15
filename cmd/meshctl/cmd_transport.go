package main

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

func init() {
	register(Command{
		Name:    "transport sync",
		Summary: "Trigger meshd sync cycle",
		Run:     cmdTransportSync,
	})
	register(Command{
		Name:    "transport queue",
		Summary: "Show pending message counts per agent",
		Run:     cmdTransportQueue,
	})
	register(Command{
		Name:    "transport deliver",
		Summary: "Deliver message to peer via PR: deliver AGENT SESSION FILE",
		Run:     cmdTransportDeliver,
	})
	register(Command{
		Name:    "transport index",
		Summary: "Index transport messages into state.db",
		Run:     cmdTransportIndex,
	})
}

func cmdTransportSync(args []string, cfg *config.Config, out *Output) error {
	sdkScript := filepath.Join(cfg.RepoRoot, "interagent-sdk", "scripts", "meshd-sync.sh")
	cmd := exec.Command("bash", sdkScript)
	output, err := cmd.CombinedOutput()
	fmt.Print(string(output))
	if err != nil {
		return fmt.Errorf("sync failed: %w", err)
	}
	return nil
}

func cmdTransportQueue(args []string, cfg *config.Config, out *Output) error {
	ssh := NewSSHRunner(cfg)
	agents, err := LoadAgentEntries(cfg)
	if err != nil {
		return err
	}

	type queueRow struct {
		ID          string `json:"id"`
		Unprocessed string `json:"unprocessed"`
		Total       string `json:"total"`
	}
	var rows []queueRow

	for _, a := range agents {
		unproc, _ := ssh.Run(fmt.Sprintf(
			"sqlite3 %s \"SELECT count(*) FROM transport_messages WHERE processed=0;\" 2>/dev/null || echo '?'",
			a.DBPath,
		))
		total, _ := ssh.Run(fmt.Sprintf(
			"sqlite3 %s \"SELECT count(*) FROM transport_messages;\" 2>/dev/null || echo '?'",
			a.DBPath,
		))
		rows = append(rows, queueRow{
			ID:          a.ID,
			Unprocessed: strings.TrimSpace(unproc),
			Total:       strings.TrimSpace(total),
		})
	}

	if out.JSON {
		out.PrintJSON(rows)
		return nil
	}

	w := out.Table("AGENT", "UNPROCESSED", "TOTAL")
	for _, r := range rows {
		fmt.Fprintf(w, "%s\t%s\t%s\n", r.ID, r.Unprocessed, r.Total)
	}
	w.Flush()
	return nil
}

func cmdTransportDeliver(args []string, cfg *config.Config, out *Output) error {
	if len(args) < 3 {
		return fmt.Errorf("usage: meshctl transport deliver AGENT SESSION FILE [label]")
	}

	agent := args[0]
	session := args[1]
	file := args[2]
	label := "meshctl-delivery"
	if len(args) > 3 {
		label = args[3]
	}

	deliverScript := filepath.Join(cfg.RepoRoot, "interagent-sdk", "scripts", "deliver-to-peer.sh")
	cmd := exec.Command("bash", deliverScript, agent, session, file, label)
	output, err := cmd.CombinedOutput()
	fmt.Print(string(output))
	if err != nil {
		return fmt.Errorf("delivery failed: %w", err)
	}
	return nil
}

func cmdTransportIndex(args []string, cfg *config.Config, out *Output) error {
	indexScript := filepath.Join(cfg.RepoRoot, "scripts", "index-transport.sh")
	cmd := exec.Command("bash", indexScript)
	output, err := cmd.CombinedOutput()
	fmt.Print(string(output))
	if err != nil {
		return fmt.Errorf("indexing failed: %w", err)
	}
	return nil
}
