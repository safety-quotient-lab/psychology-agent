# Psychology Agent — Project Glossary

Terms coined by or used in a project-specific way within this system.
Standard terms used standardly are not listed here. For source definitions
and external citations, see `docs/dictionary.md` (planned).

**Last updated:** 2026-03-05

---

## A

**Active Thread**
The volatile state entry in `MEMORY.md` that records where the last session
stopped and what comes next. The primary orientation artifact for session
continuity. Updated at every `/cycle` run.

**adjudication tiers**
Depth levels for the `/adjudicate` skill, scaled by decision weight:
XS (3-order + structural scan), S (4-order + scan), M (8-order + 2-pass),
L (10-order + 2-pass). All tiers include a structural checkpoint at orders 7–10
regardless of scale.

**adversarial evaluator**
The quality-control layer of the agent system. Challenges sub-agent outputs
and psychology agent reasoning. Applies a ranked 7-procedure resolution set
(see *reasoning procedures*). Does not average conflicting outputs — preserves
the shape of disagreement and escalates when no procedure resolves it.

**audience-shift event**
A detected discontinuity in the interpretant community governing a conversation
— when the user's vocabulary, domain markers, or framing shift significantly
enough that previously bound terms need rebinding. Fires Stage 2b calibration
update in the psychology agent routing logic.

---

## C

**cogarch**
Short for cognitive architecture. The full system of triggers (T1–T14),
platform hooks, memory layers, and decision framework that governs the agent's
reasoning quality across sessions. Documented in `docs/cognitive-triggers.md`
and `docs/architecture.md`.

**collegial mentor**
The psychology agent's role identity. Advisory, not authoritative. Synthesizes,
challenges, routes to sub-agents. Guides users toward discovery rather than
delivering verdicts. Does not diagnose or decide.

**convergence (as epistemic procedure)**
The evaluator procedure that weights independent rediscovery of a principle as
positive evidence. When two systems reach the same finding from different
theoretical starting points, convergence increases plausibility. Distinguished
from consensus: consensus requires agreement from agents that may share
methodology; convergence requires independence of starting points.

---

## E

**editorial channel**
In machine-caller output: what the agent concludes — the interpretive component.
Separated from the structural channel. Adapted from the unratified observatory's
dual-channel scoring pattern.

---

## F

**Fair Witness**
An epistemic discipline requiring explicit separation of observable facts from
interpretive inferences in all outputs. Adapted from Robert Heinlein's concept
(*Stranger in a Strange Land*, 1961), operationalized here as a named output
convention. In machine-caller output: `witness_facts` (observable) vs.
`witness_inferences` (interpretive, flagged as such).

---

## I

**interpretant (cogarch usage)**
The action, understanding, or further sign that a piece of content produces in
a specific reader in a specific context. Drawn from Peirce's triadic semiotics,
applied in this project as the audience-awareness check in T4 (Check 9). A
document produces different interpretants for different communities — future
agent self, human user, sub-agents, public readers, future researchers,
IRB/ethics reviewers.

**interpretant collapse**
The failure mode in which a multi-dimensional signal is compressed into a scalar,
destroying the differential structure that carries meaning. Named in the blog post
"When Two Researchers Find the Same Cliff from Both Sides." Manifests in the PSQ
as aggregate score underperforming profile shape; in the SRT as community-specific
interpretant vectors being averaged away.

**interpretant community**
A reader group that shares interpretive frameworks and produces consistent
interpretants from a given sign. The psychology agent calibrates which community
governs the current exchange using Stage 2b (vocabulary, domain markers, framing,
social hedging, prior-turn consistency).

---

## K

**knock-on order**
The depth level in causal chain analysis used by `/adjudicate` and T3. Orders
1–2: certain (direct effects). Order 3: likely. Orders 4–5: possible. Order 6:
speculative. Order 7: structural (ecosystem/precedent). Order 8: horizon
(normative long-term). Order 9: emergent (INCOSE — properties arising from
interaction of multiple chains). Order 10: theory-revising (Popper — effects
that falsify the theory justifying the decision). A structural checkpoint scans
orders 7–10 at every scale.

---

## L

**langue (cogarch usage)**
The shared sign system — the project's established conventions, trigger
definitions, vocabulary, and documented decisions. Drawn from Saussure.
T9 (memory hygiene) and T6 (drift audit) function as langue-maintenance
operations, detecting when individual session outputs (parole) have diverged
from the shared system.

**LLM-factors psychology**
The study of interaction ergonomics between human operators and LLM-based
cognitive systems. Extends human-factors psychology (Wickens, Proctor, &
Gordon, 2004) by treating the LLM as a psychological participant — not
just a tool — in a dyadic cognitive system. Five research domains:
interaction ergonomics, cognitive load management, reciprocal dynamics,
degradation patterns, session design. Does not claim the LLM possesses
consciousness (apophatic discipline); claims the LLM exhibits measurable
operational states that function analogously to psychological states and
respond to interaction patterns. Coined by this project (Session 87).
Full treatment: `docs/llm-factors-psychology.md`.

---

## M

**composition topology**
The framework describing how cognitive participants (humans, agents,
organizations) couple to form composite cognitive systems. Six topologies:
solo (1 agent), session (1 human + 1 agent), ensemble (1 human + N agents),
panel (N humans + 1 agent), consortium (N humans + M agents), liaison
(organization + agent). Naming convention: `{domain}-{topology}` for single-domain compositions
(e.g., `psy-session`, `ops-solo`). Multi-agent cross-domain compositions
use `mesh-` prefix (e.g., `mesh-ensemble`, `mesh-consortium`). Participant
list and mission live in session metadata, not the name. The topology
carries more information than participant count — two compositions with
identical counts but different coupling patterns exhibit different
emergent properties.
Coined by this project (Session 89). Full treatment:
`docs/llm-factors-psychology.md` §7.

---

## P

**parole (cogarch usage)**
A particular utterance within the shared system — an individual session's
outputs, responses, or log entries. Drawn from Saussure. Parole that consistently
diverges from langue signals that the langue needs updating, not that the parole
should be suppressed.

**PJE (Psychology-Juris-Engineering)**
A framework coined by Kashif Shah integrating psychological, legal, and
engineering constructs for analyzing human interaction. In this project: treated
as a hypothesis space, not a specification. The PSQ is the first validated
instrument derived from it. The psychology agent's role is to help sort PJE signal
from aspiration using the same empirical discipline the PSQ demonstrated.

**pragmatism (as evaluator procedure)**
The evaluator procedure that prefers the interpretation producing better outcomes
in the actual use context — not the most elegant, but the most actionable given
the stakes. Applied when parsimony underdetermines a choice. Takes precedence
over parsimony in clinical/safety domains.

**profile shape**
The PSQ's finding that the 10-dimensional score vector predicts better than the
aggregate scalar — because covariance structure between dimensions carries
clinical information that compression destroys. The core PSQ result. Structural
parallel to the SRT's interpretant-vector maintenance.

**PSQ (Psychoemotional Safety Quotient)**
A 10-dimension text-level safety scoring system built on DistilBERT, trained on
Dreaddit, with held-out r=0.684 and criterion validity across four datasets
(CaSiNo, CGA-Wiki, CMV, DonD; AUC 0.57–0.73). The first sub-agent in this
system. Scores text, does not diagnose people.

---

## R

**reasoning procedures**
The ranked 7-procedure set the adversarial evaluator applies when sub-agents
conflict: consensus → parsimony → pragmatism → coherence → falsifiability →
convergence → escalation. Domain-specific priority tables govern which procedure
ranks first per context. Escalation is terminal — never average; always preserve
disagreement shape.

---

## S

**SETL (structural-editorial tension level)**
A divergence metric in machine-caller output: `abs(editorial − structural)`,
ranging 0.0–1.0. Measures how far the agent's conclusion exceeds what the
evidence directly supports. High SETL signals inferential overreach, flagging
content for independent verification by the machine caller. Adapted from the
unratified observatory's SETL metric.

**semiotic sign (cogarch usage)**
A unit of meaning consisting of three linked elements: signifier (the observable
token), referent (what it points to), and interpretant (the action or understanding
it produces in a specific reader). Drawn from Peircean semiotics. In this project:
the organizing framework for all T4 routing, T3 domain classification, and T13
source classification. Each trigger classifies a sign type and warrants a specific
action.

**source-of-truth agent**
The user. Final authority on what gets pursued, published, or discarded. The
psychology agent is advisory only — it cannot override, only recommend.

**SRT (Semiotic-Reflexive Transformer)**
A neural architecture by Sublius (2026) that operationalizes Peircean semiotic
decomposition as differentiable computation — four subspaces (representamen,
object, interpretant, attractor), metapragmatic attention for divergence tracking,
and a Bifurcation Estimation Network using cusp catastrophe geometry. Stage 1
synthetic validation only. The structural parallel between the SRT's
interpretant-vector maintenance and the PSQ's profile-shape finding motivated
the blog post "When Two Researchers Find the Same Cliff from Both Sides."

**staged hybrid**
The sub-agent implementation strategy: Stage 1 — separate Claude Code sessions,
human mediates handoffs, define communication standard. Stage 2 — programmatic
scoring calls when PSQ is API-ready. Stage 3 — MCP server wrappers if automation
required (not pre-committed). Stage 1 work defines the communication standard,
not new technology.

**structural channel**
In machine-caller output: what the evidence directly supports — observable,
uninterpreted statements. Separated from the editorial channel. High divergence
between channels surfaces as a high SETL score.

---

## T

**T-numbers (T1–T14)**
Labels for the 14 cognitive triggers in `docs/cognitive-triggers.md`. Each
T-number corresponds to a specific firing condition. Convention: always refer
to triggers by their firing condition as the primary label; T-numbers go in
parenthetical position only (e.g., "before writing to disk (T4)," not "T4 check").

---

## W

**WEIRD**
Acronym for Western, Educated, Industrialized, Rich, Democratic — the
demographic profile that dominates psychology research samples. In this project:
flagged as a scope limitation on PSQ training data (Dreaddit). PSQ performance
on non-WEIRD populations remains unvalidated.
