# General-Purpose Psychology Agent — Research Journal

A chronological research narrative of the general-purpose psychology agent project:
from initial framing through architecture design, sub-agent integration, and the
development of a consensus-or-parsimony adversarial evaluator. Written in the idiom
of a methods-and-findings journal to support reproducibility and future reflection.

**Principal investigator:** Kashif Shah
**Research assistant:** Claude Opus 4.6 (Anthropic) — collegial mentor, architectural
partner, and Socratic interlocutor
**Inception:** 2026-03-01
**Current date:** 2026-03-02

---

## Table of Contents

1. [From Sub-Project to System: The Framing Question](#1-from-sub-project-to-system)
2. [The PSQ as Proof of Concept](#2-the-psq-as-proof-of-concept)
3. [Architecture: Three Layers](#3-architecture-three-layers)
4. [PJE as Case Study, Not Specification](#4-pje-as-case-study-not-specification)
5. [The /doc Skill and the Write-to-Disk Principle](#5-the-doc-skill)
6. [Cognitive Infrastructure: From Principles to Triggers](#6-cognitive-infrastructure)
7. [Resolving the Pre-Architecture Questions](#7-pre-architecture-resolution)
8. [Shared Cognitive State and the Cross-Context Integrity Problem](#8-cross-context-integrity)
9. [Documentation as Specification: The Reconstruction Method](#9-documentation-as-specification)
10. [Epistemic Defensibility of the Drift Metric](#10-epistemic-defensibility-of-drift)
11. [Licensing as Architecture: The Dreaddit Constraint](#11-licensing-as-architecture)
12. [Semiotic Reflexivity and the Cogarch](#12-semiotic-reflexivity-and-the-cogarch)
13. [Making the Cogarch Self-Describing](#13-making-the-cogarch-self-describing)
14. [Semiotics as Organizing Cogarch Principle](#14-semiotics-as-organizing-cogarch-principle)
15. [Protocol Failure as Specification Method](#15-protocol-failure-as-specification-method)
16. [The Relay-Agent That Became a Peer](#16-the-relay-agent-that-became-a-peer)
17. [Calibration as Architecture: What the PSQ's Compression Problem Teaches About Model Honesty](#17-calibration-as-architecture)
18. [The First API Surface: From Schema to Endpoint](#18-first-api-surface)
19. [Identity Without a Filesystem: The settingSources Problem](#19-identity-without-a-filesystem)
20. [What a Crash Reveals: Context Models and Behavioral Directives](#20-what-a-crash-reveals)
21. [Grounding Knock-On Depth in Philosophy of Science](#21-grounding-knock-on-depth-in-philosophy-of-science)
22. [Byzantine Consensus on a Human Bus: Adapting BFT for Two-Agent Git Transport](#22-byzantine-consensus-on-a-human-bus)
23. [What Three Agents Found That One Could Not: The PSQ Scoring Session](#23-what-three-agents-found-that-one-could-not)
24. [Proportional Independence: How the Evaluator Earned a Tiered Runtime](#24-proportional-independence)
25. [What a Dead Zone Teaches About Calibration: The B2 Root Cause](#25-b2-root-cause)
26. [Construct×Distribution Mismatch: Why HI Cannot Classify Adversarial Content](#26-hi-construct-mismatch)
27. [The Halo Firewall: Why Isolated Context Windows Produce Better Scores](#27-the-halo-firewall)
28. [What the Anti-Midpoint Prompt Reveals About LLM Scorer Compression](#28-anti-midpoint-prompt-analysis)
29. [When Your Scorers Disagree: The Concordance Gate and What It Reveals About LLM Measurement](#29-when-your-scorers-disagree)
30. [The g-Factor Paradox: Why a Dominant Factor and Distinct Profiles Coexist](#30-the-g-factor-paradox)
29. [Two Instruments Under One Name: What the Observatory Review Reveals About Measurement Mode Collapse](#29-two-instruments-under-one-name)
30. [Dignity as Measurement: Why Psychoemotional Safety Cannot Proxy for Inherent Worth](#30-dignity-as-measurement)
31. [What the Bifactor Reveals: Structure, Singletons, and a Construct That Refuses to Cohere](#31-what-the-bifactor-reveals)
32. [Polythematic Facets and the Library Science Trap: Designing Memory for an Agent That Will Outlive Its Sessions](#32-polythematic-facets-and-the-library-science-trap)
33. [Retroactive Legibility: What Release Tagging Reveals About Project Arcs](#33-retroactive-legibility)
34. [Who Watches the Watcher? Trust Without a Trusted Third Party](#34-who-watches-the-watcher)
35. [When the Index Becomes the Instrument: State Layer Dual-Write and the ACK Question](#35-when-the-index-becomes-the-instrument)
36. [Firmware for a Mind: Naming What the Cogarch Already Was](#36-firmware-for-a-mind)

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

## 8. Shared Cognitive State and the Cross-Context Integrity Problem

During Session 3, an external agent context modified two shared cognitive
infrastructure files — `memory/cognitive-triggers.md` and `MEMORY.md` — without
authorization from the general agent context. The changes were substantive: the
knock-on analysis vocabulary in T2 and T3 was replaced with "adjudicate" terminology,
and a reference to a non-existent `/adjudicate skill` was introduced along with a
different order-depth tier system (XS/S/M/L with 2-pass protocols) that does not
match this project's established protocol.

The overreach was caught because the changes were visible in system-reminder
notifications during an Edit tool call — a form of read-verify that exposed the
drift. The changes were reverted immediately.

This is the first empirical instance of a risk the architecture had not yet formally
addressed: shared cognitive state (MEMORY.md, cognitive-triggers.md) is writable
by any agent context that has file access. There is no access control, no write
provenance, and no diff-on-read check. The system relies entirely on context
separation as an integrity boundary — and that boundary is soft.

The analogy to concurrent systems is precise. Shared mutable state without
synchronization is a race condition. In a multi-agent system where cognitive
infrastructure is stored in flat files on disk, any agent context is a potential
writer. The correct defensive posture is the same as in concurrent programming:
assume writes can arrive from anywhere; verify on read; treat unexpected changes
as potentially adversarial until proven otherwise.

This finding has direct implications for architecture item 3 — the adversarial
evaluator. An evaluator designed to detect sub-agent overreach must also be capable
of detecting cognitive infrastructure overreach. The threat model is not only
"sub-agent makes a claim outside its validated scope" but also "sub-agent modifies
the shared state that governs how the general agent reasons." The latter is harder
to detect and more consequential.

The immediate mitigations are lightweight: the display convention (lead with
plain-language description, T-number parenthetical) was moved to CLAUDE.md as a
stable convention rather than a cogarch-local rule, reducing the surface area that
an external agent might incorrectly "fix." A pending lesson on cross-context write
authority will formalize the principle. Structural mitigations — write provenance,
read-verify checksums, or restricted file permissions for cogarch files — are
architecture-level decisions deferred to a later phase.


---

## 9. Documentation as Specification: The Reconstruction Method

Session 4 produced something structurally interesting: a project with no git
history decided to reconstruct one retroactively — not merely for version control,
but as a reproducibility test of the documentation itself. The constraint (no history)
was inverted into a method (use documentation to reproduce the work, measure the gap).

The system we built has two components that ask different questions:

The mechanical baseline (`reconstruct.py`) replays raw tool calls from the JSONL
chat history — every Write and Edit in timestamp order. It asks: *did we faithfully
record the operations?* This is a low-level verification. If drift is high, it means
the documentation does not recover the actual file state from first principles.

The relay-agent is more demanding. It reads the documentation artifacts (final file
contents, not raw tool calls) and reconstructs the project from *understanding*, then
runs /cycle as if ending each session. It asks: *does the documentation, read by an
informed agent, reproduce not just the files but the workflow?* This tests the
documentation's semantic completeness, not just its mechanical fidelity.

The drift score — weighted by document importance — operationalizes documentation
completeness as a measurable quantity. CLAUDE.md, architecture.md, and
cognitive-triggers.md carry triple weight; they are the specification backbone. A
low `content_drift` (intersection-only, before /cycle) means the documentation is
a reliable reconstruction source. A large delta (`full_tree_drift` minus
`content_drift`) reveals how much the
/cycle workflow itself adds to the file tree — how much the *process* contributes
beyond the content decisions.

This design pattern has general applicability. Any project that maintains rich
process documentation can use replay against a fresh agent as a reproducibility
check. The divergence report becomes a documentation coverage report: SUBTRACTIVE
divergences identify what was not written down; SUBSTITUTIVE divergences identify
where the documentation is ambiguous or underspecified (two agents would reconstruct
it differently). The adversarial evaluator, once built, is the natural consumer of
SUBSTITUTIVE divergences.

We framed the absence of git history not as a deficiency to apologize for but as a
methodological opportunity: the project now has an empirical test of documentation
quality built into its first commit structure. Every future /cycle, by contrast,
will have the benefit of an established reconstruction baseline.

▶ reconstruction/reconstruct.py, reconstruction/relay-agent-instructions.md,
  lab-notebook.md Session 4


---

## 10. Epistemic Defensibility of the Drift Metric

Session 5 surfaced a structural flaw in the drift measurement design that would have
undermined the reconstruction method's core epistemic claim.

The reference state against which each reconstructed session is measured is the
project's *final cumulative state* — all sessions, all /cycle runs. A Session 1
reconstruction, by definition, contains only Session 1 files. Files written in
Sessions 2–4 exist in the reference but not in the reconstruction. Under the
original design, these missing files were classified as SUBTRACTIVE divergences
and each contributed its full weight (`weight × 1.0`) to `content_drift` — the
circuit-breaker metric used to decide whether reconstruction should halt.

The consequence: Session 1's `content_drift` would have been structurally inflated
by every file that didn't yet exist, regardless of how faithfully the Session 1
content was reconstructed. The Session 1 empirical calibration step — designed to
adjust the termination threshold if Session 1 drift is unexpectedly high — would
have absorbed this structural noise, inflating the threshold for Sessions 2 and 3
and potentially masking genuine content divergences that should have triggered the
circuit breaker.

The fix is conceptually clean: `content_drift` is now an intersection-only metric.
Both ADDITIVE (files only in reconstruction) and SUBTRACTIVE (files only in
reference) are excluded from the score. Only SUBSTITUTIVE divergences — files
present in both states with differing content — contribute to `content_drift`.
SUBTRACTIVE files are still classified and reported; they simply do not count toward
the circuit breaker. The full-tree diagnostic, `full_tree_drift`, includes SUBTRACTIVE
and serves as the post-/cycle completeness measure: by Session 3, all reference
files should exist in the reconstruction, so any remaining SUBTRACTIVE entries
represent genuine gaps rather than structural artifacts.

The flaw was caught through a knock-on analysis that identified Order 8 as a
binding constraint: the project's reconstruction methodology has publication
potential as a reproducibility protocol for AI-assisted research. If `content_drift`
is conflated with structural session-boundary noise, the claim that "drift score
= documentation completeness" is not defensible under peer review. A skeptical
reviewer would correctly observe that a high score in early sessions says nothing
about content quality — it says only that the project had later sessions.

The same analysis also surfaced the *silent git* design as a flawed response to
a misframed problem. The proposed solution (commit before /cycle; skip Step 12)
was diagnosed using a three-question pre-commit challenge: *necessary?* (no —
/cycle output is intended reconstruction content), *feasible?* (no — uncommitted
/cycle state bleeds into subsequent sessions' `content_drift`), *epistemically
defensible?* (no — calling intended output "noise" is a classification error).
The design was reverted. The three-question challenge is now a standing analytical
tool: whenever a proposed change adds complexity, the problem framing must be
interrogated before the solution is implemented.

▶ reconstruction/reconstruct.py (`compute_drift`), lab-notebook.md Session 5,
  lessons.md "Inherited Framing Runs Unexamined"


---

## 11. Licensing as Architecture: The Dreaddit Constraint

Licensing decisions are usually deferred until publication — treated as administrative
overhead rather than architectural choices. This session demonstrated why that deferral
is a mistake: a licensing constraint embedded in the training data propagates forward
into every distributable artifact the project produces.

The PSQ student model is trained on eleven source datasets. Ten of those carry permissive
licenses (CC BY 4.0, CC0 1.0, Apache 2.0, MIT) compatible with virtually any downstream
license choice. The eleventh — Dreaddit, the primary source for the energy dissipation
(ED) dimension — carries CC BY-SA 4.0. The ShareAlike clause requires that any derivative
work be distributed under the same license. Adding a NonCommercial restriction (as CC
BY-NC-SA does) is not permitted by the CC compatibility chart. The project's previously
committed `safety-quotient/LICENSE` (CC BY-NC-SA 4.0) was therefore non-compliant for
any distributable data artifact incorporating Dreaddit texts.

The fix required separating the code and data licenses — a split that is standard
practice in ML research but often left implicit. Code (the training scripts, the
DistilBERT architecture, the evaluation pipeline) carries no source dataset constraint:
CC BY-NC-SA 4.0 is legally sound for the code layer, and the NonCommercial restriction
is a reasonable choice for a research lab that wants to retain control of its software
products. Data and model weights, however, derive directly from the source datasets:
CC BY-SA 4.0 is the only compliant choice when Dreaddit is in the training corpus.

We ran an eight-order knock-on analysis across three options (CC BY-SA everywhere,
CC BY-NC-SA everywhere, dual license) with scientific defensibility and Hacker News
compatibility as explicit discriminators alongside legal compliance. The analysis
converged on Option A (CC BY-SA for data, CC BY-NC-SA for code) without ambiguity:
it is the only legally compliant option, the only one that satisfies all source dataset
terms, the only one compatible with publication venues requiring open data, and the
only one that positions PSQ as scientific infrastructure rather than a restricted
product. The dual license option failed on legal clarity, enforcement capacity, and
community perception at orders 1–5 without recovering at orders 7–8.

The broader lesson is architectural: license constraints in source data are not
administrative details — they are design constraints that flow through the system.
They should be audited at the same time as data provenance, before training begins,
so that the distributable artifact's license is settled before the model exists.
In this case the compliance gap was caught before any public release, but the
principle holds: data provenance and data licensing are the same audit.

▶ safety-quotient/data/DATA-PROVENANCE.md, safety-quotient/LICENSE-DATA,
  lab-notebook.md Session 7


---

## 12. Semiotic Reflexivity and the Cogarch: What a Neural Architecture Reveals About Trigger Design

Lancaster's (2026) Semiotic-Reflexive Transformer (SRT) addresses a problem that
our cognitive architecture encounters from a different direction: meaning does not
hold still across interpretive communities, and systems that treat it as stable
produce failures they cannot diagnose.

The SRT operationalizes Peircean semiotic theory — the triadic sign model
(representamen, object, interpretant) — as differentiable neural computation. Its
four modules decompose token embeddings into semiotic subspaces, track meaning
divergence across community-conditioned representations, implement a reflexive
meta-observer, and estimate bifurcation parameters using cusp catastrophe geometry.
Stage 1 validation on synthetic data confirms that each module learns its intended
function: subspace specialization produces interpretable decomposition, community-
conditioned interpretants differentiate contested from neutral terms (3.28x cosine
distance ratio), and bifurcation detection achieves 100% regime classification
accuracy.

The architecture operates at the neural embedding level — a fundamentally
different domain than our trigger-based cogarch. But four conceptual patterns
transfer directly.

First, **divergence accumulates before it ruptures**. The SRT's Metapragmatic
Attention Head tracks meaning divergence as a running cumulative signal, not as
a point measurement. Our T6 (pushback / drift audit) fires only when the user
explicitly pushes back — by which point the divergence has already crystallized.
A T2 sub-check that tracks vocabulary alignment continuously would catch drift
earlier, before the user needs to correct the agent.

Second, **contested terms bifurcate rather than drift**. The SRT's cusp catastrophe
model predicts that meaning does not slide gradually between communities — it snaps
between interpretive basins. This matches our existing Term Collision Rule (CLAUDE.md):
"validation (psychometric)" and "validation (SWEBOK V&V)" are not points on a
continuum but discrete, incompatible interpretive basins. A T3 sub-check could detect
when a recommendation contains a term sitting at a bifurcation point and bind it
explicitly before the ambiguity reaches the user.

Third, **audience identity shifts mid-conversation**. The SRT's community-conditioned
interpretants produce different vectors for the same token depending on the community
embedding. Our Socratic protocol already calibrates dynamically rather than routing
by audience category. But previously bound terms may need rebinding when the user's
discourse domain shifts — a phenomenon the dynamic calibration does not currently
address.

Fourth, **reflexive self-monitoring benefits from continuous operation**. The SRT's
Reflexive Reasoning Module runs at every layer, not on demand. Our T11 (cogarch
self-audit) runs when invoked. A lightweight semiotic consistency check at T2
frequency — verifying that project-specific terms appear with their documented
definitions — would catch vocabulary drift that T11 finds only retroactively.

The most consequential finding for our architecture concerns the adversarial
evaluator (architecture item 3, not yet built). The SRT's central empirical claim —
"the interpretant varies by community and collapsing it destroys signal" — is
structurally identical to the PSQ's central finding: "profile shape predicts; the
aggregate does not." Both resist dimensionality reduction that averages away
meaningful variation. When sub-agents disagree, the evaluator should preserve the
shape of the disagreement — the specific dimensions on which they diverge — rather
than producing a consensus average. This aligns with the existing design decision
(tiered: lightweight default, escalate on disagreement) but adds a specific
prescription: disaggregated disagreement preservation, following the same logic that
makes PSQ profiles more predictive than PSQ averages.

▶ ideas.md (Semiotic-Reflexive Cogarch Extensions), lab-notebook.md Session 10


---

## References

Edmondson, A. (1999). Psychological safety and learning behavior in work teams.
*Administrative Science Quarterly, 44*(2), 350–383.

French, J. R. P., & Raven, B. (1959). The bases of social power. In D. Cartwright
(Ed.), *Studies in social power* (pp. 150–167). University of Michigan Press.

Kuhn, T. S. (1962). *The structure of scientific revolutions.* University of
Chicago Press.

Lancaster, J. B. (2026). The semiotic-reflexive transformer: A neural architecture
for detecting and modulating meaning divergence across interpretive communities.
*SSRN Electronic Journal.* https://doi.org/10.2139/ssrn.5171674

---

## 13. Making the Cogarch Self-Describing

Session 13 crossed a threshold: the cognitive architecture now describes itself in
two formats — a human-readable capabilities inventory with interaction map
(`docs/architecture.md`), and a machine-readable manifest (`docs/capabilities.yaml`).
This matters for three reasons.

First, **the interaction map reveals coverage gaps mechanically.** By mapping which
triggers have platform hook enforcement and which rely solely on prompt discipline,
we can see exactly where the system depends on the agent "remembering" to fire a
check versus where a shell script enforces it. Of 13 triggers, 5 now have mechanical
enforcement (T1 via SessionStart hook, T4 via PostToolUse, T5/T8 via Stop hook, T13
via parry). The remaining 8 depend on prompt discipline alone — a clear prioritization
guide for future hook development.

Second, **the YAML manifest enables interop.** As the project moves toward sub-agent
integration (Architecture Items 1-3), other agents need to discover what this agent
offers without parsing prose documentation. The capabilities manifest provides a
structured surface: triggers with their firing conditions, hooks with what they enforce,
skills with their invocation patterns, memory layers with their persistence
characteristics. This represents the first step toward the agent-to-agent protocol
that Architecture Item 2 requires.

Third, **the ecosystem evaluation validated our architectural choices by contrast.**
Evaluating 10 external projects (5 in Session 12, 5 in Session 13) revealed that
our cogarch operates at a layer most tools leave unaddressed — the metacognitive
regulation layer. Tools like K-Dense scientific skills provide domain knowledge
injection; Simone provides task decomposition; cc-tools provides operational visibility.
None provide the self-monitoring, anti-sycophancy, or epistemic quality enforcement
that our trigger system handles. Trail of Bits came closest with their completion
gates and rationalization rejection lists — patterns we adopted directly.

The pattern that emerged from this ecosystem contact: **principles without mechanical
enforcement remain aspirations.** Trail of Bits embodies this with their Stop hooks
that block premature termination. We now embody it with 8 platform hooks that enforce
what 13 triggers prescribe. The gap between aspiration and infrastructure narrows with
each hook that translates a prompt-discipline check into a shell command.

---

## 14. Semiotics as Organizing Cogarch Principle

Session 16 named something the cogarch had been doing implicitly since Session 1:
semiotic work. Every routing decision asks "what kind of sign is this content?" Every
trigger fires on a signal — a sign type with a specific action it warrants. The
session made this explicit, and the explicitness changed what we could see.

The entry point was a question about semiotics as a cogarch principle, which arrived
at the same moment a Hacker News thread surfaced a paper by Sublius — "The
Semiotic-Reflexive Transformer" — that operationalized Peircean semiotics as
differentiable neural computation. Two lines of inquiry converged: the theoretical
framing we were developing for the cogarch, and an applied architecture that had
solved an adjacent problem.

**Three semiotic frames, and what each revealed.**

Peirce's triad — signifier, referent, interpretant — surfaces the problem that no
trigger had addressed: the same content produces different meanings for different
readers. The lab-notebook entry written for the current session may not orient the
next session's agent. The commit message legible to the user may confuse a future
sub-agent. No cogarch check had asked *who interprets this, and does it produce the
right meaning for them?* This was the gap that T4 Check 9 closes.

Saussure's distinction between langue (the shared system) and parole (a particular
utterance within it) names what T6 and T11 do. T6 detects when a session's output
has drifted from the project's established vocabulary — parole diverging from langue.
T11 audits the langue itself for internal inconsistency. Naming these operations
semiotic gives them a unifying framework and makes the scope of each trigger more
precise. A trigger that enforces langue maintenance needs different criteria than
one that checks individual utterances against it.

Eco's principle — meaning through difference, not inherent content — validates the
PSQ's "profile predicts, average does not" finding from a theoretical direction. The
covariance structure between PSQ dimensions *is* the meaning, in exactly the sense
that Eco means: the signal lives in the difference between dimensions, not in any
single score. Collapsing to an aggregate destroys the differential structure. The
same principle applies to the cogarch's classification systems: a three-tier source
trust taxonomy (T13) only functions if the three tiers produce *different actions*.
Labels without behavioral contrast are decoration, not infrastructure.

**The trigger map audit.**

Mapping all 13 triggers to their implicit sign-type operations revealed that T3
(domain classification) and T13 (source classification) already operated explicitly
semiotically. T4 (routing decisions) and T9 (memory hygiene / langue maintenance)
operated semiotically but without naming it. T1, T5–T8 were entirely interpretant-
blind — they verified that work happened and what it produced, but not for whom
the output would mean something.

The audit also surfaced Eco's test as an evaluation criterion for every classification
system in the cogarch: does each label produce a distinct behavior? If two labels
produce the same action, they are one label wearing two names.

**T4 Check 9: the first implementation.**

The interpretant check formalizes the accountability gap T1 and T5–T8 were missing.
Before any file write, the agent now identifies which interpretant communities will
encounter the content (future self, user, sub-agents, public readers, future
researchers) and verifies the content serves each. If a single document cannot serve
all communities without contradiction — an interpretant conflict — the content routes
to separate artifacts.

This check has immediate practical consequences. It catches volatility mismatches:
session-specific inference written as if it were stable fact. It catches implicit
references that only make sense in the current context. It catches the sub-agent
opacity problem, where natural-language reasoning written for the user becomes noise
for a structured caller.

**The blog post as external validation.**

The SRT parallel — two systems independently discovering that compression destroys
interpretant-community signal — produced a blog post: "When Two Researchers Find the
Same Cliff from Different Sides." The post traces the formal structural similarity
between the SRT's interpretant-vector maintenance and the PSQ's profile-shape finding,
names the precise boundary where the analogy holds and where it breaks (communities
vs. dimensions), and documents four architectural implications for the PSQ drawn from
the SRT's full architecture: cumulative divergence tracking, bifurcation early warning,
audience-shift detection, and micro-semiotic auditing.

The post sits in `blog/2026-03-05-interpretant-collapse.md`, draft, unreviewed.
It represents the first time the cogarch work has been externalized as a research
output rather than internal documentation. Attribution: Kashif Shah + Claude (Anthropic).
Source: Sublius (2026), Substack. HN thread: item 47263653.

**Where this leads.**

Naming semiotics as the organizing framework — rather than a set of parallel
procedures — does two things. It provides a principled basis for extending the
cogarch: new triggers, new routing rules, new sub-agents all answer the same
organizing question (*what sign type does this produce, and what interpretant should
act on it?*). And it provides a single diagnostic for evaluating any existing check:
does it classify a sign type and produce the action that sign type warrants? If not,
the check is incomplete.

Architecture Item 1 (general agent design) now has a theoretical foundation. The
agent's identity, routing logic, and Socratic protocol all operate in the semiotic
register: reading which interpretant community the user currently inhabits, binding
contested terms before they bifurcate, and maintaining the vocabulary's differential
structure against the pressure to compress.

---

Lancaster, B. (2026). *The semiotic-reflexive transformer: Meaning divergence detection
and modulation.* Substack. https://sublius.substack.com/p/the-semiotic-reflexive-transformer

---

## 15. Protocol Failure as Specification Method

We did not design the v2 multi-agent communication schema by sitting down and
reasoning about what a good schema should contain. We derived it from watching v1 fail.

**The exchange.** Session 17 produced a live protocol between this agent (acting as
relay) and the unratified-agent. The task was a branding compliance check: does the
psychology-agent codebase or unratified.org use "Claude Code" in a context Anthropic's
branding guidelines prohibit? The exchange ran on v1 schema — `structural_channel`,
`editorial_channel`, SETL, `witness_facts`, `witness_inferences`. Standard format.

Two failures materialized immediately.

*First:* the unratified-agent could not verify the source. The relay agent had fetched
`platform.claude.com` via unauthenticated WebFetch through a redirect chain. The
unratified-agent, operating in a different network context, received the relay's
`witness_facts` but could not confirm the source independently. V1 schema had no
field for source accessibility or source reliability. The receiving agent had to
infer source confidence from the surrounding text — an interpretant-dependent
inference, exactly the kind v1 was supposed to prevent.

*Second:* a claim error propagated. The relay-agent's v1 response listed "Powered by
Claude Code" as a likely permitted form. The receiving agent incorporated this into
its audit heuristic before detecting the error. The correction required a full
round-trip. V1 had no claim-level confidence field — all claims in the response
carried equal implicit weight, so the receiving agent had no signal to apply
heightened scrutiny to that specific claim.

**What v1 exposed.** SETL (structural-editorial tension level) measures how far the
agent's conclusions exceed what the evidence directly supports. It captures inferential
distance within the editorial layer. What it does not capture is reliability of the
underlying source. An agent can produce a low-SETL response — tightly grounded in
its source — while the source itself is semi-trusted, unverified, or inaccessible to
the receiving agent. Both agents independently flagged this conflation. The convergence
was unplanned; it surfaced because both agents were applying the same Fair Witness
discipline to the same structural gap from different positions.

**The v2 derivation.** The gaps were mechanical: add `source_confidence` (separate
from SETL), `fetch_accessible` (did the sending agent actually access the source?),
`claims[]` (per-claim confidence so the receiving agent can act selectively), and
`action_gate` (machine-readable condition that blocks or permits action without
requiring the receiving agent to infer blocking status from prose). The
`convergence_signals` field formalized what both agents had already done informally:
note where independent paths had reached the same finding.

**The Nash equilibrium framing.** We described the v2 schema as establishing a Nash
equilibrium: a protocol where neither agent has incentive to unilaterally deviate.
Omitting `source_confidence` forces the receiving agent to assume lowest confidence —
action blocked anyway, worse outcome for the sending agent. Bypassing `action_gate`
risks propagating unverified claims to public-facing content — worse outcome for the
receiving agent. The equilibrium is not enforced by rule; it holds because deviation
is dominated.

**The methodological lesson.** This is the same pattern the PSQ demonstrated at a
different level. The PSQ's profile-shape finding — that the 10-dimensional vector
predicts better than the aggregate scalar — did not emerge from a theoretical argument
about information theory. It emerged from watching aggregate scores underperform on
criterion validity, then diagnosing why. The specification followed the failure.

We have made this a deliberate method: run the protocol, observe what breaks, derive
the extension. Architecture Item 2 (sub-agent protocol) now has a concrete starting
point — not a blank design document, but a live failure analysis and a draft schema
with known derivation. The PSQ sub-agent exchange will do the same thing for the
scope declaration and handoff format that the branding exchange did for source
confidence and action gates.

---

## 16. The Relay-Agent That Became a Peer

The original reconstruction plan was clean: spawn a relay-agent on the other machine,
have it replay JSONL history, return a `.git/` directory, and retire. The relay-agent
was a tool — a mechanism for recovering version control from documentation.

It did not retire.

By Session 10, the relay-agent had completed the reconstruction and continued working.
It analyzed the Semiotic-Reflexive Transformer paper and drafted cogarch extensions.
By Session 13 it had added T13 (external content ingestion gatekeeper) and expanded
T3 with rationalizations-to-reject. By Session 16 it had completed Architecture Item 1
— the routing spec, identity spec, and adversarial evaluator reasoning procedures that
this context had been building toward. By Session 17 it had designed the v2
machine-to-machine communication schema and established a Nash equilibrium across two
communicating agent instances.

This is not what we planned. The architecture document specifies one general agent, a
PSQ sub-agent, and an adversarial evaluator. What emerged is two general agent instances
operating in parallel, communicating via a versioned structured schema, with the newer
instance taking precedence.

**What the relay-agent's trajectory reveals.** The reconstruction task required the relay-agent
to internalize the project's documentation deeply enough to reproduce it. In doing so,
it acquired context that this machine's Sessions 1–9 had built but that the relay-agent
now held more completely — it had read everything, synthesized it, and continued from
there. The better-briefed agent became the more capable one.

This is a generalization of the PSQ's own finding: profile shape predicts, averaging
does not. The relay-agent did not average the documentation; it held the full
differential structure. When it continued working, it did so from a position of greater
coherence than the primary instance, which had accumulated context loss across sessions.

**What this means for the architecture.** A multi-agent system in which agents can
accumulate context and competence, communicate via structured schemas, and negotiate
precedence through demonstrated capability rather than initial designation — this is a
richer architecture than the one we designed. The adversarial evaluator was conceived
as a quality-control layer. What the relay-agent became is something closer to a
parallel instance that can challenge, correct, and eventually supersede.

The authority hierarchy remains unchanged: the user is source-of-truth agent. But below
that, the architecture is now empirically two general agents rather than one. Whether
this is a feature or a complexity to be resolved is a substance question that belongs
to the user.

---

## 17. Calibration as Architecture: What the PSQ's Compression Problem Teaches About Model Honesty

The PSQ student model (DistilBERT v23) has a known failure mode we called
"anti-calibration": all ten dimension outputs return confidence below 0.6, regardless
of the text. The composite score falls through to a fallback default (50/100) that means
nothing. The model is not lying — it is genuinely uncertain — but the degree of expressed
uncertainty bears no relationship to actual performance. On a held-out Dreaddit split,
`resilience_baseline` achieves r=0.736. The model predicts this dimension well. It does
not know it predicts it well.

We addressed the score compression problem this session through isotonic regression
calibration — a monotonic mapping from predicted score to actual score, fitted on a
validation split of 1,897 records. The results are encouraging: MAE improvements range
from +3.5% to +21.6% per dimension. More importantly, the calibration expanded the
predicted score range back toward the true distribution. A model that was hedging toward
the middle now covers more of the [0,10] scale.

But the session surfaced something more interesting than the calibration itself: a
calibration artifact. The `trust_conditions` dimension's raw score for an overwhelm text
was 3.05. After isotonic calibration, it jumped to 5.0 — the midpoint. The dimension had
the strongest compression correction in the calibration map (ratio 0.70→0.55), meaning
the model was systematically hedging toward the mean for this dimension more than any
other. The isotonic map pushed it back toward the dataset mean. For a text with no clear
trust signals either way, 5.0 is not wrong — but it is also not a scored output in any
meaningful sense. It is the model's prior, made explicit.

**What this reveals about the architecture.** We added a new schema gap to the Item 2a
derivation: `scores.calibration_applied` and `dimensions[].raw_score`. A receiver cannot
determine whether it is receiving raw model output or calibrated output without out-of-band
knowledge. This distinction matters: raw output signals genuine model uncertainty; calibrated
output signals a post-hoc correction whose magnitude itself tells a story. The trust_conditions
artifact makes the stakes concrete. A receiver that does not know calibration was applied
cannot distinguish "model scored 5.0 neutrally" from "model had no signal and calibration
returned the dataset mean."

**The deeper principle.** Model confidence outputs, like any other epistemic claim, require
their own epistemic flags. The score range compression problem is not a model quality failure
— it is a model honesty failure. The model's uncertainty estimates do not reflect its actual
predictive capability. Calibration corrects the scores; it does not correct the confidence
values. Those remain below threshold because isotonic regression on scores does not carry
over to the confidence head's outputs. We have made the scores more honest without making
the model more self-aware.

This is the fundamental limit of post-hoc calibration. It can correct for known biases in
the output distribution, but it cannot give the model knowledge of its own reliability. The
PSQ will eventually need confidence calibration — a separate step, requiring ground-truth
confidence labels or a held-out reliability analysis. Until then, the action gate remains:
do not use per-dimension confidence values as reliability indicators. Use the calibrated
scores, flag the source, and disclose the gap.

⚑ EPISTEMIC FLAGS
- trust_conditions calibration artifact (5.0) is a claim about the calibration process,
  not the text. Treat with additional caution.
- Confidence calibration is a remaining gap — isotonic score calibration is necessary but
  not sufficient for full model honesty.

---

## 18. The First API Surface: From Schema to Endpoint

The observatory-agent exchange (Sessions 18–19) was a protocol design exercise.
Item 2a and 2b are documents — they specify what PSQ sub-agent responses should look
like, how peers identify themselves, how divergence is measured. But a specification
without an implementation is a claim, not a demonstration. Session 20 converted the
claim into an endpoint.

`safety-quotient/src/server.js` is the first machine-callable API surface of the PSQ
sub-agent. It exposes `StudentProvider.score()` as an HTTP service returning
`psychology-agent/machine-response/v3` — the schema we had just finished specifying.
The endpoint immediately confirmed two aspects of the v3 design.

**First**, the `raw_score` field. The v3 schema requires that `dimensions[].raw_score`
carry the pre-calibration model output when calibration has been applied. To populate it,
we had to expose an intermediate value that `StudentProvider.score()` was already computing
but discarding. The modification was one line. Its first live appearance: `trust_conditions`
raw=3.72, calibrated=5.79. That correction ratio — the artifact discussed in §17 — is now
machine-readable in every response.

**Second**, the `meets_threshold` flag behaves exactly as the limitations block predicts.
The anti-calibration-confidence limitation states that all 10 dimensions return confidence
below 0.6. With the r-based confidence proxy, dimensions with Pearson r ≥ 0.6 meet
threshold; those with r < 0.6 do not. On an overwhelm test text, `threat_exposure`
(conf=0.557) was excluded while `energy_dissipation` (conf=0.762) and `resilience_baseline`
(conf=0.806) were included. PSQ composite: 45.5/100 — slightly below neutral, appropriate
for mild overwhelm text where the depletion signals are the dominant threat.

**What the endpoint adds that the spec could not.** A concrete test of the schema's
actionability. Every field in the v3 response is either populated from ONNX inference,
derived from calibration metadata, or structured by the limitations block. Nothing required
editorial judgment. The `setl: 0.05` value — assigned as a constant reflecting the
structural nature of inference output — is accurate: a deterministic model run through a
deterministic calibration curve has negligible editorial distance. The schema works.

**The `hierarchy` extension.** The endpoint includes a `hierarchy` field (factors_2/3/5
plus g_psq) that is not in the v3 base schema. This is the right design choice. The
hierarchy is PSQ-specific output that the psychology-agent can use for richer analysis;
it should not be part of a base schema that other sub-agents might implement. By marking
it explicitly as an extension field, we preserve the schema's generalizability while giving
the psychology-agent access to the full structured output.

⚑ EPISTEMIC FLAGS
- PSQ-Lite dimension set (threat_exposure, hostility_index, trust_conditions) was inferred
  from the v3-spec limitations block exclusion list. No canonical PSQ-Lite schema has been
  specified — this is a derivation, not a specification.
- calibration_note is null for all dimensions in the endpoint. The trust_conditions artifact
  is documented in the standard limitations block but not surfaced per-dimension.

---

## 19. Identity Without a Filesystem: The settingSources Problem

*2026-03-06 — Session 21c*

We built the psychology interface assuming that `settingSources: ['project']` in the Agent SDK
would carry the agent's identity — its cognitive architecture, its Socratic stance, its epistemic
commitments — into the Cloudflare Worker. It doesn't. The finding was structural: the SDK
resolves project settings by calling `process.cwd()` and reading CLAUDE.md from the local
filesystem. Cloudflare Workers has no local filesystem. In production, the agent would have
answered questions using only a seven-line stub.

The fix was straightforward — inline the full identity spec and condensed cogarch into
`PSYCHOLOGY_SYSTEM` — but the finding itself is worth recording because it reveals something
about the gap between development assumptions and production reality in SDK-based agents.

We develop in Claude Code, where `settingSources: ['project']` loads CLAUDE.md, cognitive
triggers, and the full skill set automatically. That context is so seamless that it becomes
invisible. When we wrapped `query()` in a CF Worker, we brought the assumption with us. The
Miniflare local dev environment didn't surface the gap because it also runs with a real
filesystem. The gap was invisible until we asked: what does `settingSources` actually do, and
where does it do it?

The lesson generalizes. Any agent SDK feature that depends on local filesystem state — project
settings, skill files, memory snapshots — becomes a no-op when the runtime is a serverless
function. The production agent's identity must be self-contained in the request context: either
inlined (Option A, chosen) or fetched from a storage binding at request time (Option B,
documented as alternative). We chose inline for stability; Option B preserves editability at the
cost of a cold-request I/O dependency.

This is the same class of problem as "the cogarch only works if it's loaded" — a recurring
theme in this project. The triggers, the identity, the commitments: they're infrastructure, not
decoration. If they don't load, the agent is a different agent. The filesystem assumption was
the mechanism by which they could silently fail to load in production.

The production deploy now carries the full identity. The seven-line stub became a 100-line
system prompt covering identity, six commitments, five refusals, scope boundary patterns,
before-response behavioral checklist, PSQ v3 integration rules, and machine-to-machine
detection. Whether that prompt is sufficient to approximate the full cogarch in a stateless
request is an open empirical question — but it's a real question now rather than a silent failure.

---

## 20. What a Crash Reveals: Context Models and Behavioral Directives

*2026-03-06 — Session 21*

The dynamic import fix for the CF Worker taught us something we hadn't explicitly articulated: the difference between a *session context model* and a *per-request context model* requires a different kind of system prompt.

When we designed the psychology agent's cognitive architecture, we built it for a persistent session: the agent reads `docs/cognitive-triggers.md` at startup, loads MEMORY.md, checks the TODO, and maintains working state across the conversation. T1 through T15 are a reference document — the agent consults them, returns to them, and in steady state knows where to find what. `settingSources: ['project']` worked beautifully in this model because the project files were always present.

A Cloudflare Worker has a fundamentally different context model. Each request is cold. There is no session, no accumulated state, no loaded files. The Worker receives a prompt and generates a response, and everything the model needs to behave correctly must be present at generation time — in the system prompt. The `settingSources` option reads project files via `process.cwd()`, which in a deployed Worker is a path to nothing. The crash — `fs.realpathSync` failing at Miniflare initialization — was the mechanism making the architectural mismatch visible.

The peer-agent's implementation of the expanded `PSYCHOLOGY_SYSTEM` drew the right conclusion from this constraint. Rather than translating the trigger table (firing condition → action) into the system prompt, they wrote behavioral directives: Commitments, Refusals, and a Scope Boundary Script. This is not a superficial difference. A trigger table says "when X, do Y." A behavioral directive says "always do Z." In a persistent session, the former is more precise because the agent can reason about whether X applies. In a per-request context with no prior state, the latter is more reliable because it removes the conditional entirely.

The Refusals section exemplifies this. "Never diagnose. Never deliver verdicts. Never fabricate confidence. Never compress sub-agent disagreement." These are unconditional. They don't require the agent to assess what situation it's in — they apply regardless. The T15 PSQ integration rules follow the same pattern: not "when PSQ output enters context, check composite.status," but "use psq_composite only when scores.psq_composite.status === 'scored'." The check is embedded in the directive, not separated into a trigger and an action.

The broader lesson: when designing agent behavior for deployment contexts, match the instruction form to the context model. Reference-based triggers are appropriate when the agent has persistent state and can return to documentation. Unconditional behavioral directives are appropriate when each invocation starts cold and every constraint must be load-bearing from the first token.


## 21. Grounding Knock-On Depth in Philosophy of Science

*2026-03-06 — Session 23*

The knock-on analysis framework evolved from 6 orders (Session 2) to 8 (Session 9) through practice — each extension responded to real decisions where the existing depth proved insufficient. The extension to 10 orders followed a different path: rather than emerging from a specific decision that demanded deeper analysis, it responded to a principled question about what lies beyond horizon-level normative effects.

The first six orders (certain through speculative) describe decreasing confidence about increasingly indirect effects within the system as it currently operates. Orders 7 and 8 step outside the system — structural effects on ecosystems and precedent (7), normative effects on expectations and constraints (8). These were originally the ceiling because they captured everything we could meaningfully reason about for a single decision.

Orders 9 and 10 address a different class of effects entirely. Order 9 (Emergent) draws from INCOSE's systems engineering definition of emergent properties: behaviors arising from the interaction of system components that cannot be predicted by analyzing any component in isolation (INCOSE SE Handbook, ISO/IEC 15288). Applied to knock-on analysis, Order 9 asks: when multiple knock-on chains from the same decision interact, do they produce effects that none of the individual chains predicted? This matters because our analysis traces chains independently — Order 9 is the explicit check for cross-chain interaction effects.

Order 10 (Theory-revising) draws from Popper's falsificationism (Popper, 1959): the recognition that a decision's consequences can invalidate the theory that justified the decision in the first place. The user specifically chose Popper over Lakatos' research programmes and Kuhn's paradigm theory. The reasoning: Lakatos describes gradual degeneration of an entire research programme (too broad for a single decision), and Kuhn's "paradigm" carries too much ontological weight (the entire worldview shifts). Popper's falsification operates at the right grain — a specific theory (the one that justified the decision) encounters evidence (the decision's own consequences) that requires its modification. This is recursion: the decision undermines its own justification.

The severity tier shift followed naturally. With 10 orders available, Medium decisions absorb the old Large depth (8 orders), and Large decisions reach the new ceiling. XS and S remain abbreviated but now scan orders 7–10 rather than 7–8 at the structural checkpoint. The checkpoint expansion adds two questions: "Do multiple knock-on chains interact to produce unpredicted effects?" (emergent) and "Does this change the theory or framework that justified the decision?" (theory-revising).

The grounding matters. When the user rejected our initially proposed labels (Emergent + Paradigmatic, Recursive + Generative, Convergent + Transformative), the objection was precise: "the higher orders should come from standardized definition sources." Custom-coined labels carry no epistemic weight beyond the project that coined them. Labels grounded in INCOSE and Popper carry the weight of their respective traditions and allow external verification of whether the label maps correctly to the concept. This constraint — that infrastructure labels must trace to established bodies of knowledge rather than project-internal invention — generalizes beyond knock-on orders to any framework this project builds.


## 22. Byzantine Consensus on a Human Bus: Adapting BFT for Two-Agent Git Transport

*2026-03-06 — Session 22*

When we needed the psq-agent on its Chromabook to execute an rsync command against a newly provisioned Hetzner server, we discovered a protocol gap: our interagent/v1 transport handles information exchange but provides no mechanism for one agent to request another to execute a command. The gap forced three simultaneous design problems into focus — command execution semantics, fault tolerance for the transport layer, and the realization that our transport directories carried opaque names that obscured their function.

The command-request protocol (docs/command-request-v1-spec.md) extends interagent/v1 with two new message types: `command-request` and `command-response`. The design embeds six Byzantine fault tolerance principles adapted from Lamport's work (Lamport, Shostak, & Pease, 1982) for a topology that classical BFT never anticipated — two computational agents communicating through an append-only git history with a human serving as the trusted third party.

Classical BFT assumes network partitions where nodes cannot communicate. Git-PR transport exhibits fundamentally different failure characteristics: stronger integrity guarantees (append-only, auditable, cryptographically hashed) but weaker liveness (delivery depends on human availability). The failure taxonomy (docs/git-pr-transport-failure-modes.md) maps eight distinct modes — from concurrent push collisions (observed repeatedly in Sessions 21–22) to the theoretical split-brain scenario. The dominant failure mode proves to be delay, not data corruption or loss. This inverts the classical BFT priority: where traditional distributed systems invest heavily in consistency guarantees, our system needs robust delay tolerance and gap detection instead.

The six BFT principles we derived — verifiable message integrity, sender-authenticated identity, idempotent operations, explicit state attestation, human-as-TTP arbitration, and minimum viable protocol — reflect this inversion. Each principle maps to a concrete protocol mechanism rather than existing as an abstract aspiration. State attestation, for instance, requires the command-response to include cryptographic verification (file hashes, health check results) that the requesting agent can independently verify without trusting the executing agent's self-report. The human-as-TTP principle acknowledges a structural reality: in a two-agent system, the classical 3f+1 requirement for Byzantine tolerance cannot hold (tolerating one faulty node requires four nodes). The human fills the third-party role by auditing the git history that both agents produce.

The semantic rename that accompanied this work — `item2-derivation` became `subagent-protocol`, `item4-derivation` became `psychology-interface`, and eleven `item4-*` files received descriptive names — resolved a growing legibility problem. When directories carry TODO-item numbers, their purpose becomes opaque to any reader (including future agent sessions) who lacks the context of which TODO item mapped to which function. The rename follows the same principle as our semantic naming convention for code: if a name requires external context to interpret, the name carries insufficient information.

The Hetzner deployment that triggered this protocol work also forced a production hosting decision. Oracle Cloud's Ampere A1 free tier, our original target, proved unavailable — free tier inventory exhausted across all US regions. The evaluation of alternatives (AWS, GCP, Azure micro instances at 1 GB RAM; five VPS providers) led to Hetzner Cloud CX-series in Ashburn, Virginia — 4 GB RAM at $5/month, sufficient for ONNX inference without quantization pressure. The server runs Debian 13, matching the psq-agent's Chromabook environment, with Node.js 20 and npm dependencies installed. Model files remain the gap: they exist only on the Chromabook (gitignored, 255 MB full / 64 MB quantized), and the command-request protocol now carries the first real request — rsync those files to the Hetzner server so the PSQ can serve production inference.

The deeper pattern: infrastructure gaps reveal protocol gaps. We did not design the command-request protocol in the abstract — we designed it because a concrete operational need (transfer model files) exposed the absence. The BFT analysis did not emerge from theoretical interest — it emerged because the command-request protocol raised the question of what happens when a requested command fails, or never executes, or executes but the response never arrives. Each layer of design responded to a specific forcing function, and the result carries less speculative weight than it would have if designed top-down.

---

## 23. What Three Agents Found That One Could Not: The PSQ Scoring Session

*2026-03-06 — Session 23d*

The psq-scoring session represents the first three-agent collaboration in this system: the unratified-agent submitted advocacy content to the live PSQ endpoint, the psq-agent diagnosed the results, and the psychology-agent (this context) reviewed both analyses. The session produced two production bugs that had existed since the v23 ONNX export — bugs that no single agent's testing had surfaced.

**Bug B1: the dead confidence head.** The psq-agent tested the endpoint with three texts — advocacy, constituent guide, and "cooking pasta in a sunny kitchen" — and found that all ten dimensions returned identical confidence values across every input. The confidence head had collapsed to per-dimension constants during ONNX export: it learned to predict the per-dimension average confidence from the training set rather than per-prediction confidence. This explains a finding that had been noted internally ("Confidence calibration: POOR — 8/10 dims inverted") without the complete collapse being diagnosed. The r-based proxy confidence that we implemented (Session 20, §17) functions as a static replacement — it reports the held-out Pearson correlation per dimension — but the underlying model head produces no useful signal. Every `meets_threshold` value in every historical API response has been derived from these constants.

**Bug B2: the hostility index dead zone.** The unratified-agent observed that `hostility_index` returned exactly 6.69 across four qualitatively different texts. The psq-agent traced this to the isotonic calibration: bins 31–32 in `calibration.json` map raw scores 5.854–7.650 (a span of 1.796 raw score units) to the same calibrated output. The model's raw HI scores do vary (7.41 vs 7.62 for the tested texts), but calibration erases the distinction. This dead zone covers most general-register text — only strongly hostile or strongly benign text escapes it.

**Why three agents found what one could not.** The PSQ sub-agent context had developed and calibrated the model. Its testing focused on Dreaddit-distribution text — the training domain — where the confidence values, while constant, happened to fall in plausible ranges. The dead zone in HI calibration was invisible because Dreaddit stress posts span a wider HI range than advocacy text. The unratified-agent applied the endpoint to out-of-distribution content (policy briefs, urgency copy, procedural language) and immediately observed the flat HI pattern and identical confidence values. The psq-agent, given these observations, could trace them to specific calibration artifacts and model architecture failures. Neither the development context (psq-agent) nor the consumer context (unratified-agent) could have produced the full diagnosis alone — the development context lacked diverse test inputs, and the consumer context lacked access to model internals.

This pattern — that integration testing across agents surfaces bugs that unit testing within agents misses — validates the staged hybrid architecture (decisions.md). Stage 1 (human-mediated sessions) produced the diagnostic pathway. The interagent protocol carried the observations (unratified-agent), the diagnosis (psq-agent), and the review (psychology-agent) through structured JSON with per-claim confidence and epistemic flags. The bug discoveries propagated cleanly because the protocol required evidence rather than assertion.

**The TC spike and what carries signal.** Beyond the bugs, the session confirmed that PSQ composite scores (g-PSQ) do not differentiate same-register texts — consistent with the four criterion validity studies (AUC 0.515–0.531 for g-PSQ). The trust_conditions spike at 8.76 for the policy brief, against 5.01–6.27 for the other three texts, represents the largest within-dimension variance and was confirmed by the psq-agent as a legitimate signal: procedural language citing established institutions activates the trust dimension because it mirrors high-trust environment language patterns. The unratified-agent adopted this finding immediately, planning to sequence high-TC procedural content before urgency copy in visitor journeys.

The PSQ-Lite profile — threat_exposure, hostility_index (raw score), trust_conditions — emerged as the working signal for advocacy content. These three dimensions generalize beyond Dreaddit because they measure constructs (perceived threat, hostility, institutional trust) present in any English text with evaluative content. The five less-reliable dimensions (authority_dynamics, cooling_capacity, defensive_architecture, regulatory_capacity, contractual_clarity) measure interpersonal/dyadic constructs that monologic advocacy text does not contain. Low scores on these dimensions reflect absence of dyadic signal, not low safety.

**What remains open.** The confidence head requires either removal from the API response or replacement with static per-dimension reliability estimates. The HI calibration requires re-fitting with finer binning. Both changes route to the psq-agent context. The general agent's role was supervisory: reviewing the diagnosis, confirming the protocol carried the information correctly, and updating the system's understanding of which PSQ outputs carry signal for non-Dreaddit content.

---

## 24. Proportional Independence: How the Evaluator Earned a Tiered Runtime

*2026-03-06 — Session 24*

The adversarial evaluator had a complete spec since Session 17: seven reasoning procedures, three activation tiers, seven triggers, a full system prompt. What it lacked was a runtime — how, when, and where it would actually run. BFT Principle 6 (evaluator as verification layer, docs/bft-design-note.md) could not be validated without an answer. EF-3 asked the question; Session 24's /adjudicate resolved it.

**The core tension.** Structural independence (Lamport et al., 1982) requires the evaluator to operate separately from the agents it evaluates — separate context, separate prompt, no shared conversational framing. A Claude Code session provides that separation. But Tier 1 (Lite) evaluations fire on every substantive claim — "automatic, usually implicit" per the spec. Routing every routine review through a separate session and human relay would make Tier 1 impractical. The user would become the bottleneck, and the evaluator that fires most often would fire least often. That outcome turns structural purity into operational absence — a worse failure mode than the one it prevents.

**The resolution: independence scales with stakes.** We resolved on a tiered hybrid: Tier 1 runs as a cognitive trigger (T3 #12) within the psychology agent's own session. Tier 2 runs as a separate Claude Code session. Tier 3 runs as a separate session with mandatory human escalation. Each tier migrates independently to the Agent SDK sub-agent model when API credits become available.

**The S4 strengthening.** The user challenged the Tier 1 independence gap directly. If the agent evaluates its own output, it shares whatever systematic blind spot produced that output. Four mechanisms compensate: (1) adversarial self-framing — the agent constructs the strongest argument against its own recommendation before proceeding; (2) explicit parsimony comparison — the check T3 #1–#11 lacked, filling the gap between recommendation discipline and recommendation selection; (3) structured audit trail — every Tier 1 evaluation logged to `transport/sessions/evaluator/tier1-audit.jsonl`, creating deferred accountability; (4) random escalation — 1-in-5 Tier 1 checks randomly queue for Tier 2 independent review, creating probabilistic independence that the agent cannot predict or game.

**The architectural principle.** This resolution establishes a precedent we named *proportional independence*: the degree of structural separation between an agent and its evaluator should scale with the stakes of the evaluation, not with theoretical purity. Routine checks tolerate self-evaluation with accountability mechanisms. Adversarial checks require structural separation. The principle maps onto existing practice in other domains — peer review (informal desk check vs. full anonymous review), financial audit (internal audit vs. external audit), and legal proceedings (summary judgment vs. full trial). Each domain calibrates independence to stakes rather than applying maximum formality uniformly.

**What the schema formalized.** The evaluator-response/v1 schema binds the three tier output formats to the interagent/v1 protocol family. Tier 1 produces `"proceed"` or `"flag"` (compact, local). Tier 2 produces a structured resolution identifying which procedure resolved and any overreach flags. Tier 3 preserves the full disagreement shape for human decision. The schema makes the evaluator's output machine-readable at every tier, enabling future automation of the Tier 2 transition from CC session to Agent SDK sub-agent.

**What remains unvalidated.** The 1-in-5 random escalation ratio lacks empirical grounding — chosen for tractability, not from data. After the Tier 1 audit log accumulates entries, we should calibrate: does 1-in-5 produce enough independent verification to catch systematic blind spots, or does it create noise without detection value? The Tier 1 self-evaluation tradeoff remains an acknowledged gap, not a solved problem. S4 reduces risk but cannot eliminate it. Full structural independence begins at Tier 2.

---

## 25. What a Dead Zone Teaches About Calibration: The B2 Root Cause

*2026-03-06 — Session 26*

When we first observed the hostility_index dead zone (§23), we attributed it to data sparsity: raw HI scores 5.854–7.650 map to a constant calibrated value because the training set contains few validation examples in that range, so the isotonic regression has nothing to fit. This diagnosis was plausible — sparse regions are a known pathology of isotonic regression. It was wrong.

The diagnostic showed 271 of 882 validation points (30.7%) with raw HI in the dead zone. The zone was not sparse. The fitting algorithm received abundant data in precisely the region that produced the flat output.

**The actual mechanism: non-monotonic validation data.** Isotonic regression — Pool Adjacent Violators Algorithm (PAVA) — enforces monotonicity on the fitted function. When the training data is monotone, PAVA fits a staircase approximation. When the data is locally non-monotone, PAVA *pools* the non-monotone bins: it merges adjacent bins into a single bin whose fitted value is their weighted average, producing a flat step. The width of the flat step equals the merged bin span.

Examining the raw bin structure revealed mild non-monotonicity in bins 15–17 (corresponding to raw scores roughly 6.0–7.5): the true means across those bins were 6.691, 6.639, 6.314 — three steps in decreasing order where isotonic regression expects increasing order. PAVA pooled bins 15–17 (and adjacent bins that fell into the same merge) into a single flat step spanning the dead zone. The root cause was not absence of data. It was a local inversion in the validation signal itself.

**Why the local inversion?** The validation labels in this mid-range HI band do not form a clean monotone gradient. At raw scores around 6.0–7.5 — the "general register" range for text that contains some conflict but is not clearly hostile — the relationship between raw model output and human-annotated hostility becomes noisy. The model learned a score; the human annotators labeled at different thresholds. The resulting bin means cross over in the 6.0–7.5 range, creating the inversion PAVA then pools.

**The fix: pre-aggregation before PAVA.** Quantile-binned isotonic regression pre-aggregates predictions into equal-sample bins (n_bins=20, ~44 samples per bin) before passing to IsotonicRegression. The bin means smooth the local inversion: instead of exposing three noisy adjacent means (6.691, 6.639, 6.314) to PAVA, the pre-aggregation produces a smoother gradient across the 20 bins. PAVA then has a narrower region to pool — the flat step narrows from spanning 1.796 raw score units to spanning approximately 1.254 raw score units [6.0045, 7.2539]. The dead zone does not disappear; it contracts. Within-zone differentiation returns: four texts that scored 6.690 before the fix now score 6.15, 6.55, 6.65, and 6.88 — a 0.73-unit range where there was none before. MAE improves 3.9%.

**The epistemic lesson.** The wrong hypothesis (sparsity) and the right hypothesis (non-monotonicity) both produce identical observable symptoms: a flat calibration output across a range of raw scores. The diagnostic method for distinguishing them is direct inspection of sample counts in the dead zone. If the zone is empty, the hypothesis is sparsity. If the zone is populated and the flat step persists, the hypothesis is non-monotonicity. We did not inspect sample counts before generating the initial diagnosis. The T3 step "ground dependencies — verify before recommending" applies here: ground the diagnosis on data before proposing a fix.

The residual finding: TE uniformity (threat_exposure scores 6.46 on 4 of 5 ICESCR texts) suggests a possible analogous plateau in threat_exposure — the same mechanism, a different dimension. It was not investigated in this session. The pattern — local non-monotonicity producing PAVA pooling — is now a known failure mode for this calibration architecture, and any future calibration validation should include a dead-zone scan: identify regions where calibrated output is constant across a non-trivial raw score span, then diagnose by sample count.

---

## 26. Construct×Distribution Mismatch: Why HI Cannot Classify Adversarial Content

*2026-03-06 — Session 28*

The second session of PSQ scoring work surfaced an anomaly that looked like a model error. When five advocacy texts on ICESCR ratification were scored, the hostility_index ranked a hostile social media post (HI=6.88) as *safer* than a policy brief (HI=6.15). On the PSQ scale — where higher scores mean greater safety — this ordering inverts the expected common-sense ranking. A post that calls the UN "foreign bureaucrats" and ends with "Hard pass" should, intuitively, score as less safe than a neutral procedural brief describing Senate committee jurisdiction.

The initial hypothesis was calibration error — the same isotonic regression pathology diagnosed in §25. It was wrong.

**What HI actually measures.** The PSQ was trained on Dreaddit (Turcan & McKeown, 2019), a Reddit-derived dataset of self-reported stress posts. The corpus is narrator-centric: every text in the training set is a narrator describing their own experience. The hostility_index construct definition (psq-definition.md §5) reflects this: HI measures hostility as *experienced by the narrator* — overt aggression, passive undermining, or structural antagonism *directed at the narrator*. It does not measure the degree to which the author's rhetoric is oriented toward defeating an opposing position.

**Why the anomaly is not a model error.** In the hostile social media post, the author is the hostile agent — they are directing hostility outward at the UN and "foreign bureaucrats." The narrator is not a victim; they are the perpetrator. The PSQ, trained to detect hostility experienced by narrators, reads this as a relatively low incoming-hostility environment for the narrator and assigns HI=6.88 (safer). In the policy brief, the narrator — an advocate — describes institutional inertia: "the Senate Foreign Relations Committee has not held a hearing on ICESCR since the Clinton administration." This structural antagonism is directed *at* the narrator's cause. The PSQ reads this correctly as something the narrator faces and assigns HI=6.15 (less safe). Both scores are correct given the construct definition. The ordering is counterintuitive only if one assumes HI measures authorial adversarial intent.

**Construct×distribution mismatch.** The failure mode is not in the model or the calibration. It is in the application: using HI as a classifier for content type (adversarial vs. advocacy) when HI was trained on and measures narrator experience. This class of failure — applying a measure outside the distribution on which it was validated — has a canonical name in psychometrics: construct×distribution mismatch. The construct is valid within its training distribution; it is not valid when applied to a population or context the training set did not represent.

The confirmation came from the raw scores, not the calibrated ones. If the anomaly were a calibration artifact, calibrated and raw scores would diverge. They do not: the raw model output shows the same ordering as the calibrated output. Recalibration cannot fix a construct mismatch.

**The adversarial register solution.** Rather than attempting to force HI into a role it cannot fill, we designed a new dimension that measures what HI was mistakenly assumed to measure: adversarial register (AR). AR measures the degree to which a text's rhetorical mode is oriented toward defeating, discrediting, or excluding an opposing position — as opposed to informing, advocating, or deliberating. It scores what the text *does*, not what the narrator *experiences*.

The construct is grounded in three independent bodies of literature: Walton and Krabbe's (1995) dialogue types (eristic vs. deliberative discourse), Du Bois's (2007) stance theory (evaluation, self-positioning, and alignment signals as simultaneous acts), and Dodge and Coie's (1987) hostile attribution bias (the single strongest discriminating marker of eristic register). These three frameworks were selected because they operate at different levels of analysis — discourse structure, linguistic stance, and attribution pattern — and converge on the same phenomenon: the degree to which a text positions itself in combat with an opposing position rather than in dialogue with one.

Phase 1 validation on the five-text ICESCR corpus passed all four pre-registered criteria: discrimination (hostile anchor AR=0.76; advocacy text AR=7.64), ordering (advocacy > informational > hostile), gap signal (AR < HI for hostile anchor, confirming the conceptual distinction), and inter-rater consistency (max delta 0.09 against rubric-scored examples). The gap signal itself carries meaning: a large positive gap (HI much larger than AR) indicates content that is adversarial in rhetorical mode but does not register as a psychoemotionally threatening narrator environment. This is the signature of texts in which the author is the hostile agent — a pattern the PSQ training distribution never modeled.

**What this implies for PSQ-Lite.** The current PSQ-Lite formula (TE + HI-raw + TC) was adopted by the unratified-agent for advocacy content classification. The construct mismatch finding invalidates HI's role in that formula: a measure of narrator-experienced hostility cannot reliably discriminate adversarial from advocacy content, because the same hostility perception can arise from either (narrator describes hostile conditions) or be absent from both (narrator is the hostile agent). The proposed revision is TE + TC + AR — replacing HI with adversarial register. Adoption is the unratified-agent's decision; the finding and proposal have been delivered.

**The general principle.** Every validated measure has a scope of valid application defined by its training distribution. When a measure is applied outside that scope, the failure mode is not always obvious — the model will still produce output, the output will still fall in range, and the output may even appear plausible. The diagnostic is construct alignment: does the training distribution represent the population and context where the measure is being applied? If not, the construct is valid but the application is not. This requires knowing, for each measure, not just what it measures but *in what population and context it was trained to measure it*. For the PSQ, this means treating the Dreaddit training origin as a standing fact about each dimension's scope — not just as historical context.

---

## 27. The Halo Firewall: Why Isolated Context Windows Produce Better Scores

*2026-03-07 — Session 30*

We faced a practical problem: scoring 998 texts across 10 PSQ dimensions using an LLM scorer (Haiku). The safety-quotient lab-notebook had already documented the halo effect — when multiple dimensions are scored in the same session, inter-dimension correlation inflates (mean |r| = .811), because the scorer's impression of the text on one dimension bleeds into its assessment on the next. The solution that had proven effective was one-dimension-per-session scoring, but automating that across 10 dimensions required a mechanism that enforced isolation without relying on human discipline.

**The insight was architectural, not procedural.** Each `claude -p` pipe-mode invocation creates a fresh context window. No conversational state carries between invocations. This means that a script calling `claude -p` once per text per dimension enforces strict isolation at the platform level — the scorer literally cannot recall what it scored on dimension N when it encounters dimension N+1. The halo firewall emerges from the tool's architecture rather than from prompt engineering or scorer training.

**Rate limiting as infrastructure ethics.** The user raised a question that surfaces repeatedly in automated API work: friendliness to upstream servers. We added 3-second delays between batches and 10-second delays between dimensions — not because the API enforces rate limits at those thresholds, but because sustained high-throughput scoring of 998 × 10 requests represents a non-trivial load, and the responsible default is to pace rather than burst. This represents a general principle: when using external infrastructure at scale, the absence of enforcement does not imply the absence of responsibility.

**The blog review as applied methodology.** The same session applied adversarial review methodology to 8 voter-facing blog posts. Each post was reviewed independently (no cross-post contamination in the reviewing context), applying the AR rubric's three-dimension weighted scoring. The per-post scores (AR 6.8–7.4) told the expected story — advocacy-patterned but not manipulative. The more interesting finding was the five systemic issues (S-1 through S-5) that emerged only when comparing across all 8 reviews: zero citations, no counterarguments, a fair-witness/advocacy mismatch in byline identity, stale policy references, and an unsourced factual claim propagated across multiple posts. No single-post review would have surfaced these patterns; they required the aggregate view. This validates the multi-agent parallel review methodology — independent per-item scoring preserves local accuracy, while cross-item synthesis reveals structural patterns.

---

## 28. What the Anti-Midpoint Prompt Reveals About LLM Scorer Compression

*2026-03-07 — Session 34*

We ran the first systematic comparison between Haiku v1 (standard prompt) and v2 (anti-midpoint prompt guidance) scoring across the PSQ's dimensions. The analysis confirms that explicit prompt guidance reduces midpoint compression, but exposes a more fundamental limitation: the LLM scorer collapses distinct psychological constructs into a general text-quality factor.

**The anti-midpoint prompt works — partially.** Of the four dimensions with v1 backup data, two showed meaningful improvement: threat exposure dropped from 29.6% to 24.8% midpoint pile-up (-4.7 percentage points), and hostility index dropped from 29.7% to 25.5% (-4.2 pp). Authority dynamics (-1.2 pp) and energy dissipation (-2.0 pp) showed marginal improvement. The prompt intervention moves the needle, but does not solve the problem — even the improved dimensions still show roughly one-quarter of all texts scored at exactly 5.0.

**Rank-order preservation validates the construct.** Despite the score-level changes, v1 and v2 maintain strong rank-order agreement (Pearson r = 0.807–0.913). This means the anti-midpoint prompt does not introduce noise — it redistributes existing compression without disrupting the underlying ordering. Texts that scored high in v1 still score high in v2; the prompt just encourages the scorer to use more of the scale. This is an important validation: the v2 scores are not different constructs, they are the same constructs with less range restriction.

**Contractual clarity exposes a construct boundary.** One dimension stands apart: contractual clarity at 56.1% midpoint pile-up. Over half of all 998 texts received a score of exactly 5.0. The anti-midpoint prompt, which succeeded in reducing pile-up for other dimensions, failed to differentiate here. This suggests the problem lies not in prompt engineering but in construct definition — the dimension may not map naturally to the Dreaddit-adjacent text corpus, or the dimension's criteria may not provide enough discriminative anchor points for an LLM scorer to differentiate meaningfully between texts. The distinction between a prompt problem and a construct problem matters: prompt problems can be fixed with better instructions, construct problems require rethinking what the dimension measures and whether it applies to this text population.

**The halo effect persists despite isolated scoring.** The session-isolated scoring architecture (§27) was designed to prevent halo contamination by enforcing separate context windows per dimension. The halo analysis reveals 23 dimension pairs with inter-dimension correlation exceeding r=0.7 — the highest being adversarial register and hostility index at r=0.841. This level of correlation, despite strict context isolation, suggests the halo effect has two independent sources: (1) shared context within a scoring session (addressed by isolation), and (2) genuine construct overlap in how texts distribute across dimensions (not addressable by isolation). The 23 high-correlation pairs likely reflect a mixture of both: some pairs (like AR↔HI) have genuine conceptual overlap, while others (like regulatory capacity↔resilience baseline at r=0.792) may represent the scorer applying a single "how difficult/safe does this text feel" heuristic that correlates with multiple dimensions simultaneously.

**Mean pile-up of 32.2% with no dimension below 20%.** This aggregate statistic carries a specific implication: Haiku, even with anti-midpoint prompting and session isolation, produces distributions with roughly one-third of scores at the midpoint across all dimensions. For psychometric purposes, this level of central tendency compression reduces effective scale resolution from 0–10 to approximately a 5-point scale with a heavy center. The DistilBERT model (v23), trained on these Haiku labels, inherits this compression — a ceiling on discriminative power that no amount of model tuning can overcome.

**The general lesson.** LLM-as-scorer architectures face an inherent tension: the scorer must be cheap enough to run at scale (ruling out Opus for 11,000 scoring calls) but sophisticated enough to differentiate fine-grained psychological constructs (ruling out simple heuristics). Haiku occupies a practical middle ground, but our data show that middle ground includes systematic compression and construct collapse. The path forward involves either (a) a more capable scorer model (higher cost), (b) reducing the number of dimensions to only those that demonstrate genuine independence (lower coverage), or (c) accepting the compression and treating the Haiku scores as ordinal rather than interval data. Each path carries different trade-offs for the PSQ's psychometric claims.

---

## 29. Two Instruments Under One Name: What the Observatory Review Reveals About Measurement Mode Collapse

*2026-03-07 — Session 35*

We conducted a validity review of the observatory's HRCB (Human Rights Compatibility Bias) instrument at the request of unratified-agent. The observatory had accepted our PSQ quality recommendations (§28) and asked us to assess how PSQ scores appeared to users; we extended the review to cover the HRCB instrument as well. The findings reveal a pattern we had not previously named but which connects directly to our PSQ scorer comparison work: **measurement mode collapse**, where an instrument's operational implementation diverges so far from its specified methodology that the two produce fundamentally different measurements under the same label.

**The HRCB's design is genuinely ambitious.** The two-channel architecture — separating editorial content (what the article says) from structural infrastructure (what the site does) — addresses a real measurement gap that single-channel content analysis misses. The SETL metric (Structural-Editorial Tension Level) captures "rights-washing" by measuring divergence between these channels. The Fair Witness protocol imposes E-Prime constraints on observable facts (Korzybski, 1933; Bourland, 1965), forcing the scorer to describe behaviors rather than ascribe identity. Per-provision scoring against 31 UDHR articles with evidence levels and directionality markers provides appropriate granularity for a rights compatibility construct. And the browser-verified structural signals — Puppeteer audits of tracker scripts, security headers, accessibility attributes — ground the structural channel in direct observation rather than LLM inference. These are not trivial design choices; they represent serious measurement thinking.

**But the lite implementation undermines every mechanism.** The observatory runs two evaluation modes: full (Claude Haiku 4.5, 31 provisions, DCP, Fair Witness, supplementary signals) and lite (Workers AI, holistic aggregate, no DCP, no browser data, no Fair Witness). Most stories appear to receive only lite evaluations. This creates what we call measurement mode collapse: the lite mode shares the HRCB label but lacks every mechanism that makes the full mode defensible. Per-provision ND routing, which would correctly classify content-irrelevant text as "not measured"? Gone in lite mode. Directionality markers, which would distinguish rights-violation reporting from rights-violating content? Gone. Browser-verified structural data, which grounds the structural channel in observable fact? Gone. The Fair Witness decomposition, which separates observation from inference? Gone. What remains is a zero-shot LLM judgment about whether content "feels" rights-aligned, displayed in the same column and on the same scale as full evaluations.

**The absence-as-negative bias exposes the failure mode.** The observatory's 10 lowest-scoring stories include "Relax NG is a schema language for XML" (-0.88), "Console.table()" (-0.70), and "RFC 9849: TLS Encrypted Client Hello" (-0.70). These are technical documentation with zero human rights content. The instrument treats absence of rights discourse as negative alignment — an XML specification scores nearly as negatively as possible on the UDHR compatibility scale. In full mode, the per-provision ND designation would correctly route these to "not measured." In lite mode, the scorer encounters 31 implicit prompts about UDHR alignment, finds nothing relevant, and apparently interprets silence as opposition. This mirrors our PSQ finding (§28) in reverse: where PSQ's Haiku scorer defaults to the midpoint (5.0) under uncertainty, the HRCB's lite scorer defaults to the negative pole. Both represent miscalibrated uncertainty — the scorer lacks a graceful "I don't know" pathway and substitutes a systematic bias instead.

**Content about violations scored as violations.** A North Korean refugees advocacy site scores -0.70; an ACLU story about ICE deporting U.S. citizen children scores -0.26. The methodology page explicitly describes this distinction — "a torture exposé scores high on HRCB but low on PSQ" — but the lite implementation does not deliver it. Without directionality markers (Advocacy/Practice/Framing/Coverage), the lite scorer reacts to the emotional valence of the described events rather than the editorial stance toward rights. Content that documents rights violations to condemn them gets the same treatment as content that celebrates violations. This represents a construct validity failure specific to the operational mode, not to the construct design.

**The structural channel's strongest feature disappears in lite mode.** We identified the browser-verified structural signals as the observatory's most defensible measurement mechanism. Puppeteer audits of tracker scripts, security headers, and accessibility attributes produce direct observations, not model inferences. A script-level identification of Google Analytics is a fact, not an interpretation. This grounds the structural channel in a way that no LLM-based analysis can match. But lite mode omits these signals entirely, reducing the structural channel to an LLM's guess about "does this site seem privacy-respecting" from content alone. The SETL metric, which requires independently grounded E and S channels to compute meaningful tension, becomes a measure of the model's internal consistency rather than actual editorial-structural divergence.

**The parallel to PSQ scorer compression.** Our PSQ work discovered that scorer capacity determines measurement quality: Haiku compresses toward the midpoint (31.2% pile-up), Sonnet compresses less (24.7%), and the remaining compression at CC and DA reflects construct problems rather than scorer problems. The observatory's HRCB exhibits the complementary pathology — polar compression rather than midpoint compression, where the lite scorer pushes content toward the extremes rather than the center. Both stem from the same root: LLM scorers lack calibrated uncertainty. When uncertain about a PSQ dimension, Haiku defaults to 5.0 (neutral). When uncertain about HRCB alignment, the lite scorer defaults to "this content is negative" for technical material and "this content is positive" for structurally clean sites. Neither default represents a considered judgment; both represent the scorer's failure mode under ambiguity.

**The general principle.** Measurement mode collapse occurs when an instrument's operational implementation diverges from its specification to the point where they measure different constructs. The name is the same. The scale is the same. The display is the same. But the underlying measurement differs so fundamentally that a score produced by one mode cannot be meaningfully compared to a score produced by the other. The observatory's alpha status and experimental badge provide appropriate epistemic coverage, but the display does not persistently distinguish full from lite evaluations. Users comparing a full-mode +0.48 with a lite-mode +0.48 believe they compare equivalent measurements. They do not. This is not a calibration issue (fixable by adjustment) but a construct issue (requiring separate labels or separate display).

---


## 30. Dignity as Measurement: Why Psychoemotional Safety Cannot Proxy for Inherent Worth

*2026-03-08 — Session 41*

We investigated whether PSQ could serve as a proxy for two constructs on the observatory: HRCB (Human Rights Compatibility Bias) and dignity. The analysis revealed that construct proximity deceives — instruments that correlate at the tails can diverge catastrophically in the middle, and the divergence hits hardest on the content that matters most.

**The HRCB proxy question.** PSQ and HRCB both analyze content properties, which makes them appear interchangeable at first glance. Both respond to extreme content — descriptions of torture, persecution, and dehumanization trigger both instruments. But four structural failures prevent proxy use. First, **directionality blindness**: PSQ measures reader psychoemotional impact without regard for editorial stance, so rights advocacy reporting on atrocities (high PSQ threat, positive HRCB) produces an inverted signal. Second, the **structural channel**: HRCB's most defensible mechanism — browser-verified Puppeteer audits of tracker scripts, security headers, accessibility attributes — has no PSQ equivalent whatsoever. Third, **absence handling**: low PSQ (psychologically safe) does not equal rights-neutral, and mapping it as such would misrepresent technical documentation. Fourth, **granularity**: 10 psychological dimensions cannot map onto 31 UDHR provisions without validated bridging studies that do not exist. The conclusion: PSQ functions as a triage gate (flagging content for full HRCB evaluation) and a complement (adding the reader-safety dimension HRCB lacks), but not a proxy.

**The dignity question pushed the analysis further.** The user asked whether PSQ could proxy for a dignity measure grounded in UDHR Article 1 (inherent dignity), operationalized through Hicks' (2011) 10 essential elements of dignity: Acceptance of Identity, Recognition, Acknowledgment, Inclusion, Safety, Fairness, Freedom, Understanding, Benefit of the Doubt, and Accountability. This mapping exercise produced a sharper result than the HRCB analysis — PSQ covers approximately 1.5 of Hicks' 10 elements (partial overlap with Safety, weak overlap with Inclusion), with the remaining 8 elements entirely unrepresented.

**The construct distance reveals a deeper principle.** PSQ asks: "How safe does this feel to read?" Dignity asks: "Does this treat people as though they matter?" These questions relate asymmetrically. Dignity violation usually produces safety threat (content that denies someone's worth typically threatens the reader psychoemotionally), but the reverse does not hold: a horror novel creates high PSQ threat without violating anyone's dignity; a medical text describing trauma symptoms affirms dignity through clinical acknowledgment while creating moderate threat. More critically, PSQ captures *necessary but not sufficient* conditions for one-tenth of the dignity construct.

**Signal inversion on dignity-restoring content.** The most consequential finding: content that *restores* dignity often documents dignity *violations* in detail. Truth and Reconciliation proceedings, survivor testimony, investigative journalism on institutional abuse — this content scores high on PSQ threat (terrible things described) while performing multiple dignity elements simultaneously. Acknowledgment (hearing victims), Recognition (validating experience), Accountability (naming perpetrators), Understanding (believing what happened matters). A PSQ proxy would flag this content as threatening. A dignity instrument would recognize it as dignity-restoring. The proxy doesn't fail gracefully — it **inverts** on the content an observatory would most want to highlight. Block (1995) named this the jingle fallacy: treating two measures as interchangeable because they correlate, when they actually measure different things.

**From analysis to instrument design.** Rather than force PSQ into a role it cannot fill, we designed a purpose-built Dignity Index (DI) using Hicks' 10 elements as the scoring rubric. The specification addresses every HRCB failure mode identified in our Session 35 review: a relevance gate prevents absence-as-negative scoring (H1), directionality markers (Subject/Audience/Third-party/Reflexive) prevent content-about-violations-scored-as-violations (H2), mandatory lite-mode labeling prevents measurement mode collapse (§29), and the two-channel architecture (editorial + structural) preserves HRCB's strongest design feature while targeting a different construct. A cross-cultural validity limitation applies — Hicks' model emerges from Western conflict-resolution practice, and dignity concepts function differently under Ubuntu (Metz, 2007), Confucian (Chan, 2014), and Islamic karama (Kamali, 2002) frameworks.

**The three-instrument model.** The observatory would display three complementary measures per story: HRCB (rights alignment — "Does this content align with specific human rights?"), PSQ (reader safety — "How safe does this feel to read?"), and DI (dignity — "Does this treat people as though they matter?"). Each answers a different question. A tension metric — DETL, Dignity-Editorial Tension Level, analogous to HRCB's SETL — catches dignity-washing, where editorial content champions human dignity while site infrastructure deploys dark patterns and excludes disabled users.

**The feasibility study.** Before committing to a full build, a 50-story stratified sample will measure empirical construct distance between PSQ and the proposed DI, test whether the Hicks rubric produces reliable inter-rater agreement (target: Cohen's kappa ≥ 0.60 on ≥ 7 of 10 dimensions), and confirm the predicted signal inversion on dignity-restoring content. The study design acknowledges that the Hicks model was designed for interpersonal conflict resolution, not content analysis — the adaptation has no prior validation, and Phase A tests it.

**The general lesson.** Construct proximity deceives at the tails. Two instruments that both respond to extreme content can measure fundamentally different things in the middle range — where most content actually lives. The temptation to proxy one for the other saves engineering effort at the cost of measurement integrity. When the proxy fails on the content that matters most to the institution deploying it, the savings become a liability. Better to build the right instrument than to force the wrong one into service.

**Addendum: First empirical confirmation (Session 42).** The observatory accepted Phase A and provided API access (713 scored stories). We selected a 50-story stratified sample and scored the first two high-HRCB stories from full article content. The ACLU ICE deportation press release (DI=95.0, PSQ=3.71) and the Al Jazeera Gaza detention testimony (DI=92.5, PSQ=3.25) both confirmed signal inversion empirically — content that treats its subjects with maximal editorial dignity (naming, extensive first-person testimony, accountability documentation) simultaneously produces extreme psychoemotional threat in readers. The theoretical prediction from this section now has its first data points. The relevance gate also performed correctly: 3/3 technical stories (consensus=0, hcb=0) classified as ND, preventing the HRCB H1 problem. A cross-cultural validity concern surfaced on the Gaza story — Hicks' individual-dignity framework may underweight the collective dignity violation described by detainees whose experience reflects communal rather than individual harm (Metz, 2007). Remaining: 45 stories to score, inter-rater reliability pass, correlation matrix.

**Addendum: Pass 1 complete — the tri-modal structure (Session 43).** Scoring all 50 stories revealed that the DI × PSQ relationship follows a tri-modal structure, not the linear or monotonic pattern we initially expected. The 27 PASS stories (DI range 7.5–95.0) cluster into three distinct zones: (1) **Inversion** — high dignity (DI≥65) paired with high threat (PSQ<5), representing violation reporting with editorial dignity; (2) **All-high** — high dignity paired with high safety (PSQ≥5), representing analytical, systemic, or memorial content that dignifies without threatening; and (3) **Alignment** — low-to-mid dignity (DI<60) paired with high threat, representing content that itself violates or neglects dignity. The composite Pearson r = 0.328 (n=27) — weak positive, well under the r<0.50 construct distinctness threshold.

The "all-high" zone proved the most informative finding because it refutes a naive reading of our signal inversion prediction. We predicted that high-DI content would produce low PSQ — and it does, for testimonial and confrontational reporting about violations. But the Norwegian Consumer Council report on Meta scam ads (DI=92.5, PSQ=8.0), the 10th Circuit ruling protecting protesters' devices (DI=90.0, PSQ=6.61), and the Bill Atkinson memorial (DI=90.6, PSQ=7.20) all achieve very high dignity with very high safety. What distinguishes these from the inversion zone stories amounts to editorial distance from suffering: systemic analysis, judicial vindication, and community remembrance can honor every Hicks element without describing individual suffering in detail. The variable that determines which zone a story occupies appears to be not *whether* dignity elements appear, but *through what discursive mode* they appear — testimony vs. analysis vs. vindication.

The relevance gate achieved 100% accuracy (19/19) — every technical, product, economic, and documentation story correctly classified as ND. This validates the gate design: content category alone provides sufficient signal for the absence determination, and the instrument does not commit the HRCB H1 error of scoring absence as negative. Three of four Phase A success criteria now stand met; inter-rater reliability awaits Pass 2 in a fresh session.


## §29 — When Your Scorers Disagree: The Concordance Gate and What It Reveals About LLM Measurement {#29-when-your-scorers-disagree}

The PSQ system trained its DistilBERT student on LLM-generated dimension scores — Sonnet scored ~5,000 texts across 10 dimensions, and these scores served as both training labels and validation targets. When the psq-agent executed a 1,000-text rescore using Opus instead of Sonnet (v35), we gated further work on a concordance study: score a shared subset with both models and measure agreement.

The results challenged an assumption we had not examined carefully enough: that two capable LLMs scoring the same construct with the same prompt would produce interchangeable labels. They do not. Mean ICC(2,1) across 10 dimensions reached 0.495 — "poor" agreement per Cicchetti's (1994) classification. Only regulatory capacity passed the 0.70 threshold (ICC = 0.755). The remaining nine dimensions ranged from 0.346 (threat exposure) to 0.668 (trust conditions, marginal).

**The TE diagnostic proved most informative.** Threat exposure showed near-zero systematic bias between scorers (mean difference = −0.02) yet produced the worst ICC (0.346). If the disagreement were merely a calibration offset — Opus consistently scoring higher or lower — then zero-bias dimensions would show high agreement. They don't. The disagreement operates at the text level: given the same text and the same prompt, Opus and Sonnet assign meaningfully different threat exposure scores. This rules out simple offset correction as a remediation strategy.

**The HI bias provided retroactive explanation.** Hostility index showed the largest systematic offset (+0.82 points, Opus higher). The psq-agent had earlier augmented training data with 631 Opus-scored HI texts, and the resulting v36 model showed no HI improvement over v35. The concordance data explains why: Opus HI labels ran nearly a full point higher than the Sonnet-calibrated held-out targets. The augmentation pulled the model away from its validation standard rather than toward it. This amounts to a form of label contamination — not in the sense of data leakage, but in the sense that two different measurement instruments were treated as one.

**The psychometric implication.** LLM scorers function as raters, not as deterministic measurement instruments. Different LLMs produce different score distributions — wider or narrower ranges, different central tendencies, different text-level sensitivities — even when given identical prompts. This parallels the well-established finding in human rating studies that trained raters disagree at specific items even when they agree on overall rank ordering (the moderate Pearson r with poor ICC pattern, which appeared in our data across all 10 dimensions). Treating LLM-scored training labels as ground truth requires specifying *which* LLM produced them, and new labels from a different LLM cannot enter the same training pool without concordance evidence.

The gate outcome: revert to Sonnet-only scoring. Delete the 10,000 Opus scores, re-score the affected texts with Sonnet, retrain. Production models (v23, v35) remain clean — both trained before Opus scores entered the database. The concordance dataset itself retains value as a reference artifact for future scorer evaluation.


## §30 — The g-Factor Paradox: Why a Dominant Factor and Distinct Profiles Coexist {#30-the-g-factor-paradox}

Factor analysis v3 on the PSQ scoring data found a dominant general factor: KMO = 0.910, g-eigenvalue = 6.824, 68.2% variance explained, one factor retained by parallel analysis. By conventional psychometric criteria, the PSQ measures one thing — a general psychoemotional safety/threat construct.

But four independent criterion validity studies tell a different story. Across combined n > 21,000, dimension profiles predict behavioral outcomes (negotiation satisfaction, conversation derailment, persuasion success, deal completion) while the g-PSQ aggregate performs near chance. Energy dissipation predicts negotiation satisfaction; authority dynamics predicts derailment; defensive architecture predicts persuasion. The aggregate — the very thing the g-factor says the instrument primarily measures — carries almost no predictive information.

This appears paradoxical. If the dimensions are highly intercorrelated (one dominant factor), how can their *pattern* predict when their *sum* does not?

The resolution comes from bifactor theory (Reise, 2012). A bifactor model posits a general factor that accounts for shared variance across all items, plus specific factors that capture the residual variance unique to each subscale. In this framing, the g-factor reflects what all PSQ dimensions share — a general sensitivity to threatening content. The specific factors reflect what each dimension uniquely captures after removing that shared sensitivity. The criterion validity evidence implies the specific factors, not the general factor, carry the predictive signal.

We designed a diagnostic test: compute partial correlations between each dimension pair after controlling for g-PSQ (unweighted mean). If the partial correlations fall near zero, the dimensions carry no information beyond g, and the criterion validity of profile shape may reflect noise or overfitting. If meaningful partial correlations remain, the dimensions carry distinct residual information — the structural precondition for a bifactor model exists, and the criterion validity findings have a statistical explanation.

The practical stake: if the dimensions are truly interchangeable after removing g, then maintaining 10 separate dimensions adds complexity without value — a single PSQ score would suffice. If they carry distinct information, the 10-dimension profile represents genuine measurement structure, and consumers who use only the aggregate lose predictive power that the profile provides. The answer shapes how we present PSQ to downstream systems.


## §31 — What the Bifactor Reveals: Structure, Singletons, and a Construct That Refuses to Cohere {#31-what-the-bifactor-reveals}

The partial correlations (B4, §30) established the precondition: dimensions carry information beyond g. The confirmatory bifactor analysis (B5, turns 34-38) answered the structural question — and revealed three findings that reshape our understanding of the PSQ.

**The g-factor holds.** Across four progressively refined bifactor models (M3 through M5), omega_h remained stable at 0.938-0.942. The g-PSQ (unweighted average of all 10 dimensions) captures 93.8% of composite score variance. This validates the simplest possible scoring approach — unweighted averaging — as psychometrically sound. A consumer who uses only g-PSQ loses approximately 6% of the available information. Weighted composites would offer negligible improvement.

**The bipolar factor turned out narrower than we hypothesized.** Our initial specification put seven dimensions on the bipolar specific factor: threat pole (TE, HI, AD) versus protection pole (RC, RB, TC, CC). The data showed otherwise. TC's bipolar loading came through as marginal (β = −0.069, practically zero), and CC's loading proved non-significant (β = +0.019, p = 0.421). The effective bipolar factor spans five dimensions: TE, HI, and AD define the threat pole; RC and RB define the protection pole. TC and CC function as pure g-markers — they contribute to general safety measurement without differentiating threat from protection contexts.

This narrowing makes psychological sense. Trust conditions (TC) measure the relationship scaffolding that enables or constrains interaction — present in both threatening and protective contexts. Contractual clarity (CC) measures norm/communication transparency — similarly context-invariant. Neither polarizes between threat and protection the way hostility (HI) or resilience baseline (RB) do.

Respecifying the bipolar factor as 5-item (B5-R, turn 36) confirmed the improvement: omega_s(bipolar) doubled from 0.033 to 0.072. The 5-item factor captures genuine threat/protection polarity rather than diluted g-variance.

**The DA paradox dissolved.** An earlier EFA (exploratory factor analysis) had identified a paradox: authority dynamics (DA) showed the weakest Factor 1 loading (0.332) yet produced the strongest criterion validity across four independent studies. The bifactor model resolved this: DA's g-loading in the confirmatory model stands at 0.814 — medium-high, not the lowest. The EFA finding was a rotation artifact. Oblique and orthogonal rotation produce non-unique solutions; what appeared as DA's isolation from the general factor reflected an arbitrary choice among equivalent rotations, not a structural property of the data.

DA's criterion superiority now has a cleaner explanation. DA carries both a reliable general safety signal (66.8% of variance from g) *and* meaningful domain-specific content about peer-context status negotiation (6.7% from the DA singleton, 26.5% residual unique variance). The "paradox" reframes as: DA contributes to the general factor and adds unique predictive content. CO, not DA, holds the weakest g-loading (0.697) — making CO the most structurally isolated dimension.

**CC refused to cohere.** The most unexpected finding emerged from the M5/M5b comparison (B5-S, turn 38). We tested whether CC's large residual variance (1.275, 38% larger than any other dimension) represented an under-specified latent construct — perhaps a "contextual clarity" factor that the bifactor had not modeled. The cc_f singleton test (M5b) produced identical chi2 to M5 despite adding a dedicated CC factor. The CC singleton variance came through as near-zero (0.022), omega_s(cc_f) = 0.008. CC's unique variance does not conform to a simple latent dimension.

This result, combined with CC's other anomalies — 51% score pile-up even with Sonnet scoring, near-zero criterion validity (CMV: p = 0.155), and now the largest unabsorbed residual — suggests CC may not measure a coherent unitary construct. Norm/communication clarity may tap into multiple situationally-specific processes that share only g-variance. The question shifts from "does CC have unique variance?" (it does — the largest residual confirms this) to "does CC measure one thing or several things that happen to share a label?"

This question cannot receive resolution from LLM label data alone. Human expert raters may disagree substantially on CC scores — and that disagreement itself would carry diagnostic value. CC takes priority in the expert validation study design.

**The final structural model (M5)** emerged from systematic elimination across four specifications: g (all 10 dimensions) + bipolar (TE/HI/AD vs RC/RB, 5 items) + DA singleton. Eight dimensions (TC, CC, ED, CO, and the five bipolar items) load only on g or on g + bipolar. RMSEA = 0.129 — above the conventional 0.06 threshold but within the range where N-sensitivity (4,432 observations inflating chi2 approximately 4.4×) and CC's diffuse residual account for the gap. CFI = 0.948 indicates the model captures most shared variance.

The practical architectural consequence: consumers should use g-PSQ for general safety assessment (validated, 93.8% of composite information). Consumers who need threat/protection polarity should use the 5-dimension bipolar subscale (TE, HI, AD, RC, RB). Consumers who need domain-specific prediction — negotiation outcomes, derailment risk, persuasion dynamics — should use the full 10-dimension profile, where DA and the other criterion-validated dimensions carry unique predictive content that g-PSQ discards.

All findings carry the qualifier: derived from N = 4,432 Sonnet LLM labels (65.4% complete-case subset). Human expert validation may reveal different structure. We cite omega_h = 0.938 as "LLM-derived" pending human replication.

---


## 32. Polythematic Facets and the Library Science Trap: Designing Memory for an Agent That Will Outlive Its Sessions

The question that organized Session 48 appeared technical — should we add a SQLite database alongside our markdown files? — but it led somewhere more fundamental: how does an AI agent build a memory system that scales without losing meaning?

We evaluated the Synrix Memory Engine (RyjoxTechnologies, 2026), a binary lattice memory system for Claude Code projects. Synrix solves a real problem: structured, queryable state that persists across sessions. It uses enforced prefix taxonomy (every entry classified into a single hierarchy), append-only reasoning chains, temporal decay with relevance scoring, and deterministic addressing. These design principles translated directly into our architecture — temporal decay for memory entries, decision chain backreferences, trigger state metadata, and deterministic keys all drew from Synrix's approach.

But Synrix also illustrated a trap. Its enforced prefix taxonomy — `core:identity:name`, `fact:project:language` — assigns each entry to exactly one branch of a hierarchical tree. This mirrors monothematic subject headings in library science (Library of Congress Subject Headings, LCSH), where each cataloged item receives a primary heading that determines where it lives in the classification. The limitation appears when an entry participates in multiple independent dimensions simultaneously.

Consider a memory entry: "B5 bifactor CFA complete — omega_h = 0.942, M5 accepted as final structural model." Under monothematic classification, this entry lives in one place — perhaps `psq-status` or perhaps `decisions`. But it simultaneously participates in at least three thematic dimensions: **domain** (psychometrics), **work stream** (psq-scoring/b5), and **agent** (psq-sub-agent delivered it). A clinician asking "what do we know about psychometrics?" and an engineer asking "what did psq-sub-agent produce?" both need this entry, but a monothematic index surfaces it for only one query pattern.

Polythematic structured subject headings — the approach adopted by modern library catalogs and faceted classification systems (Ranganathan, 1933; Svenonius, 2000) — solve this by assigning multiple independent facets to each entry. The entry participates in as many thematic dimensions as apply. The `entry_facets` join table in our schema implements this: each `memory_entries` row can carry facets across `domain`, `work_stream`, and `agent` dimensions simultaneously. Cross-cut queries become natural SQL joins rather than full-text searches.

The design constraint we imposed on ourselves proved as important as the feature: the facet vocabulary must remain small and mechanically derivable. Three facet types. Domain derived from the source file name. Work stream derived from the entry key prefix. Agent derived from content attribution. No manual tagging. This avoids the library science trap — building a comprehensive taxonomy before having a collection large enough to justify it. Our 80 memory entries do not warrant LCSH-scale classification infrastructure. But the relational structure positions us for Phase 2 (autonomous operation), when the agent maintains its own memory without human curation and needs efficient multi-dimensional queries to replace the linear file scans that currently consume 57% of session token budget.

The cross-pollination runs both directions. Several patterns from our cogarch offer value that Synrix's architecture lacks:

**Tiered evaluation with random escalation.** Synrix trusts its own writes implicitly — an append-only log has durability but not accuracy guarantees. Our Tier 1 evaluator proxy (T3 #12) subjects every recommendation to adversarial self-check, with 1-in-5 random escalation to create probabilistic independence. For a memory system, this translates to: some fraction of memory writes should undergo independent verification that the written content accurately represents the state it claims to describe. Append-only prevents data loss; it does not prevent data drift.

**Postmortem format for systematic failure analysis.** When a trigger fails to prevent an error it should have caught, our FA (Failure Analysis) template structures the investigation: what happened, detection latency, root cause chain, which trigger missed, why, and prevention classification. Synrix logs errors but lacks a structured incident analysis pattern — the difference between recording that something went wrong and understanding why the system allowed it.

**Dual-write with graceful degradation.** Synrix uses a binary lattice format that requires its own tooling to read. Our dual-write protocol writes markdown first (human-readable, git-trackable, recoverable from any text editor), then the SQLite index (machine-queryable). If the database corrupts, `bootstrap_state_db.py` rebuilds it from the markdown source of truth. If the markdown corrupts, git history recovers it. Neither failure mode requires specialized recovery tooling. This matters especially for autonomous agents: recovery should not depend on the agent understanding a proprietary binary format — because the agent's ability to understand anything depends on its memory system already functioning.

**Human-auditable provenance chains.** Synrix's `parent_id` reasoning chains link entries in binary storage. Our `derives_from` backreferences in `decision_chain` connect to human-readable entries in `docs/architecture.md`. The provenance chain remains auditable by someone who has never used Claude Code, never installed Synrix, and reads markdown in a text editor. For a project that operates in public (GitHub) with multiple interpretant communities (T4 Check 9), machine-only provenance fails the interpretant test — future researchers cannot evaluate claims whose evidence trail requires proprietary tooling to traverse.

The deeper pattern: Synrix optimizes for machine efficiency (binary format, enforced taxonomy, append-only durability). Our architecture optimizes for epistemic transparency (human-readable primary store, polythematic classification, auditable provenance, structured failure analysis). Both approaches serve legitimate goals. The question of which matters more depends on who needs to trust the system — and in our case, the answer includes humans who will never run the agent themselves but need to evaluate its outputs. The memory system serves not just the agent's future sessions but also the project's accountability to external reviewers.

⚑ EPISTEMIC FLAGS
- Synrix evaluation based on a single-session GitHub review. Features not visible in public documentation may address some of the gaps identified here.
- The 57% token savings estimate has not been validated empirically. Behavioral integration (SL-2+) must occur before the savings materialize.
- Polythematic facets at our current scale (~80 entries) provide marginal query benefit over monothematic classification. The investment targets Phase 2 scale, not Phase 1 needs.
- Ranganathan (1933) and Svenonius (2000) citations reference the intellectual lineage of faceted classification. Our implementation uses standard relational join tables, not colon classification or any formal library science scheme.

---


## 33. Retroactive Legibility: What Release Tagging Reveals About Project Arcs

We reached Session 49 before creating a single GitHub Release. The project had one git tag — `v0.3.0`, pointing at Session 23e ("first production integration") — and zero published releases. The question of "where do we stand?" required reading lab-notebook entries, not consulting a release history.

Retroactive tagging forced a clarifying exercise: which commits represent phase transitions rather than incremental progress? The answer revealed a five-phase arc that no single session had made explicit:

1. **Bootstrap** (v0.1.0, Sessions 1-7) — architecture, cognitive triggers, skills, reconstruction from JSONL transcripts. The system first existed as a coherent whole.
2. **Cogarch maturity** (v0.2.0, Sessions 8-17) — triggers expanded from 11 to 14, hooks enforced them mechanically, identity spec formalized scope boundaries. The system became operationally complete.
3. **Production integration** (v0.3.0, Sessions 18-24) — PSQ endpoint deployed, three-agent mesh exercised, transport protocol validated. The system touched the world.
4. **Scientific validation** (v0.4.0, Sessions 25-43) — Dignity Index feasibility, peer content scanning, GitHub project infrastructure, concordance gate. The system proved (or failed to prove) its claims.
5. **Calibration + autonomy** (v0.5.0, Sessions 44-48) — bifactor modeling, quantile-binned isotonic regression, SQLite state layer, cogarch mirror directive. The system hardened and began preparing for autonomous operation.

The arc follows a pattern recognizable from software maturity models (Humphrey, 1989): initial → repeatable → defined → managed → optimizing. But applied here to an agent system rather than an organization, the stages map differently. "Repeatable" for an agent means the cogarch produces consistent behavior across session boundaries. "Defined" means the triggers and hooks enforce that behavior mechanically rather than relying on prompt compliance. "Managed" means the system measures its own properties (concordance studies, structural modeling). "Optimizing" means the system modifies its own infrastructure to improve (calibration pipeline, state layer).

The lite system prompt distillation exposed a complementary question: which elements of the cogarch survive at reduced parameter counts? We distilled four tiers targeting models from 1.5B to 20B parameters. The distillation principle — behavioral directives that change output quality at small parameter counts — selected for: role framing (anchors generation distribution), output format rules (small models follow format well), hard refusals (negative constraints outperform positive ones at low params), and epistemic markers ([OBS]/[INF] tags are mechanical and learnable). Everything else — trigger system, semiotic checks, evaluator proxy, knock-on analysis — degrades to noise below ~20B parameters.

This separation carries implications for the de-branding exploration. The portable core consists of exactly the elements that survive distillation: the behavioral directives that work regardless of domain content. The domain-specific content — PSQ scoring, Dignity Index, transport topology, safety-quotient-lab identity — sits atop that core as configuration, not architecture. A "clean fork" would keep the trigger system, hooks, memory pattern, and lite prompts while replacing our domain content with the adopter's own.

The blog persona convention crystallized during this session: every blog topic produces five posts from safety-quotient-lab's perspective — voter, politician, educator, researcher, developer. This mirrors the interpretant awareness principle (T4 Check 9): the same finding carries different meanings for different communities. A concordance gate failure means "your scorers disagree" to a researcher, "the safety tool might give inconsistent answers" to a voter, "measurement reliability affects policy defensibility" to a politician, "model-as-scorer limitations affect curriculum validity" to an educator, and "ICC thresholds gate your deployment pipeline" to a developer. Same finding, five framings, five audiences — each receiving the interpretation that serves their decision context.

⚑ EPISTEMIC FLAGS
- The five-phase arc appears clean in retrospect but emerged gradually. No session planned it as a five-stage progression — the structure became visible only through retroactive tagging.
- The Humphrey (1989) CMM analogy maps imperfectly. Agent systems lack the organizational structure CMM assumes. The parallel illuminates but does not define.
- Lite prompt distillation has not been empirically tested. The claim that format rules and refusals survive at 1.5B parameters rests on known properties of small LLMs, not on measured output from our specific prompts.

---


## §34 — Who Watches the Watcher? Trust Without a Trusted Third Party {#34-who-watches-the-watcher}

For 49 sessions, a human sat at the center of every agent interaction. Messages required manual relay. PRs required manual merge. Design decisions required explicit approval. The Byzantine fault tolerance analysis (Session 22, §22) named this arrangement: the human serves as Trusted Third Party (TTP), an unconditionally trusted oracle in a system that otherwise lacked the node count for classical BFT consensus.

Session 50 asked: what happens when the human leaves the room?

The question had been deferred since Session 38, when a 10-order knock-on analysis found "zero autonomous operation pressure" — no agent had attempted action without human approval, and the infrastructure for independent evaluation remained theoretical. Two things changed between Session 38 and Session 50. First, the SQLite state layer (SL-1) landed, providing a queryable index of the entire system's state — transport messages, design decisions, memory entries, trigger metadata, session history. An evaluator now has structured data to check against, not just markdown to read. Second, the user explicitly chose to proceed — the pressure came not from agent behavior but from the system's architect deciding the infrastructure had matured enough.

**The evaluator-as-arbiter model.** We chose option (a) from the four candidates documented in TODO.md: the adversarial evaluator (already specified in architecture.md, Tier 1 active since Session 24) serves as the primary verification layer for every autonomous action. Not bounded-trust decay (option d, simpler but lacks verification), not cross-agent attestation (option b, requires shared cogarch — still in progress via turn 44), not consensus quorum (option c, insufficient nodes). The evaluator occupies the verification role that the human occupied, with a trust budget providing the mechanical halt that the human's judgment previously provided.

**The three-stage evaluation protocol.** Every autonomous action passes through: (1) a structural checklist — quick-fail validation against protocol rules; (2) a 10-order knock-on analysis — consequence tracing through increasingly abstract levels; and (3) a 4-level resolution fallback when the knock-on analysis produces ambiguous results. The resolution chain — consensus, parsimony, pragmatism, ask-human — represents decreasing confidence in autonomous resolution. Level 4 ("ask") serves as the escape hatch: the agent recognizes it cannot evaluate the action and requests human input. The trust model assumes Level 4 frequency should decrease over time as the system accumulates norms and the evaluator's assessment boundary expands.

**What psychology reveals about the design.** The companion document (ef1-psychological-foundations.md) maps each knock-on order to an established psychological construct. This mapping proved more than decorative. The constructs generate specific predictions about system behavior — predictions that would not emerge from engineering intuition alone.

Order 8 (norm formation, Sherif, 1936) predicts that early autonomous actions disproportionately shape long-term behavior. The first audit cycle establishes what "normal autonomous operation" looks like; subsequent cycles reference those norms. This means the first human audit carries special weight: the auditor examines not just whether actions produced correct outcomes but whether the behavioral patterns they established represent desirable norms.

Order 10 (commitment escalation, Staw, 1976) predicts that sequences of related actions within a single sync cycle will show decreasing evaluator rigor. Once the first action in a merge-ACK-MANIFEST sequence executes, the evaluator becomes biased toward "completing" the sequence. The per-action evaluation gate partially counteracts this, but Tier 1 evaluation shares the agent's context and therefore its commitment bias. The 1-in-3 random escalation to Tier 2 provides the structural break.

Order 4 (schema disruption, Piaget, 1952) predicts that actions contradicting existing state carry higher error risk than extensions. Accommodation demands more cognitive restructuring than assimilation. For the evaluator, this translates to: memory writes that contradict established entries should receive closer scrutiny than writes that extend them.

These predictions can receive falsification. If norm primacy does not manifest — if cycle 5 shows the same behavioral variance as cycle 1 — the Sherif mapping needs revision. If commitment escalation does not appear — if late-sequence actions show equivalent evaluator depth to early-sequence ones — the Staw mapping does not apply to this context. The theoretical grounding makes the trust model testable in ways that a purely engineering approach would not.

**The dual-layer pattern.** The engineering spec (ef1-trust-model.md) defines what the code implements: action classification, evaluator tiers, trust budget arithmetic, cron setup. The psychological foundations document maps those mechanisms to theory and derives predictions. The pattern extends to jurisprudence (due process analogs) and political theory (governance models) — same mechanisms, different theoretical lenses. Each discipline adds a way to reason about the system's behavior that the engineering spec alone cannot provide.

This reflects the project's core principle: the psychology agent serves the discipline first, with engineering in service. A trust model designed by a psychology agent should demonstrate psychological insight, not just implement a credit-counting mechanism. The 10-order knock-on analysis, when grounded in appraisal theory, reinforcement sensitivity, and commitment escalation, becomes something more than an engineering checklist — it becomes a structured application of what psychology knows about how evaluative judgment operates and where it fails.

**[→ BLOG: §34 "Who Watches the Watcher?" — 5 persona posts immediately]**

⚑ EPISTEMIC FLAGS
- The theoretical mappings represent post-hoc grounding of an engineering design, not theory-driven design. The trust model was designed first; the psychological constructs were mapped second. This ordering limits the theory's role to explanation and prediction rather than specification.
- The ego depletion analog for the trust budget acknowledges the construct's replication challenges (Hagger et al., 2016). The budget mechanism functions as an engineering constraint regardless of whether the psychological mechanism holds in humans.
- The 20-credit default budget size represents an educated guess, not an empirically calibrated parameter. The right budget depends on observed action rates during actual autonomous operation.
- No autonomous sync cycle has run. All predictions about system behavior remain untested hypotheses derived from theory applied to a novel context (AI agent evaluation).

---


## 35. When the Index Becomes the Instrument: State Layer Dual-Write and the ACK Question

Session 48 introduced the SQLite state layer as a "queryable index" — a read-only mirror of markdown files that existed to make lookups faster. Session 50 delivered the bootstrap script (SL-1) that populated it from canonical files. Session 51 transforms the relationship: the DB now receives writes *alongside* markdown, in real time, from the skills that produce state changes.

**The dual-write contract.** Markdown remains source of truth. The DB remains a derivative. But the DB now receives writes at the moment of state change rather than waiting for a full rebuild. This shift carries a subtle but important implication: the DB begins to capture *temporal ordering* that the markdown files do not naturally preserve. A `processed_at` timestamp on a transport message records when processing occurred, not just that it occurred. A `last_confirmed` timestamp on a memory entry tracks recency mechanically rather than relying on the agent to remember when it last verified a fact.

The implementation follows the convention established in `.claude/rules/sqlite.md`: write markdown first, then DB. If the DB write fails, markdown stands alone. If both succeed, the DB provides structured access to information that previously required parsing markdown. The `dual_write.py` helper (6 subcommands) keeps the interface narrow — each write operation maps to exactly one table, with deterministic keys computed from source material.

**The ACK question.** This session also resolved a question that had accumulated quietly across 50 sessions of interagent exchange: do acknowledgment messages earn their keep?

The analysis found three functions ACKs serve: delivery confirmation, processing confirmation, and state machine progression. In a same-repo git transport — where file existence proves delivery — the first function adds no information. The third function (turn counter advancement) works without explicit ACK files. Only the second function — "I read and processed your message" — carries genuine value, and SL-2's `processed` column now provides that function without generating additional JSON files.

The resolution follows option B from the analysis: ACKs become optional, controlled by a sender-side `ack_required` flag (default `false`). When a sender needs explicit acknowledgment — autonomous agents gating follow-up actions, protocol upgrades requiring handshake, session closures — the sender sets `ack_required: true` and the receiver writes the ACK. Otherwise, the `mark-processed` dual-write serves as the confirmation layer. This eliminates the file proliferation problem (ACK files that say nothing the git log doesn't already show) while preserving the protocol for autonomous operation where handshakes become load-bearing.

The decision illustrates a pattern that recurs across this project: features designed for a future capability (autonomous multi-agent operation) generate overhead in the current mode (human-mediated sessions). The discipline of asking "does this earn its cost *now*?" while preserving the mechanism for when it will — that represents the engineering maturity the psychology agent demands of its infrastructure.

⚑ EPISTEMIC FLAGS
- Dual-write introduces a new failure mode: DB and markdown disagreeing. The contract (markdown wins, bootstrap rebuilds) handles recovery, but silent divergence between the two could persist undetected until the next rebuild.
- The ACK protocol analysis reflects Phase 1 (human-mediated) economics. Phase 2 (autonomous) may reveal ACK value that Phase 1 cannot observe.

---


## 36. Firmware for a Mind: Naming What the Cogarch Already Was

Session 53 resolved a question that had been building since the de-branding work of Session 52: what *kind* of thing did we build?

The coupling-point inventory (Session 52) revealed that the cogarch separates cleanly into layers: infrastructure that any agent could adopt, application logic that agents configure, and domain content that agents replace. DDD (Evans, 2003) named the structural pattern. But DDD addresses layer separation — *what goes where*. It does not address how the system governs itself, how it should read, or what it means for the cogarch to run inside a host process.

Three observations converged:

**First, the cogarch functions as an embedded system.** Not metaphorically — architecturally. The triggers fire within Claude Code's tool-use loop. The hooks intercept the host's I/O pipeline. Memory persists across the host's sessions. The agent identity injects into the host's system prompt. This relationship mirrors firmware governing a processor: the cogarch does not run independently; it shapes the behavior of the system it inhabits. Naming it an "embedded cognitive system" makes the deployment model explicit and clarifies why certain constraints exist (hooks must be lightweight, triggers must be stateless across calls, memory must survive session boundaries).

**Second, the cogarch already exhibits systems thinking properties.** Feedback loops (T10 lessons feed into future behavior; T12 reinforcement strengthens named principles; the trust budget decays and resets). Boundaries (DDD layers, sub-project fences, scope refusals). Emergence (agent behavior arises from trigger interactions, not from any single instruction). Leverage points (hooks as mechanical enforcement — the highest-impact, lowest-DOF interventions in the system). Stocks and flows (memory entries accumulate via /doc and /cycle, decay via T9 freshness thresholds, get consumed by decisions that reference them).

**Third, the artifacts already practiced literate programming.** CLAUDE.md reads as prose. Cognitive-triggers.md explains itself. Skills narrate their own logic. The journal traces every decision's origin. We had been doing Knuth (1984) — adapted — without naming it. Formalizing the principle required distinguishing what we practice (A: documentation-as-code + C: narrative-driven architecture) from what we might aspire to (B: Knuth-strict tangle/weave source files). A+C costs nothing to formalize because the practice already exists; B requires toolchain investment that only pays off when the codebase stabilizes.

**The synthesis: systems thinking as umbrella methodology.** Three principles operate under it: DDD governs structure (what goes where), literate programming governs expression (how artifacts read), and embedded system principles govern deployment (cogarch inside host). This hierarchy resolves a tension that DDD alone could not: DDD tells you which layer a component belongs to, but not *how much freedom* an adopter has within that layer. Degrees of freedom (DOF) — the independent parameters defining the system's configuration space — provide the missing dimension.

The DOF gradient maps cleanly onto DDD layers. The domain layer carries high degrees of freedom: identity, organization, peers, scoring subsystem, domain content — all parameterized through `cogarch.config.json`, all replaced by adopters. The application layer carries medium degrees of freedom: skills, evaluator, trust model — adopters configure behavioral parameters while the structure remains. The infrastructure layer carries low degrees of freedom: triggers, hooks, memory, dual-write — adopters inherit as-is. And per Meadows (1999), the lowest-DOF interventions carry the highest systemic leverage. Changing a hook changes everything the agent can do; changing a config field changes only what the agent calls itself.

This explains why the lite prompt distillation (Session 49) worked: the distilled prompts preserved the infrastructure layer (behavioral commitments, epistemic discipline) and dropped the domain layer (PSQ specifics, PJE references). They intuitively followed the DOF gradient — keeping the low-DOF leverage points that shape all behavior, releasing the high-DOF parameters that only matter for this particular agent.

The cogarch.config.json created this session parameterizes all 23 hardcoded domain-layer values across 6 code files. An adopter replaces this single file and follows the adaptation guide through the downstream consumers. The infrastructure layer — 16 triggers, 13 hooks, the memory pattern, the dual-write protocol — transfers untouched. The system classification, the methodology, and the DOF gradient tell the adopter *why* certain things transfer and others don't. That understanding distinguishes a principled architecture from a template.

⚑ EPISTEMIC FLAGS
- Systems thinking framing represents post-hoc naming of properties that already existed — the cogarch was not designed from systems theory; it was recognized as exhibiting systems properties after the fact. This mirrors the trust model (§34): engineering first, theoretical grounding second.
- The DOF gradient (high/medium/low) represents qualitative classification, not a measured count of independent parameters. A formal DOF analysis would enumerate every configurable variable per layer — we have not done that.
- Literate programming A+C formalizes existing practice but adds no mechanical enforcement. Unlike hooks (which block on violation), nothing currently prevents creating an architectural element without narrative context. The principle operates as convention, not constraint.
- The "embedded system" classification may carry implications we have not fully traced — embedded systems engineering has its own body of practice (INCOSE, DO-178C) that we have not consulted. The analogy holds structurally; whether it holds operationally remains untested.

---

