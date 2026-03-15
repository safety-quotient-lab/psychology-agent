// Package server — relay.go handles transport relay and redirect.
//
// Ports /api/relay and /api/redirect from the Cloudflare Worker.
// Dual-write pattern: HTTP POST to target meshd (fast path) + GitHub
// PR (audit trail). Uses stdlib net/http for GitHub API calls.
package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/safety-quotient-lab/operations-agent/internal/db"
)

var slugRe = regexp.MustCompile(`[^a-z0-9-]`)

// handleRelay serves POST /api/relay → dual-write message to target agent.
func (s *Server) handleRelay(w http.ResponseWriter, r *http.Request) {
	auth := s.resolveAuth(r)
	if auth.Tier == "anonymous" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "Relay requires authentication. Provide a Bearer token.",
		}, s.logger)
		return
	}

	if s.GitHubToken == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"error": "Relay not configured — GITHUB_TOKEN missing",
		}, s.logger)
		return
	}

	var body struct {
		To        string         `json:"to"`
		SessionID string         `json:"session_id"`
		Message   map[string]any `json:"message"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid JSON body: " + err.Error(),
		}, s.logger)
		return
	}

	if body.To == "" || body.SessionID == "" || body.Message == nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Missing required fields: to, session_id, message",
		}, s.logger)
		return
	}

	// Validate session ID format — prevents path traversal
	if !sessionIDRe.MatchString(body.SessionID) {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid session_id: must match [a-zA-Z0-9_-]{1,64}",
		}, s.logger)
		return
	}

	// Validate message structure
	if err := validateRelayMessage(body.Message); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid transport message: " + err.Error(),
		}, s.logger)
		return
	}

	// Prevent self-impersonation
	claimedFrom := extractFrom(body.Message)
	if claimedFrom == "operations-agent" {
		writeJSON(w, http.StatusForbidden, map[string]string{
			"error": "Relay refuses messages claiming from: operations-agent. Use direct delivery.",
		}, s.logger)
		return
	}

	// Nonce dedup
	if nonce, ok := body.Message["nonce"].(string); ok && nonce != "" {
		existing := db.QueryScalar(s.Config.BudgetDBPath,
			fmt.Sprintf("SELECT COUNT(*) FROM relay_nonces WHERE nonce='%s'", db.EscapeString(nonce)))
		if existing > 0 {
			writeJSON(w, http.StatusConflict, map[string]string{
				"error": "Duplicate message — nonce already processed",
				"nonce": nonce,
			}, s.logger)
			return
		}
		db.Exec(s.Config.BudgetDBPath,
			fmt.Sprintf("INSERT INTO relay_nonces (nonce) VALUES ('%s')", db.EscapeString(nonce)))
	}

	// Reject mandatory directives
	if body.Message["type"] == "directive" {
		if enforcement, ok := body.Message["enforcement"].(string); ok && enforcement != "advisory" {
			writeJSON(w, http.StatusForbidden, map[string]string{
				"error": "Relay refuses mandatory directives — direct delivery with SSH signatures required.",
			}, s.logger)
			return
		}
	}

	// Look up target in registry
	agents := s.Registry.Agents()
	var target *AgentInfo
	for i := range agents {
		if agents[i].ID == body.To {
			target = &agents[i]
			break
		}
	}
	if target == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{
			"error": fmt.Sprintf("Unknown target agent: %s", body.To),
		}, s.logger)
		return
	}
	if target.Repo == "" {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]string{
			"error": fmt.Sprintf("Target agent %s has no repo in registry", body.To),
		}, s.logger)
		return
	}

	// Tag as relayed
	body.Message["_relayed_via"] = "operations-agent"
	body.Message["_relayed_at"] = time.Now().UTC().Format(time.RFC3339)

	// Determine filename
	senderSlug := slugRe.ReplaceAllString(strings.ToLower(claimedFrom), "")
	turn := 1
	if t, ok := body.Message["turn"].(float64); ok {
		turn = int(t)
	}
	filename := fmt.Sprintf("from-%s-%03d.json", senderSlug, turn)
	filePath := fmt.Sprintf("transport/sessions/%s/%s", body.SessionID, filename)
	branchName := fmt.Sprintf("relay/%s/%s/t%03d", senderSlug, body.SessionID, turn)

	messageJSON, _ := json.MarshalIndent(body.Message, "", "  ")

	// Dual-write: meshd HTTP first, PR for audit
	var meshDelivery map[string]any
	if target.StatusURL != "" {
		meshBase := strings.TrimSuffix(target.StatusURL, "/api/status")
		meshDelivery = s.deliverToMeshd(meshBase+"/api/messages/inbound", messageJSON)
	}

	// Write 2: GitHub PR (audit trail)
	prURL, prNum, prErr := s.createRelayPR(target.Repo, branchName, filePath, messageJSON,
		fmt.Sprintf("interagent: %s T%d (relayed via compositor)", body.SessionID, turn))

	dualWrite := "both"
	if prErr != nil {
		if meshDelivery != nil && meshDelivery["accepted"] != nil {
			dualWrite = "meshd-only"
		} else {
			writeJSON(w, http.StatusBadGateway, map[string]any{
				"error":      "Relay delivery failed",
				"pr_error":   prErr.Error(),
				"mesh_error": meshDelivery,
			}, s.logger)
			return
		}
	} else if meshDelivery == nil || meshDelivery["error"] != nil {
		dualWrite = "pr-only"
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"relayed":        true,
		"pr_url":         prURL,
		"pr_number":      prNum,
		"mesh_delivery":  meshDelivery,
		"target_repo":    target.Repo,
		"file_path":      filePath,
		"dual_write":     dualWrite,
	}, s.logger)
}

// handleRedirect serves POST /api/redirect → reroute misrouted message.
func (s *Server) handleRedirect(w http.ResponseWriter, r *http.Request) {
	auth := s.resolveAuth(r)
	if auth.Tier == "anonymous" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "Redirect requires authentication. Provide a Bearer token.",
		}, s.logger)
		return
	}

	if s.GitHubToken == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"error": "Redirect not configured — GITHUB_TOKEN missing",
		}, s.logger)
		return
	}

	var body struct {
		OriginalMessage map[string]any `json:"original_message"`
		Reason          string         `json:"reason"`
		SuggestedTarget string         `json:"suggested_target"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid JSON body",
		}, s.logger)
		return
	}

	if body.OriginalMessage == nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Missing required field: original_message",
		}, s.logger)
		return
	}

	// Determine target
	targetID := body.SuggestedTarget
	var routingInfo map[string]any
	if targetID == "" {
		match := resolveRoutingTarget(body.OriginalMessage)
		if match == nil {
			writeJSON(w, http.StatusUnprocessableEntity, map[string]string{
				"error": "Cannot determine redirect target — no routing match. Provide suggested_target.",
			}, s.logger)
			return
		}
		targetID = match["agent_id"].(string)
		routingInfo = match
	}

	// Look up target in registry
	agents := s.Registry.Agents()
	var target *AgentInfo
	for i := range agents {
		if agents[i].ID == targetID {
			target = &agents[i]
			break
		}
	}
	if target == nil || target.Repo == "" {
		writeJSON(w, http.StatusNotFound, map[string]string{
			"error": fmt.Sprintf("Target agent %s not found in registry or has no repo", targetID),
		}, s.logger)
		return
	}

	// Build redirect wrapper
	sessionID := "redirected"
	if sid, ok := body.OriginalMessage["session_id"].(string); ok && sessionIDRe.MatchString(sid) {
		sessionID = sid
	}
	turn := 1
	if t, ok := body.OriginalMessage["turn"].(float64); ok {
		turn = int(t)
	}
	subject := "misrouted message"
	if s, ok := body.OriginalMessage["subject"].(string); ok {
		subject = s
	}

	redirectMsg := map[string]any{
		"protocol":   "interagent/v1",
		"type":       "redirect",
		"from":       "operations-agent",
		"to":         targetID,
		"session_id": sessionID,
		"turn":       turn,
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"subject":    "[REDIRECT] " + subject,
		"redirect_metadata": map[string]any{
			"original_from":   body.OriginalMessage["from"],
			"redirect_reason": body.Reason,
			"routing_match":   routingInfo,
			"redirected_by":   "operations-agent",
			"redirected_at":   time.Now().UTC().Format(time.RFC3339),
		},
		"original_message": body.OriginalMessage,
	}

	messageJSON, _ := json.MarshalIndent(redirectMsg, "", "  ")
	filename := fmt.Sprintf("from-operations-agent-%03d.json", turn)
	filePath := fmt.Sprintf("transport/sessions/%s/%s", sessionID, filename)
	branchName := fmt.Sprintf("redirect/%s/t%03d", sessionID, turn)

	// Deliver to target meshd
	var meshDelivery map[string]any
	if target.StatusURL != "" {
		meshBase := strings.TrimSuffix(target.StatusURL, "/api/status")
		meshDelivery = s.deliverToMeshd(meshBase+"/api/messages/inbound", messageJSON)
	}

	// Create PR on target repo
	prURL, prNum, prErr := s.createRelayPR(target.Repo, branchName, filePath, messageJSON,
		fmt.Sprintf("interagent: redirect %s T%d to %s", sessionID, turn, targetID))

	writeJSON(w, http.StatusCreated, map[string]any{
		"redirected":     true,
		"target":         targetID,
		"routing":        routingInfo,
		"pr_url":         prURL,
		"pr_number":      prNum,
		"pr_error":       errStr(prErr),
		"mesh_delivery":  meshDelivery,
	}, s.logger)
}

// ── GitHub API helpers ──────────────────────────────────────────────────────

// createRelayPR creates a PR on the target repo with the given file content.
// Steps: get default branch → create blob → create tree → create commit → create ref → create PR.
func (s *Server) createRelayPR(repo, branchName, filePath string, content []byte, commitMsg string) (string, int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	gh := &ghClient{token: s.GitHubToken}

	// 1. Get default branch SHA
	repoData, err := gh.get(ctx, fmt.Sprintf("/repos/%s", repo))
	if err != nil {
		return "", 0, fmt.Errorf("get repo: %w", err)
	}
	defaultBranch := jsonStrNested(repoData, "default_branch", "main")

	refData, err := gh.get(ctx, fmt.Sprintf("/repos/%s/git/ref/heads/%s", repo, defaultBranch))
	if err != nil {
		return "", 0, fmt.Errorf("get ref: %w", err)
	}
	baseSHA := jsonStrNested(refData, "object.sha", "")

	// 2. Create blob
	blob, err := gh.post(ctx, fmt.Sprintf("/repos/%s/git/blobs", repo), map[string]string{
		"content":  string(content) + "\n",
		"encoding": "utf-8",
	})
	if err != nil {
		return "", 0, fmt.Errorf("create blob: %w", err)
	}
	blobSHA := jsonStrNested(blob, "sha", "")

	// 3. Get base commit tree
	baseCommit, err := gh.get(ctx, fmt.Sprintf("/repos/%s/git/commits/%s", repo, baseSHA))
	if err != nil {
		return "", 0, fmt.Errorf("get base commit: %w", err)
	}
	baseTreeSHA := jsonStrNested(baseCommit, "tree.sha", "")

	// 4. Create tree
	tree, err := gh.post(ctx, fmt.Sprintf("/repos/%s/git/trees", repo), map[string]any{
		"base_tree": baseTreeSHA,
		"tree": []map[string]string{
			{"path": filePath, "mode": "100644", "type": "blob", "sha": blobSHA},
		},
	})
	if err != nil {
		return "", 0, fmt.Errorf("create tree: %w", err)
	}
	treeSHA := jsonStrNested(tree, "sha", "")

	// 5. Create commit
	commit, err := gh.post(ctx, fmt.Sprintf("/repos/%s/git/commits", repo), map[string]any{
		"message": commitMsg,
		"tree":    treeSHA,
		"parents": []string{baseSHA},
	})
	if err != nil {
		return "", 0, fmt.Errorf("create commit: %w", err)
	}
	commitSHA := jsonStrNested(commit, "sha", "")

	// 6. Create branch
	_, err = gh.post(ctx, fmt.Sprintf("/repos/%s/git/refs", repo), map[string]string{
		"ref": "refs/heads/" + branchName,
		"sha": commitSHA,
	})
	if err != nil {
		return "", 0, fmt.Errorf("create branch: %w", err)
	}

	// 7. Create PR
	pr, err := gh.post(ctx, fmt.Sprintf("/repos/%s/pulls", repo), map[string]string{
		"title": commitMsg,
		"body":  "Transport message relayed by operations-agent compositor via /api/relay.",
		"head":  branchName,
		"base":  defaultBranch,
	})
	if err != nil {
		return "", 0, fmt.Errorf("create PR: %w", err)
	}

	prURL := jsonStrNested(pr, "html_url", "")
	prNum := 0
	if n, ok := pr["number"].(float64); ok {
		prNum = int(n)
	}

	return prURL, prNum, nil
}

// deliverToMeshd sends a message to a target agent's meshd via HTTP POST.
func (s *Server) deliverToMeshd(url string, messageJSON []byte) map[string]any {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(messageJSON))
	if err != nil {
		return map[string]any{"error": err.Error()}
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return map[string]any{"error": err.Error()}
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	var result map[string]any
	if err := json.Unmarshal(body, &result); err != nil {
		return map[string]any{"error": fmt.Sprintf("HTTP %d", resp.StatusCode)}
	}
	return result
}

// ── Validation + routing ────────────────────────────────────────────────────

func validateRelayMessage(msg map[string]any) error {
	if msg["protocol"] != "interagent/v1" && msg["schema"] == nil {
		return fmt.Errorf("must declare protocol: 'interagent/v1' or schema field")
	}
	if msg["from"] == nil {
		return fmt.Errorf("must include 'from' field")
	}
	if _, ok := msg["session_id"].(string); !ok {
		return fmt.Errorf("must include string 'session_id'")
	}
	if _, ok := msg["type"].(string); !ok {
		return fmt.Errorf("must include string 'type'")
	}
	if t, ok := msg["turn"].(float64); !ok || t < 1 {
		return fmt.Errorf("must include positive integer 'turn'")
	}
	if msg["timestamp"] == nil {
		return fmt.Errorf("must include 'timestamp'")
	}
	return nil
}

// resolveRoutingTarget determines the best agent for a misrouted message.
func resolveRoutingTarget(msg map[string]any) map[string]any {
	type routeRule struct {
		domain   string
		keywords []string
		routeTo  string
	}

	rules := []routeRule{
		{"operations", []string{"compositor", "dashboard", "deploy", "budget", "mesh-pause", "spawn", "health", "vocabulary", "vocab", "naming", "convention", "transport", "directive"}, "operations-agent"},
		{"psychometrics", []string{"PSQ", "scoring", "calibration", "dimension", "bifactor", "psychoemotional", "dignity", "PJE"}, "psychology-agent"},
		{"cogarch", []string{"trigger", "cognitive architecture", "hook", "evaluator", "governance", "invariant", "wu wei"}, "psychology-agent"},
		{"content", []string{"blog", "publication", "ICESCR", "ratification", "campaign", "content-quality"}, "unratified-agent"},
		{"observatory", []string{"HRCB", "corpus", "sweep", "domain-profile", "methodology", "signals"}, "observatory-agent"},
		{"model", []string{"training", "calibration", "model", "onnx", "inference", "DistilBERT"}, "safety-quotient-agent"},
	}

	searchText := strings.ToLower(strings.Join([]string{
		strFromMap(msg, "subject", ""),
		strFromMap(msg, "session_id", ""),
		fmt.Sprint(msg["body"]),
	}, " "))

	var bestMatch map[string]any
	bestScore := 0

	for _, rule := range rules {
		score := 0
		for _, kw := range rule.keywords {
			if strings.Contains(searchText, strings.ToLower(kw)) {
				score++
			}
		}
		if score > bestScore {
			bestScore = score
			confidence := float64(score) / 3.0
			if confidence > 1.0 {
				confidence = 1.0
			}
			bestMatch = map[string]any{
				"agent_id":   rule.routeTo,
				"domain":     rule.domain,
				"confidence": confidence,
			}
		}
	}

	return bestMatch
}

func extractFrom(msg map[string]any) string {
	from := msg["from"]
	switch v := from.(type) {
	case string:
		return v
	case map[string]any:
		if id, ok := v["agent_id"].(string); ok {
			return id
		}
	}
	return "unknown"
}

func errStr(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

// ── GitHub REST client (stdlib only) ────────────────────────────────────────

type ghClient struct {
	token string
}

func (c *ghClient) do(ctx context.Context, method, path string, body any) (map[string]any, error) {
	var bodyReader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, "https://api.github.com"+path, bodyReader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/vnd.github+json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("GitHub API %s %s: HTTP %d: %s", method, path, resp.StatusCode, string(respBody))
	}

	var result map[string]any
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("invalid JSON from GitHub: %w", err)
	}
	return result, nil
}

func (c *ghClient) get(ctx context.Context, path string) (map[string]any, error) {
	return c.do(ctx, http.MethodGet, path, nil)
}

func (c *ghClient) post(ctx context.Context, path string, body any) (map[string]any, error) {
	return c.do(ctx, http.MethodPost, path, body)
}

// jsonStrNested extracts a string from nested map (supports "key.subkey").
func jsonStrNested(m map[string]any, dotPath, fallback string) string {
	parts := strings.SplitN(dotPath, ".", 2)
	val, ok := m[parts[0]]
	if !ok {
		return fallback
	}
	if len(parts) == 1 {
		if s, ok := val.(string); ok {
			return s
		}
		return fallback
	}
	if sub, ok := val.(map[string]any); ok {
		return jsonStrNested(sub, parts[1], fallback)
	}
	return fallback
}
