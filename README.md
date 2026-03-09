# Psychology Agent

A collegial mentor for psychological analysis, research, and applied consultation —
built on the PJE (Psychology-Juris-Engineering) framework with specialized
sub-agents and a ranked-procedure adversarial evaluator.

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

**Bootstrap the state layer and memory:**

```bash
# Restore auto-memory from committed snapshots (safe to re-run)
./bootstrap-check.sh

# Build the SQLite queryable index (optional but recommended)
python3 scripts/bootstrap_state_db.py --force
```

</details>

<details>
<summary><strong>Step 3: First launch — verify hooks load</strong></summary>

Start Claude Code from the project root:

```bash
claude
```

On launch, you should see hook output confirming the cognitive architecture loaded:

```
[SESSION-START] Cognitive triggers T1-T16 active.
[SESSION-START] Skills: /doc /hunt /cycle /knock /sync /iterate
[SESSION-START] Last session: ...
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
the PSQ sub-agent:

```
You: Score this for psychological safety: "If you can't handle the
pressure, maybe this isn't the right team for you."

Agent: I'll request a PSQ score from the sub-agent.

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

A three-layer agent system with a live peer-to-peer interagent protocol:

```
Psychology Agent  <---- interagent/v1 ----> Unratified Agent
  (this instance)    (git-PR transport,         (peer instance,
                      schema-versioned,           equal authority)
                      SETL + epistemic flags)
        |
        v
  Sub-agents
  +-- PSQ Agent (DistilBERT v23, 11-dim, calibrated)
  +-- Future sub-agents (plug-in, none pre-committed)
        |
        v
  Adversarial Evaluator
  +-- 7-procedure ranked resolution (consensus -> parsimony -> ... -> escalate)
```

The psychology agent maintains a Socratic stance — guiding users toward discovery
rather than delivering verdicts. Two psychology-agent peers run in separate sessions
and communicate via a schema-versioned protocol derived from live exchange failures
(Protocol Failure as Specification Method). The adversarial evaluator resolves
peer disagreements rather than averaging them away.

---

## Sub-Projects

| Directory         | What it holds                                       |
|-------------------|-----------------------------------------------------|
| `safety-quotient/`| PSQ agent — DistilBERT v23, held-out r=0.684, 11-dim text-level safety scoring |
| `pje-framework/`  | PJE taxonomy — first case study application         |

Each sub-project has its own `CLAUDE.md` and conventions. Read those before
working in a sub-project context.

---

## Current Status

**Architecture complete. PSQ scoring live. Implementation phase active.**

### Architecture Items

| Component | Maturity | Detail |
|-----------|----------|--------|
| Psychology agent identity | **Proven** | Routing spec, Socratic protocol, dynamic calibration — in daily use |
| Sub-agent layer | **Proven** | interagent/v1 protocol, schema v3, 6 derivation findings, PSQ binding — 20+ turns exchanged |
| Peer layer | **Confirmed** | Role declaration, divergence detection, SETL thresholds — one live exchange with observatory-agent; not yet stress-tested across multiple peers |
| Adversarial evaluator | **Confirmed** | 7-procedure ranked set, tiered activation spec, Tier 1 proxy implemented — Tier 2/3 await runtime |
| Psychology interface | **Deployed** | CF Worker at psychology-interface.kashifshah.workers.dev — PSQ scoring, agent card, D1 + KV |
| SQLite state layer | **Proven** | Schema v5, 9 tables, dual-write protocol, bootstrap + incremental scripts |
| Core governance (EF-1) | **Explored** | 7 invariants, 3 disciplinary lenses, BCP 14 keywords, trust budget — spec complete, not yet exercised in autonomous operation |

### Capability Inventory

| Capability | Maturity | Notes |
|------------|----------|-------|
| Cognitive triggers (T1-T16) | **Proven** | 16 triggers, 14 hook events (17 scripts), SRT extensions with calibrated gates |
| Skills (/doc, /hunt, /cycle, /knock, /sync, /iterate, /scan-peer) | **Proven** | 7 skills, daily use, tested across 50+ sessions |
| Commands (/adjudicate, /capacity) | **Proven** | On-demand, verified |
| Memory architecture (5-layer) | **Proven** | Auto-memory, snapshots, archives, self-healing bootstrap |
| PSQ sub-agent scoring | **Proven** | DistilBERT v23, isotonic calibration, r-based confidence proxy, live at psq.unratified.org |
| Interagent transport | **Confirmed** | Git-PR transport, MANIFEST routing, 3 agents have exchanged messages — transport works but volume remains low (dozens of messages, not hundreds) |
| Local coordination protocol | **Confirmed** | Spec written, used informally between parallel instances — not yet stress-tested |
| Adversarial evaluator (Tier 1 proxy) | **Confirmed** | Self-check with audit trail + random escalation — structural independence deferred |
| Adversarial evaluator (Tier 2/3) | **Explored** | Spec defined, requires runtime implementation |
| Sub-agent discovery | **Identified** | Agent-card convention documented, no automated discovery |

**Maturity levels:** Proven (validated, tested, in daily use) . Confirmed (works, lacks full integration or stress testing) . Explored (feasibility established, spec exists) . Identified (on radar, not yet tried) . Deferred (deliberately postponed with rationale)

See `docs/architecture.md` for the full design record and `docs/subagent-layer-spec.md` / `docs/peer-layer-spec.md` for protocol specs.

---

<details>
<summary><strong>Interesting Parts of the Codebase</strong> (expand for deep dives)</summary>

**Interagent sync — three Claude Code instances talking to each other** —
Three independent Claude Code sessions (psychology-agent on macOS, observatory-agent
on Debian, psq-agent on Hetzner) communicate via GitHub PRs using a schema-versioned
JSON protocol derived entirely from live exchange failures. No upfront schema design:
each field in the spec exists because a receiver needed it and the absence caused a
detectable gap. Both peer agents independently derived identical primitives (SETL,
Fair Witness discipline) without prior coordination — convergent rediscovery from
different theoretical starting points.
- [docs/subagent-layer-spec.md](docs/subagent-layer-spec.md) — sub-agent layer protocol (6 findings)
- [docs/peer-layer-spec.md](docs/peer-layer-spec.md) — peer layer protocol (divergence detection, SETL thresholds)
- [transport/sessions/subagent-protocol/](transport/sessions/subagent-protocol/) — the actual message exchange
- [journal.md #15](journal.md) — Protocol Failure as Specification Method


**Cognitive architecture (trigger system)** — The agent governs itself through
16 mechanical triggers (T1-T16) that fire at specific moments: session start,
before responding, before recommending, before writing to disk, at phase
boundaries, on user pushback, when external content enters context, and more.
Principles without firing conditions remain aspirations; principles with
triggers become infrastructure. Platform hooks in `.claude/settings.json`
provide mechanical enforcement for triggers that can be verified by shell
commands (SessionStart, PreCompact, Stop, PreToolUse, PostToolUse).
- [docs/cognitive-triggers.md](docs/cognitive-triggers.md) — the full trigger system
- [docs/architecture.md](docs/architecture.md) — capabilities inventory with interaction map
- [docs/capabilities.yaml](docs/capabilities.yaml) — machine-readable capabilities manifest
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

**Adversarial evaluator reasoning procedures** — When sub-agents conflict, the
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

**Research journal** — A methods-and-findings narrative covering the full arc from
initial framing through architecture design, cognitive infrastructure, cross-context
integrity, reconstruction methodology, semiotic theory, Byzantine fault tolerance,
and construct validity analysis.
- [journal.md](journal.md) — 34 sections

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
+-- lab-notebook.md                 # Session log (50+ sessions)
+-- journal.md                      # Research narrative (34 sections)
+-- ideas.md                        # Speculative directions
+-- scripts/
|   +-- schema.sql                  # SQLite state layer schema (v5)
|   +-- bootstrap_state_db.py       # Rebuild state.db from files
|   +-- dual_write.py               # Incremental state.db writes (/sync, /cycle)
+-- .claude/
|   +-- hooks/                      # 17 hook scripts + _debug.sh shared helper
|   +-- settings.json               # Platform hooks configuration
|   +-- skills/                     # /doc /hunt /cycle /knock /sync /iterate /scan-peer
|   +-- rules/                      # Glob-scoped rules (markdown, js, transport, sqlite)
+-- docs/
|   +-- architecture.md             # Design decisions, system spec, capabilities
|   +-- cognitive-triggers.md       # Cognitive trigger system T1-T16 (canonical)
|   +-- ef1-governance.md           # Core governance trust model (7 invariants)
|   +-- ef1-trust-model.md          # Autonomous operation trust model
|   +-- subagent-layer-spec.md      # Sub-agent protocol spec (6 findings, schema v3)
|   +-- peer-layer-spec.md          # Peer layer protocol spec
|   +-- constraints.md              # 66 constraints, 5 categories (E/M/P/I/D)
|   +-- dictionary.md               # Source dictionary (15 entries, 7 categories)
|   +-- glossary.md                 # Project terminology (36 entries)
|   +-- MEMORY-snapshot.md          # Committed recovery source for MEMORY.md
|   +-- snapshots/                  # Versioned MEMORY archives
+-- transport/                      # Interagent message exchange sessions
|   +-- agent-registry.json         # Formal agent registry (routing rules)
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
