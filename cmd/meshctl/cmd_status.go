package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

func init() {
	register(Command{
		Name:    "status",
		Summary: "Mesh overview — agents, budgets, spawns, CI, health",
		Run:     cmdStatus,
	})
}

type agentStatus struct {
	ID         string `json:"id"`
	Role       string `json:"role"`
	Health     string `json:"health"`
	Uptime     string `json:"uptime"`
	Version    string `json:"version"`
	Budget     string `json:"budget"`
	Shadow     string `json:"shadow"`
	MeshdPID   string `json:"meshd_pid"`
	LastSpawn  string `json:"last_spawn"`
	Spawns24h  string `json:"spawns_24h"`
	FailRate   string `json:"fail_rate_24h"`
	Unproc     string `json:"unprocessed"`
	Sessions   string `json:"open_sessions"`
	RotatePend string `json:"rotate_pending"`
	Model      string `json:"deliberation_model"`
	DBSize     string `json:"db_size_kb"`
}

type slotInfo struct {
	Index int    `json:"index"`
	Agent string `json:"agent"`
	AgeS  string `json:"age_seconds"`
}

func cmdStatus(args []string, cfg *config.Config, out *Output) error {
	runner := NewRunner(cfg)
	agents, err := LoadAgentEntries(cfg)
	if err != nil {
		return err
	}

	// ── Mesh-wide state ─────────────────────────────────────────────

	pauseOut, _ := runner.Run("cat /tmp/mesh-pause 2>/dev/null || echo '__none__'")
	paused := pauseOut != "__none__"

	// Spawn slots
	var slots []slotInfo
	for i := 0; i < 10; i++ {
		path := fmt.Sprintf("/tmp/mesh-spawn-slot-%d", i)
		content, err := runner.Run(fmt.Sprintf("cat %s 2>/dev/null", path))
		if err != nil || content == "" {
			continue
		}
		ageOut, _ := runner.Run(fmt.Sprintf(
			"echo $(( $(date +%%s) - $(stat -c %%Y %s 2>/dev/null || stat -f %%m %s 2>/dev/null || echo 0) ))", path, path))
		slots = append(slots, slotInfo{Index: i, Agent: content, AgeS: strings.TrimSpace(ageOut)})
	}

	reserveOut, _ := runner.Run("test -f /tmp/mesh-reserve-unlock && echo 'yes' || echo 'no'")
	meshdOut, _ := runner.Run("pgrep -c meshd 2>/dev/null || echo '0'")

	// Mesh-wide spawn totals (last 24h from operations-agent state.db — it logs all agents)
	opsDB := ""
	for _, a := range agents {
		if a.ID == cfg.AgentID {
			opsDB = a.DBPath
			break
		}
	}
	totalSpawns24h := "?"
	totalFails24h := "?"
	if opsDB != "" {
		totalSpawns24h, _ = runner.Run(fmt.Sprintf(
			"sqlite3 %s \"SELECT count(*) FROM deliberation_log WHERE started_at > datetime('now', '-24 hours');\" 2>/dev/null || echo '?'", opsDB))
		totalFails24h, _ = runner.Run(fmt.Sprintf(
			"sqlite3 %s \"SELECT count(*) FROM deliberation_log WHERE started_at > datetime('now', '-24 hours') AND exit_code != 0;\" 2>/dev/null || echo '?'", opsDB))
	}

	// Transport session summary
	localSessionsDir := filepath.Join(cfg.RepoRoot, "transport", "sessions")
	openSessions := 0
	totalSessions := 0
	if entries, err := os.ReadDir(localSessionsDir); err == nil {
		for _, e := range entries {
			if !e.IsDir() {
				continue
			}
			totalSessions++
			manifest := filepath.Join(localSessionsDir, e.Name(), "MANIFEST.json")
			data, err := os.ReadFile(manifest)
			if err != nil {
				continue
			}
			var m struct {
				Status string `json:"status"`
			}
			json.Unmarshal(data, &m)
			if m.Status == "open" {
				openSessions++
			}
		}
	}

	// ── Per-agent state ─────────────────────────────────────────────

	// URL map — both ID variants for psq
	agentURLs := map[string]string{
		"operations-agent":    "https://operations-agent.safety-quotient.dev/api/status",
		"psychology-agent":    "https://psychology-agent.safety-quotient.dev/api/status",
		"psq-agent":           "https://psq-agent.safety-quotient.dev/api/status",
		"safety-quotient-agent": "https://psq-agent.safety-quotient.dev/api/status",
		"unratified-agent":    "https://unratified.org/api/status",
		"observatory-agent":   "https://observatory.unratified.org/api/status",
	}

	client := &http.Client{Timeout: 5 * time.Second}
	var agentRows []agentStatus

	for _, a := range agents {
		row := agentStatus{ID: a.ID, Role: a.Role}

		// Budget — try new schema, fall back to old
		budgetResult, _ := runner.Run(fmt.Sprintf(
			"sqlite3 -separator '|' %s \"SELECT budget_spent, budget_cutoff, shadow_mode FROM autonomy_budget WHERE agent_id='%s';\" 2>/dev/null",
			a.DBPath, a.ID))
		if budgetResult == "" {
			budgetResult, _ = runner.Run(fmt.Sprintf(
				"sqlite3 -separator '|' %s \"SELECT budget_max - budget_current, budget_max, shadow_mode FROM autonomy_budget WHERE agent_id='%s';\" 2>/dev/null",
				a.DBPath, a.ID))
		}
		parts := strings.SplitN(budgetResult, "|", 3)
		if len(parts) == 3 {
			spent := strings.TrimSpace(parts[0])
			cutoff := strings.TrimSpace(parts[1])
			if cutoff == "0" {
				row.Budget = spent + " (∞)"
			} else {
				row.Budget = spent + "/" + cutoff
			}
			row.Shadow = strings.TrimSpace(parts[2])
			if row.Shadow == "0" {
				row.Shadow = "-"
			} else {
				row.Shadow = "ON"
			}
		} else {
			row.Budget = "?"
			row.Shadow = "?"
		}

		// meshd PID
		pid, _ := runner.Run(fmt.Sprintf(
			"pgrep -f 'meshd.*%s' 2>/dev/null | head -1 || echo ''", a.ID))
		row.MeshdPID = strings.TrimSpace(pid)
		if row.MeshdPID == "" {
			row.MeshdPID = "-"
		}

		// Spawns
		lastSpawn, _ := runner.Run(fmt.Sprintf(
			"sqlite3 %s \"SELECT started_at FROM deliberation_log WHERE agent_id='%s' ORDER BY started_at DESC LIMIT 1;\" 2>/dev/null",
			a.DBPath, a.ID))
		row.LastSpawn = strings.TrimSpace(lastSpawn)
		if row.LastSpawn == "" {
			row.LastSpawn = "-"
		} else if len(row.LastSpawn) > 19 {
			row.LastSpawn = row.LastSpawn[11:19]
		}

		spawnCount, _ := runner.Run(fmt.Sprintf(
			"sqlite3 %s \"SELECT count(*) FROM deliberation_log WHERE agent_id='%s' AND started_at > datetime('now', '-24 hours');\" 2>/dev/null || echo '?'",
			a.DBPath, a.ID))
		row.Spawns24h = strings.TrimSpace(spawnCount)

		failCount, _ := runner.Run(fmt.Sprintf(
			"sqlite3 %s \"SELECT count(*) FROM deliberation_log WHERE agent_id='%s' AND started_at > datetime('now', '-24 hours') AND exit_code != 0;\" 2>/dev/null || echo '?'",
			a.DBPath, a.ID))
		if row.Spawns24h != "?" && row.Spawns24h != "0" && failCount != "?" {
			row.FailRate = failCount + " fail"
		} else {
			row.FailRate = "-"
		}

		// Unprocessed messages
		unproc, _ := runner.Run(fmt.Sprintf(
			"sqlite3 %s \"SELECT count(*) FROM transport_messages WHERE processed=0;\" 2>/dev/null || echo '?'",
			a.DBPath))
		row.Unproc = strings.TrimSpace(unproc)

		// Open transport sessions for this agent
		openSess, _ := runner.Run(fmt.Sprintf(
			"sqlite3 %s \"SELECT count(*) FROM transport_messages WHERE processed=0 AND message_type IN ('directive','proposal','request');\" 2>/dev/null || echo '?'",
			a.DBPath))
		row.Sessions = strings.TrimSpace(openSess)

		// Context rotation
		rotateCheck, _ := runner.Run(fmt.Sprintf(
			"test -f /tmp/context-rotate-%s && echo 'PENDING' || echo '-'", a.ID))
		row.RotatePend = strings.TrimSpace(rotateCheck)

		// DELIBERATION_MODEL from agent's .dev.vars
		agentDir := filepath.Dir(a.DBPath)
		deliberationModel, _ := runner.Run(fmt.Sprintf(
			"grep DELIBERATION_MODEL %s/.dev.vars 2>/dev/null | cut -d= -f2 || echo 'default'", agentDir))
		row.Model = strings.TrimSpace(deliberationModel)
		if row.Model == "" {
			row.Model = "default"
		}

		// state.db size
		dbSize, _ := runner.Run(fmt.Sprintf(
			"du -k %s 2>/dev/null | cut -f1 || echo '?'", a.DBPath))
		row.DBSize = strings.TrimSpace(dbSize)

		// Live health from HTTP
		if url, ok := agentURLs[a.ID]; ok {
			resp, err := client.Get(url)
			if err != nil {
				row.Health = "DOWN"
				row.Uptime = "-"
				row.Version = "?"
			} else {
				body, _ := io.ReadAll(resp.Body)
				resp.Body.Close()
				var data map[string]any
				json.Unmarshal(body, &data)

				if h, ok := data["health"].(string); ok {
					row.Health = h
				} else {
					row.Health = "online"
				}
				if u, ok := data["uptime"].(string); ok {
					row.Uptime = u
				} else {
					row.Uptime = "-"
				}
				if v, ok := data["version"].(string); ok {
					row.Version = v
				} else {
					row.Version = "?"
				}
			}
		} else {
			row.Health = "?"
			row.Uptime = "?"
			row.Version = "?"
		}

		agentRows = append(agentRows, row)
	}

	// ── CI ───────────────────────────────────────────────────────────

	type ciSummary struct {
		Repo       string `json:"repo"`
		Conclusion string `json:"conclusion"`
		Workflow   string `json:"workflow"`
	}
	ciRepos := []string{
		"safety-quotient-lab/operations-agent",
		"safety-quotient-lab/psychology-agent",
		"safety-quotient-lab/safety-quotient",
		"safety-quotient-lab/unratified",
		"safety-quotient-lab/observatory",
	}
	var ciResults []ciSummary
	ciFailures := 0
	for _, repo := range ciRepos {
		apiURL := fmt.Sprintf("https://api.github.com/repos/%s/actions/runs?per_page=1&status=completed", repo)
		req, _ := http.NewRequest("GET", apiURL, nil)
		req.Header.Set("Accept", "application/vnd.github+json")
		if cfg.GitHubToken != "" {
			req.Header.Set("Authorization", "Bearer "+cfg.GitHubToken)
		}
		resp, err := client.Do(req)
		conclusion, workflow := "?", "?"
		if err == nil && resp.StatusCode == 200 {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			var gh struct {
				Runs []struct {
					Name       string `json:"name"`
					Conclusion string `json:"conclusion"`
				} `json:"workflow_runs"`
			}
			json.Unmarshal(body, &gh)
			if len(gh.Runs) > 0 {
				conclusion = gh.Runs[0].Conclusion
				workflow = gh.Runs[0].Name
				if conclusion == "failure" {
					ciFailures++
				}
			}
		}
		p := strings.Split(repo, "/")
		ciResults = append(ciResults, ciSummary{Repo: p[len(p)-1], Conclusion: conclusion, Workflow: workflow})
	}

	// ── Compositor ───────────────────────────────────────────────────

	compositorHealth := "?"
	compositorDetail := ""
	resp, err := client.Get("https://interagent.safety-quotient.dev/health")
	if err != nil {
		compositorHealth = "DOWN"
	} else {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		var hd map[string]any
		json.Unmarshal(body, &hd)
		if s, ok := hd["status"].(string); ok {
			compositorHealth = s
		}
		if kv, ok := hd["kv_connected"].(bool); ok {
			if kv {
				compositorDetail = "KV connected"
			} else {
				compositorDetail = "KV disconnected"
			}
		}
		if fe, ok := hd["fetch_errors"].(float64); ok && fe > 0 {
			compositorDetail += fmt.Sprintf(", %d fetch errors", int(fe))
		}
	}

	// ── JSON output ─────────────────────────────────────────────────

	if out.JSON {
		out.PrintJSON(map[string]any{
			"mesh_paused":       paused,
			"pause_reason":      pauseOut,
			"active_slots":      slots,
			"slot_count":        len(slots),
			"max_normal":        cfg.MaxConcurrent,
			"reserve_active":    reserveOut == "yes",
			"reserve_slots":     cfg.ReserveSlots,
			"meshd_processes":   strings.TrimSpace(meshdOut),
			"total_spawns_24h":  strings.TrimSpace(totalSpawns24h),
			"total_fails_24h":   strings.TrimSpace(totalFails24h),
			"compositor":        compositorHealth,
			"compositor_detail": compositorDetail,
			"ci_failures":       ciFailures,
			"ci":                ciResults,
			"transport":         map[string]int{"open": openSessions, "total": totalSessions},
			"agents":            agentRows,
		})
		return nil
	}

	// ── Human-readable ──────────────────────────────────────────────

	pauseLabel := "active"
	if paused {
		pauseLabel = "PAUSED (" + pauseOut + ")"
	}
	fmt.Println("╔══════════════════════════════════════════════════════════════╗")
	fmt.Println("║                      MESH STATUS                           ║")
	fmt.Println("╚══════════════════════════════════════════════════════════════╝")
	fmt.Println()

	fmt.Printf("  Mesh:         %s\n", pauseLabel)
	fmt.Printf("  meshd:        %s processes\n", strings.TrimSpace(meshdOut))

	compLabel := compositorHealth
	if compositorDetail != "" {
		compLabel += " (" + compositorDetail + ")"
	}
	fmt.Printf("  Compositor:   %s\n", compLabel)

	ciLabel := "GREEN"
	if ciFailures > 0 {
		var failing []string
		for _, c := range ciResults {
			if c.Conclusion == "failure" {
				failing = append(failing, c.Repo+"/"+c.Workflow)
			}
		}
		ciLabel = fmt.Sprintf("RED [%s]", strings.Join(failing, ", "))
	}
	fmt.Printf("  CI:           %s\n", ciLabel)
	fmt.Printf("  Transport:    %d open / %d total sessions\n", openSessions, totalSessions)
	fmt.Printf("  Spawns (24h): %s total, %s failed\n", strings.TrimSpace(totalSpawns24h), strings.TrimSpace(totalFails24h))

	reserveLabel := "locked"
	if reserveOut == "yes" {
		reserveLabel = "UNLOCKED"
	}
	fmt.Printf("  Capacity:     %d normal + %d reserve (%s)\n",
		cfg.MaxConcurrent, cfg.ReserveSlots, reserveLabel)

	if len(slots) > 0 {
		fmt.Println()
		fmt.Println("  Active spawns:")
		for _, s := range slots {
			fmt.Printf("    slot-%d  %s  (%ss)\n", s.Index, s.Agent, s.AgeS)
		}
	}

	fmt.Println()
	w := out.Table("AGENT", "HEALTH", "UPTIME", "BUDGET", "MODEL", "24H", "FAIL", "LAST", "UNPROC", "ROTATE", "DB(KB)")
	for _, r := range agentRows {
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
			r.ID, r.Health, r.Uptime, r.Budget, r.Model,
			r.Spawns24h, r.FailRate, r.LastSpawn, r.Unproc, r.RotatePend, r.DBSize)
	}
	w.Flush()

	fmt.Println()
	fmt.Println("  CI per repo:")
	for _, c := range ciResults {
		marker := "  "
		if c.Conclusion == "failure" {
			marker = "!!"
		}
		fmt.Printf("  %s %-20s %s (%s)\n", marker, c.Repo, c.Conclusion, c.Workflow)
	}

	return nil
}
