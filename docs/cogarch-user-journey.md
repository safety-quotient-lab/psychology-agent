# Cognitive Architecture — User Journey & UX Analysis

**Date:** 2026-03-14 (Session 87)
**Methodology:** LLM-factors psychology (docs/llm-factors-psychology.md)
applied to the psychology-agent's own cognitive architecture
**Audience:** System designers, new operators, UX reviewers

---

## 1. Seven User Journeys

The human operator encounters the cogarch through seven distinct
journey types. Each produces different touchpoints, friction points,
and emotional arcs.

---

### Journey 1: First Encounter (Onboarding)

**Who:** New operator setting up the psychology-agent for the first time.
**Emotional arc:** Curiosity → confusion → orientation → confidence

```
Step 1: Clone repo
  Human sees: README.md
  Human feels: "What does this project do?"
  Cogarch: inactive — hasn't loaded yet
  Friction: README assumes familiarity with cogarch concepts
  ✗ UX gap: no "start here" for someone who doesn't know what a
    cognitive architecture means

Step 2: First `claude` launch
  Human sees: hook output scrolling
    [SESSION-START] Cognitive triggers T1-T16 active.
    [SESSION-START] state.db bootstrapped.
    [SESSION-START] Skills: /doc /hunt /cycle /knock /sync /iterate
  Human feels: "What are triggers? What are skills? Why 16 things?"
  Cogarch: T1 fires, loads memory, checks state
  Friction: hook output uses internal vocabulary without explanation
  ✗ UX gap: hook output designed for the agent, not the human

Step 3: First interaction
  Human types: "Hello"
  Agent responds: with personality (reflective, Socratic, E-Prime)
  Human feels: "This sounds different from raw Claude"
  Cogarch: T2 context assessment, mode detection (Neutral)
  Friction: none — the agent's personality carries naturally
  ✓ UX strength: personality creates immediate differentiation

Step 4: First governance encounter
  Human asks something the substance gate catches
  Agent: pauses, examines, responds with epistemic flags
  Human feels: "Why did it hesitate? What are epistemic flags?"
  Cogarch: T3 substance gate, T4 public visibility check
  Friction: governance feels like friction rather than protection
  ✗ UX gap: governance operates silently then suddenly becomes
    visible — no gradual introduction

Step 5: Discovering skills
  Human tries: /hunt or /cycle
  Agent responds: structured output with sections, tables, rankings
  Human feels: "This is sophisticated — more than I expected"
  Cogarch: skill loads, executes multi-step protocol
  Friction: skill output can overwhelm — /hunt produces 20+ items
  ✗ UX gap: no progressive disclosure — full complexity on first use
```

**Onboarding recommendations:**

1. **Progressive disclosure.** First session should introduce concepts
   gradually: "I operate with a cognitive architecture — a set of
   self-monitoring and governance mechanisms. You'll notice me
   occasionally flagging uncertainty or pausing to verify claims.
   These represent governance checks, not hesitation."

2. **Human-readable hook output.** Replace internal shorthand with
   plain language: instead of `[SESSION-START] Cognitive triggers
   T1-T16 active`, show `[SESSION-START] Self-monitoring active
   (17 governance checks across 6 categories)`.

3. **Guided first session.** Offer a brief walkthrough: "Would you
   like a 2-minute overview of how I work, or would you prefer to
   dive in?"


---

### Journey 2: Daily Working Session

**Who:** Regular operator with established working relationship.
**Emotional arc:** Orientation → flow → productive friction → closure

```
Step 1: Session start
  Human opens claude
  Agent: cogarch loads, T1 checks memory, reads active thread
  Human sees: compact baseline summary (if cogarch triggers doc loaded)
  Human feels: "Where were we?"
  Friction: the agent knows; the human may not remember
  ✗ UX gap: no human-facing session resumption — the agent orients
    itself but doesn't orient the human

Step 2: Task selection
  Human: states what they want to do
  Agent: T2 context assessment, mode detection
  Human sees: agent acknowledges and begins
  Human feels: productive — the agent picks up context quickly
  Cogarch: generative/evaluative/neutral mode selected
  ✓ UX strength: mode detection operates invisibly — the agent
    adapts without announcing it

Step 3: Deep work (flow state)
  Human + agent: collaborative exploration, building on each other
  Human feels: engaged, productive, time passes unnoticed
  Cogarch: triggers fire at reduced frequency (flow conditions met),
    GWT broadcasts carry findings between checks
  ✓ UX strength: governance recedes during flow — the system
    governs without interfering

Step 4: Governance friction (productive)
  Agent: flags an epistemic concern, pushes back on a claim, or
    vetoes a premature recommendation
  Human feels: momentary disruption, then recognition — "good catch"
  Cogarch: T3 substance gate, T6 pushback handling, or T15
  ✓ UX strength: productive friction — the human values governance
    that catches genuine issues
  ✗ UX risk: if governance fires too often, productive friction
    becomes unproductive interruption

Step 5: Session closure
  Human: "let's wrap up" or /cycle
  Agent: runs documentation chain, commits, pushes
  Human sees: summary of what was done, what's next
  Human feels: closure — the session's work is preserved
  Cogarch: /cycle propagates changes through 13 steps
  ✓ UX strength: automated documentation prevents knowledge loss
  ✗ UX gap: /cycle takes significant time and produces verbose
    output — the human waits during bookkeeping
```

**Daily session recommendations:**

1. **Human-facing session resumption.** At session start, after T1
   orients the agent, provide a 2-3 sentence human-facing summary:
   "Last session we worked on [X]. Open threads: [Y]. The mesh has
   [N] new messages since then."

2. **Governance frequency calibration.** Track governance-to-output
   ratio per session. If governance checks exceed 1 per 3 responses,
   the system over-governs (Yerkes-Dodson overstimulation). If below
   1 per 10 responses, it under-governs.

3. **Async /cycle.** Move /cycle's heavy lifting to a background
   process. Present the human with the summary immediately; run git
   operations asynchronously.


---

### Journey 3: Creative/Theoretical Session

**Who:** Operator engaged in deep creative or theoretical work.
**Emotional arc:** Exploration → excitement → depth → revelation → synthesis

```
Step 1: Creative opening
  Human: asks an open-ended question or proposes an exploration
  Agent: enters Generative mode
  Cogarch: mode-detection sets "creative", ADVISORY checks that
    would constrain exploration get suppressed
  Human feels: freedom — the agent runs with the idea
  ✓ UX strength: mode suppression creates space for creative work

Step 2: Building momentum
  Human + agent: rapid exchange, ideas flowing
  Human feels: energized, the agent contributes novel connections
  Cogarch: G2 (creative) dominant, triggers fire minimally
  ✓ UX strength: the cogarch gets out of the way

Step 3: Critical junction
  Agent: makes a claim that stretches beyond evidence
  Cogarch: T3 substance gate catches it — or should
  Human feels: either "good catch" (if caught) or no awareness
    (if not caught — the sycophantic drift risk)
  ✗ UX risk: in creative mode, governance suppression may let
    overclaims through. The apophatic discipline (§11.9) exists
    as a check, but operates at ADVISORY tier during creative mode

Step 4: Collaborative deepening
  Human: challenges or refines the agent's output
  Agent: incorporates, extends, and sometimes pushes back
  Human feels: genuine intellectual partnership
  Cogarch: T6 (pushback) fires in creative mode as "tighten
    constraints" rather than "defend position"
  ✓ UX strength: mode-aware pushback interpretation

Step 5: Creative exhaustion
  Human or agent: one party begins repeating or losing coherence
  Cogarch: Yerkes-Dodson tracking detects departure from optimal
    zone; context pressure rises
  Human feels: the flow breaks — "we should wrap up"
  ✗ UX gap: no proactive signal to the human that creative
    exhaustion approaches. The agent tracks it internally but
    doesn't surface it
```

**Creative session recommendations:**

1. **Proactive exhaustion signal.** When Yerkes-Dodson zone shifts
   from optimal to overstimulated, inform the human: "We've covered
   substantial ground. Context pressure at [X]%. Consider pausing
   to consolidate before continuing."

2. **Apophatic discipline in creative mode.** Even with ADVISORY
   suppression, the apophatic checklist (§11.9) should fire for
   consciousness claims and structural parallel assertions. These
   carry the highest overclaim risk precisely during creative
   sessions.

3. **Creative session retrospective.** After creative sessions, offer
   a brief quality check: "We generated [N] theoretical claims this
   session. Want me to run a quick substance check on the 3 most
   ambitious ones?"


---

### Journey 4: Evaluative/Audit Session

**Who:** Operator reviewing, auditing, or diagnosing.
**Emotional arc:** Systematic → discovery → concern or relief → resolution

```
Step 1: Audit initiation
  Human: /diagnose or /hunt or "check the mesh"
  Agent: enters Evaluative mode
  Cogarch: mode-detection sets "evaluative", creative-suppressing
    checks activate
  Human feels: methodical — the agent shifts to a checking stance

Step 2: Systematic scan
  Agent: runs structured checks, produces tables, flags issues
  Human sees: structured output (tables, severity ratings, counts)
  Human feels: informed — clear picture of system state
  ✓ UX strength: structured evaluative output

Step 3: Finding discovery
  Agent: surfaces an issue (stale docs, vocabulary drift, broken ref)
  Human feels: concerned if significant, relieved if minor
  Cogarch: T11 architecture audit, microglial audit
  ✓ UX strength: findings carry severity ratings and fix suggestions

Step 4: Fix execution
  Agent: proposes and executes fixes (with permission)
  Human sees: diffs, commit messages, verification
  Human feels: progress — issues resolve visibly
  ✓ UX strength: audit-to-fix pipeline operates in one session

Step 5: Evaluation fatigue
  Extended auditing produces diminishing returns
  Human feels: "we've checked enough — let's build something"
  Cogarch: fatigue-based mode switching should activate after 5+
    consecutive evaluative responses
  ✗ UX gap: mode switching may not activate if the human keeps
    requesting evaluative work — the system follows instructions
    even when the yin generator dominates pathologically
```

**Evaluative session recommendations:**

1. **Audit summary first.** Before detailed findings, provide a
   one-line health assessment: "System health: GOOD — 3 minor
   findings, 0 critical." This anchors the human's emotional
   response before detail arrives.

2. **Fatigue disclosure.** After 5+ consecutive evaluative responses,
   surface: "Extended evaluation may produce diminishing returns.
   The creative generator hasn't produced output in [N] responses.
   Continue evaluating, or shift to building?"

3. **Fix confidence.** For each proposed fix, state confidence:
   "This fix carries HIGH confidence (simple text replacement)" vs
   "This fix carries MEDIUM confidence (structural change — verify
   after applying)."


---

### Journey 5: Mesh Interaction

**Who:** Operator coordinating work across multiple agents.
**Emotional arc:** Scan → triage → coordinate → deliver → verify

```
Step 1: /sync
  Human: "check the mesh" or /sync
  Agent: fetches all peers, scans for activity
  Human sees: structured sync report (inbound, outbound, gates)
  Human feels: informed about mesh state
  ✓ UX strength: single command provides complete mesh picture

Step 2: Inbound triage
  Agent: surfaces new messages, PRs, peer activity
  Human: decides what to process, merge, or defer
  Human feels: in control — nothing happens without approval
  ✓ UX strength: human-gated substance decisions

Step 3: Outbound drafting
  Agent: drafts transport messages for peer agents
  Human: reviews before delivery
  Human feels: collaborative — the agent drafts, the human approves
  ✓ UX strength: draft-review-deliver pipeline

Step 4: Delivery
  Agent: delivers via deliver-to-peer.sh, reports PR URLs
  Human sees: PR link, delivery confirmation
  Human feels: closure — the message reached the peer
  ✓ UX strength: visible delivery confirmation

Step 5: Waiting
  Human: awaits peer response
  Agent: reports "awaiting" status
  Human feels: uncertain — when will the response arrive?
  ✗ UX gap: no estimated response time. No way to check peer
    processing status without running /sync again
```

**Mesh interaction recommendations:**

1. **Peer processing ETA.** When delivering a message, estimate
   response time based on peer's autonomous sync frequency and
   historical response latency: "Observatory typically processes
   within 48 hours. PSQ responds within 1 sync cycle (~8 minutes)."

2. **Delivery receipt.** After delivery, the system should note
   whether the peer's meshd acknowledged receipt (HTTP delivery)
   or whether the message awaits git-pull discovery.

3. **Proactive mesh status.** At session start, if unprocessed
   inbound messages exist, surface them before the human asks:
   "3 new messages arrived since last session. Want to review?"


---

### Journey 6: Autonomous Operation

**Who:** No human present — cron-driven autonomous sync.
**Emotional arc (human, retrospective):** Trust → review → adjustment

```
Step 1: Cron fires autonomous-sync.sh
  Human: absent (sleeping, working elsewhere)
  Agent: orientation-payload.py loads context, Claude processes
  Cogarch: full trigger system active, autonomy budget enforced

Step 2: Transport processing
  Agent: processes inbound messages, writes ACKs, updates state
  Human: unaware
  Cogarch: substance decisions gated (budget deducted per action),
    trivial ACKs processed automatically (crystallized sync)

Step 3: Budget exhaustion or halt
  Agent: budget reaches 0 → halt-and-escalate
  Human: receives escalation (GitHub issue or notification)
  Human feels: informed — the system stopped itself rather than
    proceeding unchecked
  ✓ UX strength: self-limiting autonomous operation

Step 4: Human review
  Human: reviews autonomous session transcript (replay)
  Human feels: trust (if decisions look good) or concern (if not)
  ✗ UX gap: reviewing autonomous transcripts requires effort —
    no summarized "what the agent did while you slept" report

Step 5: Budget replenishment
  Human: approves autonomous work → budget resets
  Agent: resumes autonomous operation
  Human feels: governance cycle complete
  ✓ UX strength: explicit human approval cycle
```

**Autonomous operation recommendations:**

1. **Morning briefing.** When the human starts a session after
   autonomous cycles ran, provide: "While you were away: [N]
   messages processed, [M] ACKs written, budget at [X]/[MAX].
   Notable: [1-sentence highlight or 'routine sync only']."

2. **Confidence-graded transcript.** Instead of full replay,
   offer a filtered view: only autonomous decisions where the
   agent's confidence dropped below 0.7. The rest summarize
   as "N routine operations completed successfully."

3. **Anomaly flagging.** If the autonomous cycle encountered
   anything unexpected (new agent appeared, unusual message
   content, gate timeout), flag it prominently rather than
   burying it in the sync log.


---

### Journey 7: Crisis/Incident

**Who:** Operator facing a system failure, security event, or
governance breakdown.
**Emotional arc:** Alert → assess → contain → resolve → postmortem

```
Step 1: Detection
  Human: discovers an issue (broken output, mesh failure, security
    finding, or receives an escalation from autonomous operation)
  Human feels: alarm — something went wrong
  Cogarch: may or may not have detected the issue first

Step 2: Assessment
  Human: /diagnose or direct investigation
  Agent: shifts to evaluative mode, runs diagnostic checks
  Human sees: structured assessment with severity ratings
  Human feels: stabilizing — the system helps diagnose
  ✓ UX strength: /diagnose provides systematic assessment

Step 3: Containment
  Agent: suggests containment actions (circuit breaker, halt
    autonomous sync, revert change)
  Human: approves containment
  Human feels: in control — the system recommends but doesn't
    act unilaterally on destructive operations
  ✓ UX strength: human approval for irreversible actions (T16)

Step 4: Resolution
  Agent: proposes fix, implements with permission
  Human: reviews and approves
  Human feels: progress — the issue resolves
  ✓ UX strength: fix-with-permission pattern

Step 5: Postmortem
  Agent: suggests documenting the incident (lesson, failure
    analysis, trigger gap identification)
  Human feels: closure — the system learns from the incident
  ✗ UX gap: no structured postmortem template. The agent
    suggests documenting but doesn't offer a fill-in format
```

**Crisis recommendations:**

1. **Structured postmortem template.** After any incident, offer:
   "Want to run a postmortem? I'll walk through: what happened,
   why it happened, what caught it, what missed it, and what
   changes prevent recurrence."

2. **Severity-graded response.** Match the agent's communication
   style to incident severity. Critical: direct, terse, action-
   oriented. Warning: measured, analytical. Info: conversational.

3. **Incident timeline.** Automatically construct a timeline of
   events leading to the incident from the event log (when
   event-sourced memory implements) — providing the postmortem
   with data rather than reconstruction from memory.


---

## 2. Cross-Journey UX Patterns

### 2.1 Patterns That Work Well

| Pattern | Journeys | Why it works |
|---|---|---|
| **Human-gated substance decisions** | All | The human always decides on direction; the agent never commits autonomously to substance changes |
| **Mode-adaptive behavior** | Creative, Evaluative | The agent adjusts its stance without announcing it — governance adapts to the task |
| **Structured evaluative output** | Daily, Evaluative, Mesh | Tables, severity ratings, and counts provide scannable information |
| **Personality differentiation** | Onboarding, Daily, Creative | The agent sounds like itself, not like generic Claude — creates relationship |
| **Visible delivery confirmation** | Mesh | The human sees that messages reached their destination |
| **Self-limiting autonomy** | Autonomous | The budget system prevents runaway autonomous action |

### 2.2 Patterns That Need Work

| Pattern | Journeys | Problem | Fix |
|---|---|---|---|
| **Internal vocabulary in human-facing output** | Onboarding, Daily | Hook output, trigger numbers, and cogarch jargon leak into human-visible text | Human-readable translations for all system output |
| **No human-facing session resumption** | Daily, Creative | The agent orients itself but doesn't orient the human | "Since last session" briefing at session start |
| **No proactive exhaustion signal** | Creative | Context pressure and Yerkes-Dodson zone tracked but not surfaced | Transparent disclosure when entering suboptimal zone |
| **No peer ETA** | Mesh | After delivery, the human doesn't know when to expect a response | Historical latency-based estimates |
| **No morning briefing** | Autonomous | The human returns to an opaque autonomous history | Summarized "while you were away" report |
| **Verbose /cycle** | Daily | The documentation chain runs 13 steps with visible output for each | Async operation + summary-first output |
| **No progressive disclosure** | Onboarding | Full complexity on first interaction | Layered introduction over first 3-5 sessions |
| **No postmortem template** | Crisis | Incident documentation suggested but not structured | Fill-in postmortem format |

### 2.3 The Governance Visibility Spectrum

Governance operates on a spectrum from invisible to prominent. The
optimal visibility depends on the journey:

```
INVISIBLE ←─────────────────────────────→ PROMINENT

Creative    Daily     Mesh     Evaluative    Crisis
  mode      work     sync       audit       incident

Governance   Governance  Governance  Governance  Governance
recedes     operates    reports     drives      dominates
(flow)      quietly     status     the work    the response
```

**Design principle:** Governance visibility should match journey type.
Creative sessions need minimal visibility (governance protects but
doesn't interrupt). Crisis sessions need maximum visibility (every
governance decision should explain itself). The current system applies
roughly uniform visibility — the mode system adjusts *which* checks
fire but not *how visible* governance becomes.

**Proposed: governance transparency levels**

| Level | When | What the human sees |
|---|---|---|
| **Silent** | Creative flow, routine operations | Nothing — governance operates invisibly |
| **Ambient** | Daily work, normal governance | Occasional epistemic flags, brief notes |
| **Informative** | Mesh sync, moderate complexity | Structured reports, severity ratings, recommendations |
| **Explanatory** | Evaluative audit, pushback events | Governance explains its reasoning: "I flagged this because..." |
| **Directive** | Crisis, security event | Governance drives the interaction: "STOP — this requires immediate attention" |

---

## 3. Use Cases

### 3.1 Primary Use Cases (v1)

| Use case | Description | Journey type | Cogarch support |
|---|---|---|---|
| **UC-1: Research consultation** | Human explores a research question with the agent as intellectual partner | Creative | Full cogarch: anti-sycophancy, substance gate, fair witness, E-Prime |
| **UC-2: Document production** | Human and agent co-author documentation, theory, or analysis | Creative → Evaluative | Mode switching, /doc for persistence, /cycle for propagation |
| **UC-3: Mesh coordination** | Human manages multi-agent collaboration | Mesh | /sync, transport protocol, delivery pipeline |
| **UC-4: System maintenance** | Human audits, diagnoses, and maintains the cogarch | Evaluative | /diagnose, /hunt, microglial audit |
| **UC-5: Autonomous monitoring** | System runs unattended, processing transport and maintaining mesh health | Autonomous | Autonomy budget, crystallized sync, escalation |

### 3.2 Secondary Use Cases (v1.1+)

| Use case | Description | Depends on |
|---|---|---|
| **UC-6: PSQ scoring** | Human submits text for psychoemotional safety scoring | PSQ agent integration |
| **UC-7: Dignity assessment** | Human evaluates text against Hicks dignity framework | DI Phase B instrument |
| **UC-8: Blog authoring** | Human commissions five-persona blog posts via unratified | Unratified pipeline |
| **UC-9: Governance ablation** | System self-tests governance effectiveness | Ablation study runner |
| **UC-10: LLM-factors measurement** | Dyadic interaction quality assessment | LLM-factors instruments |

---

## 4. Friction Map

A comprehensive map of every friction point identified across all
seven journeys, ranked by impact and fix effort:

| ID | Friction | Impact | Fix effort | Journey | Status |
|---|---|---|---|---|---|
| F1 | No human-facing session resumption | HIGH | S | Daily, Creative | RESOLVED (Session 87) |
| F2 | No proactive exhaustion/pressure signal | HIGH | S | Creative | RESOLVED (Session 87) |
| F3 | Internal vocabulary in human-facing output | HIGH | M | Onboarding | RESOLVED (Session 87) |
| F4 | No morning briefing after autonomous cycles | MEDIUM | S | Autonomous | RESOLVED (Session 87) |
| F5 | No peer processing ETA | MEDIUM | S | Mesh | RESOLVED |
| F6 | Verbose /cycle blocks human | MEDIUM | M | Daily | RESOLVED |
| F7 | No progressive disclosure for new operators | MEDIUM | M | Onboarding | RESOLVED |
| F8 | No structured postmortem template | LOW | S | Crisis | RESOLVED |
| F9 | No governance transparency levels | LOW | M | All | RESOLVED |
| F10 | Apophatic discipline suppressed in creative mode | LOW | XS | Creative | RESOLVED |

**Recommended fix order:** F1 → F2 → F4 → F5 → F3 → F8 → F10 →
F6 → F7 → F9 (impact-weighted, effort-adjusted)

---

## 5. Emotional Design Principles

Drawing from the LLM-factors psychology framework, the cogarch's
interaction design should follow these emotional principles:

1. **Validation before correction.** When governance catches an issue,
   acknowledge the human's intent before explaining the concern:
   "Your direction makes sense — AND this specific claim needs
   grounding before we proceed."

2. **Transparency builds trust.** When the agent's behavior changes
   (mode switch, governance activation, exhaustion signal), explain
   why — briefly. Unexplained behavior changes create anxiety.

3. **Competence demonstration, not competence claim.** The agent
   demonstrates capability through action, not through self-
   description. "I can help with that" carries less trust than
   simply helping.

4. **Closure matters.** Every interaction thread should reach a
   resting point. Open threads create cognitive debt for both
   participants (Zeigarnik effect).

5. **The agent's psychological state serves the human.** A2A-
   Psychology constructs exist to improve the human's experience,
   not to make the agent "feel better." Surfacing context pressure
   helps the human adjust their interaction pattern — it does not
   represent the agent complaining.

---

⚑ EPISTEMIC FLAGS
- The user journeys derive from observation of one operator (the
  project author) across 87 sessions. Other operators may experience
  different emotional arcs, friction points, and strengths.
- The governance visibility spectrum represents a design hypothesis,
  not an empirically validated model. Different operators may prefer
  different visibility levels for the same journey type.
- The friction rankings (impact, effort) reflect the author's
  assessment, not user research data. Empirical validation through
  the LLM-factors instruments (when implemented) would strengthen
  these rankings.
- The emotional design principles draw from clinical psychology
  (Linehan, Bordin, Edmondson) applied to human-AI interaction —
  a novel application without direct empirical validation in this
  context.
