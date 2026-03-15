package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"strings"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

func init() {
	register(Command{
		Name:    "ci",
		Summary: "CI status across all mesh repos (recent workflow runs)",
		Run:     cmdCI,
	})
}

func cmdCI(args []string, cfg *config.Config, out *Output) error {
	repos := []string{
		"safety-quotient-lab/operations-agent",
		"safety-quotient-lab/psychology-agent",
		"safety-quotient-lab/safety-quotient",
		"safety-quotient-lab/unratified",
		"safety-quotient-lab/observatory",
	}

	type run struct {
		Name       string `json:"name"`
		Conclusion string `json:"conclusion"`
		Branch     string `json:"branch"`
		CreatedAt  string `json:"created_at"`
	}
	type repoResult struct {
		Repo     string `json:"repo"`
		Status   string `json:"status"`
		Failures int    `json:"failures"`
		Runs     []run  `json:"runs,omitempty"`
	}

	var results []repoResult
	totalFail := 0

	client := &http.Client{Timeout: 10 * time.Second}

	for _, repo := range repos {
		rr := repoResult{Repo: repo, Status: "unknown"}

		// Try gh CLI first (handles auth), fall back to API
		ghOut, err := exec.Command("gh", "run", "list", "--repo", repo, "--limit", "5", "--json", "name,conclusion,headBranch,createdAt").Output()
		if err == nil {
			var runs []struct {
				Name       string `json:"name"`
				Conclusion string `json:"conclusion"`
				HeadBranch string `json:"headBranch"`
				CreatedAt  string `json:"createdAt"`
			}
			json.Unmarshal(ghOut, &runs)
			for _, r := range runs {
				rr.Runs = append(rr.Runs, run{
					Name:       r.Name,
					Conclusion: r.Conclusion,
					Branch:     r.HeadBranch,
					CreatedAt:  r.CreatedAt,
				})
				if r.Conclusion == "failure" {
					rr.Failures++
				}
			}
		} else {
			// Fallback: direct API
			apiURL := fmt.Sprintf("https://api.github.com/repos/%s/actions/runs?per_page=5&status=completed", repo)
			resp, err := client.Get(apiURL)
			if err != nil {
				rr.Status = "unreachable"
				results = append(results, rr)
				continue
			}
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)
			var ghResp struct {
				Runs []struct {
					Name       string `json:"name"`
					Conclusion string `json:"conclusion"`
					HeadBranch string `json:"head_branch"`
					CreatedAt  string `json:"created_at"`
				} `json:"workflow_runs"`
			}
			json.Unmarshal(body, &ghResp)
			for _, r := range ghResp.Runs {
				rr.Runs = append(rr.Runs, run{
					Name:       r.Name,
					Conclusion: r.Conclusion,
					Branch:     r.HeadBranch,
					CreatedAt:  r.CreatedAt,
				})
				if r.Conclusion == "failure" {
					rr.Failures++
				}
			}
		}

		totalFail += rr.Failures
		if rr.Failures > 0 {
			rr.Status = "FAILING"
		} else if len(rr.Runs) > 0 {
			rr.Status = "passing"
		}
		results = append(results, rr)
	}

	if out.JSON {
		out.PrintJSON(map[string]any{
			"mesh_ci":        map[string]string{"status": statusLabel(totalFail)},
			"total_failures": totalFail,
			"repos":          results,
		})
		return nil
	}

	meshLabel := "GREEN"
	if totalFail > 0 {
		meshLabel = fmt.Sprintf("RED (%d failures)", totalFail)
	}
	fmt.Printf("Mesh CI: %s\n\n", meshLabel)

	w := out.Table("REPO", "STATUS", "FAILS", "LATEST")
	for _, r := range results {
		latest := "—"
		if len(r.Runs) > 0 {
			// Short repo name
			parts := strings.Split(r.Repo, "/")
			shortRepo := parts[len(parts)-1]
			latest = fmt.Sprintf("%s (%s)", r.Runs[0].Name, r.Runs[0].Conclusion)
			fmt.Fprintf(w, "%s\t%s\t%d\t%s\n", shortRepo, r.Status, r.Failures, latest)
		} else {
			parts := strings.Split(r.Repo, "/")
			fmt.Fprintf(w, "%s\t%s\t%d\t%s\n", parts[len(parts)-1], r.Status, r.Failures, latest)
		}
	}
	w.Flush()

	if totalFail > 0 {
		return fmt.Errorf("%d CI failures across mesh", totalFail)
	}
	return nil
}

func statusLabel(failures int) string {
	if failures > 0 {
		return "red"
	}
	return "green"
}
