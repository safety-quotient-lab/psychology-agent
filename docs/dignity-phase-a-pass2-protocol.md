# Dignity Index Phase A — Pass 2 Protocol

**Status:** Ready to execute (Session 85, 2026-03-13)
**Derives from:** `docs/dignity-phase-a-study.md`, `docs/dignity-instrument-spec.md`
**Processual grounding:** `docs/einstein-freud-rights-theory.md` §10.13
**Prerequisites:** Pass 1 complete (3/4 criteria met)

---

## Objective

Establish inter-rater reliability for the Dignity Index (DI) instrument.
Pass 2 provides the fourth success criterion: κ ≥ 0.60 (moderate agreement)
on ≥ 7 of 10 Hicks dignity dimensions, scored independently by a fresh
session with zero access to Pass 1 results.


## Design

### Rater Structure

| Rater | Session | Access |
|-------|---------|--------|
| Pass 1 (Rater A) | Session 41, 2026-03-08 | Original scoring — completed, results in `docs/dignity-phase-a-study.md` |
| Pass 2 (Rater B) | Fresh session | Zero access to Pass 1 scores, reasoning, or composite values. Independent scoring of identical 50 stories. |

**Independence guarantee:** The Pass 2 session MUST NOT load, read, or
reference `docs/dignity-phase-a-study.md` or any file containing Pass 1
scores. The session receives only: the scoring rubric
(`docs/dignity-instrument-spec.md` §2–3), the story list (HN IDs only),
and access to observatory API / original URLs for content.

### Sample

Same 50 stories as Pass 1, stratified across 5 tiers:
- Stratum 1: High-HRCB positive (n=10)
- Stratum 2: Low/Negative HRCB (n=10)
- Stratum 3: Mid-HRCB (n=10)
- Stratum 4: High-PSQ threat (n=10)
- Stratum 5: Technical/neutral (n=10)

**Analytic sample:** 27 PASS stories (passed relevance gate in Pass 1).
The 19 ND stories and 4 DEFERRED stories contribute to relevance gate
reliability but not to dimension-level ICC.

### Scoring Procedure

For each of the 50 stories:

1. **Fetch content** — observatory API (`/stories/:hn_id`) or original URL.
   HN discussion thread provides I-level (inference) evidence. Full article
   provides D-level (direct) evidence. I-level proved sufficient in Pass 1
   for 23/27 PASS stories.

2. **Apply relevance gate** — does the content reference, describe, or
   depict persons in dignity-relevant ways?
   - **Relevant:** Score all 10 dimensions
   - **Peripheral:** Score only engaged dimensions
   - **Not relevant:** All dimensions = ND, mark "below relevance gate"

3. **Score 10 Hicks dimensions independently:**

   | Dimension | Scale | Directionality |
   |-----------|-------|---------------|
   | D1 Acceptance of Identity | -2 to +2 | S/A/T/R |
   | D2 Recognition | -2 to +2 | S/A/T/R |
   | D3 Acknowledgment | -2 to +2 | S/A/T/R |
   | D4 Inclusion | -2 to +2 | S/A/T/R |
   | D5 Safety | -2 to +2 | S/A/T/R |
   | D6 Fairness | -2 to +2 | S/A/T/R |
   | D7 Freedom | -2 to +2 | S/A/T/R |
   | D8 Understanding | -2 to +2 | S/A/T/R |
   | D9 Benefit of the Doubt | -2 to +2 | S/A/T/R |
   | D10 Accountability | -2 to +2 | S/A/T/R |

   Score meanings: -2 = actively violated, -1 = neglected/passively absent,
   0 = neutral/not applicable, +1 = present but not emphasized,
   +2 = actively honored/emphasized.

4. **Compute composite:**
   `DI = ((mean_of_scored_dimensions + 2) / 4) × 100`
   Minimum 3 scored dimensions required; fewer → ND.

5. **Record evidence level** (D/I/ND) per dimension.


## Analysis Plan

### Primary: Cohen's Kappa per Dimension

Compute weighted Cohen's κ (quadratic weights, ordinal scale) for each
of the 10 Hicks dimensions across the 27 PASS stories.

```python
from sklearn.metrics import cohen_kappa_score

for dim in ['D1', 'D2', ..., 'D10']:
    kappa = cohen_kappa_score(
        pass1_scores[dim],
        pass2_scores[dim],
        weights='quadratic'
    )
    print(f"{dim}: κ = {kappa:.3f}")
```

**Success threshold:** κ ≥ 0.60 on ≥ 7 of 10 dimensions.

### Sensitivity: PABAK (Prevalence-Adjusted Bias-Adjusted Kappa)

Pass 1 showed restricted range: most dimension scores cluster at +1
("present but not emphasized"). Standard kappa penalizes marginal
distributions with low variation, potentially suppressing agreement
measures even when raters agree.

PABAK (Byrt, Bishop, & Carlin, 1993) adjusts for this:
`PABAK = 2 × observed_agreement − 1`

Report both standard κ and PABAK. If standard κ fails threshold but PABAK
exceeds it, the restricted range — not low agreement — explains the
discrepancy.

### Secondary: ICC(2,1) for Composite DI

Intraclass correlation coefficient (two-way random, single measures) for
the DI composite score across the 27 PASS stories.

```python
import pingouin as pg

icc = pg.intraclass_corr(
    data=df,
    targets='story_id',
    raters='pass',
    ratings='DI_composite'
)
# Report ICC(2,1) — "ICC2" in pingouin output
```

**Threshold:** ICC(2,1) ≥ 0.70 (good agreement at composite level).

### Tertiary: Relevance Gate Concordance

Compare Pass 1 and Pass 2 relevance gate decisions (relevant/peripheral/
not-relevant) for all 50 stories. Compute simple agreement percentage
and Cohen's κ for the 3-category gate.

**Expected:** Near-perfect agreement — Pass 1 achieved 100% accuracy
(19/19 ND correct), and relevance gate decisions proved deterministic
from content category in Pass 1.


## Processual Interpretation (Session 85)

Under neutral process monism, the analysis produces a richer
interpretation than classical psychometric agreement:

**Standard interpretation:** Two raters agree on the fixed properties
of texts. Kappa measures how often they identify the same property.

**Processual interpretation:** Two independent processual engagements
with the same texts converge on similar characterizations. Kappa
measures **processual convergence** — whether the same text produces
similar dignity-characterization processes in two independent observers.

**What this changes practically:**

1. **Restricted range becomes signal, not noise.** If most scores cluster
   at +1, this reflects genuine processual regularity — most dignified
   content operates in the "present but not emphasized" zone. The
   instrument correctly identifies that editorial dignity processes
   cluster rather than spread. PABAK adjusts the kappa calculation to
   reflect this.

2. **Disagreement reveals processual divergence.** When raters disagree on
   a dimension, the processual interpretation asks: what about the
   observer's processual history makes this text produce a different
   dignity-characterization process? This converts disagreement from
   "measurement error" into "processual information."

3. **The tri-modal finding (Phase A) reinterprets.** The inversion zone
   (high DI + high PSQ threat) no longer looks paradoxical — the text
   participates in two simultaneous processes (dignity-honoring +
   threat-generating) with different participants. Pass 2 tests whether
   this processual characterization converges between raters.


## Execution Checklist

- [ ] Start fresh Claude session (psychology-agent, Opus)
- [ ] Load ONLY: `docs/dignity-instrument-spec.md` §2-3 (scoring rubric)
- [ ] Do NOT load: `docs/dignity-phase-a-study.md`, any Pass 1 results
- [ ] Score all 50 stories (order: randomize, not stratified)
- [ ] Record: dimension scores, directionality, evidence level per story
- [ ] Compute DI composites
- [ ] Export scores to structured format (CSV or JSON)
- [ ] Run analysis in separate session with both Pass 1 and Pass 2 data
- [ ] Report: kappa per dimension, PABAK, ICC(2,1), gate concordance


## Resources Required

- **Data:** 50 story HN IDs (from Pass 1 sample design)
- **Access:** Observatory API or original URLs for content
- **Software:** scikit-learn (kappa), pingouin (ICC), numpy (PABAK)
- **Sessions:** 2 (one for scoring, one for analysis)
- **Independence:** Scoring session MUST NOT access Pass 1 results


---

⚑ EPISTEMIC FLAGS
- **LLM-to-LLM inter-rater reliability** tests whether two sessions of
  the same model converge — not whether the model agrees with human
  experts. The "raters" share architecture and training, reducing
  independence compared to human inter-rater studies. Pass 2 measures
  **session-to-session stability**, not **model-to-human agreement**.
- **Restricted range risk remains real** despite processual reframing.
  If kappa fails on dimensions where 25+ of 27 stories score +1, PABAK
  provides the appropriate diagnostic — but the restriction itself
  limits what kappa can detect.
- **27-story analytic sample provides limited statistical power** for
  10 separate kappa calculations. Consider reporting confidence intervals
  alongside point estimates.
- **Scoring order effects:** Pass 2 should randomize story presentation
  order (not match Pass 1's stratified order) to reduce systematic
  ordering effects.
- **Content access may differ:** If original URLs changed or HN threads
  accumulated new comments since Pass 1, the content available to Rater
  B differs from Rater A's. Record content access method and timestamp
  for each story.


---

## References

Byrt, T., Bishop, J., & Carlin, J.B. (1993). Bias, prevalence and kappa.
*Journal of Clinical Epidemiology*, 46(5), 423–429.

Hicks, D. (2011). *Dignity: Its Essential Role in Resolving Conflict*.
Yale University Press.

Landis, J.R. & Koch, G.G. (1977). The measurement of observer agreement
for categorical data. *Biometrics*, 33(1), 159–174.
