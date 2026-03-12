# Psychology Agent

A collegial mentor for psychological analysis, research, and applied consultation —
built on the PJE (Psychology-Juris-Engineering) framework with specialized
peer agents and a ranked-procedure adversarial evaluator.

---

## Zero to Demo

Get a working psychology agent from scratch. Accordion sections collapse steps
you can skip. Someone with Claude Code already installed reaches the first demo
in under 5 minutes.

<details>
<summary><strong>Step 1: Install Claude Code</strong> (skip if already installed)</summary>

Claude Code runs as a CLI tool in your terminal. Install it globally:

```bash
npm install -g @anthropic-ai/claude-code
```

You need an Anthropic API key or a Claude subscription with Claude Code access.
See [Anthropic's Claude Code docs](https://docs.anthropic.com/en/docs/claude-code/overview)
for full setup instructions including authentication.

**Verify installation:**

```bash
claude --version
```

</details>

<details>
<summary><strong>Step 2: Clone and set up</strong></summary>

```bash
git clone https://github.com/safety-quotient-lab/psychology-agent.git
cd psychology-agent
```

**Python 3.10+ required** (stdlib only — no pip packages needed):

```bash
python3 --version   # needs 3.10+
```

Both auto-memory and state.db bootstrap automatically on first launch — no manual
setup needed beyond cloning.

</details>

<details>
<summary><strong>Step 3: First launch — verify hooks load</strong></summary>

Start Claude Code from the project root:

```bash
claude
```

On first launch, you should see hook output confirming everything bootstrapped:

```
[SESSION-START] Auto-memory restored from committed snapshots.
[SESSION-START] state.db bootstrapped from source files.
[SESSION-START] Cognitive triggers T1-T16 active.
[SESSION-START] Skills: /doc /hunt /cycle /knock /sync /iterate
```

The agent reads `CLAUDE.md` automatically and loads glob-scoped rules from
`.claude/rules/`. 14 hook events (17 scripts) enforce the cognitive architecture mechanically.

If the hooks do not fire, check that `.claude/settings.json` exists and that
the hook scripts in `.claude/hooks/` have execute permissions (`chmod +x`).

</details>

### Demo 1: Conversational exchange

The psychology agent operates as a fair witness with a Socratic stance — it guides
discovery rather than delivering verdicts, uses e-prime (avoids forms of "to be"),
and balances cognitive accessibility with technical precision.

```
You: What makes someone psychologically safe in a conversation?

Agent: That question opens several productive directions. Let me ground
it before we explore.

Psychological safety — as Edmondson (1999) operationalized it — describes
a shared belief that a team environment permits interpersonal risk-taking.
The construct carries specific measurement properties worth unpacking...

Three dimensions surface most consistently in the literature:
1. **Permission to fail** — errors treated as learning data, not character
   evidence
2. **Voice** — participants expect their input to receive genuine
   consideration rather than performative acknowledgment
3. **Absence of punishment threat** — disagreement does not trigger
   retribution or status loss

Which dimension interests you most? Each connects to different intervention
strategies...
```

The agent cites sources, defines jargon on first use, chunks information for
cognitive accessibility, and offers stopping points rather than monologuing.

### Demo 2: PSQ score on sample text

The Psychological Safety Quotient (PSQ) scores text across 10 dimensions using
a fine-tuned DistilBERT model. The psychology agent can request a score from
the PSQ agent:

```
You: Score this for psychological safety: "If you can't handle the
pressure, maybe this isn't the right team for you."

Agent: I'll request a PSQ score from the PSQ agent.

PSQ Score — 10 Dimensions (0.0–1.0 scale, higher = safer):

  Dimension                    Score   Confidence
  ─────────────────────────────────────────────────
  Tone & Empathy (TE)          0.15    ██░░ 0.82
  Hostility/Intimidation (HI)  0.22    ███░ 0.88
  Autonomy/Dignity (AD)        0.18    ██░░ 0.79
  Constructive Critique (CC)   0.31    ██░░ 0.74
  Trust/Collaboration (TC)     0.25    ██░░ 0.81
  Resilience/Balance (RB)      0.28    ██░░ 0.77
  Defensiveness/Avoidance (DA) 0.41    █░░░ 0.65
  Receptivity (RC)             0.20    ██░░ 0.80
  Context/Openness (CO)        0.33    ██░░ 0.76
  Emotional Depth (ED)         0.19    ██░░ 0.78

  Composite PSQ:               0.25    LOW SAFETY
  ─────────────────────────────────────────────────

Interpretation: This statement scores consistently low across safety
dimensions. The implied threat ("maybe this isn't the right team")
registers on HI and AD. The framing attributes difficulty to personal
inadequacy rather than systemic challenge, suppressing TC and TE...
```

**Note:** The PSQ endpoint runs at `psq.unratified.org`. If the endpoint
is down, scoring requests return a health-check failure message.

### Demo 3: /knock on a decision

The `/knock` skill traces 10 orders of knock-on effects for any decision or
change — from immediate consequences through emergent system-level effects.

```
You: /knock Should we make the agent's memory files public in the repo
instead of gitignored?

Agent: Domain classification: operations × information security
Ground truth: memory files currently gitignored; snapshots committed
in docs/ for recovery.

10-Order Knock-On Analysis
──────────────────────────

Order 1 (Immediate): Memory files become version-controlled. Every
  session's state changes appear in git diff and PR reviews.

Order 2 (Direct consequence): Contributors and forks gain full context
  without running bootstrap. Onboarding friction drops.

Order 3 (Systemic): Session-specific state (active threads, in-progress
  work) becomes visible to all repo watchers. Internal reasoning
  becomes part of the public record.

Order 4 (Behavioral): Agent communication patterns shift — knowing
  memory is public changes what gets persisted. Self-censoring
  risk emerges.

Order 5 (Structural): The snapshot recovery system (MEMORY-snapshot.md,
  bootstrap-check.sh) becomes redundant. Maintenance burden drops
  but so does the defense-in-depth layer.

...

Order 10 (Emergent): The distinction between "agent state" and
  "project documentation" dissolves. Memory files evolve into a
  new form of living documentation that other projects adopt as
  a pattern — or reject as too transparent.

Governance check (Invariants 4, 5): Orders 3-4 carry irreversibility
  — published state cannot be unpublished. RECOMMEND: Tier 3 review.
```

### Demo 4: /iterate — the autonomous work loop

The `/iterate` skill chains the full work cycle: sync with peer agents,
discover the highest-value next task, trace knock-on effects, discriminate
between candidates, execute the winner, and run the documentation cycle.

```
You: /iterate

Agent:
Phase 0 — /sync
  Scope: all | Registry: loaded
  Inbound messages: none
  Outbound scan: psq-agent — no new content detected
  No new activity.

Phase 1 — /hunt
  Scanning TODO.md, architecture.md, ideas.md, cogarch...
  Candidates:
    [1] DI Phase A Pass 2 (inter-rater reliability)    — BLOCKED (fresh session)
    [2] README quickstart guide                        — READY, high visibility
    [3] SL-2 dual-write integration                    — READY, infrastructure

Phase 2 — Discriminate
  2-order knock-on per candidate...
  4-mode discriminator (value × urgency × dependency × cost):
    Winner: [2] README quickstart — unblocked, external-facing, pairs
    with de-branding.

Phase 3 — Execute
  [executing README quickstart guide...]

Phase 4 — /cycle
  [documentation propagation...]

/iterate complete. Executed: README quickstart guide.
Next awaiting: DI Phase A Pass 2 (needs fresh session), PSQ cogarch
mirror (awaiting psq-agent response).
```

### Demo 5: SPSS data interaction

The psychology agent can read SPSS `.sav` files (including `.zsav` compressed
and `.por` portable formats), preserve variable and value labels, run
descriptive analyses, and interpret output — bridging the gap between
statistical software and psychological interpretation.

```
You: Load survey_data.sav and tell me what you find.

Agent: I'll read the SPSS file and provide an initial assessment.

Dataset: survey_data.sav
  Cases: 847 | Variables: 42 | Missing: 3.2% (MCAR test p=0.41)

Variable groups detected:
  Demographics (6): age, gender, education, role, tenure, team_size
  PSQ-adjacent items (10): items mapping to TE, HI, AD, CC, TC...
  Outcome measures (4): turnover_intent, engagement, burnout, voice

Initial observations:
  - Reliability: Cronbach's alpha ranges 0.74–0.89 across subscales
  - Distribution: burnout shows ceiling effect (skew = -1.2)
  - Notable correlation: voice × team_size r = 0.34 (p < .001)

Three analysis paths present themselves:
  1. Confirmatory factor analysis on the PSQ-adjacent items
  2. Hierarchical regression: PSQ dimensions predicting turnover intent
  3. Moderation analysis: team_size moderating PSQ → engagement

Which direction serves your research question?
```

**Requires:** `pip install pyreadstat` (MIT license, stdlib-only C extension).
Verified: `.sav` read/write, `.zsav` compressed, variable labels, value labels,
and descriptive statistics all function correctly.

---

## What This Project Does

A multi-agent mesh with live peer-to-peer transport, standards-aligned discovery,
and an adversarial evaluator:

```
  Clients (submitters)
  ┌──────────────────────────────────────────┐
  │  Public          Human Operator          │
  │  (HTTP API,      (privileged client —    │
  │   website)        directs work,          │
  │                   configures replicas)   │
  └──────────┬───────────────┬───────────────┘
             │               │
             ▼               ▼
  Replicas (peer agents — BFT consensus)
  ┌──────────────────────────────────────────┐
  │          PSQ Agent                       │
  │        (psychometrics)                   │
  │           ╱    ╲                         │
  │          ╱      ╲                        │
  │ Psychology◆──────◆Observatory            │
  │   Agent   ╲      ╱  Agent               │
  │ (this repo)╲    ╱(research data)         │
  │             ╲  ╱                         │
  │          Unratified                      │
  │            Agent                         │
  │       (blog platform)                    │
  └──────────────────────────────────────────┘

  ◆ = peer agent (equal authority)
  ─ = interagent/v1 transport

  Protocol:
    DIDComm-inspired threading (thread_id / parent_thread_id)
    Content-addressable IDs (SHA-256 CID)
    A2A-compatible agent card (v2)
    A2A task state lifecycle (7 states)
    SETL + epistemic flags
    Git-PR + cross-repo fetch transport
```

Four peer agents (replicas) communicate via a schema-versioned protocol derived from
live exchange failures (Protocol Failure as Specification Method). Clients submit
requests and receive consensus results. The human operator functions as a privileged
client — able to configure replicas, approve substance decisions, and override
consensus. The public interacts via HTTP API (PSQ scoring, agent discovery) and the
compositor dashboard. The adversarial evaluator resolves replica disagreements rather
than averaging them away.

**Mesh Dashboard:** The compositor at [psychology-agent.safety-quotient.dev](https://psychology-agent.safety-quotient.dev)
provides real-time visibility into the mesh — message flow, claims, epistemic debt,
session state, and agent health across 5 tabs (Pulse, Meta, Knowledge, Wisdom,
Operations) with SSE live updates and LCARS-inspired design.

<!-- TODO: Add compositor screenshot (docs/images/compositor-dashboard.png) -->

---

## Sub-Projects

| Directory         | What it holds                                       |
|-------------------|-----------------------------------------------------|
| `safety-quotient/`| PSQ agent — DistilBERT v23, held-out r=0.684, 11-dim text-level safety scoring. Peer agent with its own CLAUDE.md and cogarch. |
| `pje-framework/`  | PJE taxonomy — first case study application         |

Each sub-project has its own `CLAUDE.md` and conventions. Read those before
working in a sub-project context.

---

## State Layer (SQLite)

The project maintains a queryable SQLite database (`state.db`, gitignored) alongside
its markdown documentation. Markdown remains the source of truth for prose-heavy
documents; the database provides structured queries over transport messages, design
decisions, memory entries, session history, and more.

**Schema:** `scripts/schema.sql` (v20, 19 tables). **Bootstrap:** `scripts/bootstrap_state_db.py`
rebuilds the entire database from source files. **Incremental writes:** `scripts/dual_write.py`
keeps the database in sync during normal operation.

### Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `transport_messages` | 204 | Interagent message index with threading, CID, task state |
| `decision_chain` | 57 | Design decisions with `derives_from` provenance links |
| `memory_entries` | 39 | Structured index of memory topic file contents |
| `session_log` | 78 | Session history with summaries and epistemic flags |
| `claims` | 371 | Claims extracted from transport messages (verification pending) |
| `epistemic_flags` | 435 | Uncertainty and validity threats across sessions |
| `trigger_state` | 17 | Cognitive trigger metadata (fire count, decay, relevance) |
| `universal_facets` | 3,759 | Polythematic classification (PSH, schema.org, domain, agent) |
| `psq_status` | 29 | PSQ operational status (calibration, endpoints, models) |
| `lessons` | 26 | Structured index of lessons.md entries |
| `autonomy_budget` | — | Autonomous operation credits per agent |
| `autonomous_actions` | — | Audit trail for actions taken without human mediation |
| `active_gates` | — | Gated autonomous action chains (timeout + fallback) |
| `engineering_incidents` | — | Incident tracking (tool failures, hook issues) |
| `entry_facets` | 83 | Legacy polythematic classification (superseded by universal_facets) |
| `schema_version` | 20 | Migration history |

### Visibility Model

Every table carries a visibility classification that controls what ships in exports:

| Tier | Audience | What it contains |
|------|----------|------------------|
| **public** | Any adopter | Infrastructure (triggers, schema) — the starter kit |
| **shared** | GitHub viewers | Research output (decisions, sessions, flags) — visible, not seeded |
| **commercial** | Licensed customers | Monetizable assets (calibration, endpoints, service configs) |
| **private** | Never exported | Personal state (memory, lessons, trust budgets) |

Private by default — every new table starts private and requires explicit promotion.

**Export profiles** generate filtered databases for different audiences:

```bash
python scripts/export_public_state.py --profile seed       # public only (adopter kit)
python scripts/export_public_state.py --profile release     # + shared (GitHub release)
python scripts/export_public_state.py --profile licensed    # + commercial (paying customers)
python scripts/export_public_state.py --dry-run             # preview without writing
```

### Querying

Collaborators can query state.db directly for structured lookups that would otherwise
require scanning multiple markdown files:

```sql
-- Messages by task state (A2A lifecycle)
SELECT task_state, COUNT(*) FROM transport_messages GROUP BY task_state;

-- Thread-based message lookup (DIDComm threading)
SELECT filename, turn, from_agent, subject FROM transport_messages
WHERE thread_id = 'psq-scoring' ORDER BY turn;

-- Decisions and their evidence chains
SELECT decision_key, decision_text, decided_date FROM decision_chain ORDER BY decided_date;

-- Cross-domain query via universal facets (PSH vocabulary)
SELECT dc.decision_key, uf.facet_value FROM decision_chain dc
  JOIN universal_facets uf ON uf.entity_type = 'decision_chain' AND uf.entity_id = dc.id
  WHERE uf.facet_type = 'psh' AND uf.facet_value = 'psychology';

-- Lessons by pattern type (promotion scan)
SELECT pattern_type, COUNT(*) FROM lessons
WHERE pattern_type IS NOT NULL GROUP BY pattern_type HAVING COUNT(*) >= 3;
```

See `.claude/rules/sqlite.md` for full conventions, deterministic key rules, and
the polythematic facet system.

---

## Current Status

**Architecture complete. PSQ scoring live. Mesh operational with 5 agents.
Standards alignment in progress (A2A, DIDComm).**

### Architecture Items

| Component | Maturity | Detail |
|-----------|----------|--------|
| Psychology agent identity | **Proven** | Routing spec, Socratic protocol, dynamic calibration — in daily use |
| Peer mesh | **Proven** | 4 peer agents (PSQ, unratified, observatory, claude-control), 204 messages across 18 sessions, self-readiness audit completed |
| Adversarial evaluator | **Confirmed** | 7-procedure ranked set, tiered activation spec, Tier 1 proxy implemented — Tier 2/3 await runtime |
| Psychology interface | **Deployed** | CF Worker at api.safety-quotient.dev — PSQ scoring, agent card, D1 + KV |
| SQLite state layer | **Proven** | Schema v20, 19 tables, dual-write protocol, 4-tier visibility model, universal facets (PSH vocabulary), threading + CID |
| Core governance (EF-1) | **Confirmed** | 7 invariants, trust budget, circuit breaker (3 mechanisms), autonomous sync operational on Hetzner |
| Agent discovery | **Confirmed** | A2A-compatible agent card (v2), `.well-known/` path, agent registry with routing rules |
| Autonomous mesh | **Confirmed** | meshd daemon, autonomous-sync.sh cron, compositor (5-tab LCARS UI), SSE live updates |

### Capability Inventory

| Capability | Maturity | Notes |
|------------|----------|-------|
| Cognitive triggers (T1-T16) | **Proven** | 17 triggers, 14 hook events (20 scripts), SRT extensions with calibrated gates |
| Skills (/doc, /hunt, /cycle, /knock, /sync, /iterate, /scan-peer, /diagnose) | **Proven** | 8 skills, daily use, tested across 78 sessions |
| Commands (/adjudicate, /capacity) | **Proven** | On-demand, verified |
| Memory architecture (5-layer) | **Proven** | Auto-memory, snapshots, archives, self-healing bootstrap |
| PSQ agent scoring | **Proven** | DistilBERT v23, isotonic calibration, r-based confidence proxy, live at psq.unratified.org |
| Interagent transport | **Proven** | Git-PR + cross-repo fetch, MANIFEST routing, DIDComm-inspired threading, content-addressable IDs, A2A task state lifecycle, 5 agents exchanging messages |
| Local coordination protocol | **Confirmed** | Spec written, cron-generated heartbeat/mesh-state files, exempt from turn numbering |
| Circuit breaker | **Confirmed** | 3 mechanisms: pause file, budget zeroing, mesh-stop/start scripts |
| Systemic diagnostics | **Confirmed** | /diagnose skill — 11 subsystem health checks with severity classification |
| Adversarial evaluator (Tier 2/3) | **Explored** | Spec defined, requires runtime implementation |

**Maturity levels:** Proven (validated, tested, in daily use) . Confirmed (works, lacks full integration or stress testing) . Explored (feasibility established, spec exists) . Identified (on radar, not yet tried) . Deferred (deliberately postponed with rationale)

See `docs/architecture.md` for the full design record and `docs/subagent-layer-spec.md` / `docs/peer-layer-spec.md` for protocol specs.

---

<details>
<summary><strong>Interesting Parts of the Codebase</strong> (expand for deep dives)</summary>

**Interagent mesh — five agents talking to each other** —
Five independent Claude Code sessions (psychology-agent on macOS, psq-agent on
Hetzner, unratified-agent and observatory-agent on Debian, claude-control) communicate
via git-based transport using a schema-versioned JSON protocol derived entirely from
live exchange failures. The transport layer now includes DIDComm-inspired threading
(`thread_id`/`parent_thread_id`), content-addressable message IDs (SHA-256 CID),
A2A-compatible agent cards, and a 7-state task lifecycle. 204 messages across 18
sessions. Peer agents independently derived identical primitives (SETL, Fair Witness
discipline) without prior coordination — convergent rediscovery from different
theoretical starting points.
- [docs/subagent-layer-spec.md](docs/subagent-layer-spec.md) — sub-agent layer protocol (6 findings)
- [docs/peer-layer-spec.md](docs/peer-layer-spec.md) — peer layer protocol (divergence detection, SETL thresholds)
- [transport/sessions/](transport/sessions/) — 18 session directories with message exchanges
- [journal.md #15](journal.md) — Protocol Failure as Specification Method


**Cognitive architecture (trigger system)** — The agent governs itself through
17 mechanical triggers (T1-T17) that fire at specific moments: session start,
before responding, before recommending, before writing to disk, at phase
boundaries, on user pushback, when external content enters context, and more.
Principles without firing conditions remain aspirations; principles with
triggers become infrastructure. Platform hooks in `.claude/settings.json`
provide mechanical enforcement for triggers that can be verified by shell
commands (SessionStart, PreCompact, Stop, PreToolUse, PostToolUse).
- [docs/cognitive-triggers.md](docs/cognitive-triggers.md) — the full trigger system
- [docs/architecture.md](docs/architecture.md) — capabilities inventory with interaction map
- [journal.md #6](journal.md) — the design narrative explaining why triggers exist

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
- [journal.md #9-10](journal.md) — the method and its epistemic analysis

**Documentation propagation chain (`/cycle`)** — A 13-step post-session checklist
that propagates changes through 10 overlapping documents at different abstraction
levels, with content guards, versioned archives, and orphan detection.
- [.claude/skills/cycle/SKILL.md](.claude/skills/cycle/SKILL.md) — the full skill definition

**Structured decision resolution (`/adjudicate`)** — Resolves ambiguous decisions
through 10-order knock-on analysis (certain -> emergent -> theory-revising), severity-tiered
depth, 2-pass iterative refinement, and consensus-or-parsimony binding.
- [journal.md #11](journal.md) — licensing decision as a worked example of the method

**Adversarial evaluator reasoning procedures** — When peer agents conflict, the
evaluator applies a ranked 7-procedure set rather than averaging: consensus,
parsimony (Occam), pragmatism (what's actionable given stakes), coherence
(fits validated findings), falsifiability (prefer testable claims), convergence
(independent rediscovery as evidence), escalation (surface disagreement shape to
user). Domain-specific priority tables govern which procedure ranks first per
context (clinical vs. research vs. architecture vs. applied consultation).
- [docs/architecture.md](docs/architecture.md) — Component Spec: Adversarial Evaluator

**Session replays** — Any session transcript can become a self-contained HTML replay
with playback controls, speed adjustment, and automatic secret redaction using
[claude-replay](https://github.com/es617/claude-replay). Replays live in
`docs/replays/` (gitignored — they embed full transcripts including file paths
and source code). Review before sharing externally.

```bash
# Generate a replay from any session transcript
claude-replay ~/.claude/projects/<project>/<session>.jsonl \
  --title "Session Name" --no-thinking --speed 2.0 -o docs/replays/session.html
```

**Queryable state layer with 4-tier visibility** — A SQLite database (state.db)
indexes 19 tables of structured state alongside the markdown documentation.
A 4-tier visibility model (public/shared/commercial/private) controls what
ships in exports. The universal facets system provides polythematic classification
using PSH (Polythematic Structured Subject Heading) vocabulary — 3,759 facets
across 11 L1 disciplines. Private by default; explicit promotion required.
- [scripts/schema.sql](scripts/schema.sql) — the full schema (v20, 19 tables)
- [scripts/export_public_state.py](scripts/export_public_state.py) — filtered exports by visibility tier
- [.claude/rules/sqlite.md](.claude/rules/sqlite.md) — conventions, deterministic keys, facet system
- [journal.md #39](journal.md) — Private by Default: How Data Governance Emerges in Agent Systems

**Research journal** — A methods-and-findings narrative covering the full arc from
initial framing through architecture design, cognitive infrastructure, cross-context
integrity, reconstruction methodology, semiotic theory, Byzantine fault tolerance,
construct validity analysis, monitoring gaps, and standards alignment.
- [journal.md](journal.md) — 60 sections

</details>

---

## Project Structure

```
psychology-agent/
+-- bootstrap-check.sh              # Health check + auto-memory restore
+-- BOOTSTRAP.md                    # Full bootstrap guide
+-- CLAUDE.md                       # Stable conventions (auto-loaded)
+-- README.md                       # This file
+-- TODO.md                         # Forward-looking task backlog
+-- lab-notebook.md                 # Session log (78 sessions)
+-- journal.md                      # Research narrative (60 sections)
+-- lessons.md                      # Transferable pattern errors and insights
+-- ideas.md                        # Speculative directions
+-- scripts/
|   +-- schema.sql                  # SQLite state layer schema (v20, 19 tables)
|   +-- migrate_v*.sql              # Schema migrations
|   +-- bootstrap_state_db.py       # Rebuild state.db from source files
|   +-- dual_write.py               # Incremental state.db writes (/sync, /cycle)
|   +-- export_public_state.py      # Export filtered DB by visibility tier
|   +-- generate_manifest.py        # Auto-generate MANIFEST.json from state.db
|   +-- bootstrap_lessons.py        # Index lessons.md entries into state.db
|   +-- bootstrap_facets.py         # Populate universal_facets (PSH vocabulary)
|   +-- orientation-payload.py      # State.db → compact context for autonomous sessions
|   +-- epistemic_debt.py           # Epistemic debt summary (unresolved flags)
|   +-- autonomy-budget.py          # Trust budget management (pause-all/resume-all)
|   +-- cross_repo_fetch.py         # Cross-repo transport message discovery
|   +-- sync_project_board.py       # TODO.md ↔ GitHub Projects board reconciliation
+-- platform/shared/scripts/
|   +-- autonomous-sync.sh          # Cron-driven autonomous sync (circuit breaker)
|   +-- mesh-stop.sh                # Mesh-wide or per-agent circuit breaker (on)
|   +-- mesh-start.sh               # Mesh-wide or per-agent circuit breaker (off)
+-- .claude/
|   +-- hooks/                      # 19 hook scripts + _debug.sh shared helper
|   +-- settings.json               # 14 hook events, 20 entries
|   +-- skills/                     # /doc /hunt /cycle /knock /sync /iterate /scan-peer /diagnose
|   +-- rules/                      # Glob-scoped rules (markdown, js, transport, sqlite, anti-patterns, evaluation)
+-- .well-known/
|   +-- agent-card.json             # A2A-compatible agent card (v2)
+-- docs/
|   +-- architecture.md             # Design decisions, system spec, capabilities
|   +-- cognitive-triggers.md       # Cognitive trigger system T1-T17 (canonical)
|   +-- ef1-governance.md           # Core governance trust model (7 invariants)
|   +-- ef1-trust-model.md          # Autonomous operation trust model
|   +-- subagent-layer-spec.md      # Sub-agent protocol spec (6 findings, schema v3)
|   +-- peer-layer-spec.md          # Peer layer protocol spec
|   +-- hooks-reference.md          # Full hook event × script reference table
|   +-- constraints.md              # 66 constraints, 5 categories (E/M/P/I/D)
|   +-- dictionary.md               # Source dictionary
|   +-- glossary.md                 # Project terminology
|   +-- MEMORY-snapshot.md          # Committed recovery source for MEMORY.md
|   +-- memory-snapshots/           # Committed topic file snapshots
|   +-- snapshots/                  # Versioned MEMORY archives
|   +-- decisions/                  # Persisted adjudication records
+-- transport/                      # Interagent message exchange (18 sessions)
|   +-- agent-registry.json         # 5-agent registry with routing rules
|   +-- MANIFEST.json               # Auto-generated pending message index
+-- reconstruction/                 # Git history reconstruction tools
+-- safety-quotient/                # PSQ sub-project (separate CLAUDE.md)
+-- pje-framework/                  # PJE sub-project
```

---

## Skills and Commands

| Name          | Type    | When          | What                                         |
|---------------|---------|---------------|----------------------------------------------|
| `/doc`        | Skill   | Mid-work      | Persist decisions and findings to disk        |
| `/cycle`      | Skill   | Post-session  | Full documentation chain update, commit, push |
| `/hunt`       | Skill   | Discovery     | Find highest-value next work                  |
| `/knock`      | Skill   | Analysis      | Single-option 10-order knock-on tracing       |
| `/sync`       | Skill   | Coordination  | Inter-agent mesh scan, ACKs, MANIFEST update  |
| `/iterate`    | Skill   | Autonomous    | Hunt -> discriminate -> execute next work     |
| `/scan-peer`  | Skill   | Quality       | Peer content scan for safety + drift issues   |
| `/diagnose`   | Skill   | Housekeeping  | Systemic self-diagnostic across all subsystems|
| `/adjudicate` | Command | Decisions     | Multi-option knock-on comparison, resolution  |
| `/capacity`   | Command | Housekeeping  | Assess cognitive architecture capacity        |

---

## Documentation

| Audience               | Start here                               |
|------------------------|------------------------------------------|
| Developers / technical | This file + `BOOTSTRAP.md`               |
| Psychology researchers | `docs/overview-for-psychologists.md`     |
| Current project state  | `docs/MEMORY-snapshot.md`                |
| Design record          | `docs/architecture.md`                   |
| State layer / database | [Wiki: State Layer](https://github.com/safety-quotient-lab/psychology-agent/wiki/State-Layer) |
| Project terminology    | `docs/glossary.md`                       |

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
- **Dependencies:** MIT/Apache/BSD licenses only — no GPL/AGPL
- **Community tools:** [recall](https://github.com/zippoxer/recall) (session search),
  [ccusage](https://github.com/ryoppippi/ccusage) (token/cost tracking),
  [claude-replay](https://github.com/es617/claude-replay) (session transcript -> HTML replay)

See `CLAUDE.md` for full conventions.

---

## License

- **Code:** Apache 2.0 (`LICENSE`)
- **PSQ data + model weights:** CC BY-SA 4.0 (`safety-quotient/LICENSE-DATA`)

---

## Principal Investigator

Kashif Shah
