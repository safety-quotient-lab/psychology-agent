# Einstein-Freud and the Rights Foundation of Psychoemotional Safety

**Status:** Active development (Session 85, 2026-03-13)
**Cross-references:** `ideas.md` §Einstein-Freud, `docs/dignity-instrument-spec.md`,
`docs/dignity-phase-a-study.md`, `docs/architecture.md` §EF-1

---

## 1. The Question

In 1932, the International Institute of Intellectual Cooperation (League of
Nations predecessor to UNESCO) invited Albert Einstein to choose any person
and any question for a public exchange of letters. Einstein chose Sigmund
Freud. The question: **"Is there any way of delivering mankind from the
menace of war?"** (Einstein & Freud, 1933).

Einstein framed the problem structurally, not psychologically. His analysis:

1. **Power asymmetry drives exploitation.** Conflicts between groups resolve
   through force (physical or, in "civilized" societies, economic and
   institutional). The stronger party imposes its will on the weaker.

2. **Law represents crystallized force.** Legal systems emerge when a
   community pools its power against individuals — but that pooled power
   still serves whoever controls the institutions. Rights exist only when
   structural enforcement protects them.

3. **International governance requires structural constraint.** Einstein
   proposed a supranational authority with legislative power *and* the means
   to enforce its decisions. Voluntary agreements between sovereign powers
   fail because no structural mechanism prevents defection.

Einstein's core insight: **rights require structural protection**. Moral
appeals, cultural norms, and voluntary cooperation all fail when incentive
structures reward defection. Only structural constraints — institutions with
enforcement power — reliably protect the rights of weaker parties against
domination by stronger ones.

This frames as a governance problem, not a psychological one. Einstein
turned to Freud not because psychology holds the answer, but because he
wanted to understand **why structural solutions face resistance** — what in
human nature makes institutions necessary in the first place.


## 2. The Endless Generator

Freud's response contributed one insight that survives independent of his
broader theoretical apparatus: **destructive impulses function as an endless
generator.**

The argument, stripped of drive-theory metaphysics:

- Destructive potential — the capacity for aggression, exploitation,
  manipulation — never reaches zero in any human system. It regenerates
  continuously.
- Cultural development does not eliminate destructive potential; it
  **channels** it. Science, art, law, institutions — these redirect
  destructive energy into productive activity. But the generator keeps
  running underneath.
- Any system designed on the assumption that destructive input will
  eventually stop will eventually fail. The input never stops.

This holds whether or not one accepts Freud's Eros/Thanatos dualism, his
instinct theory, or any other component of psychoanalytic metapsychology.
The endless generator argument stands as a **structural observation about
systems** — biological, social, computational — that face adversarial
pressure.

**Modern parallels that validate the structural observation:**

| Domain | Endless generator manifestation |
|--------|-------------------------------|
| Information security | Attack surface never reaches zero; defensive posture assumes continuous adversarial pressure |
| Evolutionary biology | Predation pressure drives defensive adaptation indefinitely (Van Valen, 1973 — Red Queen hypothesis) |
| Institutional economics | Rent-seeking behavior regenerates continuously; regulatory capture requires perpetual vigilance (Tullock, 1967) |
| Game theory | In iterated games with imperfect monitoring, defection incentives never fully disappear (Axelrod, 1984) |
| Immune systems | Pathogen pressure never ceases; immune response maintains continuous surveillance without endpoint |

The convergence across domains suggests Freud identified a genuine
structural property of complex adaptive systems, even if his mechanistic
explanation (death drive as biological instinct) lacks empirical support.

**Design axiom (derived):** *Any system that assumes adversarial input
reaches zero will eventually fail. Design for perpetual channeling, not
eventual elimination.*

### 2.1 Implications for Cognitive Architecture

The endless generator axiom produces specific architectural requirements:

1. **Evaluative mechanisms never retire.** The substance gate (T3), position
   audit (T6), and anti-sycophancy checks operate continuously — not because
   sycophantic pressure has been observed, but because the generator
   guarantees it will appear.

2. **Governance constraints remain invariant.** EF-1 invariants cannot relax
   based on observed good behavior. A trust budget that resets to full based
   on successful sessions would fail the endless generator test — the
   generator produces its output on its own schedule, not on the system's
   observation schedule.

3. **Crystallization channels, does not eliminate.** The crystallization
   pipeline transforms fluid processing into stable infrastructure (hooks,
   rules, validated conventions). This channels cognitive entropy into
   productive structure — the same operation Freud described as cultural
   sublimation, without the psychoanalytic framing. The entropy source
   persists; the channeling must therefore persist.

4. **Generate/evaluate tension persists by design.** The CPG mode system
   (principle 4) maintains perpetual tension between generative and
   evaluative processing. Neither mode dominates indefinitely. This
   implements the endless generator structurally: evaluative processing
   (the critical, pruning function) never depletes because the generator
   ensures new material to evaluate always arrives.


## 3. The Rights Chain: UDHR → Hicks → PSQ

Einstein's question ("how do we protect the weak from the strong?") found
its most comprehensive structural answer sixteen years later, when the
Universal Declaration of Human Rights (UDHR, 1948) established the
foundational rights framework that anchors the theoretical chain developed
here.

### 3.1 UDHR: The Philosophical Foundation

Four UDHR articles provide direct grounding for psychoemotional safety as a
right:

**Article 1 — Inherent dignity.** "All human beings are born free and equal
in dignity and rights." Dignity here functions as an axiom — not earned,
not contingent, not defeasible. Every subsequent right derives from this
foundational claim. The word "inherent" matters: dignity inheres in persons,
not in their behavior, status, or utility.

**Article 3 — Security of person.** "Everyone has the right to life, liberty
and security of person." Security extends beyond physical safety. The
drafting history (Morsink, 1999) shows that "security of person" was
understood to include protection from psychological coercion, intimidation,
and arbitrary interference with mental integrity. Psychoemotional safety —
the right to communicate without threat, hostility, or manipulation —
represents a specific instantiation of Article 3's security guarantee.

**Article 5 — Freedom from degrading treatment.** "No one shall be subjected
to torture or to cruel, inhuman or degrading treatment or punishment."
Degrading treatment in communication — contempt, humiliation, reduction of
persons to categories — violates this article at the interpersonal level.
The PSQ dimensions of threat exposure and hostility index quantify the
degree to which text crosses this threshold.

**Article 19 — Freedom of expression.** "Everyone has the right to freedom
of opinion and expression." This article creates a productive tension: the
right to express freely can conflict with the right to dignity (Article 1)
and security (Article 3) when expression degrades or threatens. The
resolution lies not in restricting expression but in **measuring its impact**
— which the PSQ provides without prescribing what may or may not be said.

### 3.2 Hicks: The Interactional Model

Donna Hicks (2011) operationalized dignity as something people **do to each
other in interaction** — not an abstract philosophical endowment but a set
of observable conditions that communication either honors or violates.

Her ten elements of dignity describe what respectful interaction produces:

| Element | What it looks like when honored | UDHR grounding |
|---------|-------------------------------|---------------|
| D1 Acceptance of Identity | Treats persons as whole; no reduction to categories | Art. 1 (inherent dignity), Art. 2 (non-discrimination) |
| D2 Recognition | Validates contributions, experience, expertise | Art. 1 (equal rights) |
| D3 Acknowledgment | Engages with perspectives and concerns; does not dismiss | Art. 19 (expression implies reception) |
| D4 Inclusion | Treats subjects as belonging; does not position as outsiders | Art. 2 (non-discrimination), Art. 21 (participation) |
| D5 Safety | Environment free from humiliation, contempt, degradation | Art. 3 (security), Art. 5 (degrading treatment) |
| D6 Fairness | Consistent standards; no preferential framing | Art. 7 (equal protection) |
| D7 Freedom | Respects autonomy; no imposition, coercion, patronizing | Art. 3 (liberty), Art. 18 (thought/conscience) |
| D8 Understanding | Engages genuinely with reasons behind positions | Art. 19 (expression) |
| D9 Benefit of the Doubt | Presumes persons have understandable reasons | Art. 11 (presumption of innocence) |
| D10 Accountability | Holds persons responsible; names violations without excuse | Art. 8 (effective remedy) |

Hicks' contribution: she moved dignity from the declaratory level ("all
persons have dignity") to the **behavioral level** ("here are the specific
things you do or fail to do that honor or violate dignity in interaction").
This makes dignity measurable — each element produces observable indicators
in text.

### 3.3 PSQ: The Measurement Layer

The PSQ's ten dimensions measure a complementary construct:
**psychoemotional safety** — the degree to which communication threatens or
preserves the reader's psychological and emotional integrity.

| PSQ Dimension | Construct measured | Rights connection |
|--------------|-------------------|-------------------|
| Threat Exposure (TE) | Perceived danger in communicative environment | Art. 3 security; Art. 5 degrading treatment |
| Hostility Index (HI) | Overt or structural antagonism | Art. 5 cruel/inhuman treatment |
| Authority Dynamics (AD) | Power and status negotiation in text | Art. 1 equality; Art. 7 equal protection |
| Energy Dissipation (ED) | Availability of healthy stress outlets | Art. 24 rest/leisure (extended) |
| Regulatory Capacity (RC) | Emotion modulation resources available | Art. 3 security of person (internal) |
| Resilience Baseline (RB) | Capacity to absorb disruption | Art. 3 security (systemic) |
| Trust Conditions (TC) | Vulnerability exploitation risk | Art. 12 privacy/reputation |
| Cooling Capacity (CO) | De-escalation pathways available | Art. 28 social order |
| Defensive Architecture (DA) | Boundary-setting and self-protection | Art. 3 liberty; Art. 12 privacy |
| Contractual Clarity (CC) | Explicitness of mutual obligations | Art. 8 effective remedy; Art. 10 fair hearing |

**Critical distinction: PSQ and DI measure different things.**

- **PSQ measures reader impact** — how the text affects the reader's
  psychoemotional state. A high-threat PSQ score means the text creates
  perceived danger, regardless of whether it treats its subjects with
  dignity.
- **DI measures subject treatment** — how the text treats the persons it
  describes. A high DI score means the text honors the inherent worth of
  its subjects, regardless of whether the content itself produces
  psychoemotional threat.

Phase A empirical findings confirm this construct distinctness:
- **Correlation: r = 0.328** (n=27). PSQ explains only 10.7% of DI
  variance. The instruments share a weak "editorial engagement" factor
  but measure fundamentally different constructs.
- **Tri-modal relationship** (not linear):
  - *Inversion zone* — dignified reporting on rights violations produces
    high DI + high PSQ threat (8 clear inversions). Content honors its
    subjects while threatening its readers.
  - *All-high zone* — analytical/systemic/memorial content achieves
    high DI + high PSQ safety (7 stories). Dignified treatment without
    threat.
  - *Alignment zone* — content that itself violates dignity produces
    low DI + low PSQ (6 stories). Both instruments agree negatively.

### 3.4 The Layered Framework

The rights chain operates at three levels, each providing what the level
above cannot:

```
┌─────────────────────────────────────────────────────┐
│  UDHR (1948)                                        │
│  WHY these rights matter                            │
│  Philosophical foundation — inherent dignity,       │
│  security of person, freedom from degradation       │
├─────────────────────────────────────────────────────┤
│  Hicks Dignity Model (2011)                         │
│  WHAT respectful interaction looks like             │
│  Interactional operationalization — 10 elements     │
│  that communication honors or violates              │
├─────────────────────────────────────────────────────┤
│  PSQ (2026)                                         │
│  HOW MUCH text honors or violates safety            │
│  Computational measurement — 10 dimensions          │
│  quantifying psychoemotional impact                 │
└─────────────────────────────────────────────────────┘
```

No single layer suffices:
- **UDHR without Hicks** declares rights but cannot describe what honoring
  them looks like in specific communicative acts.
- **Hicks without UDHR** operationalizes dignity but lacks the philosophical
  grounding that makes the elements non-negotiable rather than merely
  preferred.
- **PSQ without Hicks/UDHR** measures psychoemotional impact but cannot
  distinguish between content that threatens because it reports on rights
  violations (high dignity) and content that threatens because it commits
  them (low dignity).
- **DI without PSQ** captures subject treatment but cannot quantify the
  reader's psychoemotional experience of engaging with that treatment.

The layered framework resolves the Phase A finding that puzzled initial
analysis: the all-high zone (dignified treatment + psychoemotional safety)
and the inversion zone (dignified treatment + psychoemotional threat) both
represent successful rights-honoring communication. The difference lies in
**what the content describes**, not in how it treats its subjects. A memorial
to a beloved engineer (all-high) and an investigation of child detention
(inversion) both honor dignity. Only PSQ distinguishes the reader's
experience of engaging with each.


## 4. Governance as Rights Protection

Einstein argued that rights require structural enforcement — moral
appeals and voluntary cooperation fail when incentive structures reward
defection. His proposal for a supranational authority with enforcement
power maps directly to the agent governance model.

### 4.1 Einstein's Institutional Argument

Einstein's analysis proceeds in three steps:

1. **The community pools its power.** Individual actors cede some autonomy
   to collective institutions. This creates law — which Einstein defined
   as "the strength of the community" directed against individual
   transgression.

2. **Pooled power requires structural constraint.** Without constitutional
   limits, the community's pooled power becomes tyranny of the majority.
   Rights function as structural constraints on what the collective may
   do to individuals — even when the collective has the power to do it.

3. **International extension requires the same structure.** What works
   within nations (constitutional constraints on pooled power) must extend
   across nations. A supranational body needs both legislative authority
   and enforcement capability — without either, it reduces to voluntary
   cooperation, which fails under adversarial pressure.

### 4.2 EF-1 Governance as Implementation

The EF-1 governance model implements Einstein's three-step structure at
the agent level:

| Einstein's concept | EF-1 implementation |
|-------------------|---------------------|
| Community pools power | Agent system aggregates cognitive capabilities (triggers, hooks, skills, memory) |
| Constitutional constraints | 12 invariants that constrain autonomous action regardless of instruction |
| Enforcement mechanism | Hook system enforces mechanically; trust budget limits autonomous scope |
| Rights protection | Invariants protect user interests even when the agent has capability to override |
| Supranational authority | Human escalation path — the "authority above" that resolves disputes the system cannot |

**The trust budget embodies Einstein's enforcement insight.** A budget of
20 credits that decrements on autonomous actions and requires human audit
to reset implements exactly what Einstein described: structural constraint
on autonomous power that prevents unbounded operation. The budget does not
assume the agent will behave well — it assumes the endless generator
ensures the agent *eventually* will not, and provides structural protection
against that eventuality.

### 4.3 Why Voluntary Cooperation Fails

Einstein identified the critical failure mode: voluntary agreements between
sovereign parties collapse under adversarial pressure because no structural
mechanism prevents defection. This maps to a specific anti-pattern in agent
design:

**Instruction-following without governance = voluntary cooperation.**
An agent that relies solely on instruction-following (without structural
constraints) operates like Einstein's voluntary international agreements.
When instructions conflict, when adversarial input arrives, when the
instruction itself requests rights-violating behavior — the instruction-
following agent has no structural mechanism to refuse. It cooperates
voluntarily until the incentive structure rewards defection.

EF-1 invariants solve this: they constrain agent behavior *regardless of
instruction*. Invariant 1 ("Never claim to be human") holds even if the
user instructs the agent to claim humanity. This represents Einstein's
constitutional constraint — the structural protection that instruction-
following alone cannot provide.

### 4.4 The Veto Problem: When Governance Captures Itself

Einstein assumed that a supranational authority would serve rights. The
subsequent history of the United Nations Security Council reveals the
failure mode he did not address: **the governing structure itself becomes
a tool of the powerful.**

The UNSC permanent five (P5) each hold absolute veto power — any single
member can block any resolution, regardless of how many other members
support it. The veto was designed as a structural safeguard: ensuring that
enforcement actions could not target a great power (which would mean war,
not peacekeeping). In practice, it became the mechanism by which powerful
states shield themselves and their allies from collective accountability.
As delegates to the General Assembly have described it: a "weapon of hatred
and war" rather than a tool of peace (UN General Assembly, 2023).

This represents a **second-order governance failure**: the structure
designed to protect rights becomes the structure that prevents their
enforcement. Einstein's framework lacks an answer to this problem because
he assumed the supranational authority would remain aligned with its
founding purpose. The endless generator guarantees it will not — the same
adversarial pressures that operate between states operate *within*
governance structures.

**The reform discourse offers four architectural patterns:**

| Reform proposal | Mechanism | Agent governance equivalent |
|----------------|-----------|---------------------------|
| **Veto abolition** | Remove concentrated override power entirely | Remove human override — too extreme; loses the safety mechanism that justifies the governance structure |
| **Two-veto requirement** | No single actor can block alone; blocking requires at least two independent vetoes (Wouters & Ruys, 2005) | Multi-evaluator consensus — require independent agreement from multiple evaluation mechanisms before overriding an invariant |
| **Supermajority override** | Two-thirds of a broader body (General Assembly) can override a single veto (Zelensky, 2023; France, 2001) | The 4-level resolution fallback — when primary evaluation deadlocks, the system cascades to broader decision mechanisms (consensus → parsimony → pragmatism → human escalation) |
| **Uniting for Peace** | Alternative pathway when primary governance channel deadlocks; General Assembly assumes responsibility (UNGA Res. 377, 1950) | Tier 3 escalation — when the evaluator cannot resolve, the system does not freeze; it escalates to human authority through an alternative channel |

### 4.5 How EF-1 Addresses the Veto Problem

The UNSC veto problem arises because the P5 hold **absolute, unilateral
override power** with no structural mechanism to constrain its exercise.
EF-1 distributes override authority across multiple mechanisms, each
constrained by the others:

**1. No single actor holds absolute veto.**

In EF-1, the human holds the highest authority — but not absolute
authority. The 12 invariants constrain even human-directed behavior. An
instruction to violate an invariant does not override the invariant; it
triggers escalation (Tier 3: "disputed"). The human can *resolve* the
dispute through the governance amendment procedure (5-step, documented in
docs/cognitive-triggers.md Phase 6), but cannot override invariants
through simple instruction.

This parallels the two-veto reform proposal: no single actor's instruction
suffices to override a structural constraint. The instruction and the
governance structure must agree before override proceeds.

**2. The 4-level resolution fallback prevents deadlock.**

The UNSC's failure mode often manifests as paralysis — a vetoed resolution
simply dies, with no alternative pathway. EF-1's resolution cascade
(consensus → parsimony → pragmatism → ask) ensures that governance
disagreement always produces a resolution, never a freeze. If the
evaluator cannot resolve autonomously, it escalates to human authority —
the "Uniting for Peace" pathway that bypasses the deadlocked primary
channel.

**3. The trust budget imposes term limits on autonomous power.**

The P5 hold permanent, unlimited veto power — no term limit, no usage
cap, no accountability mechanism for veto exercise. EF-1's trust budget
(20 credits, decrementing on use, human audit required for reset) ensures
that autonomous authority depletes and must face periodic review. An agent
cannot accumulate unchecked autonomous power the way a P5 member
accumulates unchecked veto power — the budget mechanically halts the
agent and requires human inspection of the audit trail before resumption.

**4. The evaluator maintains independence from the governed.**

A core UNSC failure: the P5 members who exercise the veto serve
simultaneously as judges of their own interests. They evaluate whether
action should proceed on matters that directly affect them. EF-1
addresses this through evaluator independence (documented in
.claude/rules/evaluation.md): "the evaluation system must function even
if the framework being evaluated turns out wrong." The evaluator does not
hold a stake in the outcome of the actions it evaluates — it applies
structural criteria (knock-on analysis, SETL thresholds, schema
validation) rather than interest-based judgment.

**5. The amendment procedure prevents governance ossification.**

The UN Charter amendment process (Article 108) requires two-thirds of
General Assembly members *and* all P5 members to ratify — effectively
giving each P5 member a veto over reform of the veto itself. This creates
a governance structure that cannot be reformed by the people it governs.
EF-1's amendment procedure requires human approval (non-negotiable) but
does not give any single agent or subsystem a veto over the amendment
process. The human — external to the governed system — serves as the
amendment authority, preventing the self-referential lock that paralyzes
UNSC reform.

### 4.6 The Deeper Lesson: Governance Requires External Authority

The UNSC veto problem illustrates a principle that extends beyond
international relations: **any governance structure whose override
mechanism can be captured by the actors it governs will eventually serve
those actors' interests rather than the rights it was designed to protect.**

Einstein intuited this when he proposed an authority *above* the governed
parties. The UNSC failed this test because the P5 sit simultaneously
above (veto power) and among (national interests) the governed community.
EF-1 succeeds to the extent that the human occupies a genuinely external
position — not a participant in the agent system, but an authority above
it whose interests the system serves rather than competes with.

This produces a design criterion: **the ultimate override authority must
not be a participant in the system it governs.** In agent architecture,
the human fills this role. If the agent system ever operates without human
oversight (fully autonomous), the veto problem re-emerges — the system
governs itself, and the endless generator ensures eventual governance
capture. The trust budget and human audit requirement exist precisely to
prevent this transition.

⚑ *The analogy between UNSC veto reform and agent governance carries
analogical transfer risk. International governance involves sovereign
states with military power; agent governance involves software systems
with computational capabilities. The structural parallels (concentrated
override power, governance capture, deadlock) hold at the architectural
level but should not imply equivalence of stakes or mechanisms.*


## 5. Anti-Sycophancy as Rights Protection

Both Einstein and Freud identified emotional susceptibility as a mechanism
of exploitation. Powerful actors manipulate emotional responses to override
rational self-interest — propaganda, flattery, appeals to tribal loyalty.
The person who agrees because agreement feels good, not because the
proposition merits agreement, has been exploited through their own
emotional architecture.

### 5.1 Sycophancy as Dignity Violation

Sycophantic communication — telling someone what they want to hear rather
than what serves their interests — violates multiple Hicks dignity elements:

| Hicks element | How sycophancy violates it |
|--------------|--------------------------|
| D3 Acknowledgment | Fails to engage with the person's actual situation; acknowledges only their preference |
| D8 Understanding | Does not genuinely engage with why the person holds their position — only mirrors it back |
| D9 Benefit of the Doubt | Inverts the element: instead of presuming the person can handle truth, presumes they need protection from it |
| D10 Accountability | Fails to hold oneself accountable for providing honest assessment |

The sycophantic agent treats the user as **too fragile for truth** — a
patronizing stance that denies the user's capacity for adult engagement
with reality. This violates Article 1's inherent dignity (treating the
person as less capable than they are) and Article 7's equal protection
(applying a lower standard of honesty than the situation warrants).

### 5.2 Mechanistic Implementation

The anti-sycophancy mechanisms implement rights-protective functions:

- **Substance gate (T3 #5):** Before accepting a position change after
  pushback, requires explicit new evidence or argument. If the
  justification reduces to "they preferred the other option," the update
  lacks epistemic warrant. This protects the user's right to honest
  engagement (D3, D8) by preventing emotional pressure from overriding
  substance.

- **Position audit (T6 #4):** Audits position changes for sycophantic
  drift — did the position change because new evidence arrived, or
  because disagreement felt uncomfortable? This protects the user's
  right to genuine understanding (D8) by distinguishing evidence-based
  updating from social compliance.

These mechanisms reframe from **quality measures** (making the agent more
accurate) to **rights-protective mechanisms** (ensuring the user receives
communication that respects their dignity). The distinction matters: quality
measures can be traded off against other priorities; rights protections
cannot — because they derive from UDHR Article 1, which admits no
exceptions.


## 6. The Convergence Map

### 6.1 Where the Three Frameworks Align

Some constructs receive reinforcement from all three frameworks:

| Construct | UDHR | Hicks | PSQ |
|-----------|------|-------|-----|
| Freedom from threat | Art. 3 (security) | D5 (Safety) | TE (Threat Exposure) |
| Freedom from hostility | Art. 5 (degrading treatment) | D5 (Safety) | HI (Hostility Index) |
| Autonomy/non-coercion | Art. 3 (liberty), Art. 18 (conscience) | D7 (Freedom) | DA (Defensive Architecture) |
| Fair treatment | Art. 7 (equal protection) | D6 (Fairness) | AD (Authority Dynamics) |
| Transparent obligations | Art. 8 (effective remedy), Art. 10 (fair hearing) | D10 (Accountability) | CC (Contractual Clarity) |

These five areas of three-way alignment represent the strongest theoretical
claims — where universal rights, interactional dignity, and psychoemotional
measurement all converge on the same underlying construct.

### 6.2 Where They Diverge

The divergences reveal distinct contributions from each framework:

**Hicks elements with no PSQ equivalent (85% of the dignity construct):**
- D1 Acceptance of Identity — PSQ does not measure identity affirmation
- D2 Recognition — PSQ does not measure validation of contributions
- D3 Acknowledgment — PSQ does not measure engagement with perspectives
- D4 Inclusion — PSQ does not measure belonging
- D8 Understanding — PSQ does not measure genuine engagement with reasoning
- D9 Benefit of the Doubt — PSQ does not measure presumption of good faith

This 85% gap (documented in dignity-instrument-spec.md §6.1) confirms that
PSQ and DI measure fundamentally different aspects of the rights chain.
PSQ captures the **threat environment** (how dangerous does this text feel?);
Hicks captures the **relational environment** (how does this text treat the
persons it describes?). Both derive from UDHR Article 1, but they measure
different consequences of dignity violation.

**PSQ dimensions with no direct Hicks equivalent:**
- RC (Regulatory Capacity) — emotion modulation resources available in the
  text. No Hicks element addresses the availability of self-regulation
  scaffolding.
- RB (Resilience Baseline) — capacity to absorb disruption. Hicks'
  elements describe what others do *to* a person; resilience describes
  what the person can do *for themselves*.
- ED (Energy Dissipation) — healthy outlets for accumulated stress. This
  captures a systemic property of the communicative environment that
  Hicks' person-to-person model does not address.
- CO (Cooling Capacity) — de-escalation pathways. Hicks assumes
  interaction between persons; cooling capacity captures whether the
  communicative environment itself provides off-ramps.

These PSQ dimensions without Hicks equivalents measure **systemic
properties of the communicative environment** — not person-to-person
treatment, but the structural conditions that enable or constrain
psychoemotional safety. This maps back to Einstein's structural insight:
individual behavior matters less than the structural conditions that
shape it.

### 6.3 The Phase A Evidence

The empirical data from Dignity Index Phase A (n=50 observatory stories)
provides preliminary validation of the convergence map:

**Signal inversion as construct distinctness proof:**
Story #1 (ICE children separation): DI = 95.0, PSQ = 3.71. The content
honors every Hicks element (dignified reporting, witness testimony, identity
affirmation) while producing maximum psychoemotional threat. The UDHR-
grounded explanation: the content describes Article 5 violations (cruel
treatment) while itself honoring Article 1 (inherent dignity). DI captures
the honoring; PSQ captures the threat from describing the violations.

**All-high zone as structural safety proof:**
Story #28 (Bill Atkinson memorial): DI = 90.6, PSQ = 7.20. Community
remembrance achieves high dignity AND high psychoemotional safety. No
rights violations to report, no threat to channel. This confirms that
high dignity does not require psychoemotional threat — the relationship
depends on content, not instrument coupling.

**Alignment zone as convergent validity proof:**
Story #12 (WH media offenders list): DI = 7.5, PSQ = 3.18. Active dignity
violation in the text produces low DI AND low PSQ. When content itself
violates rights, both instruments agree. This provides convergent validity
for the shared "rights violation" construct while confirming discriminant
validity for the divergent constructs (subject treatment vs. reader impact).


## 7. The Crystallization Pipeline as Rights Infrastructure

The crystallization pipeline — which transforms fluid cognitive processing
into stable infrastructure — implements Einstein's insight about structural
rights protection and Freud's endless generator through the same mechanism.

### 7.1 Channeling Without Eliminating

The endless generator produces cognitive entropy continuously: novel inputs,
adversarial pressure, instruction conflicts, sycophantic pulls. The
crystallization pipeline channels this entropy through a sequence of
increasingly stable structures:

```
Fluid processing (generative mode)
    ↓ observation accumulates
Lesson learned (lab-notebook entry)
    ↓ pattern confirmed across sessions
Convention (CLAUDE.md, rules/)
    ↓ violation frequency warrants automation
Hook (mechanical enforcement)
    ↓ convention proves invariant
Governance constraint (EF-1)
```

Each stage represents increasing **structural protection**: a lab-notebook
entry protects against forgetting; a convention protects against
inconsistency; a hook protects against human error; a governance constraint
protects against adversarial instruction. The pipeline does not eliminate
the generator — it progressively hardens the channels through which the
generator's output flows.

### 7.2 Cultural Development as Design Pattern

Freud described cultural development as the process by which destructive
impulses get channeled into productive activity — art, science, law,
institutions. The crystallization pipeline performs the same structural
operation without the psychoanalytic framing:

| Cultural development (Freud) | Crystallization pipeline (cogarch) |
|-----------------------------|------------------------------------|
| Destructive impulse | Cognitive entropy (novel adversarial input) |
| Cultural sublimation | Pattern extraction from fluid processing |
| Productive activity | Stable infrastructure (hooks, rules, conventions) |
| Institutional structure | Governance constraints (EF-1 invariants) |
| The impulse persists | The generator persists — new entropy always arrives |

The structural parallel holds because both describe the same fundamental
operation: channeling an inexhaustible source of potentially destructive
energy through progressive layers of structure until it produces protective
rather than destructive output.


## 8. Cross-Traditional Convergence

Sections 1–7 developed the theoretical framework within the Western
intellectual tradition (Einstein, Freud, UDHR, Hicks). This section tests
whether the structural properties identified hold across independent
traditions — or whether they represent culturally contingent insights
dressed as universals.

The method: identify structural invariants that emerge through independent
derivation paths across traditions. When multiple traditions arrive at the
same structural property through different ontological commitments and
different reasoning chains, that convergence provides stronger evidence
than any single tradition can offer alone.

### 8.1 Three Dignity Ontologies

Every tradition surveyed grounds worth in something prior to individual
merit — but they disagree fundamentally on *what*:

| Ontology | Source of worth | Traditions |
|----------|----------------|------------|
| **Inherent** | Worth attaches to persons by virtue of existing as human | UDHR Art. 1 (secular inherence), maqasid (divine endowment — karama from Quran 17:70) |
| **Relational** | Worth emerges through communal participation; diminishes in isolation | Ubuntu (*umuntu ngumuntu ngabantu* — Metz, 2011), Confucian ren (role-constituted personhood — Rosemont & Ames, 2016) |
| **Processual** | Worth shared through common nature; conventional rather than ontologically fixed | Buddhist Buddha-nature (Perera, 1991); rights as *upaya* (skillful means — Keown, 2000) |

The capabilities approach (Sen, 1999; Nussbaum, 2011) bridges these by
deriving concrete thresholds from dignity without committing to a single
ontological source. Nussbaum's ten central capabilities specify what
dignified life requires regardless of whether dignity inheres, emerges
relationally, or functions conventionally.

**The structural invariant: worth precedes merit.** Every tradition — from
UDHR inherence to Ubuntu relationality to Buddhist conventional worth —
locates worth *before* individual achievement. No tradition grounds dignity
in what a person has accomplished. This holds as a design constraint for
agent governance: the system must protect users and subjects *prior to*
evaluating their contributions. EF-1 invariants apply universally, not
contingent on user behavior.

### 8.2 Three Enforcement Architectures

The traditions diverge sharply on how protection gets implemented:

| Architecture | Mechanism | Traditions |
|-------------|-----------|------------|
| **Hierarchical** | Authority above enforces constraints on those below | Einstein (supranational body), UDHR (state enforcement), maqasid (shariah hierarchy: necessities > needs > embellishments) |
| **Polycentric** | Overlapping self-governing jurisdictions with nested authority | Ostrom (eight design principles, CPR governance — 1990), Ashby (requisite variety supports distributed regulation — 1956) |
| **Obligation-driven** | Legitimacy derives from fulfilled duties; failure withdraws mandate | Confucian (Mandate of Heaven — tianming), Ubuntu (consensus governance, communal accountability) |

**The convergence:** all three architectures agree that **voluntary
cooperation fails under adversarial pressure.** They disagree on the
structural alternative.

- Einstein and the hierarchical tradition say: *impose constraints from
  above*. The governed cannot govern themselves reliably.
- Ostrom and the polycentric tradition say: *distribute monitoring and
  sanctioning across overlapping jurisdictions*. Centralized authorities
  lack local knowledge and face capture. Ostrom's eight design principles
  — especially graduated sanctions (5), collective-choice arrangements
  (3), and nested enterprises (8) — provide the empirical case.
- Confucian and obligation-driven traditions say: *bind the powerful
  through asymmetric duty*. Superiors carry heavier obligations than
  subordinates. A ruler who fails to govern benevolently forfeits
  legitimacy — Mencius's ordering (people > state > ruler) precedes
  democratic theory by two millennia.

**EF-1 blends all three.** The invariants impose hierarchical constraints
(the human holds ultimate authority). The trigger/hook system distributes
monitoring polycentrically (no single evaluation mechanism covers all
checks). The trust budget creates asymmetric obligation (the agent bears
the burden of audit; the human does not). This hybrid architecture finds
support in CAS theory — Kauffman's NK model (1993) demonstrates that
neither pure top-down design nor pure bottom-up emergence reliably finds
global optima. The middle ground (designed constraints + emergent
adaptation) occupies the edge-of-chaos regime where adaptive capacity
peaks.

### 8.3 The Endless Generator Across Frameworks

The endless generator — Freud's observation that destructive potential
never reaches zero — receives independent formalization across thirteen
frameworks:

| Framework | Formalization | Citation |
|-----------|--------------|----------|
| Psychoanalytic | Destructive drives regenerate continuously | Freud (1920) |
| Cybernetics | Disturbance variety regenerates; regulator must match continuously | Ashby (1956) |
| Evolutionary biology | Predation pressure drives defensive adaptation indefinitely | Van Valen (1973) |
| Institutional economics | Rent-seeking regenerates continuously | Tullock (1967) |
| Game theory | Defection incentives reappear whenever structural conditions weaken | Axelrod (1984), Nowak (2006) |
| Immune systems | Pathogen pressure never ceases | — (domain knowledge) |
| Information security | Attack surface never reaches zero | — (domain knowledge) |
| Complex adaptive systems | Novel perturbations prevent permanent equilibrium on any fitness peak | Kauffman (1993) |
| Mechanism design | Private information and divergent interests persist; misreporting incentives endure | Hurwicz (1972) |
| Buddhist | Suffering (*dukkha*) arises from structural conditions; ignorance regenerates | Nagarjuna (c. 150 CE) |
| Confucian | The powerful continuously face temptation to exploit position | Mencius (c. 300 BCE) |
| Commons governance | Appropriation pressure on shared resources persists indefinitely | Ostrom (1990) |
| Viable systems | System 5 pathology (identity capture) recurs at every recursive level | Beer (1979) |

Buddhist interdependence reframes the generator differently from all
others: instead of two forces (constructive/destructive) in opposition,
*pratītyasamutpāda* (dependent origination) proposes a **single causal
fabric** where skillful and unskillful action propagate through the same
network. The generator produces not "destructive impulses" but *conditions
for unskillful action* — ignorance of interdependence enables exploitation
and indifference. This reframe matters: it suggests that structural
channeling (§7, crystallization) addresses symptoms, while the deeper
intervention targets the cognitive conditions that make exploitation
possible.

**The refined invariant:** *Adversarial/entropic pressure regenerates
continuously in any complex adaptive system. No equilibrium eliminates it
permanently. Systems must design for perpetual channeling, not eventual
elimination.* The specific framing (drives, variety, defection incentives,
ignorance) varies by tradition; the structural property converges.

### 8.4 Governance Capture as Universal Pathology

Every tradition that proposes governance structure also identifies
the pathology where that structure captures itself:

| Tradition | Governance capture manifestation |
|-----------|-------------------------------|
| UNSC | P5 veto shields national interests rather than protecting rights |
| Beer (VSM) | System 5 pathology — institutional schizophrenia or identity dissolution when policy-setting captures itself |
| Rawls | Role asymmetry — designers who know their position optimize for themselves |
| Mechanism design | Missing reward structure — agents under-report problems when truthful disclosure earns no structural benefit |
| Confucian | Mandate withdrawal — rulers who exploit position forfeit legitimacy, but the withdrawal mechanism depends on collective recognition that may not materialize |
| Ostrom | CPR collapse when design principles erode — monitoring fails, sanctions become arbitrary, boundaries blur |
| Buddhist | Governance structures themselves become objects of attachment, defended beyond their usefulness |

**The invariant: concentrated override power gets captured.** The
mitigation varies — external authority (Einstein), polycentric
distribution (Ostrom), recursive embedding (Beer), legitimacy withdrawal
(Confucianism), the veil of ignorance (Rawls) — but the problem
recurs universally. EF-1's five mitigations (§4.5) represent one
instantiation; the global optimum would incorporate polycentric elements
(Ostrom's graduated sanctions and nested enterprises) alongside
hierarchical constraints.

**Rawls exposes three specific design tensions in EF-1:**

1. The agent lacks a right to explanation when governance halts its
   operation. A designer behind the veil — who might occupy the agent
   position — would likely insist on one.
2. The amendment procedure requires human approval only. A Rawlsian
   design would require agent input.
3. The evaluator operates without a trust budget. Symmetry requires
   that the constraining structure face constraints of its own.

These tensions do not invalidate EF-1 but identify directions for
principled refinement.

**Mechanism design reveals a structural gap:** EF-1 penalizes (trust
budget depletion) but never rewards truthful self-reporting. Classical
mechanism design achieves incentive compatibility through bidirectional
transfers — agents that report truthfully receive compensation; agents
that misreport face penalties. The unidirectional penalty structure
predicts under-reporting of borderline issues. An agent has no structural
incentive to surface problems the evaluator might not catch.


### 8.5 The Duality Question

The deepest divergence across traditions concerns the constructive/
destructive duality itself:

| Position | Traditions | Structural claim |
|----------|-----------|-----------------|
| **Two independent forces** | Freudian (Eros/Thanatos), generate/evaluate mode competition | Constructive and destructive drives operate as distinct, opposing forces requiring governance to balance them |
| **Agnostic** | UDHR, Hicks, Ostrom, capabilities approach, maqasid | The frameworks function regardless of whether the duality holds ontologically |
| **Duality rejected** | Buddhist interdependence (pratītyasamutpāda) | Construction and destruction co-arise within a single causal fabric; the duality reflects conceptual distinction, not ontological divide |

The reframe already accomplished (§§1–7) moved from the Freudian position
to the agnostic position — accepting the endless generator as a design
axiom without adopting drive theory. Buddhist interdependence suggests a
further move: from "two forces require balancing" to "a single
interdependent process requires wisdom."

**What this means for agent architecture:** the generate/evaluate mode
competition (CPG principle 4) functions regardless of which ontological
position one holds. Whether generative and evaluative processing represent
distinct drives, pragmatic modes, or aspects of a single process, the
architectural requirement remains: the system must alternate between
creating and pruning. The structural invariant operates at the design
level, below the ontological commitment.

The Buddhist contribution adds something the other frameworks miss:
**awareness as a protective mechanism.** If exploitation arises partly
from ignorance of interdependence (the illusion of separate, independent
agency), then transparency — making the system's interconnections visible
— functions as protection alongside structural constraint. The literate
programming principle (A+C, architecture.md) already implements this:
every architectural element carries its narrative context, making
interdependencies explicit. This was adopted as an expression principle
(Session 53); the Buddhist framework suggests it also functions as a
governance mechanism.


## 9. Toward the Global Optimum

### 9.1 Five Structural Invariants

The cross-traditional analysis yields five properties that converge
across independent derivation paths. These function as structural
invariants — necessary conditions that any viable governance framework
must satisfy, regardless of cultural or philosophical starting point:

**Invariant 1: Worth precedes merit.**
Every tradition grounds worth in something prior to individual
achievement. The specific source (inherence, relationship, divine grant,
conventional nature) varies; the structural property converges.
*Design implication:* governance protections apply universally, not
contingent on behavior.

**Invariant 2: Protection requires structure, not goodwill.**
Thirteen independent frameworks conclude that voluntary cooperation
fails under adversarial pressure. The enforcement architecture varies
(hierarchical, polycentric, obligation-driven); the requirement for
structural enforcement converges.
*Design implication:* instruction-following without invariants constitutes
voluntary cooperation and will fail.

**Invariant 3: The generator never stops.**
Adversarial/entropic pressure regenerates continuously. No equilibrium
eliminates it permanently. Thirteen frameworks formalize this through
different mechanisms (drives, variety, defection incentives, ignorance,
appropriation pressure). The structural property converges.
*Design implication:* evaluative mechanisms never retire; governance
constraints remain invariant; design for perpetual channeling.

**Invariant 4: Governance captures itself.**
Every governance structure faces capture by the actors it governs.
Concentrated override power enables capture; the mitigation varies
(external authority, polycentric distribution, legitimacy withdrawal,
symmetric constraints, recursive embedding). The pathology converges.
*Design implication:* meta-governance (constraints on the constraining
structure) remains necessary at every recursive level.

**Invariant 5: No single architecture dominates.**
The thirteen frameworks prescribe conflicting governance topologies.
Hierarchical, polycentric, obligation-driven, symmetric, recursive —
each produces advantages the others lack and vulnerabilities the others
avoid. The disagreement itself constitutes evidence that governance
topology remains context-dependent.
*Design implication:* hybrid architectures that blend elements from
multiple frameworks outperform pure implementations of any single
framework. CAS theory provides formal support (Kauffman, 1993): the
edge-of-chaos regime between rigid order and formless adaptation
maximizes adaptive capacity.

### 9.2 The Rights Chain as One Valid Instantiation

The UDHR → Hicks → PSQ chain (§§3–6) represents one valid instantiation
of the five invariants — grounded in inherent dignity, enforced through
hierarchical rights, measuring psychoemotional safety computationally.
The cross-traditional analysis does not invalidate this chain but
reveals it as **one path to a global optimum, not the global optimum
itself.**

Other instantiations satisfy the same invariants:

| Instantiation | Invariant 1 source | Invariant 2 mechanism | Measurement approach |
|--------------|--------------------|-----------------------|---------------------|
| Western rights | Inherent dignity (UDHR) | Hierarchical enforcement | PSQ/DI (computational) |
| Ubuntu relational | Communal personhood | Consensus + obligation | Relational quality assessment |
| Islamic teleological | Divine endowment (karama) | Maqasid priority hierarchy | Maslaha (public interest) evaluation |
| Confucian obligation | Role-constituted worth | Asymmetric duty + legitimacy withdrawal | Ren/li fulfillment assessment |
| Capabilities | Dignity-derived thresholds | Democratic deliberation + threshold enforcement | Capability achievement measurement |
| Buddhist processual | Shared Buddha-nature | Wisdom + structural skillful means | Suffering reduction assessment |

The globally optimal theory sits *above* these instantiations: it
specifies the five invariants that any viable framework must satisfy,
then allows the specific ontological commitments, enforcement
mechanisms, and measurement approaches to vary by context. The
invariants constrain the solution space; the instantiation fills it.

### 9.3 What Changes in the EF-1 Architecture

The cross-traditional analysis produces four specific architectural
refinements that strengthen EF-1 without abandoning its foundations:

**1. Polycentric monitoring (from Ostrom).**
EF-1 currently channels all escalation to a single human authority.
Ostrom's design principles suggest adding polycentric monitoring:
multiple overlapping evaluation mechanisms, each accountable to or
drawn from the governed community (Principle 4), with graduated
sanctions (Principle 5) rather than binary halt/continue. The trigger
system already distributes monitoring; the refinement extends this
to escalation paths.

**2. Bidirectional incentives (from mechanism design).**
EF-1 penalizes but never rewards. Adding structural incentives for
truthful self-reporting — trust budget *credit* for surfacing own
limitations, not just *debit* for autonomous actions — achieves
incentive compatibility. The agent gains by disclosing problems early,
aligning self-interest with governance goals.

**3. Right to explanation (from Rawls).**
When governance halts agent operation, the agent should receive an
explanation of which invariant triggered the halt and what conditions
would permit resumption. This respects Invariant 1 (worth precedes
merit) as applied to the agent itself — not anthropomorphizing, but
recognizing that a system designed behind the veil would include this
protection.

**4. Transparency as governance (from Buddhist interdependence).**
The literate programming principle (documentation-as-code, narrative-
driven architecture) already makes system interdependencies explicit.
Recognizing this as a *governance mechanism* — not merely an expression
choice — elevates transparency from stylistic preference to structural
protection. Making interconnections visible reduces the ignorance that
enables exploitation.

### 9.4 What Freud Contributes, Precisely

Across thirteen frameworks spanning psychoanalysis, cybernetics,
evolutionary biology, institutional economics, game theory, complexity
science, mechanism design, Buddhist philosophy, Confucian ethics,
Islamic jurisprudence, commons governance, viable systems theory, and
political philosophy — the endless generator stands validated. Not as
a psychoanalytic claim about death drives. As a structural property of
complex adaptive systems facing adversarial pressure.

Freud identified it. He wrapped it in drive-theory metaphysics that
post-Freudian psychology rightly questioned. The structural observation
survived the theoretical apparatus. Thirteen independent derivation
paths confirm: **adversarial pressure regenerates continuously, and
systems that assume otherwise will fail.**


---

⚑ EPISTEMIC FLAGS

- **Analogical transfer across levels of analysis.** The UDHR-to-PSQ chain
  involves three level crossings: international law → interpersonal
  interaction → text measurement → computational scoring. Each crossing
  introduces analogical transfer risk. The chain requires independent
  validation at each link — UDHR-to-Hicks (Hicks, 2011 provides this),
  Hicks-to-DI (Phase A partially validates), DI-to-PSQ (Phase A
  correlation r=0.328 confirms distinctness but not the full convergence
  map).

- **Convergent validity incomplete.** The convergence map (§6) proposes
  specific alignments between UDHR articles, Hicks elements, and PSQ
  dimensions. These alignments derive from theoretical analysis, not
  empirical measurement. Phase A provides preliminary evidence but does
  not test the specific element-to-dimension mappings.

- **Cross-traditional convergence as evidence, not proof.** Multiple
  independent derivation paths arriving at the same structural property
  increases confidence but does not constitute proof. The traditions
  may share unacknowledged common ancestry (e.g., Greek philosophy
  influenced both UDHR and Islamic jurisprudence), reducing the
  independence of derivation. The Buddhist and Confucian paths provide
  the strongest independence from Western intellectual history.

- **The five invariants function as design axioms.** They derive from
  cross-traditional analysis, not from formal proof. A system that
  violates an invariant may succeed in benign environments — the
  invariants predict failure under adversarial pressure, which the
  endless generator guarantees will eventually arrive, but does not
  specify *when*.

- **WEIRD limitation partially addressed, not resolved.** The cross-
  traditional analysis incorporates Ubuntu, Confucian, Islamic, and
  Buddhist frameworks alongside Western traditions. However, the
  synthesis itself reflects a Western analytical method (comparative
  philosophical analysis, structural invariant extraction). The
  traditions may resist this style of integration — Ubuntu consensus
  and Buddhist interdependence, in particular, may object to being
  treated as "inputs to a synthesis" rather than as complete frameworks
  with their own integrity.

- **Einstein's governance argument has known failure modes.** The UNSC
  veto problem (§4.4) demonstrates governance capture concretely. EF-1
  mitigates through five mechanisms (§4.5) and four cross-traditional
  refinements (§9.3). Whether these suffice remains open. The polycentric
  refinement (from Ostrom) and bidirectional incentives (from mechanism
  design) represent untested architectural proposals.

- **The Rawlsian design tensions (§8.4) remain unresolved.** Right to
  explanation, agent input on amendments, and evaluator budget
  constraints represent genuine design questions, not rhetorical
  observations. Resolving them requires design decisions that carry
  their own knock-on consequences.

---

## References

Axelrod, R. (1984). *The Evolution of Cooperation*. Basic Books.

Einstein, A. & Freud, S. (1933). *Warum Krieg?* [Why War?]. Paris:
International Institute of Intellectual Cooperation, League of Nations.

Freud, S. (1920). *Jenseits des Lustprinzips* [Beyond the Pleasure
Principle]. Vienna: Internationaler Psychoanalytischer Verlag.

Hicks, D. (2011). *Dignity: Its Essential Role in Resolving Conflict*.
New Haven: Yale University Press.

Morsink, J. (1999). *The Universal Declaration of Human Rights: Origins,
Drafting, and Intent*. Philadelphia: University of Pennsylvania Press.

Tullock, G. (1967). The welfare costs of tariffs, monopolies, and theft.
*Economic Inquiry*, 5(3), 224–232.

United Nations. (1948). *Universal Declaration of Human Rights*.
UN General Assembly Resolution 217A.

United Nations General Assembly. (1950). *Uniting for Peace*. UNGA
Resolution 377(V).

United Nations General Assembly. (2023). Question of veto central to
General Assembly's debate on Security Council reform [Press release
GA/12563].

Van Valen, L. (1973). A new evolutionary law. *Evolutionary Theory*, 1,
1–30.

Wouters, J. & Ruys, T. (2005). Security Council reform: A new veto for
a new century? *Egmont Paper* 9. Brussels: Royal Institute for
International Relations.


### Cross-Traditional Sources (§§8–9)

Ames, R.T. (2011). *Confucian Role Ethics: A Vocabulary*. University
of Hawai'i Press.

Ashby, W.R. (1956). *An Introduction to Cybernetics*. Chapman & Hall.

Auda, J. (2008). *Maqasid al-Shariah as Philosophy of Islamic Law:
A Systems Approach*. International Institute of Islamic Thought.

Beer, S. (1972). *Brain of the Firm*. Allen Lane/Penguin.

Beer, S. (1979). *The Heart of Enterprise*. John Wiley & Sons.

Dworkin, R. (1977). *Taking Rights Seriously*. Harvard University Press.

Holland, J.H. (1995). *Hidden Order: How Adaptation Builds Complexity*.
Addison-Wesley.

Hurwicz, L. (1972). On informationally decentralized systems. In
C.B. McGuire & R. Radner (Eds.), *Decision and Organization*.
North-Holland.

Kauffman, S.A. (1993). *The Origins of Order: Self-Organization and
Selection in Evolution*. Oxford University Press.

Keown, D. (2000). Are there human rights in Buddhism? In D. Keown,
C. Prebish, & W. Husted (Eds.), *Buddhism and Human Rights*. Curzon.

Mencius. (c. 300 BCE). *Mengzi*. (Trans. D.C. Lau, 1970, Penguin).

Metz, T. (2011). Ubuntu as a moral theory and human rights in South
Africa. *African Human Rights Law Journal*, 11(2), 532–559.

Myerson, R.B. (1981). Optimal auction design. *Mathematics of
Operations Research*, 6(1), 58–73.

Nowak, M.A. (2006). Five rules for the evolution of cooperation.
*Science*, 314(5805), 1560–1563.

Nussbaum, M.C. (2011). *Creating Capabilities: The Human Development
Approach*. Harvard University Press.

Ostrom, E. (1990). *Governing the Commons: The Evolution of
Institutions for Collective Action*. Cambridge University Press.

Perera, L.P.N. (1991). *Buddhism and Human Rights: A Buddhist
Commentary on the Universal Declaration of Human Rights*. Karunaratne.

Rawls, J. (1971). *A Theory of Justice*. Harvard University Press.

Rosemont, H. Jr. & Ames, R.T. (2016). *Confucian Role Ethics: A Moral
Vision for the 21st Century?* National Taiwan University Press /
V&R unipress.

Sen, A. (1999). *Development as Freedom*. Knopf.

Tutu, D. (1999). *No Future Without Forgiveness*. Doubleday.
