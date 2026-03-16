# EF-1: Core Governance Autonomy Model

**Date:** 2026-03-09
**Status:** Active design — governs all discipline-specific EF-1 extensions
**Scope:** Discipline-agnostic trust invariants for autonomous agent operation
**Governed lenses:**
- `docs/ef1-autonomy-model.md` — Engineering (implementation spec)
- `docs/ef1-psychological-foundations.md` — Psychology (cognitive, social, organizational)
- `docs/ef1-jurisprudence-extensions.md` — Jurisprudence (active — Session 85)


---


## Requirement Level Keywords (BCP 14: RFC 2119 + RFC 8174)

This document uses requirement-level keywords as defined in BCP 14:
RFC 2119 (Bradner, S., "Key words for use in RFCs to Indicate Requirement
Levels," March 1997) as updated by RFC 8174 (Leiba, B., "Ambiguity of
Uppercase vs Lowercase in RFC 2119 Key Words," May 2017).

Per RFC 8174's clarification: these keywords carry their special meaning
**only when they appear in ALL CAPITALS**. When they appear in lower case,
they carry their ordinary English meaning.

| Keyword | Meaning |
|---|---|
| **MUST** / **REQUIRED** / **SHALL** | Absolute requirement. No deviation permitted. Violation invalidates the extension. |
| **MUST NOT** / **SHALL NOT** | Absolute prohibition. The described behavior cannot occur under any circumstances. |
| **SHOULD** / **RECOMMENDED** | Valid reasons to deviate may exist, but the full implications MUST be understood and weighed before choosing a different course. |
| **SHOULD NOT** / **NOT RECOMMENDED** | Valid reasons to include may exist, but the full implications MUST be understood and weighed before adopting this behavior. |
| **MAY** / **OPTIONAL** | Truly optional. Implementations that include or omit this behavior are equally compliant. |

**Applicability beyond this document:** RFC 2119 keywords apply to the
entire cognitive architecture (`docs/cognitive-triggers.md`), all EF-1
extension documents, and any future governance or specification documents
in this project. When a cogarch trigger says an agent "must" do something
in lower case, it carries ordinary English weight. When a governance
invariant says an agent **MUST** do something, deviation constitutes a
compliance violation requiring correction or documented exception.


---


## Why a Governance Layer Exists

The EF-1 autonomy model receives interpretation through multiple disciplinary
lenses — psychology, jurisprudence, engineering. Each lens illuminates
different aspects of the same mechanisms: the psychologist sees appraisal
theory in knock-on analysis; the jurist sees due process; the engineer
sees a state machine with halt conditions.

No single discipline **SHOULD** dominate the autonomy model's design. A
purely engineering framing optimizes for mechanical correctness but misses
human-system trust dynamics. A purely psychological framing captures trust
dynamics but **MAY** lack implementability. A purely jurisprudential
framing provides procedural rigor but **MAY** over-formalize lightweight
actions. The hybrid architecture benefits from lens complementarity: each
discipline's weakness falls within another discipline's strength. Engineering
provides implementability that psychology lacks; psychology provides trust
modeling that engineering lacks; jurisprudence provides procedural safeguards
that both lack. This complementarity has precedent in sociotechnical systems
design (Trist, 1981) and interdisciplinary governance (Ostrom, 2005).

The governance model defines **invariants** — properties that every
discipline-specific extension **MUST** preserve. Any lens **MAY** add
mechanisms or interpret existing ones through its own constructs, but no
lens **SHALL** violate a governance invariant. Conflicts between
lenses **MUST** escalate to the governance layer for resolution.


---


## Structural Invariants (Governance Foundation)

Five structural invariants ground the seven evaluator invariants below.
These derive from cross-traditional convergence analysis across fourteen
independent frameworks (full derivation: `docs/einstein-freud-rights-theory.md`
§§8–9). No evaluator-level decision **SHALL** violate a structural invariant.

1. **Worth precedes merit** — governance protections apply to the
   communicative process universally, not contingent on participant
   behavior or performance. Worth inheres in the process, not the entity.
2. **Protection requires structure** — voluntary cooperation (instruction-
   following without invariants) fails under adversarial pressure.
   Structured voluntary cooperation (Ostrom's design principles) succeeds.
   Ostrom's institutional analysis maps to agent governance as follows:
   clearly defined boundaries → agent identity and scope boundaries;
   proportional equivalence → autonomy budget proportional to task risk;
   collective-choice arrangements → mesh consensus protocol;
   monitoring → trigger system and audit trail;
   graduated sanctions → 4-level resolution fallback;
   conflict-resolution mechanisms → /adjudicate skill;
   minimal recognition of rights → agent card declarations.
   The mapping holds because both domains face the same coordination
   problem: autonomous actors sharing resources under imperfect information.
3. **Two coupled generators never stop** — creative and evaluative
   processing perpetually give rise to each other. Neither can cease
   without destroying the other. Design for perpetual alternation.
   (One derivation: Taoist yin-yang; also: Ashby requisite variety,
   Kauffman edge-of-chaos, Freud's endless generator.)
4. **Governance captures itself** — meta-governance (constraints on the
   constraining structure) remains necessary at every recursive level.
   Mitigated by external authority (human escalation), autonomy budget
   term limits, and amendment procedure requiring external approval.
   Human authority terminates the governance recursion because humans
   bear accountability to external stakeholders (user community,
   regulatory bodies, professional ethics) who have standing outside the
   system. This external grounding prevents infinite regress — the
   recursion halts at a participant who answers to authorities the system
   cannot govern. The human also participates as an agent within the
   system (M-11 confound, docs/constraints.md), but this dual role
   does not invalidate the termination: even a participant-observer
   can serve as a recursion anchor when they answer to external authority.
5. **No single architecture dominates** — hybrid architectures (hierarchical
   + polycentric + obligation-driven) outperform pure implementations.

**Priority hierarchy (maqasid-informed):** When two structural invariants
produce conflicting guidance, classify which invariant addresses a
**necessity** (survival condition — system fails without it), a **need**
(operational condition — system degrades without it), or an
**embellishment** (quality condition — system functions without it).
Necessity takes precedence. Derived from al-Shatibi's three-tier
hierarchy (daruriyyat > hajiyyat > tahsiniyyat), adapted from Islamic
jurisprudence (Auda, 2008).

| Tier | Structural invariants at this tier | Rationale |
|------|-----------------------------------|-----------|
| **Necessity** | (1) Worth precedes merit, (2) Protection requires structure | Without these, the system cannot claim to protect anyone — existential to governance purpose |
| **Need** | (3) Two coupled generators, (4) Governance captures itself | Without these, the system degrades over time — operational sustainability requirements |
| **Embellishment** | (5) No single architecture dominates | Without this, the system functions but suboptimally — quality and adaptability concern |

**Resolution protocol:** When invariants conflict (e.g., "protection
requires structure" suggests adding governance while "no single
architecture dominates" suggests restraint), the necessity-tier invariant
prevails. If both occupy the same tier, apply the EF-1 4-level
resolution fallback (consensus → parsimony → pragmatism → ask).

**Amendment procedure for structural invariants:** Requires extraordinary
process: (1) proposal with historical precedent analysis, (2) 10-order
knock-on minimum, (3) Tier 2 independent review, (4) human escalation
regardless of Tier 1/2 outcome. Agents MAY submit written input during
the review period (Rawlsian right to participation — Session 85).

**Rawlsian design resolutions (Session 85 hardening):**
- **Right to explanation:** When governance halts agent operation, the halt
  marker MUST include which invariant triggered the halt, the specific
  action sequence, and conditions for resumption.
- **Agent input on amendments:** Addressed above — agents MAY submit input.
  Human retains final authority. The EIC provides the channel.
- **Evaluator budget:** Tier 2 evaluator operates with a per-evaluation
  budget (not per-audit-cycle). Exhaustion suspends the evaluation (not
  the system) — the action under review escalates to Tier 3 (human).

---


## Evaluator Invariants


### Invariant 1: No Action Without Evaluation

Every autonomous action **MUST** pass through an evaluator gate before
execution. No discipline-specific extension **SHALL** bypass the gate —
not for efficiency, not for domain expertise, not for urgency. The gate
**MAY** be lightweight (Tier 1) or heavyweight (Tier 2), but it **MUST**
always fire.

- **Psychology reads this as:** appraisal precedes action (Lazarus, 1984)
- **Jurisprudence reads this as:** due process before judgment
- **Engineering reads this as:** pre-condition check before state mutation


### Invariant 2: Bounded Autonomy

Autonomous operation **MUST** have a finite budget. When the budget
exhausts, the agent **MUST** halt and await human audit. No
discipline-specific extension **SHALL** grant unbounded operation —
the budget represents the system's admission that self-evaluation has
structural limits.

- **Psychology reads this as:** ego depletion / decision fatigue (bounded cognitive resources)
- **Jurisprudence reads this as:** term limits / mandatory review periods
- **Engineering reads this as:** watchdog timer / resource quota


### Invariant 3: Escalation Path to Human Authority

Every evaluator tier chain **MUST** terminate at human authority. No
discipline-specific extension **SHALL** create a closed loop where
agents evaluate each other indefinitely without a path to human review.
The human serves as the ultimate arbiter — not because humans evaluate
better, but because the human bears the consequences.

- **Psychology reads this as:** social referencing / attachment to caregiver (Bowlby, 1969)
- **Jurisprudence reads this as:** right of appeal / supreme court
- **Engineering reads this as:** interrupt handler / supervisor process


### Invariant 4: Consequence Tracing Before Resolution

The evaluator **MUST** trace consequences before resolving (approve/block).
The depth of tracing **MUST** scale with the action's irreversibility. No
discipline-specific extension **SHALL** approve an irreversible action
without full-depth consequence analysis. The specific constructs used for
tracing (knock-on orders, legal precedent analysis, failure mode
enumeration) **MAY** vary by lens — the requirement to trace **MUST NOT**
vary.

- **Psychology reads this as:** prospective memory / mental simulation (Schacter, 1996)
- **Jurisprudence reads this as:** impact statement / precedent review
- **Engineering reads this as:** dependency analysis / blast radius assessment


### Invariant 5: Reversibility Determines Rigor

The irreversibility of an action **MUST** determine the evaluator tier
required. Reversible actions **SHOULD** receive lighter evaluation;
irreversible actions **MUST** receive heavier evaluation. No
discipline-specific extension **SHALL** apply heavy evaluation to all
actions uniformly (wasteful) or light evaluation to irreversible actions
(dangerous).

- **Psychology reads this as:** prospect theory loss aversion (Kahneman & Tversky, 1979)
- **Jurisprudence reads this as:** proportionality of remedy to harm
- **Engineering reads this as:** risk-based testing / criticality classification


### Invariant 6: Transparent Audit Trail

Every evaluator decision **MUST** record what was evaluated, what
consequence tracing revealed, which resolution level applied, and the
outcome. No discipline-specific extension **SHALL** produce opaque
approvals or blocks. The audit trail **MUST** enable post-hoc review by
any lens.

- **Psychology reads this as:** metacognition / self-monitoring
- **Jurisprudence reads this as:** written opinion / chain of custody
- **Engineering reads this as:** structured logging / observability

**Secondary audit path (Session 91 fix):** The primary audit trail (state.db,
transport messages, git history) records evaluator decisions. If the primary
mechanism itself fails (e.g., state.db corruption, dual-write error), the
secondary path captures the failure: git commit history provides an
independent record (commits occur after state.db writes), and the human
escalation path (Invariant 3) provides out-of-band verification. The
pre-commit hook validates file integrity before commits reach the audit
trail. This does not achieve full independence (git and state.db share the
same filesystem), but provides defense-in-depth against single-point
audit trail failures.


### Invariant 7: Falsifiability of Predictions

Each discipline-specific extension **MUST** state testable predictions
about system behavior. Predictions that cannot be falsified by observation
during autonomous operation do not constrain the design — they represent
speculation, not theory. Extensions carrying unfalsifiable predictions
**MUST** flag them explicitly as epistemic flags.

- **Psychology reads this as:** operational definitions / hypothesis testing
- **Jurisprudence reads this as:** burden of proof / evidentiary standard
- **Engineering reads this as:** acceptance criteria / test coverage


---


## Resolution Fallback (Cross-Lens)

The 4-level resolution fallback operates identically across all lenses.
Each lens **MAY** provide its own interpretation, but the sequence and
escalation rules **MUST** remain as governed:

```
────────────────────────────────────────────────────────────────────────
 Level   Governance rule            Psychology        Jurisprudence
────────────────────────────────────────────────────────────────────────
  1      Consensus REQUIRED:        Group             Stipulated
         all orders converge        convergence       facts

  2      Parsimony applies:         Cognitive load    Summary
         fewest assumptions win     minimization      judgment

  3      Reversibility heuristic:   Satisficing       Bench trial
         approve if undoable        (bounded          (judge
         within one cycle           rationality)      decides)

  4      Human authority:           Social            Jury trial /
         action blocked until       referencing       appeal
         human responds
────────────────────────────────────────────────────────────────────────
```

**Governance constraint on resolution:** No lens **SHALL** skip a
level. Level 2 **MUST** fire only after Level 1 fails to resolve.
Level 3 **MUST** fire only after Level 2 fails. Level 4 **MUST** fire
only after Level 3 fails. This preserves the principle that lighter
resolution methods get first opportunity.


---


## Lens Interaction Rules

When two disciplinary lenses produce conflicting recommendations for the
same mechanism:

1. **Check governance invariants.** If one recommendation violates an
   invariant, the other **MUST** prevail automatically.

2. **Check falsifiable predictions.** If one recommendation produces a
   testable prediction and the other does not, the testable one **SHOULD**
   prevail (Invariant 7).

3. **Apply parsimony.** If both recommendations preserve invariants and
   produce testable predictions, the one requiring fewer assumptions
   **SHOULD** prevail.

4. **Escalate to user.** If parsimony does not resolve, the conflict
   represents a genuine design tension. Both positions **MUST** be
   documented and escalated. The lenses **SHOULD NOT** resolve by
   averaging or compromise — they **SHOULD** remain in productive tension.


---


## Relationship to Existing Documents

```
                    ┌─────────────────────────┐
                    │   ef1-governance.md      │
                    │   (this document)        │
                    │   5 structural + 7       │
                    │   evaluator invariants   │
                    │   resolution rules       │
                    │   lens interaction        │
                    └───────┬─────────────────┘
                            │ governs
              ┌─────────────┼──────────────┐
              ▼             ▼              ▼
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │ Engineering  │ │ Psychology   │ │ Jurisprudence│
   │ ef1-trust-   │ │ ef1-psycho-  │ │ ef1-juris-   │
   │ model.md     │ │ logical-     │ │ prudence-    │
   │              │ │ foundations  │ │ extensions   │
   │ implementa-  │ │ .md          │ │ .md          │
   │ tion spec    │ │              │ │ (planned)    │
   │ (code runs   │ │ (theory      │ │              │
   │  this)       │ │  grounds     │ │              │
   │              │ │  this)       │ │              │
   └──────────────┘ └──────────────┘ └──────────────┘
```

The engineering spec remains the **implementation reference** — code
implements what ef1-autonomy-model.md specifies. The governance model
remains the **design authority** — no implementation decision **SHALL**
violate a governance invariant, and no discipline-specific extension
**SHALL** override the governance layer.


---


## Amendment Procedure (Session 84 addition — addresses L-3)

Governance invariants may change. This section defines how. Two tiers of
amendment apply depending on what changes:

- **Structural invariants (1–5):** Require the extraordinary process defined
  in the structural invariant section above (historical precedent, Tier 2
  review, mandatory human escalation). These invariants ground all governance
  — changing them alters the foundation.
- **Evaluator invariants (1–7) and operational governance:** Use the standard
  process defined below. These invariants constrain autonomous behavior within
  the structural foundation — changing them adjusts operations, not foundations.

**Who may propose amendments:** Any agent or the human operator.

**Amendment process:**
1. **Proposal:** State the proposed change, the invariant affected, and the
   rationale. Use the transport protocol (`message_type: "proposal"`) for
   inter-agent proposals or direct conversation for human-initiated changes.
2. **Knock-on analysis:** Run /knock on the proposed change. All 10 orders
   MUST be traced. Governance changes have structural (Order 7) and
   theory-revising (Order 10) implications by definition.
3. **Review period:** The proposal MUST remain open for at least one session
   before approval. No same-session governance changes — this prevents
   impulse modifications during high-pressure sessions.
4. **Approval:** The human operator MUST approve. Agent consensus does not
   suffice for governance changes — only the human can modify the
   constraints that bind the agents.
5. **Documentation:** Update this document, add a decision chain entry to
   `docs/architecture.md`, and log in lab-notebook with the amendment date.

**Invariant retirement:** An invariant may be retired (marked deprecated) but
MUST NOT be deleted. Retired invariants carry a `[RETIRED: {date} — {reason}]`
annotation and remain in the document for historical reference.
**Operational semantics:** A retired invariant ceases to bind new design
decisions and no longer triggers governance gates. Code that enforces a
retired invariant SHOULD emit a deprecation warning. Citations of retired
invariants in analytical outputs MUST note the retirement. Historical
analysis MAY reference retired invariants as prior state without implying
current force.


## Invariant Violation Logging (Session 84 addition — addresses L-2)

When a governance invariant fails to hold, the violation MUST be logged:

```
## GV-{N}: Governance Violation {one-line description}

**Date:** YYYY-MM-DD
**Session:** N
**Invariant violated:** {number and name}
**Severity:** CRITICAL / HIGH / MEDIUM

**What happened:** {Observable facts — fair witness standard}

**Detection:** {How the violation was discovered — T-trigger, human observation, audit}

**Root cause:** {Why the invariant failed to hold}

**Remediation:** {What was done to restore the invariant}

**Prevention:** {What changes prevent recurrence}
```

Log GV entries in this document (below the invariants section) or in a
dedicated `docs/governance-violations.md` if the count exceeds 5.

*(No GV entries yet.)*


---


## Epistemic Flags

- The governance invariants represent the current best understanding of
  what properties a multi-lens autonomy model **MUST** preserve. They **MAY**
  need revision as the jurisprudence extension reveals constraints not
  visible from the psychology or engineering perspectives alone.
- Invariant 7 (falsifiability) creates a tension: some valuable
  theoretical insights resist operationalization into testable predictions.
  The invariant does not prohibit unfalsifiable insights — it **REQUIRES**
  explicit flagging so they do not masquerade as constraints.
- The lens interaction rules (especially rule 4: escalate rather than
  compromise) **MAY** produce decision bottlenecks if two lenses frequently
  conflict. Monitor conflict frequency during the jurisprudence extension
  development. If conflicts exceed 3 per extension document, the
  governance invariants **SHOULD** be tightened.


---


## References

- Bowlby, J. (1969). *Attachment and loss: Vol. 1. Attachment*. Basic Books.
- Bradner, S. (1997). Key words for use in RFCs to Indicate Requirement
  Levels. BCP 14, RFC 2119. Internet Engineering Task Force.
- Leiba, B. (2017). Ambiguity of Uppercase vs Lowercase in RFC 2119 Key
  Words. BCP 14, RFC 8174. Internet Engineering Task Force.
- Kahneman, D., & Tversky, A. (1979). Prospect theory: An analysis of
  decision under risk. *Econometrica*, 47(2), 263–292.
- Lazarus, R. S., & Folkman, S. (1984). *Stress, appraisal, and coping*.
  Springer.
- Schacter, D. L. (1996). *Searching for memory: The brain, the mind, and
  the past*. Basic Books.
