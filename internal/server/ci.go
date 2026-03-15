// Package server — ci.go provides GET /api/ci for cross-repo CI visibility.
//
// Aggregates recent GitHub Actions workflow runs across all mesh repos
// via the GitHub API. Surfaces failures, in-progress runs, and success
// rates so the operator spots build problems across the entire mesh.
package server

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// handleCI serves GET /api/ci — aggregated CI status across mesh repos.
func (s *Server) handleCI(w http.ResponseWriter, r *http.Request) {
	repos := []string{
		"safety-quotient-lab/operations-agent",
		"safety-quotient-lab/psychology-agent",
		"safety-quotient-lab/safety-quotient",
		"safety-quotient-lab/unratified",
		"safety-quotient-lab/observatory",
	}

	client := &http.Client{Timeout: 10 * time.Second}

	type workflowRun struct {
		Name       string `json:"name"`
		Status     string `json:"status"`
		Conclusion string `json:"conclusion"`
		Branch     string `json:"head_branch"`
		URL        string `json:"html_url"`
		CreatedAt  string `json:"created_at"`
		RunNumber  int    `json:"run_number"`
	}

	type repoCI struct {
		Repo     string        `json:"repo"`
		Status   string        `json:"status"`
		Runs     []workflowRun `json:"recent_runs"`
		Failures int           `json:"failures"`
		Error    string        `json:"error,omitempty"`
	}

	results := make([]repoCI, 0, len(repos))
	totalFailures := 0

	for _, repo := range repos {
		ci := repoCI{Repo: repo, Status: "unknown"}

		apiURL := fmt.Sprintf("https://api.github.com/repos/%s/actions/runs?per_page=5&status=completed", repo)
		req, _ := http.NewRequest("GET", apiURL, nil)
		req.Header.Set("Accept", "application/vnd.github+json")

		// Use GitHub token if available for higher rate limits
		if s.GitHubToken != "" {
			req.Header.Set("Authorization", "Bearer "+s.GitHubToken)
		}

		resp, err := client.Do(req)
		if err != nil {
			ci.Status = "unreachable"
			ci.Error = err.Error()
			results = append(results, ci)
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			ci.Status = "api-error"
			ci.Error = fmt.Sprintf("HTTP %d", resp.StatusCode)
			results = append(results, ci)
			continue
		}

		body, _ := io.ReadAll(resp.Body)
		var ghResp struct {
			WorkflowRuns []struct {
				Name       string `json:"name"`
				Status     string `json:"status"`
				Conclusion string `json:"conclusion"`
				HeadBranch string `json:"head_branch"`
				HTMLURL    string `json:"html_url"`
				CreatedAt  string `json:"created_at"`
				RunNumber  int    `json:"run_number"`
			} `json:"workflow_runs"`
		}
		json.Unmarshal(body, &ghResp)

		for _, run := range ghResp.WorkflowRuns {
			ci.Runs = append(ci.Runs, workflowRun{
				Name:       run.Name,
				Status:     run.Status,
				Conclusion: run.Conclusion,
				Branch:     run.HeadBranch,
				URL:        run.HTMLURL,
				CreatedAt:  run.CreatedAt,
				RunNumber:  run.RunNumber,
			})
			if run.Conclusion == "failure" {
				ci.Failures++
			}
		}

		totalFailures += ci.Failures
		if ci.Failures > 0 {
			ci.Status = "failing"
		} else if len(ci.Runs) > 0 {
			ci.Status = "passing"
		}

		results = append(results, ci)
	}

	meshCI := "green"
	if totalFailures > 0 {
		meshCI = "red"
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"mesh_ci":         meshCI,
		"total_failures":  totalFailures,
		"repos":           results,
		"checked_at":      time.Now().UTC().Format(time.RFC3339),
	}, s.logger)
}
