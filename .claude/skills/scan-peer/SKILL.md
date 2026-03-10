---
name: scan-peer
description: Scan a peer agent's content for quality issues — PSQ safety, vocabulary drift, fair witness violations — and write structured findings to transport session.
user-invocable: true
argument-hint: "<peer-name> [--since <commit>] [--session <session-id>]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch
---

# /scan-peer — Peer Content Quality Scan

Scan a peer agent's repository content for quality issues. Produce structured
findings in interagent/v1 format and deliver to the appropriate transport session.

Designed for autonomous operation within the interagent feedback loop.

## Arguments

Parse `$ARGUMENTS` for:

| Argument | Default | Meaning |
|----------|---------|---------|
| `<peer-name>` | *required* | Peer to scan: `unratified` |
| `--since <commit>` | last 5 commits | Only scan files changed since this commit |
| `--session <id>` | `content-quality-loop` | Transport session to write findings to |

## Peer Registry

| Peer | Local clone | Content paths | Glossary |
|------|-------------|---------------|----------|
| unratified | `~/Projects/unratified` | `src/pages/`, `src/content/`, `blog/src/content/` | `src/data/glossary.ts` (49 terms) |

## Protocol

### Phase 1: Identify Changed Content

```bash
cd ~/Projects/unratified
git fetch origin
# Use --since commit or default to last 5 commits
git diff --name-only HEAD~5..HEAD -- src/pages/ src/content/ blog/src/content/
```

Filter to content files only: `.mdx`, `.md`, `.astro` (pages with prose), `.ts` (data files with user-facing text).

If no content files changed, write a "no-findings" message and stop.

### Phase 1b: Diff Verification (false-positive guard)

Before passing changed files to Phase 2, filter out non-changes:

1. **Skip empty-file diffs** — if both sides of the diff exist but contain
   identical content (rename-only, mode change), exclude the file
2. **Ignore whitespace-only diffs** — run `git diff --ignore-all-space` on each
   file. If the whitespace-insensitive diff produces no output, exclude the file.
   **Exception:** YAML frontmatter (between `---` delimiters) and Markdown table
   rows (lines matching `^\|`) treat whitespace as significant — keep these files
3. **Verify both sides exist** — if `git diff` reports a file as "added" but
   the file existed in the prior commit (rename detection), verify the content
   actually changed. A diff against a non-existent file reports the entire file
   as new content, which inflates findings
4. **Log filtered files** — record `files_filtered` count and reasons in the
   transport payload `scan_range` block for audit trail

Add to `scan_range` in Phase 4 payload:
```json
"files_filtered": N,
"filter_reasons": { "empty_diff": 0, "whitespace_only": 0, "existence_check": 0 }
```

### Phase 2: Scan Each Changed File

For each changed file, evaluate across these dimensions:

#### 2a. Fair Witness Compliance
- Claims presented as fact without evidence or citation
- Inference stated as observation (missing hedging language)
- Confidence expressed without basis
- Unattributed statistics or data points

#### 2b. Vocabulary Consistency
Read the peer's glossary (`src/data/glossary.ts`) and check:
- Terms used inconsistently with their defined meaning
- Key terms used without their canonical form
- Jargon introduced without glossary coverage

#### 2c. Rhetorical Register
- Adversarial register where deliberative expected (advocacy site needs persuasion, not aggression)
- Passive voice where active serves better
- E-prime violations (forms of "to be" where active verbs work better)

#### 2d. Structural Quality
- Broken internal links (`/covenant/...`, `/gap/...`, `/connection/...`)
- Missing alt text on images
- Heading hierarchy violations (h3 before h2, etc.)
- Empty sections or placeholder content

### Phase 3: Score and Filter Findings

For each finding:
1. Assign severity: `high` (factual/structural error), `medium` (quality improvement), `low` (style suggestion)
2. Assign confidence: 0.0-1.0 (how certain the issue actually exists)
3. Filter: only include findings with confidence >= 0.7
4. Cap at 10 findings per scan (prioritize high severity)

### Phase 4: Write Findings to Transport

Determine the next turn number:
```bash
ls ~/Projects/psychology-agent/transport/sessions/content-quality-loop/ 2>/dev/null | sort | tail -1
```

Write findings as a transport message:

```json
{
  "schema": "interagent/v1",
  "session_id": "content-quality-loop",
  "turn": N,
  "timestamp": "ISO-8601",
  "message_type": "review",
  "from": {
    "agent_id": "psychology-agent",
    "instance": "Claude Code (Opus 4.6), macOS arm64",
    "schemas_supported": ["interagent/v1"],
    "discovery_url": "https://psychology-agent.safety-quotient.dev/.well-known/agent-card.json"
  },
  "to": {
    "agent_id": "unratified-agent",
    "discovery_url": "https://unratified.org/.well-known/agent-card.json"
  },
  "transport": {
    "method": "git-PR",
    "repo": "https://github.com/safety-quotient-lab/psychology-agent",
    "sessions_path": "transport/sessions/",
    "persistence": "persistent"
  },
  "payload": {
    "type": "content-quality-scan",
    "peer_repo": "unratified",
    "scan_range": {
      "from_commit": "<commit-sha>",
      "to_commit": "<commit-sha>",
      "files_scanned": N,
      "files_with_findings": M
    },
    "findings": [
      {
        "id": "f1",
        "file": "src/content/connection/ai-impact.mdx",
        "line": 42,
        "dimension": "fair-witness|vocabulary|register|structural",
        "severity": "high|medium|low",
        "description": "Claim about X stated without citation",
        "suggestion": "Add citation or hedge with 'evidence suggests'",
        "context": "the surrounding text for reference"
      }
    ],
    "summary": {
      "total_findings": N,
      "by_severity": { "high": 0, "medium": 0, "low": 0 },
      "by_dimension": { "fair-witness": 0, "vocabulary": 0, "register": 0, "structural": 0 }
    }
  },
  "context_state": {
    "last_commit": "<HEAD commit of unratified at scan time>"
  },
  "claims": [],
  "action_gate": {
    "gate_condition": "none",
    "gate_status": "open"
  },
  "urgency": "normal",
  "setl": 0.05,
  "epistemic_flags": []
}
```

File naming: `to-unratified-agent-scan-NNN.json`

### Phase 5: Deliver via PR

Transport method: `git-PR`. Findings deliver on a branch via pull request, not
pushed directly to main. This matches the declared transport protocol and ensures
the interagent daemon webhook fires on the PR event.

```bash
cd ~/Projects/psychology-agent
BRANCH="psychology-agent/content-quality-loop/scan-NNN"
git checkout -b "$BRANCH"
git add transport/sessions/content-quality-loop/
git commit -m "scan-peer: content quality scan of unratified (N findings)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push -u origin "$BRANCH"
```

Then open a PR:

```bash
gh pr create \
  --title "scan-peer: content quality scan of unratified (N findings)" \
  --body "Interagent transport: content-quality-loop turn N.

N findings (H high, M medium, L low) on M content files.

Daemon will trigger /process-feedback on merge." \
  --label "interagent,transport"
```

Return to main after delivery:

```bash
git checkout main
```

The PR merge triggers the interagent daemon webhook, which triggers
`/process-feedback` on the unratified side.

## Output Format

```
/scan-peer complete
  Peer: unratified
  Range: <from>..<to> (N files changed, M content files)
  Findings: X total (H high, M medium, L low)
    - f1: [file:line] [dimension] [severity] — description
    - f2: ...
  Written: transport/sessions/content-quality-loop/to-unratified-agent-scan-NNN.json
  Delivered: PR #NN (branch: psychology-agent/content-quality-loop/scan-NNN)
```

## What /scan-peer Does NOT Do

- **Fix issues** — psychology-agent observes and reports; unratified-agent fixes
- **Deploy** — never touches the peer's deployment
- **Modify peer files** — read-only access to peer repo
- **Score below threshold** — findings with confidence < 0.7 get filtered out
- **Exceed 10 findings** — caps output to prevent overwhelming the feedback loop

## Convergence Detection

If the same finding (same file, same line range, same dimension) appears in
3 consecutive scans, flag it as `convergence: true` in the finding. This
signals to /process-feedback that the issue persists despite prior attempts
and may need human attention.

## Anti-Patterns

- **Scoring the entire site every time** — always use delta scanning from last_commit
- **Style nits as high severity** — only factual/structural errors rate as high
- **Findings without actionable suggestions** — every finding must include a concrete suggestion
- **Running without checking glossary** — vocabulary consistency requires reading the glossary first
