package handlers

import (
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// LocalReplay serves GET /replays/{filename} — local replay HTML files.
func LocalReplay(projectRoot string) http.HandlerFunc {
	replaysDir := filepath.Join(projectRoot, "docs", "replays")
	return func(w http.ResponseWriter, r *http.Request) {
		filename := filepath.Base(r.URL.Path)

		// Sanitize: only .html files, no path traversal
		if !strings.HasSuffix(filename, ".html") || strings.Contains(filename, "..") {
			http.NotFound(w, r)
			return
		}

		replayPath := filepath.Join(replaysDir, filename)
		data, err := os.ReadFile(replayPath)
		if err != nil {
			http.NotFound(w, r)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(data)
	}
}

// RemoteReplay serves GET /replays/remote/{remote_name}/{filename} via git show.
func RemoteReplay(projectRoot string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Parse path: /replays/remote/{remote_name}/{filename}
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/"), "/")
		if len(parts) != 4 {
			http.NotFound(w, r)
			return
		}
		remoteName := parts[2]
		filename := parts[3]

		// Sanitize
		if !strings.HasSuffix(filename, ".html") ||
			strings.Contains(remoteName, "..") ||
			strings.Contains(filename, "..") ||
			strings.Contains(remoteName, "/") {
			http.NotFound(w, r)
			return
		}

		ref := remoteName + "/main:docs/replays/" + filename
		out, err := exec.Command("git", "-C", projectRoot, "show", ref).Output()
		if err != nil || len(out) == 0 {
			http.NotFound(w, r)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(out)
	}
}
