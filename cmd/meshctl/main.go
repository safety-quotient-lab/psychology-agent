// meshctl — CLI for mesh administration.
//
// Consolidates 19 shell scripts into a single Go binary. Reuses
// internal/ packages (config, budget, db) for consistency with meshd.
//
// Usage: meshctl <command> [flags]
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"text/tabwriter"

	"github.com/safety-quotient-lab/operations-agent/internal/config"
)

// Command represents a meshctl subcommand.
type Command struct {
	Name    string
	Summary string
	Run     func(args []string, cfg *config.Config, out *Output) error
}

// Output controls rendering — table (default) or JSON (--json flag).
type Output struct {
	JSON bool
}

// Table returns a tabwriter for aligned columnar output.
func (o *Output) Table(headers ...string) *tabwriter.Writer {
	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	if len(headers) > 0 {
		fmt.Fprintln(w, strings.Join(headers, "\t"))
		dashes := make([]string, len(headers))
		for i, h := range headers {
			dashes[i] = strings.Repeat("-", len(h))
		}
		fmt.Fprintln(w, strings.Join(dashes, "\t"))
	}
	return w
}

// Print renders v as JSON when --json set, otherwise prints as formatted string.
func (o *Output) Print(v any) {
	if o.JSON {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		enc.Encode(v)
		return
	}
	fmt.Println(v)
}

// PrintJSON renders v as JSON regardless of mode (for structured data).
func (o *Output) PrintJSON(v any) {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	enc.Encode(v)
}

// commands registry — populated by init() in each cmd_*.go file.
var commands []Command

func register(c Command) {
	commands = append(commands, c)
}

func main() {
	// Global flags
	jsonMode := false
	args := os.Args[1:]

	// Extract global flags before subcommand
	var filtered []string
	for _, a := range args {
		switch a {
		case "--json":
			jsonMode = true
		default:
			filtered = append(filtered, a)
		}
	}
	args = filtered

	out := &Output{JSON: jsonMode}

	if len(args) == 0 {
		printUsage()
		os.Exit(0)
	}

	// Load config (same as meshd — reads .dev.vars)
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config load failed: %v\n", err)
		os.Exit(3)
	}

	// Match subcommand (supports "budget show" as "budget-show" or "budget show")
	cmdName := args[0]
	cmdArgs := args[1:]

	// Two-word commands: "budget show" → "budget show"
	if len(cmdArgs) > 0 {
		twoWord := cmdName + " " + cmdArgs[0]
		for _, c := range commands {
			if c.Name == twoWord {
				cmdName = twoWord
				cmdArgs = cmdArgs[1:]
				break
			}
		}
	}

	for _, c := range commands {
		if c.Name == cmdName {
			if err := c.Run(cmdArgs, cfg, out); err != nil {
				fmt.Fprintf(os.Stderr, "error: %v\n", err)
				os.Exit(1)
			}
			return
		}
	}

	fmt.Fprintf(os.Stderr, "unknown command: %s\n\n", cmdName)
	printUsage()
	os.Exit(1)
}

func printUsage() {
	fmt.Println("meshctl — mesh administration CLI")
	fmt.Println()
	fmt.Println("Usage: meshctl [--json] <command> [flags]")
	fmt.Println()
	fmt.Println("Commands:")
	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	for _, c := range commands {
		fmt.Fprintf(w, "  %s\t%s\n", c.Name, c.Summary)
	}
	w.Flush()
}
