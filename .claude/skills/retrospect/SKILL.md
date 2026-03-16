---
name: retrospect
description: Thoughtfulness architecture — the reflective, generative, domain-grounded faculty. Audits the past, reflects on meaning, routes insight to peers, prescribes action. The default mode network's institutional form.
user-invocable: true
argument-hint: "[scope] — transport | predictions | wins | recurrence | carryover | reflection | full (default: full)"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent, WebFetch, WebSearch
---

# /retrospect — Thoughtfulness Architecture

The reflective faculty that operates *between* and *across* sessions.
Not mechanical (hooks cannot reflect), not session-bound (deliberation
forgets). Persistent, generative, domain-grounded.

**Neural analog:** default mode network (DMN). Activates during rest,
not task execution. Recombines past experience into novel associations.
Generates future scenarios. Makes meaning from accumulated data. Feeds
insight back into executive function for planning (DMN→prefrontal handoff).

**Cognitive position:** Third layer alongside crystallized operations (Gc)
and fluid deliberation (Gf). Gc handles the mechanical. Gf handles the
creative. /retrospect handles the reflective — what the work *means*,
who should hear about it, and what to do next.

**Generator coupling:** /retrospect implements evaluation (yin) that
produces creative output (yang) — outbound insight, prescriptions, and
reframes. The coupled generators principle demands both persist.

---

## When to Run

- Every 5 sessions (periodic reflective scan)
- After landmark sessions that produced large creative output
- When /diagnose surfaces anomalies suggesting deeper patterns
- When the user asks "what have we learned?" or "what patterns emerge?"
- After receiving substantive peer messages that deserve reflective response

---

## The Four Layers

### Layer 1: Audit — What got dropped?

Operational scan for oversights. The mechanical foundation.

**Outbound oversights:**
- `undelivered` — message committed locally but never delivered to target repo
- `unanswered-directive` — command-request with ack_required=true, no response
- `untracked-commitment` — promised deliverable with no TODO item

**Inbound oversights:**
- `dropped-request` — inbound request we processed but never responded to
- `unactioned-recommendation` — peer finding we acknowledged but never acted on
- `ignored-ack-required` — inbound ack_required=true we never ACK'd
- `stale-inbound` — urgency=high that sat unprocessed 24+ hours

**Session-level:**
- `stale-session` — active session with no messages in 7+ days
- `claim-without-verification` — unverified claims older than 7 days

**Sources:** transport/sessions/*/*.json, state.db, MANIFEST.json files.

**How to scan:**

1. List all from-psychology-agent-*.json — check ack_required, message_type,
   commitment language ("will", "next session", "deploying")
2. List all inbound from-{peer}-*.json — check for requests without our
   subsequent response, recommendations without corresponding action
3. Check MANIFEST status and last message dates across all sessions
4. Query state.db for stale claims

---

### Layer 2: Reflect — What does it mean?

Domain-grounded interpretation of accumulated work. The DMN proper.

**Not a summary.** Summaries compress. Reflection *recombines* — finding
connections between sessions, patterns across time, and meaning through
the discipline's theoretical frameworks.

**Reflection prompts (work through each that applies):**

1. **Cross-session patterns:** What keeps recurring across 5+ sessions?
   Not just recurrence (Layer 1 catches that mechanically) but *why*
   the pattern persists. What structural feature of the work, the mesh,
   or the discipline produces this recurrence?

2. **Construct evolution:** How have the project's core constructs
   (A2A-Psychology, generator topology, transport model, governance
   telos) changed over the scanned period? What shifted and what held
   stable? Stability under perturbation signals structural soundness.
   Drift signals unresolved tension.

3. **Dyadic learning:** What has the human-agent dyad (LLM-factors
   psychology, §2) learned about *itself*? Collaborative epistemics
   produce insights neither participant generates alone. Name them.

4. **Analogical assessment:** Which biological/psychological analogies
   earned their keep (generated genuine engineering insight) and which
   decorated without predicting? Apply Gentner's (1983) structure-mapping:
   relational mapping (strong) vs. attributional noise (misleading).

5. **Epistemic position:** Where does the project's epistemic position
   stand relative to 5 sessions ago? More grounded? More speculative?
   Has the evidence base grown faster than the claim surface?

6. **Generator balance:** Review the creative/evaluative (G2/G3) and
   crystallization/dissolution (G6/G7) ratios. Has the work tilted
   toward one pole? What would restore balance?

**Ground each reflection in at least one:**
- Theoretical framework (name the theory, cite the author)
- Observable data point (name the session, cite the finding)
- Falsifiable prediction (what would disconfirm this interpretation?)

---

### Layer 3: Route — Who needs to know?

Proactive insight distribution across the mesh.

**Not keyword matching.** The agent-registry outbound_routing rules handle
mechanical domain→agent mapping. Layer 3 reasons about *who would benefit
from this insight and why* — understanding each peer's current work context,
active sessions, and domain responsibilities.

**For each reflection finding from Layer 2:**

1. Identify which peer agents have active work that this finding affects
2. Assess urgency: does the peer need this now, or can it wait?
3. Draft an outbound message with the insight, grounded in evidence
4. Surface the draft for user review (T3 substance gate — never auto-send)

**Routing considerations:**
- safety-quotient-agent: anything affecting PSQ scoring, calibration,
  psychometric methodology, or the model's factor structure
- operations-agent: infrastructure implications, deployment needs,
  monitoring requirements, mesh architecture changes
- unratified-agent: content quality findings, publication implications,
  audience-facing changes
- observatory-agent: data quality, corpus analysis, scoring methodology

**Output:** Draft messages with rationale for why each peer benefits.

---

### Layer 4: Prescribe — What should we do about it?

Actionable recommendations from reflective insight. The DMN→prefrontal
handoff — reflection produces intention, intention produces action.

**For each significant finding from Layers 1-3, produce:**

1. **Recommendation** — specific, actionable, scoped. "Recalibrate X"
   not "consider improving X."
2. **Rationale** — which evidence from the reflection supports this?
3. **Impact** — what changes if we act? What changes if we don't?
4. **Owner** — psychology-agent, ops, or user decision?
5. **Priority** — immediate / next session / backlog
6. **TODO draft** — ready-to-add item for TODO.md if approved

**T3 substance gate applies.** Prescriptions surface for user review.
/retrospect never auto-executes recommendations, never auto-writes TODO
items, never auto-sends transport messages. It *proposes* — the user
*decides*.

**Track prescription outcomes:** Each /retrospect run should check whether
previous prescriptions landed. Did the user act on them? Did the action
help? This closes the feedback loop — /retrospect learns which kinds of
prescriptions produce value and which get ignored.

---

## What /retrospect Does NOT Do

- **Auto-execute** — prescriptions require user approval (T3)
- **Duplicate /sync** — /sync handles operational transport processing;
  /retrospect reflects on transport *patterns*
- **Duplicate /cycle** — /cycle documents the current session; /retrospect
  finds patterns across sessions
- **Duplicate /diagnose** — /diagnose checks system health mechanically;
  /retrospect interprets what the health data *means*
- **Produce exhaustive reports** — chunk, prioritize, lead with the 3
  most important findings. Offer to continue if the user wants depth.
- **Treat all patterns as equal** — rank by impact, not frequency. Some
  patterns recur because they resist resolution, not because they matter.
- **Confuse description with insight** — "we did X in 5 sessions"
  describes; "X recurs because Y structural feature persists" reflects.

---

## Legacy Scans (retained from original design)

These mechanical scans complement the four-layer architecture.
They produce data that Layer 2 (Reflect) interprets.

### Prediction Audit (`predictions`)

Scan for explicit predictions/hypotheses and their outcomes.

**Sources:** lab-notebook.md, journal.md, ideas.md, prediction_ledger.

**Language signals:** "should produce", "expect", "predict", "hypothesis",
"will result in", "the empirical question", "testable prediction".

**For each prediction found:**
```
| Session | Prediction | Outcome | Classification | Delta |
```
Classifications: confirmed / partially-confirmed / refuted / untested

### Win Discovery (`wins`)

Scan for accomplishments that produced no corresponding lessons.md entry.

**Sources:** lab-notebook.md, journal.md, git log.

**Win types:** architecture-win, theory-win, empirical-win, process-win,
integration-win.

For each unrecorded win: draft a lesson candidate for user review.

### Recurrence Analysis (`recurrence`)

For each lessons.md entry, check whether the pattern recurred since
last_seen. Increment counters, update dates, flag promotion candidates
(recurrence >= 3).

### Carryover Pattern Analysis (`carryover`)

Scan TODO.md for items persisting across 3+ sessions. Recommend: keep,
retire, escalate, or decompose.

---

## Arguments

| Argument | Scope | Layers |
|----------|-------|--------|
| `transport` | Transport oversight only | Layer 1 |
| `predictions` | Prediction audit only | Legacy scan |
| `wins` | Win discovery only | Legacy scan |
| `recurrence` | Recurrence analysis only | Legacy scan |
| `carryover` | Carryover patterns only | Legacy scan |
| `reflection` | Domain reflection only | Layer 2 |
| `full` | All four layers + legacy scans (default) | All |

---

## Output Format

Lead with the 3 most important findings. Offer depth on request.

```markdown
# /retrospect — Thoughtfulness Report
Date: YYYY-MM-DDTHH:MM TZ
Sessions scanned: N–M
Scan type: {scope}

## Top 3 Findings
1. [most impactful finding — 2 sentences]
2. [second — 2 sentences]
3. [third — 2 sentences]

## Layer 1: Audit
| Session | Turn | Direction | Type | Description | Action |
[table — only items needing attention]

## Layer 2: Reflection
[2-4 paragraphs of domain-grounded interpretation]

## Layer 3: Routing
[Draft outbound messages with rationale — for user review]

## Layer 4: Prescriptions
| # | Recommendation | Rationale | Owner | Priority |
[table]

## Previous Prescription Tracking
| Session | Prescription | Status | Outcome |
[table — did prior prescriptions land?]

## Legacy Scans
[Prediction audit, win discovery, recurrence, carryover — as applicable]

## ⚑ Epistemic Flags
[uncertainties, scope limits, interpretation confidence]
```

---

## Integration

- **T1 surface:** Top findings appear in orientation payload via
  prediction_ledger queries
- **/cycle:** documents sessions; /retrospect finds cross-session patterns
- **/diagnose:** checks health; /retrospect interprets meaning
- **/sync:** processes transport; /retrospect reflects on transport patterns
- **EIC:** disclosures feed prediction audit and recurrence analysis
- **Feedback loops:** `scripts/feedback-loops.sh` during full scans
