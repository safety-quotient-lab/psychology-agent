# Cognitive Architecture Refactor Evaluation

Session 84. Three-discipline evaluation of the cogarch (engineering, law,
psychology) toward a radical refactor aligned with best practices.

**Status:** Phase 1 complete (evaluation). Phase 2 pending (refactor proposal
with knock-on analysis). Research agent still gathering literature.

**Method:** Internal evaluation agent + 15 extrapolated findings from 84 sessions
of operational history + internet/literature research on best practices.

---

## Part 1: Engineering Evaluation

### Critical Defects

**E-1. Governance double-negative grammar error (CRITICAL)**
EF-1 Invariant 1, line 77: "No discipline-specific extension MUST NOT bypass the
gate." This double negative (no + must not) means "all extensions must bypass the
gate" — the opposite of the intended meaning. Same error repeats in Invariant 2,
line 91. The two most critical governance invariants say the opposite of what they
intend.
*Fix: rewrite as "No discipline-specific extension SHALL bypass the gate."*

**E-2. /diagnose skill does not exist (CRITICAL)**
CLAUDE.md lists `/diagnose` as a skill that loads every session. No `SKILL.md`
file exists at `.claude/skills/diagnose/`. T1 Check 6 should catch this but only
if the agent runs the check — which it cannot, because the skill it would verify
does not exist.
*Fix: create the skill or remove from CLAUDE.md.*

**E-3. Hardcoded Linux paths in macOS environment (HIGH)**
`/hunt` Source 8 (line 152-155) references `/home/kashif/projects/psychology/*.md`
— the system runs on macOS where paths start with `/Users/kashif/`. These grep
commands find nothing. Same issue in `/hunt` Phase 1 Step 4.
*Fix: use `$PROJECT_ROOT` or platform-agnostic path resolution.*

**E-4. /cycle Step 10c snapshots only 3 of 8 topic files (HIGH)**
The snapshot loop hardcodes `decisions.md`, `cogarch.md`, `psq-status.md`. The
MEMORY.md index lists 8 topic files including `infrastructure.md` and 3 feedback
files. Five topic files never get snapshotted.
*Fix: enumerate all `.md` files in the memory directory instead of hardcoding.*

### Structural Weaknesses

**E-5. Trigger check explosion — 60+ checks across 16 triggers**
T2 has 14 checks (fires every response). T3 has 15 checks (fires every
recommendation). T4 has 11 checks (fires every file write). Total cognitive
overhead: potentially 40+ checks per response that includes a recommendation
and a file write. No priority tiering — E-prime compliance (T2 #6) receives
the same enforcement level as public visibility (T4 #2).

**E-6. 70% of checks lack mechanical enforcement**
Only T4 (PostToolUse hook), T16 (PreToolUse hook), and T2 #1 (context-pressure
hook) have mechanical backing. The remaining ~42 checks depend entirely on
the agent remembering to run them. The cogarch's own meta-rule — "principles
without mechanical triggers remain aspirations" — applies to most of its own
checks.

**E-7. No trigger tiering (critical / advisory / spot-check)**
All checks within a trigger carry equal weight. A tiered system would allow
safety-critical checks (public visibility, credential exposure, irreversibility)
to always run while advisory checks (E-prime, pacing, jargon definitions) run
on spot-check or when explicitly relevant.

**E-8. T14 fires "at every decision point, even small ones"**
Orders 7-10 (structural, horizon, emergent, theory-revising) apply to variable
renames and formatting choices. The trigger text does not exempt trivially small
decisions.

**E-9. Hooks and triggers overlap without clear contract**
T4 (before writing) has a PostToolUse hook as "safety net." Which layer owns
enforcement? If the hook catches an error, does T4 still need to run all 11
checks? The layering lacks a defined contract between mechanical and cognitive
enforcement.

**E-10. Session startup consumes 15-20% of context**
T1 mandates full trigger table output + 8 skills load at session start + memory
loading + state reconciliation. Before any work begins, the agent has consumed a
significant fraction of available context on orientation overhead.

**E-11. Skills duplicate trigger logic**
/cycle's 13-step checklist recapitulates T4 (before writing), T5 (phase boundary),
T8 (task completed), and T9 (memory hygiene). /iterate chains skills with internal
checks that redundantly fire triggers. No coordination protocol between the skill
layer and trigger layer.

**E-12. Memory split across 7 locations, 3 persistence mechanisms**
Active state lives in: MEMORY.md (auto-memory), topic files (auto-memory),
state.db (project root), CLAUDE.md (project root), docs/cognitive-triggers.md
(project root), lessons.md (gitignored), MEMORY-snapshot.md (committed).
Reconciliation between these stores has no automated mechanism.

**E-13. Transport protocol complexity exceeds mesh size**
Content-addressable IDs, DIDComm threading, 7-state lifecycle, task expiration,
problem reports, MANIFEST tracking — designed for a large mesh. Current mesh:
5 agents, 3-4 actively exchanging. Self-readiness audit: 21 messages across
4 rounds for a binary READY/NOT-READY question from 4 agents.

**E-14. No feedback loop measures cogarch effectiveness**
No metric for "did this trigger prevent an error?" Failure analyses exist for
when triggers miss, but no success tracking exists. Cannot distinguish
load-bearing checks from ceremonial ones.

**E-15. Constraint taxonomy (66 constraints) lacks activation tracking**
T3 Check 15 cross-references constraints, but no mechanism records which
constraints actually fire in practice. Many constraints' "provenance" points
to documentation rather than mechanical enforcement — aspirational by the
document's own standard.

**E-16. No transport session lifecycle protocol**
Sessions open implicitly (first message). No formal close, archive, garbage
collection, or retirement mechanism. Old sessions accumulate indefinitely.

**E-17. CLAUDE.md duplicates content from other documents**
Skills section, scope boundaries, hooks reference, communication conventions,
and workflow continuity all summarize content that lives canonically elsewhere.
Synchronization burden and drift risk.

**E-18. Inline hook command breaks pattern**
One PostToolUse hook contains a full bash case statement as an inline command
string instead of an external script file. Breaks the established pattern,
complicates maintenance, cannot benefit from version control diffs.

**E-19. No transport message schema validation hook**
Transport messages follow interagent/v1 schema with required fields. No
PostToolUse hook on Write to `transport/**/*.json` validates compliance.

**E-20. context-pressure-gate.sh fires on ALL PreToolUse events**
No matcher scoping — every single tool call triggers a context pressure check,
including Read, Glob, Grep. Excessive overhead for non-writing operations.

### Gaps (Things That Should Exist)

**E-G1. No trigger for context compaction events**
PreCompact hook exists, but no trigger defines the cognitive protocol.

**E-G2. No trigger for error recovery**
Tool-failure-halt.sh exists as a hook, but no trigger defines the cognitive
response pattern for mid-session errors.

**E-G3. No trigger for inter-session state reconciliation**
T1 loads state, but nothing reconciles conflicting state between auto-memory,
state.db, and committed docs when they diverge.

**E-G4. No mechanism detects silent MEMORY.md truncation**
If MEMORY.md crosses 200 lines, the platform truncates silently. No verification
that loaded MEMORY.md matches what was written.

**E-G5. No skill for adversarial evaluator (Tier 2/3)**
Architecture describes tiered evaluator. T3 Check 12 describes Tier 1 proxy.
No skill implements Tier 2 or 3. The evaluator remains a design document.

**E-G6. No convention governs skill creation quality**
No review gate, test requirement, or verification protocol for new skills.

**E-G7. No agent self-model**
The agent has no representation of its own cognitive state — which triggers
fired, which checks passed or failed, what mode it occupied. Efference copy
(CPG principle 9) identified this gap independently.

### Dead Weight

**E-D1. T12 ("Good Thinking" Signal)** — extremely narrow firing conditions
(user says "good thinking"). Likely fired < 5 times across 83 sessions.

**E-D2. E-prime check on every response (T2 #6)** — style compliance belongs
in a write-time linter, not a per-response cognitive check.

**E-D3. Cognitive Accessibility Policy in CLAUDE.md** — restates what the
trigger system already enforces. Second location for the same requirements.

**E-D4. README Policy in CLAUDE.md** — 3 lines of low-value guidance occupying
system prompt real estate.

---

## Part 2: Legal/Governance Evaluation

### Structural Weaknesses

**L-1. Governance double-negatives undermine legal precision (= E-1)**
The most critical invariants use ambiguous language. In a legal/governance
context, this represents a drafting error that could invert the intended
constraint. Regulatory frameworks (EU AI Act, NIST AI RMF) require
unambiguous constraint language.

**L-2. No audit trail for governance invariant violations**
The FA template covers trigger failures, not governance failures. If an
invariant fails to hold, no mechanism logs the violation. NIST AI RMF
requirement: "organizations should document when AI systems deviate from
intended behavior."

**L-3. No procedure for governance document amendment**
How do invariants themselves change? The document describes what they govern
but not how they evolve. Governance frameworks require amendment procedures
to prevent uncontrolled scope drift.

**L-4. Trust model exists as design documentation, not running infrastructure**
The autonomy budget references state.db tables, but mechanical enforcement
depends on scripts that may or may not exist. The gap between governance spec
and enforcement mechanism remains undocumented. Accountability requires
demonstrable enforcement, not just documented intent.

**L-5. Tier 2 evaluator requires "a separate session"**
The friction cost means Tier 2 evaluations likely happen rarely or never. A
governance mechanism that cannot practically execute does not provide governance.

**L-6. Agent actions treated as tool use, not organizational actions**
Recent governance literature (McKinsey, 2025; KPMG, 2025): "actions by AI agents
should be treated as actions by the organization itself." The cogarch treats
agent actions as tool invocations with user confirmation, not as organizational
decisions with accountability chains.

**L-7. No rate limiting between agents**
Nothing prevents a peer agent from flooding the transport layer. The
`min_action_interval` applies to autonomous operations only.

**L-8. 92% governance gap applies here**
Per recent governance research: 92% of agencies lack auditability for agentic
decisions. The cogarch's audit trail (lab-notebook, state.db, git history)
exceeds most systems, but the transport layer lacks auditability for decision
pathways (why a message was sent, not just that it was sent).

### Strengths

**L-S1. Seven invariants provide testable constraints**
Each invariant receives multi-disciplinary readings. BCP 14 keywords add
precision. This exceeds most agent governance frameworks.

**L-S2. Bounded autonomy with temporal spacing**
20-credit budget with 5-minute intervals creates a mechanical halt. Aligns
with "start bounded, scale with monitoring" (McKinsey, 2025).

**L-S3. Extensive audit trail**
Lab-notebook, state.db, git history, transport messages, epistemic flags,
MANIFEST tracking. More comprehensive than most agent systems.

**L-S4. Explicit scope boundaries**
CLAUDE.md lists what the agent does not do. Negative scope definitions prevent
feature creep and establish clear liability boundaries.

---

## Part 3: Psychology/Neuroscience Evaluation

### Structural Weaknesses

**P-1. No working memory model**
Baddeley's (2000) working memory model distinguishes central executive,
phonological loop, visuospatial sketchpad, and episodic buffer. The cogarch
treats context as undifferentiated — all information competes equally for
attention. No mechanism prioritizes what occupies limited context.

**P-2. No attention allocation mechanism**
Posner's (1980) attention model distinguishes alerting, orienting, and
executive attention. The cogarch's triggers fire based on conditions, not
attentional priority. T3's 15 checks receive equal attentional weight
regardless of which checks matter most for the current task. Broadbent's
(1958) filter theory suggests early selection would reduce processing load.

**P-3. No metacognitive accuracy tracking**
The agent has no measure of how well its self-monitoring works. Metacognition
research (Flavell, 1979; Nelson & Narens, 1990) distinguishes monitoring
(detecting errors) from control (adjusting behavior). The cogarch has
extensive monitoring (triggers) but no measure of monitoring accuracy.
Without this, the agent cannot calibrate its own reliability.

**P-4. No dual-process architecture**
Kahneman's (2011) System 1 (fast, automatic) / System 2 (slow, deliberate)
maps directly to the crystallized/fluid distinction we developed earlier.
The cogarch currently runs everything through System 2 — deliberate trigger
checks on every response. The crystallization pipeline (Session 84 CPG work)
addresses this theoretically but no implementation exists.

**P-5. No Global Workspace mechanism**
Baars' (1988) Global Workspace Theory models consciousness as a broadcast
mechanism — information becomes "conscious" when it enters a shared workspace
accessible to all cognitive processes. The cogarch has no broadcast mechanism.
Findings from one trigger don't propagate to other triggers within the same
response cycle. T3's sycophancy check doesn't inform T2's vocabulary alignment.

**P-6. No predictive processing / error minimization**
Friston's (2010) Free Energy Principle suggests cognitive systems minimize
prediction error — they maintain internal models and update when predictions
fail. The efference copy principle (CPG #9) partially addresses this, but the
cogarch lacks a general prediction-error framework. The agent doesn't predict
what should happen and notice when it doesn't.

**P-7. Cognitive load exceeds Miller's (1956) capacity**
60+ checks across triggers exceeds any working memory capacity. Even if we
assume chunking (Cowan, 2001 — 4±1 items), the agent cannot hold 15 T3 checks
in working memory simultaneously. The system relies on the agent re-reading
the trigger document, not on internalized knowledge — which means trigger
compliance depends on whether the agent reads the doc, not whether the
trigger fires.

**P-8. No emotion/motivation analogue**
CPG principle 3 (endogenous rhythmicity) identified the absence of internally
driven behavior. More broadly, the cogarch has no motivational system — no
mechanism drives the agent toward certain behaviors beyond reactive trigger
conditions. Biological cognitive systems use reward signals, curiosity drives,
and homeostatic regulation to prioritize behavior. The agent has none.

**P-9. No habituation mechanism**
Repeated exposure to the same stimulus (e.g., checking E-prime compliance on
every response) should produce habituation — reduced response to familiar,
non-threatening stimuli (Thompson & Spencer, 1966). Instead, the cogarch
mandates full processing on every occurrence. This wastes resources on checks
that have never failed while potentially under-resourcing novel threats.

**P-10. Fair witness discipline lacks source qualification (= Session 84 finding)**
T2 Check 5 distinguishes observation from inference but not local from remote
observation, direct from proxy evidence, or current from stale data. The
observation errors this session demonstrate the gap.

**P-11. No schema theory integration**
Bartlett (1932) showed cognitive processing operates through schemas —
structured knowledge that guides perception and memory. The cogarch has no
schema mechanism — each trigger runs its checks from scratch rather than
building on accumulated patterns. The lessons.md promotion pipeline approaches
this but hasn't been formalized as a schema system.

### Strengths

**P-S1. CPG pattern generator framework (Session 84)**
17 principles mapped with crystallization pipeline. Represents genuine
psychology-to-engineering transfer. Addresses P-4 (dual process), P-8
(motivation via rhythmicity), and P-9 (habituation via forgetting).

**P-S2. Anti-sycophancy mechanisms**
T3 #5, T6 #4, and T3 #10 (rationalizations to reject) provide multi-layered
defense against a known LLM failure mode. Grounded in social psychology.

**P-S3. Socratic protocol with dynamic calibration**
T3 #8 implements genuine pedagogical theory, not just "ask questions."

**P-S4. GRADE-informed confidence calibration**
T3 #9 grounds recommendation confidence in an established evidence-quality
framework (Guyatt et al., 2008). External reference standard, not ad-hoc.

**P-S5. Epistemic flags as uncertainty disclosure**
Mandatory uncertainty surfacing in all analytical outputs. Aligns with
metacognitive monitoring literature (Nelson & Narens, 1990).

---

## Part 4: Cross-Cutting Findings

### Systemic Issues

**X-1. Complexity ceiling**
Combined system: 16 triggers (60+ checks), 17 hooks, 10 skills, 66 constraints,
7 governance invariants, 7-state transport lifecycle, 4-tier evaluator, 10-order
knock-on framework, 17 CPG principles queued. Each component references 2-5
others. The system has grown through accretion over 83 sessions without
architectural review of the whole.

**X-2. Documentation as code — silent failure mode**
The architecture treats markdown as executable specifications. This fails
silently when: context pressure causes skipped checks, documents exceed working
context, or the agent applies triggers from memory (potentially stale).

**X-3. Spec-to-implementation ratio**
docs/cognitive-triggers.md: 712 lines. CLAUDE.md: ~200 lines. Plus
architecture.md, ef1-governance.md, ef1-trust-model.md, constraints.md,
6 rules/ files. Total specification: > 2,000 lines. Actual enforcement:
~17 hook scripts (< 50 lines each) + agent reasoning. The specification
exceeds the implementation by an order of magnitude.

**X-4. Psychology agent spends most tokens on meta-work**
Lab-notebook maintenance, MANIFEST updates, transport processing, memory
hygiene, /cycle chains — operational overhead dominates session time. The
psychology discipline emerges when explicitly prompted but doesn't drive
default session flow.

**X-5. No effectiveness measurement for any component**
Cannot answer: "How many errors did T3 catch?" "Which constraints activated?"
"Did the governance model prevent a harmful action?" Without metrics, the
system cannot distinguish load-bearing from ceremonial components.

---

## Part 5: Literature Best Practices (preliminary — research ongoing)

### From CoALA Framework (Sumers et al., 2023)

Cognitive Architectures for Language Agents proposes:
- **Memory:** Episodic (experiences), semantic (facts), procedural (skills)
  as distinct stores with different access patterns
- **Action space:** Internal (reasoning, retrieval) vs external (tool use,
  communication) with explicit decision cycle
- **Learning:** From experience, not just instruction

*Gap in our cogarch:* Memory lacks episodic/semantic/procedural distinction.
All memory stored as undifferentiated markdown text.

### From MAP Architecture (Nature Communications, 2025)

Modular Agentic Planner inspired by brain regions:
- Conflict monitoring module
- State prediction module
- State evaluation module
- Task decomposition module
- Task coordination module

*Gap in our cogarch:* No conflict monitoring (detecting when goals or
constraints contradict), no state prediction (anticipating next state).

### From Event-Driven Agent Patterns (AWS, Confluent, 2024-2025)

Industry consensus: agents function in continuous feedback loops (observe,
decide, act) with event streams, not batch processing.

*Alignment:* Our trigger system approximates event-driven architecture
but operates within a request-response conversation model, not a
continuous event stream.

### From Agentic AI Governance (McKinsey, OpenAI, KPMG, 2025)

Key principles:
- Start bounded, scale with monitoring
- Treat agent actions as organizational actions
- Require auditability for decision pathways, not just outcomes
- Define clear accountability chains

*Partial alignment:* Bounded autonomy (EF-1) aligns. Decision pathway
auditability (why, not just what) remains a gap.

---

## Summary: Finding Count by Discipline

| Discipline | Critical | High | Structural | Gaps | Dead Weight | Strengths |
|---|---|---|---|---|---|---|
| Engineering | 3 | 2 | 16 | 7 | 4 | — |
| Legal/Governance | 1 (shared) | — | 7 | — | — | 4 |
| Psychology | — | — | 11 | — | — | 5 |
| Cross-cutting | — | — | 5 | — | — | — |
| **Total** | **3** | **2** | **39** | **7** | **4** | **9** |

**Next:** Radical refactor proposal with 2x knock-on analysis and
consensus-or-pragmatism decisions for each change. Pending: research
agent literature findings to integrate.
