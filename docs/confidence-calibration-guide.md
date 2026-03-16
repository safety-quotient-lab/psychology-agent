# Confidence Score Calibration Guide

When extracting claims from transport messages or analytical outputs, each claim
carries a confidence score between 0.50 and 1.00. This guide provides calibration
anchors so that confidence scores reflect actual verification likelihood rather
than compressing into a narrow high-confidence band.


## Calibration Anchor Table

| Confidence | Meaning | Expected Verification Rate |
|-----------|---------|---------------------------|
| 0.50 | Coin flip — roughly half of claims at this level should verify | ~50% |
| 0.70 | More likely than not — evidence favors the claim but alternatives remain plausible | ~70% |
| 0.80 | Strong expectation — multiple supporting signals converge | ~80% |
| 0.90 | Near-certain — would surprise the scorer if wrong | ~90% |
| 0.95 | Virtually certain — only exotic failure modes threaten the claim | ~95% |
| 1.00 | Directly observed — no inference involved, first-hand measurement | ~100% |


## Current Problem: Range Compression

Validation analysis (ECE = 0.176, Brier = 0.180, Spearman rho = 0.479) found
that confidence scores cluster in the 0.85-1.00 range. This compression collapses
the continuous scale into a binary signal at approximately 0.91:

- Claims below 0.91 verified at 0%
- Claims above 0.91 verified at 91%

The 0.50-0.85 region goes entirely unused, discarding information about genuine
uncertainty gradations.


## Scoring Instructions

When extracting claims, assign confidence using the **full 0.50-1.00 range**:

1. **Reserve 0.95+ for directly observed facts.** The claim restates something
   measured or witnessed without inferential steps. Example: "The schema version
   number reads v32" (directly observable in the file).

2. **Use 0.70-0.85 for inferences.** The claim follows from evidence through
   reasoning steps that could fail. Example: "The naming reform likely resolved
   the discovery URL mismatch" (inference from commit history).

3. **Use 0.50-0.70 for speculative claims.** The claim extends beyond available
   evidence or relies on assumptions that remain untested. Example: "Power-law
   distribution probably governs session length" (hypothesis, not yet tested).

4. **Never default to 0.90.** If you catch yourself assigning 0.90 without
   deliberation, pause and evaluate which tier above actually fits.


## Validation Reference

These findings come from `scripts/validate-epistemic-calibration.py` run against
the claims table in state.db:

- **Expected Calibration Error (ECE):** 0.176 — moderate miscalibration
- **Brier score:** 0.180 — above random (0.25) but below useful threshold (0.15)
- **Spearman rho:** 0.479 — confidence ranks correlate moderately with outcomes
- **Diagnosis:** Overconfident — mean confidence exceeds overall accuracy by >10%

The `--calibrate` flag on the validation script applies isotonic regression
post-hoc to show what well-calibrated scores would look like given the same data.


## References

Gneiting, T., & Raftery, A. E. (2007). Strictly proper scoring rules, prediction,
and estimation. *Journal of the American Statistical Association*, 102(477), 359-378.

Zadrozny, B., & Elkan, C. (2002). Transforming classifier scores into accurate
multiclass probability estimates. *Proceedings of KDD*, 694-699.
