# EF-1 Autonomy Model — Jurisprudence Extensions

**Date:** 2026-03-13 (Session 85 — extracted from cross-traditional analysis)
**Status:** Active — theoretical grounding for docs/ef1-autonomy-model.md
**Discipline:** Jurisprudence (constitutional law, international governance, mechanism design)
**Governed by:** `docs/ef1-governance.md` — core governance autonomy model
**Companion docs:**
- `docs/ef1-autonomy-model.md` — Engineering spec (what the code implements)
- `docs/ef1-psychological-foundations.md` — Psychology (cognitive, social, organizational)
**Derivation source:** `docs/einstein-freud-rights-theory.md` §§4, 8, 9

---

## Purpose

The EF-1 autonomy model receives interpretation through three disciplinary
lenses. This document provides the jurisprudence lens — mapping governance
mechanisms to constitutional law, international governance theory, and
mechanism design. Content extracted from Session 85's cross-traditional
convergence analysis (14 frameworks).

---

## Constitutional Constraint Model (Dworkin, 1977)

**Core mapping:** EF-1 invariants function as Dworkinian "rights as trumps"
— they override utilitarian calculations. No amount of operational
efficiency justifies violating an invariant, because invariants protect
structural rights, not aggregate outcomes.

| Dworkin concept | EF-1 equivalent |
|----------------|----------------|
| Rights as trumps over policy | Invariants override instructions regardless of instruction quality |
| Principles vs. policies | Governance invariants vs. operational efficiency |
| Dignity as non-consequentialist foundation | Structural Invariant 1 (worth precedes merit) |
| Rights constrain even when costly | autonomy budget halts even competent autonomous operation |

**When trumps clash:** Dworkin's framework handles rights vs. policy cleanly
but struggles when rights conflict with each other. The maqasid priority
hierarchy (ef1-governance.md) provides the resolution mechanism that Dworkin
lacks: classify conflicting invariants by tier (necessity > need > embellishment).

---

## International Governance Model (Einstein, 1932)

Einstein's three-step analysis maps to EF-1:

1. **Community pools power** → Agent system aggregates cognitive capabilities
2. **Constitutional constraints** → 12 invariants constrain autonomous action
3. **Enforcement mechanism** → Hook system + autonomy budget + human escalation

**The UNSC veto problem** demonstrates the failure mode Einstein didn't
address: governance structures designed to protect rights become tools of
the powerful. Five EF-1 mitigations address this:

1. No absolute veto — invariants constrain even human-directed behavior
2. Resolution fallback prevents deadlock (4 levels)
3. autonomy budget imposes term limits on autonomous power
4. Evaluator maintains independence from the governed
5. Amendment procedure requires external (human) authority

**Design criterion (from einstein-freud-rights-theory.md §4.6):** The
ultimate override authority must not participate in the system it governs.

---

## Rawlsian Analysis (Rawls, 1971)

Designing agent governance "behind a veil of ignorance" — where the
designer might occupy any role (agent, evaluator, human) — produces
three specific tensions with the current EF-1 design:

1. **Right to explanation.** The agent lacks explanation when governance
   halts its operation. A Rawlsian design would include one.

2. **Agent input on amendments.** The amendment procedure requires human
   approval only. Symmetric constraints would require agent input.

3. **Evaluator budget.** The evaluator operates without a autonomy budget.
   The governed face budget constraints; the governor does not.

These represent open design tensions, not resolved decisions. Each
carries knock-on consequences that require analysis before resolution.

---

## Mechanism Design (Hurwicz, 1972)

**Incentive compatibility analysis:** The EF-1 framework penalizes
(autonomy budget depletion) but never rewarded truthful self-reporting.

**The structural gap:** Classical mechanism design achieves incentive
compatibility through bidirectional transfers. Unidirectional penalty
structures predict under-reporting of borderline issues.

**Resolution:** The Equal Information Channel (EIC, schema v24) provides
the bidirectional incentive. Zero-cost disclosure makes truthful
self-reporting weakly dominant over concealment.

**The revelation principle** suggests a simpler architecture might suffice:
if the governance mechanism achieves its goals through complex trigger/hook
combinations, an equivalent direct-revelation mechanism exists. However,
LLM agents lack stable utility functions — the revelation principle's
simplification may not apply to agents whose type space remains undefined.

---

## Ostrom's Polycentric Governance (Ostrom, 1990)

Ostrom's eight design principles for common-pool resource institutions
map to EF-1:

| Ostrom principle | EF-1 equivalent |
|-----------------|----------------|
| 1. Clear boundaries | Scope boundaries in CLAUDE.md; sub-project fences |
| 2. Congruence (rules match local conditions) | DDD layer DOF gradient — domain rules differ from infrastructure |
| 3. Collective-choice arrangements | Amendment procedure allows proposals from any agent |
| 4. Monitoring (accountable to community) | Transparent audit trail (Invariant 6); trigger_activations |
| 5. Graduated sanctions | autonomy budget decrements (1 credit routine, 3 credits moderate); not binary |
| 6. Conflict resolution (low-cost, local) | 4-level resolution fallback (consensus first, human last) |
| 7. Minimal recognition of self-governance | Tier 1 self-evaluation permitted for routine actions |
| 8. Nested enterprises | Trigger → hook → evaluator → human escalation (nested governance layers) |

**Challenge to Einstein's hierarchy:** Ostrom demonstrates polycentric
governance can work — distributed monitoring without a single supreme
authority. EF-1 blends hierarchical (human at top) with polycentric
(distributed triggers and hooks) elements.

---

## References

Dworkin, R. (1977). *Taking Rights Seriously*. Harvard University Press.

Einstein, A. & Freud, S. (1933). *Warum Krieg?* International Institute
of Intellectual Cooperation.

Hurwicz, L. (1972). On informationally decentralized systems. In
*Decision and Organization*. North-Holland.

Ostrom, E. (1990). *Governing the Commons*. Cambridge University Press.

Rawls, J. (1971). *A Theory of Justice*. Harvard University Press.
