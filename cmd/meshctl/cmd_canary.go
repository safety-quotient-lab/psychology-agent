package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

func init() {
	register(Command{
		Name:    "canary",
		Summary: "BFT verification — compare direct agent status vs compositor",
		Run:     cmdCanary,
	})
}

type canaryResult struct {
	AgentID       string `json:"agent_id"`
	DirectStatus  string `json:"direct_status"`
	CompStatus    string `json:"compositor_status"`
	DirectBudget  any    `json:"direct_budget"`
	CompBudget    any    `json:"compositor_budget"`
	Verdict       string `json:"verdict"`
}

func cmdCanary(args []string, cfg *config.Config, out *Output) error {
	client := &http.Client{Timeout: 6 * time.Second}

	// Fetch compositor pulse
	pulseResp, err := client.Get("https://interagent.safety-quotient.dev/api/pulse")
	var pulseData map[string]any
	compositorDown := false
	if err != nil || pulseResp.StatusCode != 200 {
		compositorDown = true
	} else {
		defer pulseResp.Body.Close()
		body, _ := io.ReadAll(pulseResp.Body)
		json.Unmarshal(body, &pulseData)
	}

	// Agent URLs from agent card discovery
	agentURLs := map[string]string{
		"operations-agent":  "https://operations-agent.safety-quotient.dev/api/status",
		"psychology-agent":  "https://psychology-agent.safety-quotient.dev/api/status",
		"psq-agent":         "https://psq-agent.safety-quotient.dev/api/status",
		"unratified-agent":  "https://unratified.org/api/status",
		"observatory-agent": "https://observatory.unratified.org/api/status",
	}

	var results []canaryResult
	divergences := 0

	for agentID, url := range agentURLs {
		r := canaryResult{AgentID: agentID}

		// Direct fetch
		resp, err := client.Get(url)
		if err != nil || resp.StatusCode != 200 {
			r.DirectStatus = "unavailable"
		} else {
			defer resp.Body.Close()
			var data map[string]any
			body, _ := io.ReadAll(resp.Body)
			json.Unmarshal(body, &data)
			r.DirectStatus = "online"
			if b, ok := data["autonomy_budget"].(map[string]any); ok {
				r.DirectBudget = b["budget_spent"]
				if r.DirectBudget == nil {
					r.DirectBudget = b["budget_current"]
				}
			}
		}

		// Compositor comparison
		if compositorDown {
			r.CompStatus = "COMP_DOWN"
			r.Verdict = "COMP_DOWN"
			divergences++
		} else {
			if s, ok := findPulseAgent(pulseData, agentID, "status").(string); ok {
				r.CompStatus = s
			}
			r.CompBudget = findPulseAgent(pulseData, agentID, "budget_spent")
			if r.CompBudget == nil {
				r.CompBudget = findPulseAgent(pulseData, agentID, "budget_current")
			}

			if r.DirectStatus != r.CompStatus {
				r.Verdict = "DIVERGE"
				divergences++
			} else {
				r.Verdict = "OK"
			}
		}

		results = append(results, r)
	}

	if out.JSON {
		out.PrintJSON(map[string]any{
			"compositor_down": compositorDown,
			"divergences":     divergences,
			"results":         results,
		})
	} else {
		if compositorDown {
			fmt.Println("COMPOSITOR: DOWN")
			fmt.Println()
		}

		w := out.Table("AGENT", "DIRECT", "COMPOSITOR", "DIR_BUDGET", "CMP_BUDGET", "VERDICT")
		for _, r := range results {
			fmt.Fprintf(w, "%s\t%s\t%s\t%v\t%v\t%s\n",
				r.AgentID, r.DirectStatus, r.CompStatus,
				r.DirectBudget, r.CompBudget, r.Verdict)
		}
		w.Flush()

		fmt.Printf("\nDivergences: %d\n", divergences)
	}

	if compositorDown {
		return fmt.Errorf("compositor unreachable")
	}
	if divergences > 0 {
		return fmt.Errorf("%d divergences detected", divergences)
	}
	return nil
}

func findPulseAgent(pulse map[string]any, agentID, field string) any {
	agents, ok := pulse["agents"].([]any)
	if !ok {
		return nil
	}
	for _, a := range agents {
		m, ok := a.(map[string]any)
		if !ok {
			continue
		}
		if m["id"] == agentID {
			return m[field]
		}
	}
	return nil
}
