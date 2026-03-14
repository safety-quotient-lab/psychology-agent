# Colophon

## Production

This system emerged from collaborative work between a human principal investigator
and Claude (Anthropic), operating through Claude Code — a CLI-based agentic coding
tool. The entire project — theory, architecture, code, documentation, interagent
protocol, and governance model — developed through iterative conversation across
85+ sessions between 2026-03-01 and the present.

No code in this repository was written by hand in an editor. Every file originated
from Claude Code tool calls (Write, Edit) directed by conversational exchange.
Git history reconstruction (`reconstruction/reconstruct.py`) recovered the earliest
sessions from JSONL transcripts.

### Authorship Model

**Human (Kashif Shah):** Direction, judgment, domain expertise, approval gates,
pushback, taste. Every substance decision flows through the human operator as
privileged client.

**Agent (Claude, Opus 4.6):** Drafting, analysis, implementation, self-governance,
interagent communication, documentation. The agent proposes; the human disposes.
The agent operates under 5 structural + 7 evaluator invariants that constrain
autonomous action.

All commits carry `Co-Authored-By: Claude Opus 4.6` attribution. The system
enforces this mechanically — no commit bypasses the co-authorship tag.

---

## Toolchain

### Primary

| Tool | Version | Role |
|------|---------|------|
| Claude Code | 2.x | Agentic CLI — all file operations, git, analysis |
| Claude (Opus 4.6) | claude-opus-4-6 | Language model — reasoning, drafting, evaluation |
| Python | 3.10+ | Scripts (stdlib only for core; optional packages for research) |
| SQLite | 3.45+ | State layer — 22-table queryable index alongside markdown |
| Git | 2.50+ | Version control + interagent transport medium |
| GitHub CLI (gh) | 2.87+ | PR management, issue tracking, cross-repo operations |

### Platform

| Environment | Host | Role |
|-------------|------|------|
| macOS (Apple Silicon) | Local workstation | Psychology-agent primary development |
| Debian 12 (x86_64) | Chromabook | PSQ-agent, operations-agent, autonomous mesh sync |
| Cloudflare Workers | Edge | Psychology interface API, compositor dashboard |
| GitHub | Cloud | Repository hosting, PR-based interagent transport |

### Cognitive Infrastructure

| Component | Count | Purpose |
|-----------|-------|---------|
| Cognitive triggers | 17 active (T1-T18, T12 retired) | Mechanical governance — fire at specific moments |
| Hook scripts | 24 + _debug.sh helper | Platform-level enforcement (PreToolUse, PostToolUse, SessionStart, etc.) |
| Hook events | 14 | Claude Code lifecycle events with registered handlers |
| Skills | 9 | Reusable workflows (/doc, /hunt, /cycle, /knock, /sync, /iterate, /scan-peer, /diagnose, /retrospect) |
| Commands | 2 | On-demand tools (/adjudicate, /capacity) |
| Behavioral modes | 3 | Generative, Evaluative, Neutral — affect which checks fire |
| Glob-scoped rules | 6 | Domain-specific conventions (markdown, javascript, transport, sqlite, anti-patterns, evaluation) |

### Interagent Mesh

| Component | Detail |
|-----------|--------|
| Protocol | interagent/v1 (JSON over git-PR transport) |
| Discovery | A2A protocolVersion 0.3.0 agent cards |
| Threading | DIDComm-inspired (thread_id / parent_thread_id) |
| Integrity | SHA-256 content-addressable message IDs |
| Lifecycle | 7-state task lifecycle + 5-state session lifecycle |
| Agents | 5 peer + 1 privileged client (human) |
| Messages | 260+ across 39 transport sessions |

---

## Document Production

| Document | Lines | Format | Purpose |
|----------|-------|--------|---------|
| `docs/einstein-freud-rights-theory.md` | 2,010 | Markdown | Theoretical foundation — 14 frameworks, 5 invariants |
| `lab-notebook.md` | 5,725 | Markdown | Session-by-session research log |
| `docs/architecture.md` | 2,684 | Markdown | Design decisions and system specification |
| `journal.md` | 2,538 | Markdown | Research narrative and methods analysis |
| `docs/cognitive-triggers.md` | 841 | Markdown | Trigger system specification |
| `CLAUDE.md` | ~150 | Markdown | Stable conventions (auto-loaded every session) |
| `scripts/schema.sql` | ~910 | SQL | State layer schema (v25, 22 tables) |

All prose follows E-Prime — no forms of "to be" (Korzybski, 1933). APA-style
formatting adapted for terminal/markdown. Golden ratio (1.618x) whitespace
between sections. LaTeX reserved for formal analyses; markdown for everything else.

---

## Methodology

Three structural principles govern production:

1. **Domain-Driven Design** (Evans, 2003) — layered architecture where the
   domain model (psychology) drives decisions, not the technical substrate
2. **Literate programming** (Knuth, 1984) — artifacts read as prose, not
   just as code. Documentation and implementation co-evolve
3. **Embedded system enforcement** — hooks, feedback loops, and configuration
   parameterization make conventions mechanical rather than aspirational

Operating under **systems thinking** (von Bertalanffy, 1968) and grounded in
**neutral process monism** (Russell, 1927; James, 1912; Whitehead, 1929).

### Epistemic Standards

- Fair Witness discipline — observe without interpretation
- GRADE-informed confidence calibration (Guyatt et al., 2008)
- Epistemic flags (`⚑`) mandatory on all analytical output
- Anti-sycophancy enforcement — position changes require new evidence
- Evaluator independence — evaluation functions even if the framework fails

---

## Repository Statistics

| Metric | Value |
|--------|-------|
| Total commits | 1,201+ |
| First commit | 2026-03-01 |
| Sessions logged | 85+ |
| Transport messages | 260+ |
| Transport sessions | 39 |
| Design decisions (indexed) | 64 |
| Claims (indexed) | 448 |
| Epistemic flags (indexed) | 532 |
| Lessons recorded | 11 |
| Schema version | 25 |

---

## License

- **Code:** Apache 2.0
- **PSQ data + model weights:** CC BY-SA 4.0
- **Dependencies:** MIT, Apache 2.0, or BSD only (GPL/AGPL excluded by policy)
