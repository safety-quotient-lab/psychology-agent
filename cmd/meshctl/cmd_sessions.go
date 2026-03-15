package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

func init() {
	register(Command{
		Name:    "sessions list",
		Summary: "List active transport sessions",
		Run:     cmdSessionsList,
	})
	register(Command{
		Name:    "sessions archive",
		Summary: "Archive stale sessions (--execute to apply, --age N days)",
		Run:     cmdSessionsArchive,
	})
}

func cmdSessionsList(args []string, cfg *config.Config, out *Output) error {
	sessionsDir := cfg.TransportDir
	entries, err := os.ReadDir(sessionsDir)
	if err != nil {
		return fmt.Errorf("read transport dir: %w", err)
	}

	type sessionInfo struct {
		Name      string `json:"name"`
		Status    string `json:"status"`
		Turns     int    `json:"turns"`
		Summary   string `json:"summary"`
	}
	var sessions []sessionInfo

	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		manifest := filepath.Join(sessionsDir, e.Name(), "MANIFEST.json")
		data, err := os.ReadFile(manifest)
		if err != nil {
			sessions = append(sessions, sessionInfo{Name: e.Name(), Status: "no-manifest"})
			continue
		}
		var m struct {
			Status  string `json:"status"`
			Turns   int    `json:"turns"`
			Summary string `json:"summary"`
		}
		json.Unmarshal(data, &m)
		sessions = append(sessions, sessionInfo{
			Name:    e.Name(),
			Status:  m.Status,
			Turns:   m.Turns,
			Summary: m.Summary,
		})
	}

	sort.Slice(sessions, func(i, j int) bool {
		return sessions[i].Name < sessions[j].Name
	})

	if out.JSON {
		out.PrintJSON(sessions)
		return nil
	}

	w := out.Table("SESSION", "STATUS", "TURNS", "SUMMARY")
	for _, s := range sessions {
		summary := s.Summary
		if len(summary) > 60 {
			summary = summary[:57] + "..."
		}
		fmt.Fprintf(w, "%s\t%s\t%d\t%s\n", s.Name, s.Status, s.Turns, summary)
	}
	w.Flush()
	return nil
}

func cmdSessionsArchive(args []string, cfg *config.Config, out *Output) error {
	archiveScript := filepath.Join(cfg.RepoRoot, "interagent-sdk", "scripts", "archive-sessions.sh")
	cmdArgs := []string{archiveScript}
	cmdArgs = append(cmdArgs, args...)

	cmd := exec.Command("bash", cmdArgs...)
	output, err := cmd.CombinedOutput()
	fmt.Print(string(output))
	if err != nil {
		return fmt.Errorf("archive failed: %w", err)
	}
	return nil
}
