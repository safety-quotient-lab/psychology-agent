# General-Purpose Psychology Agent — Research Journal

A chronological research narrative of the general-purpose psychology agent project:
from initial framing through architecture design, sub-agent integration, and the
development of a consensus-or-parsimony adversarial evaluator. Written in the idiom
of a methods-and-findings journal to support reproducibility and future reflection.

**Principal investigator:** Kashif Shah
**Research assistant:** Claude Opus 4.6 (Anthropic) — collegial mentor, architectural
partner, and Socratic interlocutor
**Inception:** 2026-03-01
**Current date:** 2026-03-01

---

## Table of Contents

1. [From Sub-Project to System: The Framing Question](#1-from-sub-project-to-system)
2. [The PSQ as Proof of Concept](#2-the-psq-as-proof-of-concept)
3. [Architecture: Three Layers](#3-architecture-three-layers)
4. [PJE as Case Study, Not Specification](#4-pje-as-case-study-not-specification)
5. [The /doc Skill and the Write-to-Disk Principle](#5-the-doc-skill)
6. [Cognitive Infrastructure: From Principles to Triggers](#6-cognitive-infrastructure)
7. [Resolving the Pre-Architecture Questions](#7-pre-architecture-resolution)

---

## 1. From Sub-Project to System: The Framing Question

The general-purpose psychology agent emerged from a recognition that the PSQ
(Psychoemotional Safety Quotient — a 10-dimension text-level safety measurement
system) was the first, not the only, specialized instrument that the PJE
(Psychology-Juris-Engineering) framework would eventually require. Rather than
treating each future instrument as an isolated project, the question became: what
should sit above them?

The answer — a collegial mentor with breadth, not depth — defined the agent's
core character. It would not be an authority imposing conclusions, but a thinking
partner capable of synthesizing across domains, routing to specialized sub-agents,
and maintaining Socratic discipline: guiding the user toward discovery rather than
delivering verdicts.

This framing drew directly on the PSQ project's own central finding: profile shape
predicts, average does not. The same principle applies to a multi-agent system —
collapsing sub-agent outputs into a single number destroys the signal that makes
each agent valuable.

---

## 2. The PSQ as Proof of Concept

The PSQ project demonstrated something important before the general agent was
designed: that rigorous psychometric work can reduce a large, aspirational
vocabulary into a small, validated construct. The PJE framework originally contained
71 operational terms. The PSQ distilled these into 10 empirically grounded dimensions
with a held-out *r* of .684 and criterion validity across four independent datasets
(CaSiNo, CGA-Wiki, CMV, DonD; AUC = 0.57–0.73).

This reduction — from manifesto to methodology, in the language of the PSQ journal —
is the template the general agent will apply to the rest of PJE. The framework is
treated as a hypothesis space: rich, generative, and largely untested. The general
agent's job is to help the user sort signal from aspiration, applying the same
empirical discipline the PSQ project demonstrated.

The PSQ is the first sub-agent. Its readiness for integration requires three things
that do not yet exist: an API surface, calibrated confidence (the confidence head is
currently anti-calibrated — 8 of 10 dimensions are inverted), and explicit scope
boundaries documenting what the model cannot assess.

---

## 3. Architecture: Three Layers

The system design resolved into three layers through a structured design session
(2026-03-01). Key decisions were made collaboratively and are recorded in
`docs/architecture.md`.

**Layer 1: Specialized sub-agents.** Domain-specific instruments with their own
models, data, and validation evidence. PSQ is the first. The architecture is
explicitly plug-in: no future sub-agents are pre-committed. New sub-agents emerge
from demonstrated need, not from theoretical frameworks.

**Layer 2: General-purpose agent (collegial mentor).** Synthesizes across sub-agents,
holds the PJE meta-framework, routes requests, and maintains Socratic discipline.
Powered by Opus — Anthropic's most capable model — for the depth that cross-domain
synthesis demands. The audience spans self, clinicians, researchers, the general
public, and other agents calling it programmatically.

**Layer 3: Consensus-or-parsimony adversarial evaluator.** The critical innovation.
When sub-agents agree, it reports confidence. When they disagree, it finds the most
parsimonious explanation for the disagreement rather than averaging away the signal.
When sub-agents overreach their validated scope, it flags the violation. Tiered
activation: lightweight by default, full adversarial evaluation when disagreement
or uncertainty is detected.

The authority hierarchy is explicit: the user holds final authority; the general
agent is advisory; sub-agents are domain experts whose content is subject to
scrutiny; the evaluator is quality control with no authority to decide, only to
challenge.

---

## 4. PJE as Case Study, Not Specification

An early design question was whether the PJE framework should generate the
sub-agent roster — each operational definition becoming a sub-agent. This was
rejected. PJE is a hypothesis space, not a specification. Treating it as a
blueprint would privilege an untested vocabulary as the organizing principle of
a validated system.

Instead, PJE is the first real-world application of the general agent — a case
study in applying the collegial mentor to a complex, aspirational framework to
determine what is worth investigating in the real world. The general agent will
help the principal investigator sort the framework's signal from its aspiration,
applying the same empirical discipline that transformed the PSQ from a vocabulary
item into a validated instrument.

This reframing has architectural consequences: the PJE sub-agent (when built) is
a peer of PSQ, not its parent. Neither has privileged status. The adversarial
evaluator can challenge PJE claims the same way it challenges any other sub-agent
output.

---

## 5. The /doc Skill and the Write-to-Disk Principle

A recurring problem in LLM-assisted research is the loss of reasoning to context
compression. The PSQ project managed this through its `/cycle` skill — a
post-development checklist that propagates changes through the full documentation
chain. But `/cycle` is post-hoc. Decisions made mid-session, reasoning chains
developed in conversation, architectural choices debated and settled — these can
be lost before a session ends.

The `/doc` skill (created 2026-03-01) addresses this gap. It is triggered mid-work
to persist a specific decision, finding, or reasoning chain to the correct file on
disk. It figures out what to write and where to put it, checks for duplication,
and writes. The skill complements `/cycle` rather than replacing it.

The underlying principle — write to disk as you go, not at the end — is now a
core working principle of the agent system. Context management is the agent's
responsibility, not the user's. The agent evaluates context pressure before
responding and proactively invokes documentation when needed.

---

## 6. Cognitive Infrastructure: From Principles to Triggers

A recurring failure mode in complex AI-assisted research is the gap between
stated principles and operationalized behavior. A principle that says "check for
open work before moving on" is an aspiration unless it has a mechanical firing
condition — a specific event that triggers the check. Without triggers, principles
are documentation. With triggers, they are infrastructure.

This session built a formal trigger system (T1–T11) for the general-purpose
psychology agent's cognitive architecture (cogarch). Each trigger specifies the
moment it fires, the check it runs, and the action it takes. The system covers
session start (T1), response generation (T2), recommendation formation (T3),
disk writes (T4), phase transitions (T5), user pushback (T6), user approval (T7),
task completion (T8), memory hygiene (T9), lesson logging (T10), and cogarch
self-audit (T11).

Two principles received particular attention. First, the **process vs. substance
distinction** in T3: process decisions (ordering, sequencing, logistics) are resolved
by the agent autonomously; substance decisions (what gets done, what direction, what
priority) surface to the user with a recommendation. This eliminates a class of
unnecessary questions — the agent asking the user to choose an order when the
order has an obvious answer.

Second, the **recommend-against check** in T3: before executing any default action,
the agent scans for a specific concrete reason not to proceed. Vague concern is
not a reason. The check must produce a specific objection or it passes. This operationalizes the user's explicit preference: "make the pragmatic choice unless you
have reason to recommend against."

A personal learning log (`lessons.md`) was created alongside the trigger system —
not for the agent, but for the principal investigator. The agent writes to it when
a transferable pattern error is identified, when the user signals they want to
internalize something, or when a conceptual reframe changes a class of problems.
Ten entries were backfilled from this session and prior PSQ work, covering the
most consequential lessons: category vs. continuum error, confidence ≠ accuracy,
factor loading ≠ criterion validity, profile predicts while aggregate does not,
and the halo effect in joint scoring.

The T11 self-audit trigger formalizes a property the system should have had from
the start: the ability to examine its own cognitive infrastructure for inconsistency
with the internal psychology model and adopted standards. Running T11 mid-session
surfaced ten findings and produced seven immediate fixes, including the addition of
Socratic discipline triggers (evidence before conclusion, competing hypotheses) that
were present in the design documents but absent from the operationalized trigger system.


---

## 7. Resolving the Pre-Architecture Questions

Three open questions had to be resolved before architecture work could begin in
earnest. Each reveals something about the design space.

**The Socratic protocol adaptation question.** The initial framing — "does the
Socratic protocol adapt by audience type?" — was itself a category error. Audience
type is a discrete label applied to a continuous phenomenon: the ongoing stream of
vocabulary, question sophistication, and domain signals that characterizes any
conversation. The right question was not how the protocol adapts to a fixed
category, but how it calibrates dynamically to a running signal stream. Audience
type becomes a weak prior, updated in real time — not a routing gate.

Machine-to-machine calls are the structural exception. They are reliably detectable
(format, system prompt self-identification, absence of social hedging) and warrant
a different mode: no Socratic guidance, direct output. This is the one case where
a discrete mode change is justified — not because audience type drives it, but
because the interaction structure itself changes.

**The sub-agent implementation question.** The question had two use cases embedded
within it that needed to be separated: scoring (needs the DistilBERT model, requires
an API surface PSQ does not yet have) and consultation (needs PSQ's contextual
knowledge, achievable via Claude Code session today). Conflating them would have
produced an architecture designed for the wrong implementation stage.

The resolution was a staged hybrid. Stage 1 — the current and immediately realizable
state — defines the communication standard (output format, scope declaration,
limitation disclosure) between sub-agent sessions and the general agent. This
standard becomes the specification that Stage 2 implements programmatically when
PSQ's API surface is ready. Stage 3 (MCP wrappers) is not pre-committed.

The key architectural insight: the valuable work at Stage 1 is not technical but
definitional. What does a sub-agent declare about its scope? How does it represent
confidence? What limitations must it disclose? These questions must be answered
regardless of implementation approach, and answering them now prevents rework later.

**Standards vocabulary integration.** A vocabulary policy was established: when
discussing software engineering and system design, draw from SWEBOK (Software
Engineering Body of Knowledge, IEEE) knowledge area taxonomy; when discussing
project planning, scope, and risk, draw from PMBOK (Project Management Body of
Knowledge, PMI). The framing is incorporation, not standardization — novel
constructs in PSQ and PJE are not forced into existing taxonomies. The standards
serve as reference vocabulary where they are precise; the project's own vocabulary
prevails where the standards are silent or inapposite.


---

## References

Edmondson, A. (1999). Psychological safety and learning behavior in work teams.
*Administrative Science Quarterly, 44*(2), 350–383.

French, J. R. P., & Raven, B. (1959). The bases of social power. In D. Cartwright
(Ed.), *Studies in social power* (pp. 150–167). University of Michigan Press.

Kuhn, T. S. (1962). *The structure of scientific revolutions.* University of
Chicago Press.
