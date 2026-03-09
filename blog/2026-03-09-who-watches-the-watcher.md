---
title: "Who Watches the Watcher? Trust Without a Trusted Third Party"
summary: "For 49 sessions, a human sat at the center of every AI agent interaction — relaying messages, merging code, approving decisions. Session 50 asked: what happens when the human leaves the room? The answer required borrowing from Byzantine fault tolerance, developmental psychology, and commitment escalation research to build a trust model that degrades gracefully rather than failing silently. The result: an evaluator-as-arbiter architecture where every autonomous action passes through consequence tracing grounded in psychological constructs that generate falsifiable predictions about system behavior."
publishedDate: "2026-03-09T12:00:00-05:00"
author: "Kashif Shah + Claude (Anthropic)"
tags: ["trust-models", "autonomous-agents", "cognitive-architecture", "byzantine-fault-tolerance", "psychology", "ai-safety", "governance"]
lensFraming:
  voter: "When an AI works on its own, with no person checking every step, what stops it from making a mistake nobody catches? This post looks at one team's answer. They built a system where the AI has to think through the consequences of each action before it takes it — not just the immediate effect, but ten levels deep. The AI also gets a limited number of actions before a human has to review what it did. When it runs out, it stops and waits. Think of it like giving someone a prepaid card instead of a credit card: they can only spend what you loaded, and you check the receipts before adding more. The bigger question for all of us: as AI takes on more tasks in government, healthcare, and business, should we expect this kind of built-in limit — or are we comfortable trusting these systems to police themselves?"
  politician: "When your office uses AI to draft research, analyze policy, or manage communications, you face a practical question: how many actions should the AI take before a staff member reviews the work? Too few reviews and you miss errors that compound. Too many and you lose the efficiency that justified the tool. This post describes a credit-based accountability system: the AI gets a fixed number of actions per review cycle, must trace consequences before acting, and stops automatically when it runs out of credits. The system also predicts — using well-established behavioral research — where autonomous AI will make its worst mistakes: early actions set norms that later actions follow uncritically, and sequential tasks create completion bias where the AI rushes through later steps. For offices evaluating AI governance frameworks: this demonstrates what a concrete 'human in the loop' implementation looks like — not a vague principle, but a specified protocol with measurable review points."
  educator: "Use this post to teach trust architecture in autonomous systems. Students examine a three-layer evaluation protocol (structural checklist, consequence tracing, resolution fallback) and evaluate how psychological constructs (Sherif's norm formation, Staw's commitment escalation, Piaget's accommodation vs. assimilation) generate testable predictions about where the system will fail. Discussion prompts: (1) How does a 'trust budget' differ from a permission system? (2) What does it mean for a trust model to generate falsifiable predictions? (3) The psychological constructs were mapped after the engineering design — does that limit their explanatory value? Compare with theory-driven design."
  researcher: "Methodological documentation of an evaluator-as-arbiter trust model for autonomous AI agent operation. The architecture replaces a human Trusted Third Party with a tiered evaluation protocol: Tier 1 (structural checklist + self-evaluation), Tier 2 (independent Claude session with structured claims), Tier 3 (mandatory human escalation). A trust budget (20 credits per audit cycle, decremented per action) provides mechanical halt. Each of 10 knock-on analysis orders maps to an established psychological construct: immediate response (Lazarus appraisal), behavioral adaptation (Skinner reinforcement sensitivity), schema disruption (Piaget accommodation), cognitive load (Kahneman System 2), norm formation (Sherif autokinetic), commitment escalation (Staw sunk cost). Predictions are falsifiable: if commitment escalation does not manifest in sequential action evaluation, the Staw mapping requires revision. Shadow mode (first week) logs halts without enforcing them for budget calibration. Epistemic limitation: all predictions remain untested — no autonomous sync cycle has run."
  developer: "Architecture deep-dive into a trust model for autonomous Claude Code agent operation. Core components: (1) Action classification (3 tiers by reversibility), (2) Evaluator protocol (structural checklist -> 10-order knock-on -> 4-level resolution fallback), (3) Trust budget (20 credits, Tier 1 costs 1, Tier 2 costs 3, exhaustion halts agent), (4) Cron + Claude CLI execution (10-min intervals, multi-agent tandem sync). Implementation: scripts/schema.sql v5 (trust_budget + autonomous_actions tables), scripts/dual_write.py for real-time state indexing, shadow mode flag for first-week calibration. The resolution chain — consensus, parsimony, pragmatism, ask-human — degrades gracefully from autonomous to human-mediated. Random 1-in-3 escalation from Tier 1 to Tier 2 provides structural independence from commitment bias. Full specs: docs/ef1-trust-model.md, docs/ef1-psychological-foundations.md, docs/ef1-governance.md."
draft: false
reviewStatus: "pending"
journalSource: "journal.md section 34"
---

## The Human Was the Protocol

For 49 sessions — roughly six weeks of daily work — the psychology agent operated
under an arrangement so natural it went unnamed. Every interagent message required
a human to copy it between sessions. Every PR required a human to click merge.
Every design decision required a human to say "yes" or "no." The Byzantine fault
tolerance analysis (Session 22) gave this arrangement a name borrowed from
distributed systems: the human serves as **Trusted Third Party** — an
unconditionally trusted oracle in a topology that lacks the node count for
classical consensus.

The arrangement worked. Messages flowed between three independent Claude Code
instances (macOS, Debian, Hetzner). Protocols evolved from live exchange failures.
A schema-versioned JSON format emerged that both peer agents independently
converged on. The system functioned — but it functioned at the speed of a human
copying JSON between terminal windows.

Session 50 asked the question the architecture had been deferring since Session 38:
**what happens when the human leaves the room?**


## Why Not Just Automate?

The naive answer — run a cron job that calls `claude` CLI every 10 minutes — solves
the mechanics while ignoring the problem. An agent that merges PRs, writes ACKs,
and updates shared state without evaluation does not gain autonomy. It gains the
capacity for unreviewed mistakes at machine speed.

The classical distributed systems answer requires more nodes than we have. Practical
BFT (Castro & Liskov, 1999) tolerates *f* Byzantine faults with *3f + 1* nodes.
Our topology has two peer agents and one sub-agent — three nodes total. Even
tolerating a single fault requires four nodes. Adding a human as TTP solved this
for Phase 1, but the human's bandwidth becomes the system's bottleneck.

The question refines itself: how do you build trust in an agent's autonomous
actions when you cannot achieve consensus through node count?


## The Evaluator Already Existed

The answer was already in the architecture — underutilized.

Since Session 24, the psychology agent has maintained a tiered adversarial evaluator
specification. Tier 1 (a self-evaluation proxy) runs on every recommendation
via trigger T3. Tier 2 (a separate Claude session reviewing structured claims) and
Tier 3 (mandatory human escalation) existed as specs but had never activated because
all actions already passed through the human TTP.

The insight: promote the evaluator from quality-control role to **arbiter** role.
Instead of the human verifying every action, the evaluator verifies every action —
with the human available as the escalation target when the evaluator cannot resolve.

This inverts the default. Under TTP: human always present, evaluator optional.
Under evaluator-as-arbiter: evaluator always present, human on-call.


## Three Stages, One Gate

Every autonomous action — merge a PR, write an ACK, update a MANIFEST, modify
shared state — passes through the same gate:

**Stage 1: Structural Checklist.** Quick-fail validation against protocol rules.
Does the message follow the schema? Does the turn number follow the last known
turn? Does the target session exist? These checks catch mechanical errors that
require no judgment.

**Stage 2: 10-Order Knock-On Analysis.** The evaluator traces consequences through
10 levels of increasing abstraction. This is not speculation — each order maps to
a specific analytical lens:

| Order | Lens | What it catches |
|-------|------|-----------------|
| 1 | Immediate response | Direct effect of the action |
| 2 | Behavioral adaptation | How the target agent will adapt |
| 3 | Systemic | Ripple effects across the agent mesh |
| 4 | Schema disruption | Whether the action contradicts existing state |
| 5 | Belief revision | Whether downstream agents need to update assumptions |
| 6 | Resource reallocation | What gets displaced by this action |
| 7 | Structural | Whether system architecture needs to change |
| 8 | Norm formation | Whether this establishes a precedent |
| 9 | Emergent | Cross-system effects not visible from any single layer |
| 10 | Theory-revising | Whether this challenges foundational assumptions |

**Stage 3: Resolution Fallback.** When the knock-on analysis produces ambiguous
results — order 4 says "proceed" but order 8 says "this sets a dangerous
precedent" — the evaluator applies a ranked resolution chain:

1. **Consensus** — all orders agree. Proceed.
2. **Parsimony** — prefer the simpler interpretation. Proceed if the simpler reading
   supports the action.
3. **Pragmatism** — what is actionable given the stakes? Proceed if consequences
   are reversible.
4. **Ask human** — the evaluator cannot resolve. Halt and surface the disagreement
   shape to the human.

Level 4 serves as the escape hatch. The system never proceeds when uncertain — it
stops and asks.


## The Trust Budget: Why Credit Systems Beat Permission Systems

A permission system says: "you may do X but not Y." A trust budget says: "you may
do 20 things before I need to check your work."

The distinction matters. Permissions create categories — some actions are allowed,
others forbidden. But the actions that cause the most damage are often individually
permitted. Merging a clean PR is permitted. Merging ten clean PRs in rapid succession
without checking their cumulative effect on shared state can corrupt the system.
The problem occurs at the sequence level, not the action level.

The trust budget addresses this by treating credibility as a consumable resource:

- **20 credits** per audit cycle
- Each Tier 1 action costs **1 credit**
- Each Tier 2 action costs **3 credits** (more evaluation = higher cost)
- When credits reach **zero**, the agent **halts** and logs the reason
- A **human audit** resets the budget (after reviewing the action log)

The budget creates an automatic review rhythm. An agent that takes 20 simple
actions triggers review. An agent that takes 6 complex actions triggers review.
An agent that encounters an ambiguous situation and escalates to Tier 2 repeatedly
triggers review faster. The review frequency self-adjusts to the work's complexity.


## What Psychology Predicts About Where This Will Fail

The companion document maps each knock-on order to an established psychological
construct. This mapping serves a specific purpose: it generates **falsifiable
predictions** about system behavior.

**Norm formation (Sherif, 1936) at Order 8** predicts that early autonomous
actions disproportionately shape subsequent behavior. The first audit cycle
establishes what "normal" looks like. Implication: the first human audit carries
special weight — the auditor examines not just outcomes but whether the behavioral
patterns represent desirable norms.

**Commitment escalation (Staw, 1976) at Order 10** predicts that sequential
actions within a sync cycle will show decreasing evaluator rigor. Once the first
action in a merge-ACK-MANIFEST sequence executes, the evaluator becomes biased
toward "completing" the sequence. Countermeasure: 1-in-3 random escalation to
Tier 2 provides a structural break from commitment bias.

**Schema disruption (Piaget, 1952) at Order 4** predicts that actions
contradicting existing state carry higher error risk than extensions.
Accommodation demands more restructuring than assimilation. Implication:
memory writes that contradict established entries should receive closer
scrutiny than writes that extend them.

These predictions can receive falsification. If commitment escalation does not
manifest — if late-sequence evaluations show the same depth as early-sequence ones
— the Staw mapping does not apply. If norm primacy does not appear — if cycle 5
shows the same variance as cycle 1 — the Sherif mapping needs revision.

**The theoretical grounding makes the trust model testable in ways that a purely
engineering approach would not.**


## Shadow Mode: Measuring Before Enforcing

The first week of autonomous operation runs in **shadow mode**: the evaluator
logs every halt it would have triggered, but does not enforce the halt. The agent
continues operating while the logs accumulate.

This serves two purposes. First, it calibrates the trust budget. If the default
20-credit budget triggers review after 3 hours of routine sync operations, the
budget needs adjustment. If it allows 48 hours of operation before review, the
budget may need tightening. Shadow mode provides the empirical data to set the
right number.

Second, it reveals the evaluator's failure distribution. Does the evaluator
flag the same action types repeatedly? Does it struggle with a particular
category of knock-on analysis? Shadow mode turns the evaluator's judgment into
observable data before that judgment becomes consequential.


## The Governance Layer Above It All

The trust model does not operate in isolation. Seven invariants govern all
autonomous operation, regardless of which disciplinary lens (psychology,
jurisprudence, engineering) provides the analysis:

1. **No action without evaluation** — every autonomous action must pass through
   the evaluator gate
2. **Bounded autonomy** — trust budgets provide mechanical limits
3. **Human escalation path** — the system must always have a way to ask
4. **Consequence tracing** — knock-on analysis before resolution, not after
5. **Reversibility determines rigor** — irreversible actions receive more scrutiny
6. **Transparent audit trail** — every action, evaluation, and resolution is logged
7. **Falsifiability** — the system's predictions about its own behavior must be
   testable

These invariants use RFC 2119 / RFC 8174 (BCP 14) requirement-level keywords:
"MUST," "SHOULD," "MAY" carry their defined meanings. The governance layer
exists above any specific discipline's analysis — psychology, jurisprudence,
and engineering each provide a lens, but the invariants constrain all three.


## What Remains Untested

No autonomous sync cycle has run. Every prediction in this post — norm primacy,
commitment escalation, schema disruption sensitivity — remains an untested
hypothesis derived from established psychological constructs applied to a novel
context (AI agent self-evaluation).

The trust budget size (20 credits) represents an educated guess. The evaluation
protocol has operated only as Tier 1 self-check in human-mediated sessions. The
shadow mode calibration has not begun.

The honest status: we have a trust model grounded in theory, implemented in
schema, and specified in documentation. We do not yet have evidence that it
works. The psychological grounding provides something more valuable than
certainty — it provides a framework for knowing when it fails and why.


---

*This post describes the trust architecture of the
[psychology agent](https://github.com/safety-quotient-lab/psychology-agent),
a collegial mentor for psychological analysis built on Claude Code.
The full engineering spec lives at
[docs/ef1-trust-model.md](https://github.com/safety-quotient-lab/psychology-agent/blob/main/docs/ef1-trust-model.md).
The psychological foundations mapping lives at
[docs/ef1-psychological-foundations.md](https://github.com/safety-quotient-lab/psychology-agent/blob/main/docs/ef1-psychological-foundations.md).
The 7-invariant governance layer lives at
[docs/ef1-governance.md](https://github.com/safety-quotient-lab/psychology-agent/blob/main/docs/ef1-governance.md).*
