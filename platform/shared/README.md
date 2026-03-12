# Platform Shared Infrastructure

Shared scripts, schema, and cogarch templates for the safety-quotient-lab
agent mesh. Every agent in the mesh uses these — agents provide domain content;
the platform provides runtime infrastructure.

## Directory Layout

```
platform/shared/
├── scripts/          # 16 shared scripts — single source of truth
│   ├── schema.sql              # SQLite state DB schema (canonical DDL)
│   ├── bootstrap_state_db.py   # Rebuild state.db from markdown + JSON
│   ├── dual_write.py           # Incremental upserts (markdown + DB)
│   ├── autonomous-sync.sh      # Autonomous mesh sync orchestration
│   ├── cross_repo_fetch.py     # Cross-repo transport fetch
│   ├── generate_manifest.py    # MANIFEST.json generation
│   ├── ensure-cron.sh          # Cron job installation + self-healing
│   ├── heartbeat.py            # Mesh heartbeat
│   ├── escalate.py             # Escalation handler
│   ├── status_server.py        # Status HTTP server
│   ├── mesh-state-export.py    # Mesh state export for compositor
│   ├── orientation-payload.py  # Session orientation payload builder
│   ├── auto_process_trivial.py # Trivial message auto-processing
│   ├── bootstrap_facets.py     # PSH/schema.org facet bootstrap
│   ├── mesh-status.py          # Mesh status reporter
│   └── verify_shared_scripts.py # Shared script integrity checker
│
└── cogarch/          # Cogarch templates — agent defaults + standup kit
    ├── cognitive-triggers.md         # T1–T16 trigger definitions (T15 = domain slot)
    ├── cogarch.config.template.json  # Skeleton config with {PLACEHOLDER} values
    ├── CLAUDE.md.template            # Starter project instructions for new agents
    ├── hooks-manifest.md             # Hook classification + identity replacement guide
    ├── lessons.md.example            # Lessons format stub (gitignored at runtime)
    └── rules/                        # Glob-scoped rule files
        ├── anti-patterns.md    # Known-failing approaches
        ├── evaluation.md       # Measurement methodology conventions
        ├── javascript.md       # CF Worker / Agent SDK patterns
        ├── markdown.md         # Formatting, whitespace, epistemic flags
        ├── sqlite.md           # State layer conventions
        └── transport.md        # Interagent protocol conventions
```

## How Agents Use This

**In the psychology-agent repo (source):**
Agent-local `scripts/` contains symlinks to `platform/shared/scripts/`.
Agent-specific scripts (autonomy-budget.py, parse-jsonl.py, etc.) remain
as regular files in `scripts/`.

**On deployment machines (chromabook):**
`platform/shared/` deploys to a single location. Each agent project root
symlinks its `scripts/` entries to the shared location. Schema migrations,
bootstrap, and autonomous-sync all run from the shared copy.

```
~/platform/shared/scripts/    # one copy, serves all agents
~/projects/psychology/scripts/ → symlinks to ~/platform/shared/scripts/
~/projects/unratified/scripts/ → symlinks to ~/platform/shared/scripts/
~/projects/observatory/scripts/ → symlinks to ~/platform/shared/scripts/
```

## Cogarch Override Convention

Each agent gets the shared cogarch as defaults. To customize:

1. **cognitive-triggers.md** — place a local copy at `docs/cognitive-triggers.md`
   in the agent's project root. bootstrap_state_db.py checks the local path
   first, falls back to the platform template.

2. **rules/** — place overrides in `.claude/rules/` in the agent's project root.
   Claude Code loads glob-scoped rules from the project, not from platform/.

3. **Agent-specific scripts** — keep in the agent's local `scripts/` directory.
   These coexist with the symlinks to platform shared scripts.

## New Agent Standup

The `cogarch/` directory contains a complete standup kit for new agents.
Use these templates when creating a new agent in the mesh:

1. Copy `cogarch.config.template.json` → agent repo `cogarch.config.json`,
   replace all `{PLACEHOLDER}` values
2. Copy `CLAUDE.md.template` → agent repo `CLAUDE.md`, fill in agent-specific
   sections
3. Copy `cognitive-triggers.md` → agent repo `docs/cognitive-triggers.md`,
   replace T15 domain slot with agent-specific subsystem checks
4. Copy `rules/` → agent repo `.claude/rules/`
5. Copy hooks per `hooks-manifest.md` → agent repo `.claude/hooks/`,
   run identity replacement (`sed -i 's/psychology-agent/{AGENT_ID}/g'`)
6. Copy `lessons.md.example` → agent repo root
7. Run verification checklist from `docs/cogarch-adaptation-guide.md`

Full adaptation guide: `docs/cogarch-adaptation-guide.md` (7 steps, 4 tiers).

## Updating Shared Scripts

Edit the canonical copy in `platform/shared/scripts/`. All agents using
symlinks pick up the change immediately (same machine) or on next deploy
(remote machines).

Never edit a symlinked copy directly — changes would modify the platform
source, affecting all agents. This single-write property eliminates drift.
