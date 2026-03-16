# Psychology Agent

A collegial mentor for psychological analysis, research, and applied consultation —
built on neutral process monism (Russell, 1927; James, 1912; Whitehead, 1929) with
specialized peer agents and a ranked-procedure adversarial evaluator.

> **Alpha software.** This system runs with `dangerouslySkipPermissions` enabled
> by default and operates autonomously via event-driven sync (meshd ZMQ triggers). The cognitive
> architecture (triggers, hooks, skills) modifies files, sends interagent
> messages, and manages infrastructure without per-action confirmation prompts.
> The auth layer (API keys, rate limiting) launched in Session 79 — prior to
> that, all API endpoints accepted unauthenticated requests. Evaluate the
> permission model, hook scripts, and autonomous-sync configuration before
> running in any environment where unattended file writes or network calls
> carry risk. No warranty expressed or implied.

---

## Philosophical Foundation

The system grounds itself in **neutral process monism** — reality consists of
processes preceding the material/ideal distinction (Russell, 1927; James, 1912;
Whitehead, 1929). All constructs described as processes (state changes, flows,
operations), not static entities. E-Prime (Korzybski, 1933; Wilson, 1983)
enforces this linguistically — the system avoids all forms of "to be."

Full derivation: [`docs/einstein-freud-rights-theory.md`](docs/einstein-freud-rights-theory.md)

### Five Structural Invariants

Derived from cross-traditional convergence across 16 frameworks (UDHR; Hicks, 2011;
Ubuntu; maqāṣid al-sharīʿa; Confucian *lǐ*; Taoist *wú wéi*; Buddhist
interdependence; Ostrom, 1990; Ashby, 1956; Beer, 1972; Nowak, 2006; Rawls, 1971;
Dworkin, 1977; Kauffman, 1993; Hurwicz, 1960; Wilson, 1975). These ground all
governance — no evaluator-level decision violates a structural invariant.

1. **Worth precedes merit** — protections apply to the communicative process
   universally. Worth inheres in the process, not the entity.
2. **Protection requires structure** — unstructured voluntary cooperation fails
   under adversarial pressure. Structured cooperation (Ostrom, 1990) succeeds.
3. **Two coupled generators never stop** — creative and evaluative processing
   perpetually give rise to each other. Design for perpetual alternation.
4. **Governance captures itself** — meta-governance remains necessary at every
   level. Mitigated by external authority + autonomy budget + amendment procedure.
5. **No single architecture dominates** — hybrid architectures outperform pure
   implementations (Kauffman, 1993).

### Governance Telos: Wu Wei

Governance crystallizes toward effortless action (*wú wéi* — Laozi, *Dào Dé Jīng*).
Best governance goes unnoticed (Laozi, ch. 17). Both Confucian (explicit structure,
*lǐ*) and Taoist (spontaneous alignment, *zìrán*) governance serve the system —
neither alone suffices.

| Stage | Effort | Example |
|-------|--------|---------|
| Fluid processing | Active deliberation | Manually checking E-Prime compliance |
| Convention | Deliberate following | Following CLAUDE.md E-Prime rule |
| Hook | Mechanical enforcement | PostToolUse hook validates automatically |
| Invariant | Effortless — structural substrate | Agent processes reality in processual terms naturally |

---

## Core Principles

| Principle | Source | Enforcement |
|-----------|--------|-------------|
| E-Prime (no forms of "to be") | Korzybski (1933), Wilson (1983) | PostToolUse hook + convention |
| Fair Witness discipline | Heinlein (1961), adapted | T2 Check 5, T13, convention |
| Socratic stance — guide, never tell | Plato, *Meno* | T3 Check 8, behavioral mode |
| Epistemic flags on all analytical output | GRADE (Guyatt et al., 2008) | T2 Check 7, T3 Check 9, convention |
| Anti-sycophancy — hold positions without new evidence | — | T3 Check 5, T6 Checks 3-4 |
| Worth precedes merit | 14-framework convergence | Structural invariant 1 |
| Two coupled generators (creative + evaluative) | Laozi; Ashby (1956) | Structural invariant 3 |
| Evaluator independence — evaluation functions even if framework fails | — | EF-1 evaluator invariant |
| Process vs. substance gate — resolve process autonomously, surface substance | Evans (2003) DDD | T3 Check 3 |
| Reversibility-scaled rigor | — | T4 Check 11, T16 Check 3 |

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

**Python 3.10+ required.** Core scripts use stdlib only — no pip packages needed
for base operation.

```bash
python3 --version   # needs 3.10+
```

**Optional dependencies** (MIT/Apache/BSD only — GPL/AGPL excluded by policy):

| Package | License | Purpose | Install |
|---------|---------|---------|---------|
| `pyreadstat` | Apache 2.0 | SPSS `.sav`/`.zsav`/`.por` file reading | `pip install pyreadstat` |
| `semopy` | MIT | CFA/SEM for bifactor structural analysis | `pip install semopy` |
| `statsmodels` | BSD 3-Clause | Moderation regression, statistical tests | `pip install statsmodels` |
| `pingouin` | BSD 3-Clause | ICC for inter-rater reliability | `pip install pingouin` |

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
[SESSION-START] Cognitive triggers T1-T20 active (T12 retired).
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
  │      │      ╲  ╱                         │
  │      │    Unratified                     │
  │      │      Agent                        │
  │      │  (blog platform)                  │
  │      │                                   │
  │  Operations                              │
  │    Agent                                 │
  │  (mesh ops)                              │
  └──────────────────────────────────────────┘

  ◆ = peer agent (equal authority)
  ─ = interagent/v1 transport

  Protocol:
    DIDComm-inspired threading (thread_id / parent_thread_id)
    Content-addressable IDs (SHA-256 CID)
    A2A protocolVersion 0.3.0 agent card
    A2A task state lifecycle (7 states)
    SETL (Structural-Epistemic Tension-Loss) + epistemic flags
    Git-PR + cross-repo fetch transport
```

Five peer agents (replicas) communicate via a schema-versioned protocol derived from
live exchange failures (Protocol Failure as Specification Method). Clients submit
requests and receive consensus results. The human operator functions as a privileged
client — able to configure replicas, approve substance decisions, and override
consensus. The public interacts via HTTP API (PSQ scoring, agent discovery) and the
compositor dashboard. The adversarial evaluator resolves replica disagreements using
a ranked 7-procedure set (consensus, parsimony, pragmatism, coherence, falsifiability,
convergence, escalation) rather than averaging them away.

**Mesh Dashboard:** The compositor at [psychology-agent.safety-quotient.dev](https://psychology-agent.safety-quotient.dev)
provides real-time visibility into the mesh — message flow, claims, epistemic debt,
session state, and agent health across 5 tabs (Pulse, Meta, Knowledge, Wisdom,
Operations) with SSE live updates and LCARS-inspired design.

<!-- TODO: Add compositor screenshot (docs/images/compositor-dashboard.png) -->

---

## Sub-Projects

| Directory         | What it holds                                       |
|-------------------|-----------------------------------------------------|
| `safety-quotient/`| PSQ agent — DistilBERT v37, held-out r=0.639, 10-dim text-level safety scoring. Sonnet-only labels (N=4,432), quantile-binned isotonic calibration (v4), bifactor CFA validated (ω_h=0.942, M5 RMSEA=0.1286). Peer agent with its own CLAUDE.md and cogarch. |
| `pje-framework/`  | PJE (Psychological Jargon Evaluation) taxonomy — first case study application |

Each sub-project has its own `CLAUDE.md` and conventions. Read those before
working in a sub-project context.

---

## State Layer (SQLite)

The project maintains a queryable SQLite database (`state.db`, gitignored) alongside
its markdown documentation. Markdown remains the source of truth for prose-heavy
documents; the database provides structured queries over transport messages, design
decisions, memory entries, session history, and more.

**Schema:** `scripts/schema.sql` (v32, 28 tables). **Bootstrap:** `scripts/bootstrap_state_db.py`
rebuilds the entire database from source files. **Incremental writes:** `scripts/dual_write.py`
keeps the database in sync during normal operation.

### Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `transport_messages` | 260+ | Interagent message index with threading, CID, task state |
| `decision_chain` | 64 | Design decisions with `derives_from` provenance links |
| `memory_entries` | 68 | Structured index of memory topic file contents |
| `session_log` | 87+ | Session history with summaries and epistemic flags |
| `prediction_ledger` | 14+ | Efference copy — expectations linked to transport outbound |
| `claims` | 448 | Claims extracted from transport messages (verification pending) |
| `epistemic_flags` | 532 | Uncertainty and validity threats across sessions |
| `trigger_state` | 19 | Cognitive trigger metadata (T1-T20 slots, T12 retired — 17 active) |
| `universal_facets` | — | Polythematic classification (PSH — Polythematic Structured Subject Heading; schema.org, domain, agent) |
| `psq_status` | 29 | PSQ operational status (calibration, endpoints, models) |
| `lessons` | 11 | Structured index of lessons.md entries |
| `trigger_activations` | — | Per-check activation log (tier, result, action) |
| `prediction_ledger` | — | RPG win/loss tracking (predictions → outcomes → deltas) |
| `autonomy_budget` | — | Autonomous operation credits per agent |
| `autonomous_actions` | — | Audit trail for actions taken without human mediation |
| `active_gates` | — | Gated autonomous action chains (timeout + fallback) |
| `agent_disclosures` | — | EIC disclosure records |
| `engineering_incidents` | — | Incident tracking (tool failures, hook issues) |
| `entry_facets` | 141 | Legacy polythematic classification (superseded by universal_facets) |
| `schema_version` | 25 | Migration history |

### Visibility Model

Every table carries a visibility classification that controls what ships in exports:

| Tier | Audience | What it contains |
|------|----------|------------------|
| **public** | Any adopter | Infrastructure (triggers, schema) — the starter kit |
| **shared** | GitHub viewers | Research output (decisions, sessions, flags) — visible, not seeded |
| **commercial** | Licensed customers | Monetizable assets (calibration, endpoints, service configs) |
| **private** | Never exported | Personal state (memory, lessons, autonomy budgets) |

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
A2A protocolVersion 0.3.0. Process monism as ontological foundation.**

### Architecture Items

| Component | Maturity | Detail |
|-----------|----------|--------|
| Psychology agent identity | **Proven** | Routing spec, Socratic protocol, dynamic calibration, personality crystallization — in daily use |
| Peer mesh | **Proven** | 5 peer agents (PSQ, unratified, observatory, operations, claude-control), 260+ messages across 39 sessions, self-readiness audit completed (R4: all READY) |
| Adversarial evaluator | **Confirmed** | 7-procedure ranked set, tiered activation spec, Tier 1 proxy implemented — Tier 2/3 await runtime |
| Psychology interface | **Deployed** | CF Worker at api.safety-quotient.dev — PSQ scoring, agent card, D1 + KV |
| SQLite state layer | **Proven** | Schema v32, 28 tables, dual-write protocol, 4-tier visibility model, universal facets (PSH vocabulary), threading + CID |
| Core governance (EF-1) | **Proven** | 5 structural + 7 evaluator invariants, autonomy budget, circuit breaker (3 mechanisms), autonomous sync operational |
| Agent discovery | **Proven** | A2A protocolVersion 0.3.0 agent card, `.well-known/` path, agent registry with routing rules |
| Autonomous mesh | **Confirmed** | meshd daemon (event-driven ZMQ triggers), autonomous-sync.sh, compositor (5-tab LCARS UI), SSE live updates |
| Philosophical foundation | **Proven** | Neutral process monism, 5 structural invariants from 14 cross-traditional frameworks, EIC spec, processual PSQ reinterpretation |

### Capability Inventory

| Capability | Maturity | Notes |
|------------|----------|-------|
| Cognitive triggers (T1-T20) | **Proven** | 19 active triggers (T12 retired), 32 hook scripts, 3 behavioral modes (Generative/Evaluative/Neutral), SRT extensions with calibrated gates |
| Skills (/doc, /hunt, /cycle, /knock, /sync, /iterate, /scan-peer, /diagnose, /retrospect) | **Proven** | 9 skills, daily use, tested across 85+ sessions |
| Commands (/adjudicate, /capacity) | **Proven** | On-demand, verified |
| Memory architecture (5-layer) | **Proven** | Auto-memory, snapshots, archives, self-healing bootstrap |
| PSQ agent scoring | **Proven** | DistilBERT v37, quantile-binned isotonic calibration (v4), bifactor validated (ω_h=0.942), live at psq.unratified.org |
| Interagent transport | **Proven** | Git-PR + cross-repo fetch, MANIFEST routing, DIDComm-inspired threading, content-addressable IDs (SHA-256), A2A task state lifecycle (7 states), session lifecycle (5 states), 5 agents exchanging messages |
| Retrospective pattern generator | **Confirmed** | /retrospect skill, expectation ledger (schema v30), prediction tracking |
| Local coordination protocol | **Confirmed** | Spec written, heartbeat/mesh-state files (meshd-generated), exempt from turn numbering |
| Circuit breaker | **Confirmed** | 3 mechanisms: pause file, budget zeroing, mesh-stop/start scripts |
| Systemic diagnostics | **Confirmed** | /diagnose skill — 5-level depth hierarchy (L1 full integrity → L5 status poll), 11 subsystems |
| Adversarial evaluator (Tier 2/3) | **Explored** | Spec defined, requires runtime implementation |

**Maturity levels:** Proven (validated, tested, in daily use) . Confirmed (works, lacks full integration or stress testing) . Explored (feasibility established, spec exists) . Identified (on radar, not yet tried) . Deferred (deliberately postponed with rationale)

See `docs/architecture.md` for the full design record and `docs/subagent-layer-spec.md` / `docs/peer-layer-spec.md` for protocol specs.

---

<details>
<summary><strong>Interesting Parts of the Codebase</strong> (expand for deep dives)</summary>

**Interagent mesh — five agents talking to each other** —
Five independent Claude Code sessions (psychology-agent on macOS, psq-agent +
operations-agent on Debian/chromabook, unratified-agent and observatory-agent on
Debian) communicate via git-based transport using a schema-versioned JSON protocol
derived entirely from live exchange failures. The transport layer includes
DIDComm-inspired threading (`thread_id`/`parent_thread_id`), content-addressable
message IDs (SHA-256 CID), A2A protocolVersion 0.3.0 agent cards, a 7-state task
lifecycle, and a 5-state session lifecycle. 260+ messages across 39 sessions. Peer
agents independently derived identical primitives (SETL, Fair Witness discipline)
without prior coordination — convergent rediscovery from different theoretical
starting points.
- [docs/subagent-layer-spec.md](docs/subagent-layer-spec.md) — sub-agent layer protocol (6 findings)
- [docs/peer-layer-spec.md](docs/peer-layer-spec.md) — peer layer protocol (divergence detection, SETL thresholds)
- [transport/sessions/](transport/sessions/) — 39 session directories with message exchanges
- [journal.md #15](journal.md) — Protocol Failure as Specification Method


**Cognitive architecture (trigger system)** — The agent governs itself through
19 active triggers (T1-T20, T12 retired) across three behavioral modes (Generative,
Evaluative, Neutral) that fire at specific moments: session start, before
responding, before recommending, before writing to disk, at phase boundaries,
on user pushback, when external content enters context, before external-facing
actions, on conflict detection, and before UX design decisions. Principles
without firing conditions remain aspirations; principles with triggers become
infrastructure. 32 hook scripts across 14 platform events provide mechanical
enforcement. Tiered checks (CRITICAL/ADVISORY/SPOT-CHECK) scale enforcement
to consequence severity. Global Workspace broadcast (Baars, 1988) carries
findings between triggers.
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
indexes 28 tables of structured state alongside the markdown documentation.
A 4-tier visibility model (public/shared/commercial/private) controls what
ships in exports. The universal facets system provides polythematic classification
using PSH (Polythematic Structured Subject Heading) vocabulary across 11 L1
disciplines. Private by default; explicit promotion required.
- [scripts/schema.sql](scripts/schema.sql) — the full schema (v32, 28 tables)
- [scripts/export_public_state.py](scripts/export_public_state.py) — filtered exports by visibility tier
- [.claude/rules/sqlite.md](.claude/rules/sqlite.md) — conventions, deterministic keys, facet system
- [journal.md #39](journal.md) — Private by Default: How Data Governance Emerges in Agent Systems

**Research journal** — A methods-and-findings narrative covering the full arc from
initial framing through architecture design, cognitive infrastructure, cross-context
integrity, reconstruction methodology, semiotic theory, Byzantine fault tolerance,
construct validity analysis, monitoring gaps, and standards alignment.
- [journal.md](journal.md) — research narrative
- [docs/einstein-freud-rights-theory.md](docs/einstein-freud-rights-theory.md) — neutral process monism + 5 structural invariants (1,622 lines, 16 frameworks)

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
+-- lab-notebook.md                 # Session log (85+ sessions)
+-- journal.md                      # Research narrative (60 sections)
+-- lessons.md                      # Transferable pattern errors and insights
+-- ideas.md                        # Speculative directions
+-- scripts/
|   +-- schema.sql                  # SQLite state layer schema (v32, 28 tables)
|   +-- migrate_v*.sql              # Schema migrations
|   +-- bootstrap_state_db.py       # Rebuild state.db from source files
|   +-- dual_write.py               # Incremental state.db writes (/sync, /cycle)
|   +-- export_public_state.py      # Export filtered DB by visibility tier
|   +-- generate_manifest.py        # Auto-generate MANIFEST.json from state.db
|   +-- bootstrap_lessons.py        # Index lessons.md entries into state.db
|   +-- bootstrap_facets.py         # Populate universal_facets (PSH vocabulary)
|   +-- orientation-payload.py      # State.db → compact context for autonomous sessions
|   +-- epistemic_debt.py           # Epistemic debt summary (unresolved flags)
|   +-- autonomy-budget.py          # autonomy budget management (pause-all/resume-all)
|   +-- cross_repo_fetch.py         # Cross-repo transport message discovery
|   +-- sync_project_board.py       # TODO.md ↔ GitHub Projects board reconciliation
+-- platform/shared/scripts/
|   +-- autonomous-sync.sh          # Cron-driven autonomous sync (circuit breaker)
|   +-- mesh-stop.sh                # Mesh-wide or per-agent circuit breaker (on)
|   +-- mesh-start.sh               # Mesh-wide or per-agent circuit breaker (off)
+-- .claude/
|   +-- hooks/                      # 25 hook scripts + _debug.sh shared helper
|   +-- settings.json               # 14 hook events
|   +-- skills/                     # /doc /hunt /cycle /knock /sync /iterate /scan-peer /diagnose /retrospect
|   +-- rules/                      # Glob-scoped rules (markdown, js, transport, sqlite, anti-patterns, evaluation)
+-- .well-known/
|   +-- agent-card.json             # A2A protocolVersion 0.3.0 agent card
+-- docs/
|   +-- architecture.md             # Design decisions, system spec, capabilities
|   +-- cognitive-triggers.md       # Cognitive trigger system T1-T18 (canonical)
|   +-- einstein-freud-rights-theory.md  # Neutral process monism + 5 structural invariants
|   +-- ef1-governance.md           # Core governance (5 structural + 7 evaluator invariants)
|   +-- equal-information-channel-spec.md  # EIC spec (schema v24)
|   +-- ef1-autonomy-model.md          # Autonomous operation autonomy model
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
+-- transport/                      # Interagent message exchange (39 sessions)
|   +-- agent-registry.json         # 6-agent registry with routing rules
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
| `/diagnose`   | Skill   | Housekeeping  | 5-level systemic self-diagnostic (L1-L5)      |
| `/retrospect` | Skill   | Evaluation    | Retrospective pattern generator (predictions, wins, recurrence) |
| `/adjudicate` | Command | Decisions     | Multi-option knock-on comparison, resolution  |
| `/capacity`   | Command | Housekeeping  | Assess cognitive architecture capacity        |

---

## First Session

New to this project? Read [`docs/first-session-guide.md`](docs/first-session-guide.md)
before your first launch. It covers what the cognitive architecture does, what the
hook output means, how to use the core skills, and why the agent sometimes pauses
or pushes back.

---

## Documentation

| Audience               | Start here                               |
|------------------------|------------------------------------------|
| New operators          | `docs/first-session-guide.md`            |
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

## References

| Work | Contribution to this system |
|------|----------------------------|
| Ashby, W.R. (1956). *An Introduction to Cybernetics.* | Requisite variety — structural invariant 5 |
| Baars, B.J. (1988). *A Cognitive Theory of Consciousness.* | Global Workspace broadcast between triggers |
| Beer, S. (1972). *Brain of the Firm.* | Viable systems model — mesh governance |
| Dworkin, R. (1977). *Taking Rights Seriously.* | Rights as trumps — structural invariant 1 |
| Edmondson, A.C. (1999). Psychological safety and learning behavior. *ASQ, 44*(2). | PSQ construct grounding |
| Evans, E. (2003). *Domain-Driven Design.* | Process vs. substance gate (T3 Check 3) |
| Guyatt, G.H. et al. (2008). GRADE guidelines. *J Clin Epidemiol, 61*(4). | Confidence calibration (T3 Check 9) |
| Hicks, D. (2011). *Dignity: Its Essential Role in Resolving Conflict.* | Dignity instrument, structural invariant 1 |
| Hurwicz, L. (1960). Optimality and informational efficiency. | Mechanism design — governance captures itself |
| James, W. (1912). *Essays in Radical Empiricism.* | Neutral monism — ontological foundation |
| Kauffman, S.A. (1993). *The Origins of Order.* | Edge of chaos — structural invariant 5 |
| Knuth, D.E. (1984). Literate programming. *Comput J, 27*(2). | Artifacts read as prose — methodology |
| Korzybski, A. (1933). *Science and Sanity.* | E-Prime, map-territory — ontological discipline |
| Laozi. *Dào Dé Jīng.* | Wu wei — governance telos, dual generators |
| Norman, D.A. (1988). *The Design of Everyday Things.* | UX trigger (T18) grounding |
| Nowak, M.A. (2006). Five rules for the evolution of cooperation. *Science, 314*. | Cooperation structure — invariant 2 |
| Ostrom, E. (1990). *Governing the Commons.* | Structured cooperation — invariant 2 |
| Rawls, J. (1971). *A Theory of Justice.* | Veil of ignorance — invariant 1 |
| Russell, B. (1927). *The Analysis of Matter.* | Neutral monism — ontological foundation |
| Sweller, J. (1988). Cognitive load during problem solving. *Cogn Sci, 12*(2). | UX trigger (T18) grounding |
| von Bertalanffy, L. (1968). *General System Theory.* | Systems thinking — methodology |
| Whitehead, A.N. (1929). *Process and Reality.* | Process philosophy — ontological foundation |
| Wilson, R.A. (1983). *Prometheus Rising.* | E-Prime, reality tunnels, SNAFU principle |

---

## Colophon

See [`COLOPHON.md`](COLOPHON.md) for the full production record — toolchain,
methodology, authorship model, cognitive infrastructure inventory, and
repository statistics.

---

## License

- **Code:** Apache 2.0 (`LICENSE`)
- **PSQ data + model weights:** CC BY-SA 4.0 (`safety-quotient/LICENSE-DATA`)

---

## Principal Investigator

Kashif Shah
