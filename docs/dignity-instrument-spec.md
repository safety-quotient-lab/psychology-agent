# Dignity Index — Instrument Specification

**Status:** Draft — pending feasibility study (Phase A)
**Created:** 2026-03-08
**Construct basis:** UDHR Article 1 (inherent dignity), operationalized through
Hicks (2011) relational dignity model
**Context:** Proposed complementary instrument for observatory.unratified.org,
alongside HRCB and PSQ-Lite


## 1. Construct Definition

**Dignity** as measured by this instrument refers to the degree to which content
treats its subjects as possessing inherent worth and honors the relational
conditions necessary for that worth to function socially.

The construct draws from two sources:

- **UDHR Article 1** — "All human beings are born free and equal in dignity
  and rights." Dignity here functions as the axiom grounding all subsequent
  rights. The instrument measures alignment with this axiom, not with
  specific rights provisions (which HRCB covers).

- **Hicks (2011)** — *Dignity: Its Essential Role in Resolving Conflict*.
  Operationalizes dignity through 10 observable relational elements. These
  provide the scoring rubric. Each element represents a way that dignity
  can be honored or violated in communication.

**What this instrument measures:** Whether content treats persons — its subjects,
its audience, third parties — as possessing inherent worth. This requires
assessing editorial stance, not just content properties.

**What this instrument does not measure:**
- Psychoemotional safety of the reader (PSQ covers this)
- Alignment with specific UDHR provisions (HRCB covers this)
- Legal compliance or rights enumeration
- Author intent (unobservable; we measure observable editorial behavior)


## 2. Dimensions — Hicks' 10 Essential Elements

Each element scored independently per content unit.

| # | Dimension | Operational definition (content scoring) |
|---|-----------|----------------------------------------|
| D1 | Acceptance of Identity | Content treats subjects as whole persons; does not reduce them to categories, stereotypes, or functions |
| D2 | Recognition | Content validates the contributions, experience, or expertise of persons it references |
| D3 | Acknowledgment | Content engages with the perspectives and concerns of persons it describes; does not dismiss or ignore |
| D4 | Inclusion | Content treats subjects as belonging; does not position them as outsiders, others, or exceptions |
| D5 | Safety | Content creates an environment free from humiliation, contempt, or degradation for the persons described |
| D6 | Fairness | Content applies consistent standards; does not give preferential or punitive framing based on group membership |
| D7 | Freedom | Content respects autonomy of thought and action for persons described; does not impose, coerce, or patronize |
| D8 | Understanding | Content engages genuinely with why persons think or act as they do; does not reduce motives to caricature |
| D9 | Benefit of the Doubt | Content starts from the premise that persons have understandable reasons for their positions |
| D10 | Accountability | Content holds persons (including the author/publisher) responsible for actions; names violations without excuse |


## 3. Scoring Architecture

### 3.1 Per-Dimension Scoring

Each dimension scored on a 5-point scale:

| Score | Label | Meaning |
|-------|-------|---------|
| 2 | Honored | Content actively upholds this dignity element |
| 1 | Present | Element present but not emphasized |
| 0 | Absent/Neutral | Element not relevant to this content |
| -1 | Neglected | Element absent where context makes it relevant |
| -2 | Violated | Content actively undermines this dignity element |

**Critical design choice: 0 = neutral, not negative.** This directly addresses
the HRCB H1 finding (absence-as-negative bias). Technical content with no
dignity-relevant subjects scores 0 across all dimensions — correctly classified
as "not applicable" rather than "dignity-violating."

### 3.2 Directionality Markers

Each scored dimension carries a directionality marker:

| Marker | Meaning |
|--------|---------|
| S | Subject-directed — dignity element applies to persons described in the content |
| A | Audience-directed — dignity element applies to readers/users |
| T | Third-party-directed — dignity element applies to persons outside the content's direct scope |
| R | Reflexive — content demonstrates the element toward its own editorial practice |

A single dimension may carry multiple markers (e.g., D5-Safety scored as
Violated/S, Present/A — content humiliates subjects but does not threaten readers).

### 3.3 Evidence Levels

Each score carries an evidence tag:

| Level | Meaning |
|-------|---------|
| D | Direct — explicit textual evidence (quoted speech, stated policy, observable action described) |
| I | Inferred — evidence from framing, tone, structure, or omission patterns |
| ND | No Data — dimension not scoreable from available content |

### 3.4 Composite Score

**Dignity Index (DI):** Mean of all non-ND dimensions, scaled to 0–100.

Formula: `DI = ((mean_of_scored_dimensions + 2) / 4) × 100`

This maps the -2 to +2 raw scale onto 0–100, where:
- 0 = all scored dimensions maximally violated
- 50 = all scored dimensions neutral or balanced
- 100 = all scored dimensions maximally honored

**Exclusion rule:** If fewer than 3 dimensions score non-ND, the composite
resolves to ND rather than a numeric value. Content with minimal dignity-relevant
material does not receive a misleading composite.

### 3.5 Relevance Gate

Before scoring, a relevance classifier determines whether the content contains
dignity-relevant material:

- **Relevant** — content references, describes, depicts, or addresses persons
  or groups in ways that engage dignity elements. Proceed to scoring.
- **Peripheral** — content mentions persons incidentally but the primary subject
  has no dignity dimension (e.g., a technical tutorial with an author bio).
  Score only directly engaged dimensions; remainder route to ND.
- **Not relevant** — content has no dignity dimension (API documentation,
  mathematical proofs, code repositories). Route to DI = ND.

This gate prevents the absence-as-negative pathology identified in HRCB review
(H1 finding, Session 35).


## 4. Two-Channel Architecture

Inherits the HRCB's strongest design feature, adapted for dignity:

### 4.1 Editorial Channel (what content says)

Scores Hicks' 10 elements based on the content's treatment of persons within
its editorial substance. This channel answers: "Does the text honor or violate
dignity in how it describes, references, or engages with persons?"

### 4.2 Structural Channel (what the site does)

Scores a subset of Hicks' elements based on the site's infrastructure behavior
toward users:

| Hicks element | Structural signal |
|---------------|-------------------|
| Safety (D5) | Absence of dark patterns, deceptive consent, manipulative UI |
| Inclusion (D4) | Accessibility compliance (WCAG), language availability, screen reader support |
| Freedom (D7) | No forced account creation, no coercive email capture, no paywall-gated essential content |
| Fairness (D6) | Consistent experience across user contexts (no geo-discrimination, no device discrimination) |
| Acceptance of Identity (D1) | Profile/account options respect identity diversity; no forced binary choices |

The remaining 5 elements (Recognition, Acknowledgment, Understanding, Benefit
of the Doubt, Accountability) apply to editorial content only — they require
semantic assessment that infrastructure signals cannot provide.

### 4.3 Dignity-Editorial Tension Level (DETL)

Analogous to HRCB's SETL. Measures divergence between editorial dignity claims
and structural dignity practice. A site whose content champions human dignity
while deploying dark patterns and excluding disabled users produces high DETL.

`DETL = |editorial_DI − structural_DI| / 100`

High DETL indicates dignity-washing — the structural equivalent of rights-washing.


## 5. Full vs. Lite Mode — Lessons from HRCB Mode Collapse

The HRCB review (Session 35, journal §29) documented measurement mode collapse:
lite mode drops every mechanism that makes full mode defensible. This instrument
specification addresses the failure modes directly.

### 5.1 Full Mode

- 10 dimensions scored independently
- Directionality markers per dimension
- Evidence levels per dimension
- Browser-verified structural signals
- Relevance gate with explicit ND routing
- DI composite from scored dimensions only

### 5.2 Lite Mode (if needed for scale)

**Non-negotiable requirements for lite mode:**

1. **Relevance gate preserved** — lite mode must route irrelevant content to ND,
   not score it. The absence-as-negative pathology originates from skipping this gate.

2. **Directionality preserved** — at minimum, the lite scorer must distinguish
   "content documents dignity violations to oppose them" from "content commits
   dignity violations." A binary Honored/Violated without directionality repeats
   the HRCB H2 failure.

3. **Score labeled as lite** — DI-Lite and DI-Full must display as distinct
   measures. Same scale, different precision. Users must see which mode produced
   the score. This prevents the mode-collapse confusion identified in journal §29.

4. **Reduced dimension set acceptable** — lite mode may score a subset of
   dimensions (recommended: D1 Acceptance, D3 Acknowledgment, D5 Safety,
   D8 Understanding, D10 Accountability — these 5 capture the most
   common dignity violations in media content). The remaining 5 route to ND.

5. **Structural channel optional in lite** — if browser signals unavailable,
   score editorial channel only and label as "editorial-only DI."


## 6. Relationship to Existing Observatory Instruments

| Instrument | Construct | Relationship to Dignity Index |
|------------|-----------|------------------------------|
| HRCB | Rights alignment with 31 UDHR provisions | Complementary. HRCB measures specific rights. DI measures the foundational axiom (dignity) that grounds those rights. Content can score well on specific provisions while treating subjects without dignity (bureaucratic compliance without recognition). |
| PSQ-Lite | Psychoemotional safety (3 dimensions) | Complementary. PSQ measures reader impact. DI measures editorial treatment of subjects. A documentary about dignity violations may score high on PSQ threat and high on DI (dignity-restoring through accountability). |
| PSQ-Full | Psychoemotional safety (10 dimensions) | Deeper complement. PSQ-Full's threat exposure and hostility index partially overlap with DI's Safety (D5). All other DI dimensions are orthogonal to PSQ-Full. |

### 6.1 Co-Display Model

On a story page, the three instruments would display as:

```
┌─────────────────────────────────────────────────┐
│ Rights Alignment (HRCB)    +0.34  [████░░] full │
│ Reader Safety (PSQ)         6.2   [██████] lite │
│ Dignity Index (DI)           72   [█████░] full │
│                                                 │
│ ⚠ DETL: 0.31 — editorial-structural tension     │
└─────────────────────────────────────────────────┘
```

Each instrument answers a different question:
- HRCB: "Does this content align with specific human rights?"
- PSQ: "How safe does this feel to read?"
- DI: "Does this treat people as though they matter?"


## 7. Phase A — Feasibility Study Protocol

### 7.1 Objective

Measure empirical construct distance between PSQ and the proposed Dignity Index
on a stratified sample of observatory content. Determine which Hicks elements
(if any) PSQ dimensions predict, and characterize the false-negative profile
(dignity-relevant content that PSQ misses).

### 7.2 Sample

50 stories from the observatory, stratified:

| Stratum | n | Selection criteria |
|---------|---|-------------------|
| High-HRCB positive | 10 | Top-scoring HRCB stories (rights-affirming content) |
| High-HRCB negative | 10 | Bottom-scoring HRCB stories (rights-irrelevant or hostile) |
| Mid-HRCB | 10 | Stories near HRCB midpoint (mixed or moderate signal) |
| High-PSQ threat | 10 | Highest PSQ-Lite threat_exposure scores |
| Technical/neutral | 10 | Stories with minimal rights or safety signal (tech docs, tutorials) |

### 7.3 Scoring Procedure

Each story scored by:

1. **PSQ-Lite** — already available in observatory data
2. **PSQ-Full** — run through PSQ-Full endpoint (if available) or manual
   in-conversation scoring using the psychology agent
3. **Dignity Index (manual)** — psychology agent scores all 10 Hicks elements
   using the rubric above, with evidence levels and directionality markers.
   Two independent scoring passes per story (scorer 1: psychology agent session A;
   scorer 2: psychology agent session B) to estimate inter-rater reliability.

### 7.4 Analysis Plan

| Analysis | Method | What it reveals |
|----------|--------|-----------------|
| Construct distance | Correlation matrix (PSQ dims × DI dims) | Which PSQ dimensions predict which DI elements, and how strongly |
| Coverage analysis | % of DI variance explained by PSQ | Whether PSQ captures enough DI signal to function as a proxy (hypothesis: < 25%) |
| Signal inversion rate | Count of stories where PSQ and DI disagree on valence | Empirical measure of the directionality problem |
| False-negative profile | DI-relevant stories with low PSQ scores | What types of dignity violations produce no PSQ signal |
| Inter-rater reliability | Cohen's kappa per DI dimension | Whether the scoring rubric produces reliable results |
| Relevance gate accuracy | % correctly classified as relevant/not-relevant | Whether the gate prevents absence-as-negative |

### 7.5 Success Criteria

Phase A proceeds to Phase B if:

1. Inter-rater reliability ≥ 0.60 (moderate agreement) on ≥ 7 of 10 dimensions
2. The relevance gate correctly classifies ≥ 90% of technical/neutral content as ND
3. PSQ-DI correlation confirms construct distinctness (r < 0.50 for majority
   of cross-instrument dimension pairs)
4. At least 5 stories demonstrate signal inversion (high PSQ threat + high DI)
   confirming the directionality divergence


## 8. Phase B — Instrument Build (Contingent on Phase A)

Detailed design deferred until Phase A data available. Preliminary architecture:

1. **Scoring prompt** — structured Hicks rubric with worked examples, evidence
   requirements, and explicit directionality instructions. Apply HRCB lessons:
   include ND routing in the prompt, not as a post-hoc filter.
2. **Model selection** — Opus for full mode (construct sophistication requires
   high capability); lite mode candidates TBD based on HRCB scorer compression
   findings (avoid repeating the Worker AI limitation).
3. **Calibration** — known-groups validation using the Phase A sample + expansion.
   Test against content with established dignity assessments (e.g., TRC testimony,
   journalism awards for humanizing coverage, documented dehumanizing content).
4. **Storage schema** — 10-dimension JSON matching observatory's existing
   psq_dimensions_json column pattern.


## 9. Phase C — Complement Integration (Contingent on Phase B)

1. PSQ and DI deployed as independent instruments with co-display
2. Triage routing: PSQ-Lite flags → DI scoring triggered (threshold from Phase A data)
3. DETL computed when both editorial and structural DI scores available
4. Mode labels (full/lite) displayed persistently per instrument per story


## 10. Constraints and Ethical Considerations

| Constraint | Applies to | Source |
|------------|-----------|--------|
| E-1 | DI scores content, not persons — no clinical dignity assessment | constraints.md |
| E-2 | WEIRD flag — Hicks model developed in Western conflict-resolution context; dignity concepts vary cross-culturally (Nussbaum, 2000; Sen, 1999) | constraints.md pattern |
| E-6 | Fabricated confidence forbidden — DI scores carry the same uncertainty as any LLM-based assessment | constraints.md |
| M-9 | Evidence-bearing responses — DI scores must link to textual evidence | constraints.md |
| New | Content about dignity violations may itself require dignity in its handling — the scoring process must not reproduce the violation it measures | Novel ethical constraint |

### 10.1 Cross-Cultural Validity Limitation

Hicks' dignity model emerges from Western conflict-resolution practice.
Dignity concepts function differently across cultures:

- **Ubuntu (Southern African)** — dignity as inherently relational:
  "I am because we are" (Metz, 2007)
- **Confucian** — dignity through proper role fulfillment and social harmony,
  not individual recognition (Chan, 2014)
- **Islamic** — karama (كرامة) as God-given, inalienable, not contingent on
  relational behavior (Kamali, 2002)

The instrument should flag this limitation when scoring content from non-Western
contexts, analogous to PSQ's WEIRD flag (T15 Check 6, E-2).


## References

Block, J. (1995). A contrarian view of the five-factor approach to personality
description. *Psychological Bulletin*, 117(2), 187–215.

Chan, J. (2014). *Confucian Perfectionism: A Political Philosophy for Modern Times*.
Princeton University Press.

Hicks, D. (2011). *Dignity: Its Essential Role in Resolving Conflict*. Yale
University Press.

Kamali, M. H. (2002). *The Dignity of Man: An Islamic Perspective*. Islamic Texts
Society.

Metz, T. (2007). Toward an African moral theory. *Journal of Political Philosophy*,
15(3), 321–341.

Nussbaum, M. C. (2000). *Women and Human Development: The Capabilities Approach*.
Cambridge University Press.

Sen, A. (1999). *Development as Freedom*. Knopf.
