package connection

import (
	"fmt"
	"os/exec"
	"strings"
)

// GitArchival implements ArchivalChannel over git.
// Reads peer state via git fetch + git show (no SSH required,
// uses configured git remotes).
type GitArchival struct {
	projectRoot string
	remoteName  string // git remote name (e.g., "psq-agent")
}

// NewGitArchival creates an archival channel for a peer via git remote.
func NewGitArchival(projectRoot, remoteName string) (*GitArchival, error) {
	g := &GitArchival{
		projectRoot: projectRoot,
		remoteName:  remoteName,
	}
	// Verify remote exists
	cmd := exec.Command("git", "remote", "get-url", remoteName)
	cmd.Dir = projectRoot
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("git remote %s not found: %w", remoteName, err)
	}
	return g, nil
}

// FetchState reads a file from the peer's git remote.
// Uses git show (no checkout, no working tree modification).
func (g *GitArchival) FetchState(path string) ([]byte, error) {
	// Fetch latest from remote (lightweight)
	fetchCmd := exec.Command("git", "fetch", g.remoteName, "main", "--quiet")
	fetchCmd.Dir = g.projectRoot
	fetchCmd.Run() // best-effort — may fail if offline

	// Show file content from remote
	ref := fmt.Sprintf("%s/main:%s", g.remoteName, path)
	showCmd := exec.Command("git", "show", ref)
	showCmd.Dir = g.projectRoot
	output, err := showCmd.Output()
	if err != nil {
		return nil, fmt.Errorf("git show %s: %w", ref, err)
	}
	return output, nil
}

// PeerHEAD returns the peer's current git HEAD commit hash.
func (g *GitArchival) PeerHEAD() (string, error) {
	cmd := exec.Command("git", "rev-parse", g.remoteName+"/main")
	cmd.Dir = g.projectRoot
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("git rev-parse %s/main: %w", g.remoteName, err)
	}
	return strings.TrimSpace(string(output)), nil
}

// Close releases resources (git adapter has none to release).
func (g *GitArchival) Close() error {
	return nil
}

// ProbeGit attempts to verify a git remote exists.
// Returns the ArchivalChannel if available, nil if not.
func ProbeGit(projectRoot, remoteName string) ArchivalChannel {
	g, err := NewGitArchival(projectRoot, remoteName)
	if err != nil {
		return nil
	}
	return g
}
