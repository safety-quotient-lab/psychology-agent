package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

func init() {
	register(Command{
		Name:    "context rotate",
		Summary: "Drop context-rotation sentinel for agent(s)",
		Run:     cmdContextRotate,
	})
	register(Command{
		Name:    "context status",
		Summary: "Check which agents have rotation pending",
		Run:     cmdContextStatus,
	})
	register(Command{
		Name:    "context clear",
		Summary: "Remove all rotation sentinels",
		Run:     cmdContextClear,
	})
}

func cmdContextRotate(args []string, cfg *config.Config, out *Output) error {
	ssh := NewSSHRunner(cfg)
	agents, err := LoadAgentEntries(cfg)
	if err != nil {
		return err
	}

	filter := ""
	reason := "meshctl rotate"
	for i := 0; i < len(args); i++ {
		if args[i] == "--reason" && i+1 < len(args) {
			reason = args[i+1]
			i++
		} else {
			filter = args[i]
		}
	}

	ts := time.Now().UTC().Format(time.RFC3339)
	for _, a := range agents {
		if filter != "" && a.ID != filter {
			continue
		}
		sentinel := fmt.Sprintf("/tmp/context-rotate-%s", a.ID)
		content := fmt.Sprintf("%s %s", reason, ts)
		_, err := ssh.Run(fmt.Sprintf("echo '%s' > %s", content, sentinel))
		status := "sentinel dropped"
		if err != nil {
			status = "FAILED"
		}
		fmt.Printf("  %s: %s\n", a.ID, status)
	}
	return nil
}

func cmdContextStatus(args []string, cfg *config.Config, out *Output) error {
	ssh := NewSSHRunner(cfg)
	agents, _ := LoadAgentEntries(cfg)

	type rotateInfo struct {
		ID      string `json:"id"`
		Pending bool   `json:"pending"`
		Content string `json:"content,omitempty"`
	}
	var infos []rotateInfo

	for _, a := range agents {
		sentinel := fmt.Sprintf("/tmp/context-rotate-%s", a.ID)
		content, err := ssh.Run(fmt.Sprintf("cat %s 2>/dev/null", sentinel))
		pending := err == nil && strings.TrimSpace(content) != ""
		infos = append(infos, rotateInfo{ID: a.ID, Pending: pending, Content: content})
	}

	if out.JSON {
		out.PrintJSON(infos)
		return nil
	}

	w := out.Table("AGENT", "PENDING", "REASON")
	for _, i := range infos {
		pendingLabel := "no"
		if i.Pending {
			pendingLabel = "YES"
		}
		fmt.Fprintf(w, "%s\t%s\t%s\n", i.ID, pendingLabel, i.Content)
	}
	w.Flush()
	return nil
}

func cmdContextClear(args []string, cfg *config.Config, out *Output) error {
	ssh := NewSSHRunner(cfg)
	_, err := ssh.Run("rm -f /tmp/context-rotate-* 2>/dev/null")
	if err != nil {
		return fmt.Errorf("failed to clear rotation sentinels: %w", err)
	}
	out.Print("All rotation sentinels cleared")
	return nil
}
