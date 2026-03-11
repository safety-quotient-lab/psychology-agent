package collector

import (
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ActiveThread holds parsed MEMORY.md active thread data.
type ActiveThread struct {
	LastSession string   `json:"last_session"`
	Next        string   `json:"next"`
	StatusLines []string `json:"status_lines"`
}

// PeerSyncInfo holds peer sync recency information.
type PeerSyncInfo struct {
	AgentID       string `json:"agent_id"`
	LastRan       string `json:"last_ran"`
	LastRanRaw    string `json:"last_ran_raw"`
	NextDue       string `json:"next_due"`
	BudgetCurrent string `json:"budget_current"`
	BudgetMax     string `json:"budget_max"`
}

// ParseActiveThread extracts active thread from MEMORY.md.
func ParseActiveThread(projectRoot string) ActiveThread {
	result := ActiveThread{}

	// Check committed snapshot first, then auto-memory location
	memoryPath := filepath.Join(projectRoot, "MEMORY.md")
	if _, err := os.Stat(memoryPath); err != nil {
		// Auto-memory path (Claude Code stores outside repo)
		home, _ := os.UserHomeDir()
		cleanRoot := strings.ReplaceAll(projectRoot, "/", "-")
		cleanRoot = strings.TrimPrefix(cleanRoot, "-")
		autoPath := filepath.Join(home, ".claude", "projects", "-"+cleanRoot, "memory", "MEMORY.md")
		if _, err := os.Stat(autoPath); err != nil {
			return result
		}
		memoryPath = autoPath
	}

	data, err := os.ReadFile(memoryPath)
	if err != nil {
		return result
	}

	inThread := false
	for _, line := range strings.Split(string(data), "\n") {
		if strings.Contains(line, "## Active Thread") {
			inThread = true
			continue
		}
		if inThread && strings.HasPrefix(line, "## ") {
			break
		}
		if !inThread {
			continue
		}

		stripped := strings.TrimSpace(line)
		if strings.Contains(stripped, "Where we stopped") || strings.Contains(stripped, "where we stopped") {
			if idx := strings.Index(stripped, ":"); idx >= 0 {
				val := strings.TrimSpace(stripped[idx+1:])
				val = strings.Trim(val, "*")
				val = strings.TrimSpace(val)
				result.LastSession = val
			}
		} else if strings.HasPrefix(stripped, "**Next:**") || strings.HasPrefix(stripped, "**Next:") {
			val := strings.ReplaceAll(stripped, "**Next:**", "")
			val = strings.ReplaceAll(val, "**Next:", "")
			val = strings.TrimRight(val, "*")
			result.Next = strings.TrimSpace(val)
		} else if strings.HasPrefix(stripped, "- ") && strings.Contains(stripped, ":") {
			result.StatusLines = append(result.StatusLines, stripped[2:])
		}
	}

	return result
}

// CollectPeerSyncRecency builds peer sync recency from remote state snapshots.
func CollectPeerSyncRecency(remoteStates []map[string]any) []PeerSyncInfo {
	peers := make([]PeerSyncInfo, 0)

	for _, state := range remoteStates {
		agentID := getString(state, "agent_id")
		if agentID == "" {
			continue
		}

		snapshotAt := getString(state, "timestamp")
		schedule, _ := state["schedule"].(map[string]any)
		budget, _ := state["autonomy_budget"].(map[string]any)

		nextDue := ""
		if schedule != nil {
			nextDue = getString(schedule, "next_expected")
		}

		budgetCurrent := "?"
		budgetMax := "?"
		if budget != nil {
			budgetCurrent = fmt.Sprintf("%v", budget["budget_current"])
			budgetMax = fmt.Sprintf("%v", budget["budget_max"])
		}

		ageStr := relativeTime(snapshotAt)

		peers = append(peers, PeerSyncInfo{
			AgentID:       agentID,
			LastRan:       ageStr,
			LastRanRaw:    snapshotAt,
			NextDue:       nextDue,
			BudgetCurrent: budgetCurrent,
			BudgetMax:     budgetMax,
		})
	}

	return peers
}

func relativeTime(isoTime string) string {
	if isoTime == "" {
		return "unknown"
	}
	layouts := []string{
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05-07:00",
	}
	var t time.Time
	var err error
	for _, layout := range layouts {
		t, err = time.Parse(layout, isoTime)
		if err == nil {
			break
		}
	}
	if err != nil {
		return isoTime
	}

	delta := time.Since(t)
	mins := delta.Minutes()
	if mins < 1 {
		return "just now"
	}
	if mins < 60 {
		return fmt.Sprintf("%dm ago", int(mins))
	}
	if mins < 1440 {
		return fmt.Sprintf("%.1fh ago", mins/60)
	}
	return fmt.Sprintf("%.1fd ago", math.Round(mins/1440*10)/10)
}
