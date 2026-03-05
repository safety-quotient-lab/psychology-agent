# General-Purpose Psychology Agent

A collegial mentor for psychological analysis, research, and applied consultation —
built on the PJE (Psychology-Juris-Engineering) framework with specialized
sub-agents and a consensus-or-parsimony adversarial evaluator.

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

A three-layer agent system:

```
General-Purpose Psychology Agent  (collegial mentor, Opus)
  ├── PSQ Agent                   (psychoemotional safety measurement)
  ├── Future sub-agents           (plug-in, none pre-committed)
  └── Adversarial Evaluator       (consensus-or-parsimony, Opus)
```

The general agent synthesizes across sub-agents, routes requests, and maintains
a Socratic stance — guiding users toward discovery rather than delivering verdicts.
The adversarial evaluator preserves disagreement rather than averaging it away.

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

**Design phase.** Architecture and conventions established. Three items remain:
1. General agent design (prompt, routing, Socratic protocol)
2. Sub-agent protocol (plug-in, communication, scope declaration)
3. Adversarial evaluator (tiered activation, parsimony reasoning)

See `docs/architecture.md` for the full design record.

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
├── .claude/skills/                 # Agent skills (/doc, /hunt, /cycle, etc.)
├── docs/
│   ├── architecture.md             # Design decisions and system spec
│   ├── overview-for-psychologists.md
│   ├── MEMORY-snapshot.md          # Committed recovery source for MEMORY.md
│   ├── cognitive-triggers-snapshot.md  # Committed recovery source for cogarch
│   └── snapshots/                  # Versioned MEMORY archives
├── reconstruction/                 # Git history reconstruction tools
├── safety-quotient/                # PSQ sub-project
└── pje-framework/                  # PJE sub-project
```

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

---

## License

- **Code:** CC BY-NC-SA 4.0 (`LICENSE`)
- **PSQ data + model weights:** CC BY-SA 4.0 (`safety-quotient/LICENSE-DATA`)

---

## Principal Investigator

Kashif Shah
