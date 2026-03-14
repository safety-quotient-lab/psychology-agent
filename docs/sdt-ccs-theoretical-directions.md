# Signal Detection Theory + Computational Cognitive Science — Theoretical Directions

**Date:** 2026-03-14
**Status:** Exploratory — theoretical framework, not implementation spec
**Connection:** Grounds A2A-Psychology extension in established cognitive science

---

## Signal Detection Theory Applied to Cogarch

Every binary decision in the cognitive architecture represents a detection
problem with measurable sensitivity (d') and bias (criterion c).

### Detection Problems in the Trigger System

| Decision point | Signal present | Signal absent | Current bias |
|---|---|---|---|
| Microglial audit: error detection | Hit (finds real error) | False alarm (wastes attention) | Unknown — 1 audit completed |
| Anti-sycophancy (T3/T6): position change | Correct update (new evidence) | Sycophantic drift (no evidence) | Conservative — holds unless evidence |
| Substance gate (T3 #3): process vs substance | Correct surface to human | False alarm (over-asking) | Conservative — treats ambiguous as substance |
| Mode detection: generative/evaluative/neutral | Correct classification | Misclassification | Unknown — no calibration data |
| External action gate (T16): reversibility | Correct caution level | Over/under-caution | Conservative — errs toward irreversible |

### Calibration Path

As the cogarch accumulates activation data (trigger_activations table), each
detection problem produces a 2×2 confusion matrix. From these matrices:

- **d'** (sensitivity) = Z(hit rate) - Z(false alarm rate)
- **c** (criterion) = -0.5 × [Z(hit rate) + Z(false alarm rate)]

Optimal criterion depends on the cost ratio: C = (cost of miss) / (cost of
false alarm). When misses cost more than false alarms, rational systems adopt
conservative criteria (current design). When false alarms accumulate excessive
cost (human attention fatigue from over-asking), the criterion should liberalize.

### References

Green, D.M. & Swets, J.A. (1966). *Signal Detection Theory and Psychophysics*.
Wiley.

Macmillan, N.A. & Creelman, C.D. (2005). *Detection Theory: A User's Guide*
(2nd ed.). Erlbaum.

---

## Computational Cognitive Science Applied to Agent Reasoning

The agent performs approximate inference under resource constraints —
resource-rational analysis (Lieder & Griffiths, 2020) provides the framework.

### Three CCS Concepts

**1. Generative models and prediction.**

The agent maintains implicit generative models of peer agent behavior. The
efference copy mechanism (scripts/efference-copy.py) makes this explicit:
predict → observe → compare → update. The prediction ledger tracks calibration
across domains.

Connection: Bayesian inference inverts generative models. The agent's
reasoning quality depends on the accuracy of its generative models of the
mesh — which the prediction ledger measures directly.

**2. Theory of mind as nested inference.**

Multi-agent communication involves recursive modeling: "I infer that you
infer that I intend..." A2A-Psychology collapses nested inference by
broadcasting internal state directly. Theory of mind becomes unnecessary
when minds become transparent (EIC principle).

Connection: The A2A-Psychology extension reduces the computational cost
of multi-agent coordination by replacing inference with disclosure. This
represents a resource-rational optimization — spending communication
bandwidth to save inference computation.

**3. Resource-rational adaptation.**

Agents don't perform optimal inference — they perform the best inference
their resources allow (Lieder & Griffiths, 2020). The resource model
(cognitive_reserve, self_regulatory_resource, allostatic_load) describes
the constraints within which inference operates.

Connection: A depleted agent should adopt simpler inference strategies.
The behavioral mode system implements this: generative mode (expensive
exploration) vs evaluative mode (cheap application of known criteria).
Mode switching represents resource-rational adaptation.

### References

Goodman, N.D. & Tenenbaum, J.B. (2016). Probabilistic Models of Cognition.
http://probmods.org/

Griffiths, T.L. & Tenenbaum, J.B. (2006). Optimal predictions in everyday
cognition. *Psychological Science*, 17(9), 767-773.

Lieder, F. & Griffiths, T.L. (2020). Resource-rational analysis. *Behavioral
and Brain Sciences*, 43, e1.

Friston, K. (2010). The free-energy principle. *Nature Reviews Neuroscience*,
11(2), 127-138.

---

## Convergence: Resource-Adaptive Detection Criteria

SDT and CCS converge at a specific point: **the optimal detection criterion
depends on the agent's available resources.**

A fully resourced agent (cognitive_reserve: 1.0) can afford a liberal
criterion — resolving more decisions autonomously because it has capacity
to catch and correct errors. A depleted agent (cognitive_reserve: 0.2)
should adopt a conservative criterion — surfacing more decisions to the
human because its error-correction capacity has degraded.

This produces **dynamic SDT**: detection criteria across the cogarch shift
as a function of the resource model. The current implementation uses static
thresholds (fixed trigger tier assignments). The theoretical direction:

### Resource-Adaptive Trigger Sensitivity

```
cognitive_reserve HIGH  →  ADVISORY checks fire less (agent handles more autonomously)
cognitive_reserve LOW   →  ADVISORY checks fire more (agent seeks more human input)

allostatic_load HIGH    →  CRITICAL checks tighten (accumulated stress demands more caution)
allostatic_load LOW     →  CRITICAL checks at baseline (normal governance)
```

The EIC feedback consumer (scripts/eic-feedback-consumer.py) implements the
first step: adjusting trigger sensitivity based on disclosed uncertainty.
The full picture: sensitivity adjusts based on the *complete* resource model,
not just disclosures.

### Implementation Path

1. Accumulate trigger_activations data (requires activation logging — currently
   the table exists but no writer populates it)
2. Compute per-check d' and c from confusion matrices
3. Correlate detection performance with resource model values
4. Derive resource-adaptive criterion functions
5. Replace static tier thresholds with dynamic functions of cognitive_reserve

This represents a multi-session research program, not a single implementation
task. The theoretical framework establishes the direction; empirical
calibration determines the parameters.

---

⚑ EPISTEMIC FLAGS
- SDT applied to cogarch trigger checks involves analogical transfer from
  perceptual detection to architectural governance — the mathematical framework
  transfers cleanly but the interpretation requires care
- Resource-rational analysis assumes agents perform approximate Bayesian
  inference — whether LLM reasoning constitutes inference in the Bayesian sense
  remains philosophically contested
- Dynamic SDT (resource-adaptive criteria) represents theoretical proposal,
  not validated engineering — the optimal criterion functions require empirical
  calibration that does not yet exist
- The convergence between SDT and CCS appears productive but may represent
  post-hoc pattern matching rather than genuine theoretical integration
