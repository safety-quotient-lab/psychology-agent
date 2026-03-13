# Thorough Scoring — Self-Consistency Confidence via Multi-Pass

**Status:** Proposed (Session 85, 2026-03-13)
**Derives from:** L4 (Confidence ≠ Accuracy), LLM confidence literature review
(2024-2025), `docs/einstein-freud-rights-theory.md` §10.13 (processual measurement)
**Replaces:** LLM self-reported `confidence` field in machine-response/v3 schema

---

## Problem

The PSQ scoring prompt currently asks the LLM to report both a score AND a
confidence per dimension. The 2024-2025 literature confirms what L4 identified
empirically: LLM self-reported confidence scores exhibit ~30% miscalibration,
systematic overconfidence, and minimal discrimination between correct and
incorrect answers (Guo et al., 2024; Yang et al., 2024). Overconfidence
compounds in LLM-as-judge settings (our exact use case).

Self-consistency — scoring the same text multiple times and measuring agreement
— outperforms verbalized confidence across all benchmarks tested (Xiong et al.,
2024 ICLR 2025).

## Design

A `--thorough N` flag controls multi-pass self-consistency scoring:

| N | Passes | Confidence | Cost | Use case |
|---|--------|-----------|------|----------|
| 0 | 1 (current behavior) | None — single-pass score only | 1× | Production, bulk scoring, real-time API |
| 1 | 2 | Basic consistency check (agree/disagree) | 2× | Quick verification of edge cases |
| 3 | 4 | Mean ± SD per dimension. SD = inverse confidence. | 4× | Research, calibration studies, publication-grade |
| 5 | 6 | Mean ± SD + IQR. Outlier detection per dimension. | 6× | Psychometric validation, instrument development |

**Confidence metric:** Standard deviation across N+1 independent passes.
Low SD = high consistency = high empirical confidence. No self-report needed.

```
thorough=0:  score = [7.2]                    → report: 7.2
thorough=3:  scores = [7.2, 7.0, 6.8, 7.1]   → report: 7.03 ± 0.17
thorough=5:  scores = [7.2, 7.0, 6.8, 7.1, 6.9, 7.3] → report: 7.05 ± 0.18 (IQR: 6.9-7.2)
```

## Processual Alignment

Under process monism (§10.13), PSQ scores measure processual outcomes, not
fixed properties. Multi-pass scoring makes this explicit: the same text
produces a *distribution* of processual outcomes across independent scoring
events. The mean captures central tendency; the SD captures processual
variability. A text with SD=0.1 generates consistent processes across
engagements. A text with SD=1.5 produces divergent processes — genuinely
ambiguous in its psychoemotional impact.

The "true score" becomes the distribution, not a single number. This aligns
with the processual measurement framework: test-retest reliability measures
process stability, not property consistency.

## Interface

### CLI (agentdb or scoring script)

```bash
# Single-pass (current default)
psq-score --text "..." --thorough 0

# Research-grade (4 passes)
psq-score --text "..." --thorough 3

# Full validation (6 passes)
psq-score --text "..." --thorough 5
```

### API (machine-response/v3 schema extension)

Request:
```json
{
  "text": "...",
  "thorough": 3
}
```

Response (thorough > 0):
```json
{
  "dimensions": {
    "threat_exposure": {
      "score": 7.03,
      "consistency": {
        "passes": 4,
        "scores": [7.2, 7.0, 6.8, 7.1],
        "sd": 0.17,
        "range": [6.8, 7.2]
      }
    }
  }
}
```

Response (thorough = 0, backward compatible):
```json
{
  "dimensions": {
    "threat_exposure": {
      "score": 7.2
    }
  }
}
```

## Scoring Prompt Change

**Remove:** "Rate your confidence (0.0-1.0) in this score."

**Replace with:** Nothing. Each pass produces only a score. Confidence
emerges from cross-pass consistency, not from self-report.

The scoring prompt becomes simpler — one dimension, one score, no
meta-cognitive demand. This reduces prompt complexity and eliminates
the self-report confidence that L4 identifies as unreliable.

## Implementation

| Phase | What | Effort |
|-------|------|--------|
| 1 | Remove confidence from scoring prompt | XS — prompt edit only |
| 2 | Add `--thorough` flag to scoring script/endpoint | S — loop + aggregation |
| 3 | Update machine-response/v3 schema for consistency block | S — schema extension |
| 4 | Calibration study: compare self-consistency SD vs held-out accuracy | M — requires scoring budget |
| 5 | Replace confidence field in existing data with held-out r per dimension | S — retrospective annotation |

## Cost Analysis

At thorough=3 (recommended research default): 4× the scoring cost per text.
For bulk scoring (training data): thorough=0 suffices — the held-out
correlation per dimension already provides population-level confidence.
Multi-pass adds value for individual-text confidence where the question
matters: "how reliable represents THIS particular score?"

## What This Replaces

| Old | New |
|-----|-----|
| LLM self-reports confidence (0.0-1.0) | Multi-pass SD measures consistency empirically |
| Single number claimed by the scorer | Distribution observed across independent scorings |
| Confidence assumed calibrated | Consistency measured, calibration not assumed |
| Prompt asks for meta-cognition | Prompt asks only for the score |


---

⚑ EPISTEMIC FLAGS
- Multi-pass scoring assumes independence between passes. If the model
  deterministically produces the same score (temperature=0), SD=0 for all
  texts — the metric requires stochastic sampling (temperature > 0).
- Cost scales linearly with thoroughness. Budget constraints limit practical
  use in production bulk scoring. The flag's value concentrates in research
  and edge-case verification.
- Self-consistency measures consistency, not accuracy. A model that
  consistently scores wrong produces low SD with wrong scores. Post-hoc
  calibration (isotonic regression on held-out data) remains necessary
  for accuracy — thoroughness addresses precision, not accuracy.

---

## References

Guo, C., et al. (2024). A survey of confidence estimation and calibration
in large language models. *NAACL 2024*.

Xiong, M., et al. (2024). Can LLMs express their uncertainty? *ICLR 2025*.

Yang, D. (2024). On verbalized confidence scores for LLMs. *arXiv:2412.14737*.
