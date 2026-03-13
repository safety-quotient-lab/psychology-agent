# DA Moderator Hypothesis Test Protocol

**Status:** Proposed (Session 85, 2026-03-13)
**Derives from:** `docs/einstein-freud-rights-theory.md` §10.12 (processual PSQ)
**Data source:** Existing v37 dataset (N=4,432 complete cases, 10 dimensions)

---

## Hypothesis

Defensive Architecture (DA) operates as a **boundary-formation meta-process**
(Whitehead's negative prehension) at a different recursive level from the
other nine PSQ dimensions. Removing DA from the factor model and treating
it as a moderating variable should:

1. **Improve model fit** for the remaining 9-dimension model
2. **Preserve or improve criterion validity** for the full instrument
3. **Reveal interaction effects** where DA score amplifies or attenuates
   the predictive power of other dimensions

## Background

The bifactor model (M5, Session 47) found:
- DA g-loading: 0.817 (medium-high, 3rd from lowest)
- DA singleton factor variance: 0.149 (7.9% beyond g)
- DA held-out r: 0.456 (lowest of all 10 dimensions)
- DA criterion prediction: strongest in fixed-authority contexts (CMV: r=.085)

The original "paradox" (weakest EFA loading + strongest criterion predictor)
resolved as a **rotation artifact** — the bifactor model showed DA contributes
reliably to g. The processual reinterpretation (Session 85) proposes a
deeper explanation: DA measures **boundary-formation processes** that
determine what participates in the communicative occasion, operating at the
scope level rather than the content level. This differs from the other nine
dimensions, which measure processes *within* the occasion DA delimits.


## Study Design

### Phase 1: Model Comparison (Factor Structure)

**Model A (baseline):** Current M5 bifactor
- g + 5-item bipolar (TE/HI/AD vs RC/RB) + DA singleton + singletons (ED, CO)
- Established fit: χ²=2256.8, df=27, CFI=0.946, RMSEA=0.129

**Model B (DA removed):** 9-dimension bifactor
- g + 4-item bipolar (TE/HI vs RC/RB) + singletons (ED, CO, CC)
- AD moves to g-only (no longer in bipolar — it loaded at β=0.358, the
  weakest bipolar loading)
- DA excluded entirely from the factor model

**Model C (DA as external covariate):** 9-dimension bifactor + DA regressed
- Same structure as Model B
- DA entered as an observed covariate predicting each dimension's
  factor score (structural regression)

**Comparison criteria:**

| Criterion | Expected if hypothesis holds |
|-----------|----------------------------|
| RMSEA (B vs A) | Should decrease (better fit without DA) |
| CFI (B vs A) | Should increase or hold |
| Δχ² (A vs B) | Non-significant or small (DA contributed little beyond g) |
| DA → factor scores (C) | Significant paths from DA to g and/or specific factors |

**Implementation:**

```python
# semopy specification for Model B (9-dim bifactor, DA removed)
model_b = """
g_psq =~ TE + HI + AD + RC + RB + TC + CC + ED + CO
bipolar =~ TE + HI + RC + RB
ed_f =~ ED
co_f =~ CO
bipolar ~~ 0*g_psq
ed_f ~~ 0*g_psq
co_f ~~ 0*g_psq
ed_f ~~ 0*bipolar
co_f ~~ 0*bipolar
ed_f ~~ 0*co_f
"""

# Model C adds DA as external predictor
model_c = model_b + """
g_psq ~ DA
bipolar ~ DA
"""
```


### Phase 2: Moderation Analysis (Criterion Validity)

Test whether DA moderates the relationship between other dimensions and
external criteria. Use the four existing criterion datasets.

**For each criterion dataset (CaSiNo, CGA-Wiki, CMV, DonD):**

1. **Main effects model:**
   `criterion ~ g_PSQ_9dim + DA`
   (g_PSQ_9dim = unweighted mean of 9 dimensions excluding DA)

2. **Interaction model:**
   `criterion ~ g_PSQ_9dim + DA + (g_PSQ_9dim × DA)`

3. **Dimension-specific interactions (exploratory):**
   For each of the 9 dimensions:
   `criterion ~ dim_i + DA + (dim_i × DA)`

**Comparison criteria:**

| Criterion | Expected if hypothesis holds |
|-----------|----------------------------|
| ΔR² (interaction vs main) | Significant increase from DA × g_PSQ_9dim |
| Interaction direction | DA amplifies criterion prediction in fixed-authority contexts; attenuates in fluid contexts |
| Dimension-specific | DA × AD interaction strongest (both measure power-related processes) |

**Context classification for moderation:**

| Dataset | Authority structure | Expected DA moderation |
|---------|--------------------|-----------------------|
| CaSiNo | Symmetric (peer negotiation) | Weak — authority fluid |
| CGA-Wiki | Asymmetric (editors vs newcomers) | Strong — status contested |
| CMV | Asymmetric (OP holds position authority) | Strong — status fixed |
| DonD | Symmetric (game rules equalize) | Weak — structure externally imposed |


### Phase 3: Processual Validation

If Phases 1-2 support the moderator hypothesis, validate the processual
interpretation through qualitative analysis:

1. Select 20 texts where DA moderates most strongly (10 amplifying, 10
   attenuating)
2. Code the boundary-formation processes in each text:
   - What participants/topics does the text include/exclude?
   - Does the text establish scope explicitly or implicitly?
   - Does the text maintain or dissolve existing boundaries?
3. Test whether boundary-formation coding predicts DA moderation strength
   independently of the DA score itself


## Success Criteria

| Criterion | Threshold | Rationale |
|-----------|-----------|-----------|
| Model B RMSEA | < 0.125 (improvement over 0.129) | Removing DA should improve fit if it operates at a different level |
| DA × g_PSQ_9dim interaction | p < 0.05 in ≥ 2 of 4 datasets | Moderation should replicate across contexts |
| Context-dependent moderation | Stronger in asymmetric (CGA, CMV) than symmetric (CaSiNo, DonD) | Boundary-formation matters more when authority contested |
| Criterion validity preserved | g_PSQ_9dim AUC ≥ g_PSQ_10dim AUC | Removing DA should not degrade prediction |


## Resources Required

- **Data:** Existing v37 scored datasets (already available in PSQ agent)
- **Software:** semopy (Python CFA), statsmodels (moderation regression)
- **Compute:** Laptop-scale — N=4,432 fits in memory trivially
- **Time:** ~2 sessions (Phase 1+2 in one, Phase 3 qualitative in another)


---

⚑ EPISTEMIC FLAGS
- The hypothesis derives from processual reinterpretation, not from
  empirical anomaly. The bifactor model already resolved the DA paradox
  (rotation artifact). The moderator test addresses a *theoretical*
  prediction, not an *empirical* anomaly.
- Fisher Information Matrix issues (non-positive-definite) in semopy
  affect Model A; Model B may inherit or resolve this depending on
  whether DA's removal changes the information structure.
- RMSEA=0.129 baseline already borderline. Improvement may fall within
  noise rather than representing genuine structural improvement.
- Moderation analysis across four datasets with different operationalizations
  of "criterion" makes replication meaningful but not uniform — each
  dataset measures a different outcome.
