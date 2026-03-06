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
