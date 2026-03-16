package main

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

func init() {
	register(Command{
		Name:    "deliberation stats",
		Summary: "Deliberation statistics — circuit breaker, active count",
		Run:     cmdDeliberationStats,
	})
	register(Command{
		Name:    "deliberation slots",
		Summary: "Active mesh deliberation slots",
		Run:     cmdDeliberationSlots,
	})
}

func cmdDeliberationStats(args []string, cfg *config.Config, out *Output) error {
	ssh := NewRunner(cfg)

	// Count active slots
	slotsOut, _ := ssh.Run("ls /tmp/mesh-spawn-slot-* 2>/dev/null | wc -l")

	// Check reserve
	reserveOut, _ := ssh.Run("test -f /tmp/mesh-reserve-unlock && echo 'yes' || echo 'no'")

	// Recent spawn log
	agents, _ := LoadAgentEntries(cfg)
	type spawnInfo struct {
		AgentID    string `json:"agent_id"`
		LastSpawn  string `json:"last_spawn"`
		SpawnCount string `json:"spawn_count_24h"`
	}
	var infos []spawnInfo
	for _, a := range agents {
		count, _ := ssh.Run(fmt.Sprintf(
			"sqlite3 %s \"SELECT count(*) FROM deliberation_log WHERE agent_id='%s' AND started_at > datetime('now', '-24 hours');\" 2>/dev/null || echo '?'",
			a.DBPath, a.ID,
		))
		last, _ := ssh.Run(fmt.Sprintf(
			"sqlite3 %s \"SELECT started_at FROM deliberation_log WHERE agent_id='%s' ORDER BY started_at DESC LIMIT 1;\" 2>/dev/null || echo '?'",
			a.DBPath, a.ID,
		))
		infos = append(infos, spawnInfo{AgentID: a.ID, LastSpawn: last, SpawnCount: count})
	}

	if out.JSON {
		out.PrintJSON(map[string]any{
			"active_slots":   strings.TrimSpace(slotsOut),
			"max_slots":      cfg.MaxConcurrent,
			"reserve_active": reserveOut == "yes",
			"reserve_slots":  cfg.ReserveSlots,
			"agents":         infos,
		})
		return nil
	}

	fmt.Printf("Active slots:  %s / %d (reserve: %s, +%d)\n",
		strings.TrimSpace(slotsOut), cfg.MaxConcurrent, reserveOut, cfg.ReserveSlots)
	fmt.Println()

	w := out.Table("AGENT", "LAST_SPAWN", "24H_COUNT")
	for _, i := range infos {
		fmt.Fprintf(w, "%s\t%s\t%s\n", i.AgentID, i.LastSpawn, i.SpawnCount)
	}
	w.Flush()
	return nil
}

func cmdDeliberationSlots(args []string, cfg *config.Config, out *Output) error {
	ssh := NewRunner(cfg)

	type slot struct {
		Path    string `json:"path"`
		Content string `json:"content"`
		AgeS    int64  `json:"age_seconds"`
	}
	var slots []slot

	for i := 0; i < 10; i++ {
		path := fmt.Sprintf("/tmp/mesh-spawn-slot-%d", i)
		content, err := ssh.Run(fmt.Sprintf("cat %s 2>/dev/null", path))
		if err != nil {
			continue
		}
		// Get age
		ageOut, _ := ssh.Run(fmt.Sprintf("stat -c %%Y %s 2>/dev/null || stat -f %%m %s 2>/dev/null", path, path))
		var ageS int64
		if ageOut != "" {
			var mtime int64
			fmt.Sscanf(ageOut, "%d", &mtime)
			ageS = time.Now().Unix() - mtime
		}
		slots = append(slots, slot{Path: path, Content: content, AgeS: ageS})
	}

	// Check reserve sentinel
	reserveExists := false
	if _, err := os.Stat("/tmp/mesh-reserve-unlock"); err == nil {
		reserveExists = true
	}

	if out.JSON {
		out.PrintJSON(map[string]any{
			"slots":          slots,
			"max_normal":     cfg.MaxConcurrent,
			"reserve_active": reserveExists,
			"reserve_slots":  cfg.ReserveSlots,
		})
		return nil
	}

	if len(slots) == 0 {
		fmt.Println("No active spawn slots")
	} else {
		w := out.Table("SLOT", "AGENT", "AGE")
		for _, s := range slots {
			fmt.Fprintf(w, "%s\t%s\t%ds\n", s.Path, s.Content, s.AgeS)
		}
		w.Flush()
	}

	reserveLabel := "locked"
	if reserveExists {
		reserveLabel = "UNLOCKED"
	}
	fmt.Printf("\nCapacity: %d normal + %d reserve (%s)\n", cfg.MaxConcurrent, cfg.ReserveSlots, reserveLabel)
	return nil
}
