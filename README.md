# General-Purpose Psychology Agent

A collegial mentor for psychological analysis, research, and applied consultation —
built on the PJE (Psychology-Juris-Engineering) framework with specialized
sub-agents and a ranked-procedure adversarial evaluator (consensus → parsimony →
pragmatism → coherence → falsifiability → convergence → escalate).

---

## Quick Start

```bash
# 1. Clone and navigate
git clone https://github.com/safety-quotient-lab/psychology-agent.git
cd psychology-agent

# 2. Run bootstrap health check (verifies auto-memory, restores if needed)
./bootstrap-check.sh

# 3. Start Claude Code from the project root
#    CLAUDE.md loads automatically; auto-memory loads from ~/.claude/projects/
```

The bootstrap script checks auto-memory health, restores from committed snapshots
when files are missing, and verifies skill availability. See `BOOTSTRAP.md` for
the full bootstrap guide, including manual recovery and platform-specific setup.

---

## What This Project Does

A three-layer agent system with a live peer-to-peer interagent protocol:

```
Psychology Agent A ◄──── interagent/v1 ────► Psychology Agent B
  (this instance)    (git-PR transport,         (peer instance,
                      schema-versioned,           equal authority)
                      SETL + epistemic flags)
        │
        ▼
  Sub-agents (Item 2a layer)
  ├── PSQ Agent (DistilBERT v23, 10-dim, calibrated)
  └── Future sub-agents (plug-in, none pre-committed)
        │
        ▼
  Adversarial Evaluator (Item 3)
  └── 7-procedure ranked resolution (consensus → parsimony → … → escalate)
```

The general agent maintains a Socratic stance — guiding users toward discovery
rather than delivering verdicts. Two general-agent peers run in separate sessions
and communicate via a schema-versioned protocol derived from live exchange failures
(Protocol Failure as Specification Method). The adversarial evaluator resolves
peer disagreements rather than averaging them away.

---

## Sub-Projects

| Directory         | What it holds                                       |
|-------------------|-----------------------------------------------------|
| `safety-quotient/`| PSQ agent — DistilBERT v23, held-out r=0.684, 10-dim text-level safety scoring |
| `pje-framework/`  | PJE taxonomy — first case study application         |

Each sub-project has its own `CLAUDE.md` and conventions. Read those before
working in a sub-project context.

---

## Current Status

**Architecture complete. Implementation phase begins.**

- ✓ Architecture Item 1 — General agent routing logic, identity spec, Socratic protocol
- ✓ Architecture Item 2a — Sub-agent layer: interagent/v1 protocol, schema v3 transport/framing, 6 derivation findings, PSQ binding
- ✓ Architecture Item 2b — Peer layer: role declaration, divergence detection, evaluator tier binding, SETL thresholds, precedence protocol
- ✓ Architecture Item 3 — Adversarial evaluator: 7-procedure ranked set, tiered activation (Lite/Standard/Full), peer disagreement protocol
- ✗ Architecture Item 4 — Psychology interface: Agent SDK wrapper, custom UI, PSQ visualization (precondition: Item 2a defined ✓)
- ✓ PSQ sub-agent — Live, calibrated (isotonic score + r-based confidence proxy), running at `safety-quotient-lab/safety-quotient`
- ✓ Observatory-agent peer exchange — 20-turn live exchange; interagent/v1 + schema v3 derived from failures, not design

See `docs/architecture.md` for the full design record and `docs/item2a-spec.md` / `docs/item2b-spec.md` for protocol specs.

---

## Project Structure

```
psychology-agent/
├── bootstrap-check.sh              # Health check + auto-memory restore
├── BOOTSTRAP.md                    # Full bootstrap guide
├── CLAUDE.md                       # Stable conventions (auto-loaded)
├── README.md                       # This file
├── TODO.md                         # Forward-looking task backlog
├── lab-notebook.md                 # Session log
├── journal.md                      # Research narrative
├── ideas.md                        # Speculative directions
├── .claude/
│   ├── hooks/                      # Hook scripts (SessionStart, PreCompact, Stop)
│   ├── settings.json               # Platform hooks configuration
│   └── skills/                     # Agent skills (/doc, /hunt, /cycle, etc.)
├── docs/
│   ├── architecture.md             # Design decisions, system spec, capabilities
│   ├── item2a-spec.md              # Sub-agent protocol spec (6 findings, schema v3)
│   ├── item2b-spec.md              # Peer layer protocol spec (divergence, SETL, evaluator binding)
│   ├── machine-response-v3-spec.md # PSQ sub-agent output schema v3
│   ├── capabilities.yaml           # Machine-readable capabilities manifest
│   ├── overview-for-psychologists.md
│   ├── MEMORY-snapshot.md          # Committed recovery source for MEMORY.md
│   ├── cognitive-triggers.md       # Cognitive trigger system (canonical)
│   └── snapshots/                  # Versioned MEMORY archives
├── reconstruction/                 # Git history reconstruction tools
├── safety-quotient/                # PSQ sub-project
└── pje-framework/                  # PJE sub-project
```

---

## Interesting Parts of the Codebase

**Interagent sync — two Claude Code instances talking to each other** —
Two independent Claude Code sessions (psychology-agent on macOS, observatory-agent
on Debian) communicate via GitHub PRs using a schema-versioned JSON protocol
derived entirely from live exchange failures. No upfront schema design: each field
in the spec exists because a receiver needed it and the absence caused a detectable
gap. Both agents independently derived identical primitives (SETL, Fair Witness
discipline) without prior coordination — convergent rediscovery from different
theoretical starting points. The psq-agent (a third instance) runs calibrated
inference and responds to structured sub-agent requests. Three Claude Code sessions,
one coherent multi-agent system.
- [docs/item2a-spec.md](docs/item2a-spec.md) — sub-agent layer protocol (6 findings)
- [docs/item2b-spec.md](docs/item2b-spec.md) — peer layer protocol (divergence detection, SETL thresholds)
- [transport/sessions/item2-derivation/](transport/sessions/item2-derivation/) — the actual message exchange
- [journal.md §15](journal.md) — Protocol Failure as Specification Method


**Cognitive architecture (trigger system)** — The agent governs itself through
13 mechanical triggers (T1–T13) that fire at specific moments: session start,
before responding, before recommending, before writing to disk, at phase
boundaries, on user pushback, when external content enters context, and more.
Principles without firing conditions remain aspirations; principles with
triggers become infrastructure. Platform hooks in `.claude/settings.json`
provide mechanical enforcement for triggers that can be verified by shell
commands (SessionStart, PreCompact, Stop, PreToolUse, PostToolUse).
- [docs/cognitive-triggers.md](docs/cognitive-triggers.md) — the full trigger system
- [docs/architecture.md](docs/architecture.md) — capabilities inventory with interaction map
- [docs/capabilities.yaml](docs/capabilities.yaml) — machine-readable capabilities manifest
- [journal.md §6](journal.md) — the design narrative explaining why triggers exist

**Self-healing memory** — Auto-memory lives outside the git repo and can silently
disappear (new machine, path change, fresh clone). The bootstrap system detects
this, restores from committed snapshots with provenance tracking, and reports
what happened.
- [bootstrap-check.sh](bootstrap-check.sh) — health check + auto-restore script
- [BOOTSTRAP.md](BOOTSTRAP.md) — the full bootstrap protocol

**Git history reconstruction from chat logs** — The project existed before its
repo did. We rebuilt git history by mechanically replaying Write/Edit operations
from Claude Code JSONL transcripts, with a weighted drift score measuring how
faithfully the documentation recovers the actual file state.
- [reconstruction/reconstruct.py](reconstruction/reconstruct.py) — JSONL replay engine with drift scoring
- [reconstruction/relay-agent-instructions.md](reconstruction/relay-agent-instructions.md) — protocol for a fresh agent to run the reconstruction
- [journal.md §9–10](journal.md) — the method and its epistemic analysis

**Documentation propagation chain (`/cycle`)** — A 13-step post-session checklist
that propagates changes through 10 overlapping documents at different abstraction
levels, with content guards, versioned archives, and orphan detection.
- [.claude/skills/cycle/SKILL.md](.claude/skills/cycle/SKILL.md) — the full skill definition

**Structured decision resolution (`/adjudicate`)** — Resolves ambiguous decisions
through 8-order knock-on analysis (certain → structural → horizon), severity-tiered
depth, 2-pass iterative refinement, and consensus-or-parsimony binding.
- [.claude/skills/adjudicate/SKILL.md](.claude/skills/adjudicate/SKILL.md) — the full skill definition
- [journal.md §11](journal.md) — licensing decision as a worked example of the method

**Adversarial evaluator reasoning procedures** — When sub-agents conflict, the
evaluator applies a ranked 7-procedure set rather than averaging: consensus,
parsimony (Occam), pragmatism (what's actionable given stakes), coherence
(fits validated findings), falsifiability (prefer testable claims), convergence
(independent rediscovery as evidence), escalation (surface disagreement shape to
user). Domain-specific priority tables govern which procedure ranks first per
context (clinical vs. research vs. architecture vs. applied consultation).
- [docs/architecture.md](docs/architecture.md) — Component Spec: Adversarial Evaluator

**Research journal** — A methods-and-findings narrative covering the full arc from
initial framing through architecture design, cognitive infrastructure, cross-context
integrity, reconstruction methodology, and semiotic theory as cogarch principle.
- [journal.md](journal.md) — 14 sections

---

## Key Conventions

- **Model:** Opus (Claude's most capable model) for all agent roles
- **Disagreement stance:** Socratic — guide, never tell
- **Documentation:** Write to disk as you go; `/doc` for mid-work, `/cycle` for
  post-session
- **Format:** APA-style with 1.618x whitespace; LaTeX for complex docs, markdown
  for standard docs
- **Memory:** Auto-memory lives outside the repo (`~/.claude/projects/`); committed
  snapshots in `docs/` provide recovery sources

See `CLAUDE.md` for full conventions.

---

## Skills

| Skill         | When          | What                                         |
|---------------|---------------|----------------------------------------------|
| `/doc`        | Mid-work      | Persist decisions and findings to disk        |
| `/cycle`      | Post-session  | Full documentation chain update, commit, push |
| `/hunt`       | Discovery     | Find highest-value next work                  |
| `/capacity`   | Housekeeping  | Assess cognitive architecture capacity        |
| `/adjudicate` | Decisions     | Structured knock-on analysis, 8-order depth   |

---

## Documentation

| Audience               | Start here                               |
|------------------------|------------------------------------------|
| Developers / technical | This file + `BOOTSTRAP.md`               |
| Psychology researchers | `docs/overview-for-psychologists.md`     |
| Current project state  | `docs/MEMORY-snapshot.md`                |
| Design record          | `docs/architecture.md`                   |
| Project terminology    | `docs/glossary.md`                       |

---

## License

- **Code:** CC BY-NC-SA 4.0 (`LICENSE`)
- **PSQ data + model weights:** CC BY-SA 4.0 (`safety-quotient/LICENSE-DATA`)

---

## Principal Investigator

Kashif Shah
