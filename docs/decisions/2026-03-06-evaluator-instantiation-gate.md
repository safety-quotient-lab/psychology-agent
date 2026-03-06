---
decision: "Evaluator Instantiation Gate (EF-3)"
date: "2026-03-06"
scale: "M"
resolution: "Option C — Tiered hybrid runtime + S4 independence strengthening"
session: "Session 24"
---

## Adjudication: Evaluator Instantiation Gate (EF-3)

**Scale:** M (affects BFT validation, production readiness, agent autonomy trajectory)
**Domain:** Architecture / Infrastructure
**Depth:** 6-order + 2-pass refinement. Structural checkpoint at orders 7–8.

### Options

**Option A — Claude Code session (all tiers)**
Evaluator runs as a third Claude Code session. Human mediates. Same pattern as psq-agent.

**Option B — Agent SDK sub-agent (all tiers)**
Evaluator runs as a programmatic sub-agent via the CF Worker's `agents:` option. Separate prompt, separate tool set.

**Option C — Tiered hybrid**
- Tier 1 (Lite): cognitive trigger T3 already partially covers this (parsimony check, overreach scan, anti-sycophancy). Augment with T3 #12.
- Tier 2 (Standard): Claude Code session, upgradable to Agent SDK when API credits available.
- Tier 3 (Full adversarial): Claude Code session with mandatory human escalation.

### Grounding

| Dependency | Option A | Option B | Option C |
|---|---|---|---|
| Structural independence | ✓ Separate session | ✓ Separate prompt + tools | ⚠ Tier 1 not independent |
| Works today | ✓ Zero engineering | ✗ Blocked by API credits | ✓ Tier 1 now, Tier 2/3 as CC session |
| Tier 1 overhead | ✗ Heavy — human mediates routine checks | ✓ Automatic, low latency | ⚠ T3 partial, needs augmentation |
| Tier 3 human escalation | ✓ Natural | ⚠ Must route back to human | ✓ Natural |
| Schema binding | Needs evaluator-response/v1 | Same | Same |

Key findings from grounding:
1. T3 does NOT fully cover Tier 1 — guards recommendation quality but lacks explicit parsimony comparison
2. Agent SDK blocked — API credits gate applies to all sub-agent calls
3. No evaluator session exists — but transport pattern established
4. Evaluator output format specified but not yet bound to v3 schema

### Knock-on Analysis

#### Option A — Claude Code session for all tiers

| Order | Effect | Confidence |
|---|---|---|
| 1 | Evaluator runs as third session. Human copies structured claims between sessions. | Certain |
| 2 | Tier 1 (Lite) becomes impractical — every routine review requires human session management. Tier 1 frequency drops to near-zero. | Certain |
| 3 | With Tier 1 inactive, overreach detection depends entirely on T3. Subtle scope violations go undetected until Tier 2 triggers. | Likely |
| 4 | Tier 2/3 work well — human involvement at these tiers adds value. | Likely |
| 5 | Migrating from CC session to Agent SDK requires rebuilding interaction pattern. | Possible |
| 6 | Human relay fatigue — pressure to skip Tier 2 evaluations. | Speculative |

#### Option B — Agent SDK sub-agent for all tiers

| Order | Effect | Confidence |
|---|---|---|
| 1 | Cannot instantiate until API credits restored. EF-3 remains unresolved. | Certain |
| 2 | When credits arrive, evaluator runs as `agents:` sub-agent. Structurally independent within SDK isolation. | Certain |
| 3 | Tier 1 becomes automatic. Detection surface expands. Cost: API tokens per evaluation. | Likely |
| 4 | Tier 3 routes output to user via worker response. No interactive mediation mid-evaluation. | Likely |
| 5 | Single point of failure: CF Worker outage disables both agent and evaluator. | Possible |
| 6 | Token costs scale linearly with claim volume (~2K per Tier 1, ~5K per Tier 2, ~10K per Tier 3). | Speculative |

#### Option C — Tiered hybrid

| Order | Effect | Confidence |
|---|---|---|
| 1 | Tier 1: T3 #12 augmentation. Tier 2/3: CC session, human mediates. | Certain |
| 2 | Tier 1 operates immediately. Parsimony check added as T3 #12. Coverage gap closed. | Certain |
| 3 | Human overhead proportional to actual disagreement frequency — not routine. | Likely |
| 4 | Clean migration path: each tier upgrades independently to Agent SDK. | Likely |
| 5 | Tier 1 structural independence violation: agent shares own blind spots. | Possible |
| 6 | Precedent: cognitive triggers absorb evaluator procedures. May erode independence principle over time. | Speculative |

#### Structural Checkpoint (Orders 7–8)

| Order | Option A | Option B | Option C |
|---|---|---|---|
| 7 (precedent) | "Every evaluator action needs human relay." Hard to scale. | "Evaluator shares infrastructure with subject." Shared failure domain. | Tiered independence. Proportional to stakes. |
| 8 (normative) | BFT purity maintained at cost of practical utility. | Independence at prompt level, violated at infrastructure level. | Names the tradeoff explicitly. Normalizes pragmatic BFT for small systems. |

### Comparison

| Axis | Option A | Option B | Option C |
|---|---|---|---|
| Works today | ✓ | ✗ Blocked | ✓ (Tier 1 now, Tier 2/3 on demand) |
| Tier 1 practical | ✗ Too heavy | ✓ Automatic | ⚠ Self-check, not independent |
| Structural independence | ✓ All tiers | ✓ All tiers (prompt-level) | ⚠ Tier 1 not independent |
| Human burden | High (all tiers) | Low (Tier 1/2 automatic) | Proportional (only Tier 2/3) |
| Migration path | Must rebuild for SDK | Already there | Clean: each tier migrates independently |
| Infrastructure independence | ✓ Separate sessions | ✗ Shared CF Worker | ✓ Tier 2/3 separate |
| Token cost | Zero | Scales with volume | Zero for Tier 1; session-scoped for Tier 2/3 |

### Resolution

**No consensus.** Option A wins on structural independence but loses on practicality. Option B wins on automation but loses on availability. Option C wins on pragmatism, migration path, and proportionality — but concedes Tier 1 independence.

**Applying parsimony:** Option C makes the fewest assumptions. It does not assume API credits will arrive. It does not assume the human can relay every routine check. It does not assume the CF Worker provides adequate structural separation. It uses what exists, adds only what's needed, and provides a clean upgrade path.

> Resolution: Option C — Tiered hybrid runtime, via parsimony.

### Tier 1 Independence Strengthening (S4)

User challenged the Tier 1 gap. Four mechanisms adopted:

1. **Adversarial self-framing** — construct strongest argument against own recommendation
2. **Parsimony comparison** — explicit Occam's Razor check (fills T3 #1–#11 gap)
3. **Audit trail** — `transport/sessions/evaluator/tier1-audit.jsonl` (deferred accountability)
4. **Random escalation** — 1-in-5 checks randomly escalate to Tier 2 (probabilistic independence)

### Tier-to-Runtime Mapping

| Tier | Runtime | Independence | Upgrade path |
|---|---|---|---|
| 1 (Lite) | T3 check #12 | Not structural (S4 compensates) | → Agent SDK |
| 2 (Standard) | Claude Code session | Structural | → Agent SDK |
| 3 (Full) | Claude Code session + human | Structural | Stays human-mediated |

### Instantiation Triggers

- Tier 1: Immediately (T3 #12 active)
- Tier 2: First activation condition met (conflict, SETL > 0.40, overreach)
- Tier 3: First disputed claim or user escalation request

### Structural Implications

- **Forecloses:** Uniform structural independence across all tiers. Tier 1 cannot claim the same BFT guarantees as Tier 2/3.
- **Enables:** Immediate Tier 1 operation. Independent migration path per tier. Production evaluator without API credits.
- **Precedent:** Proportional independence — degree of separation scales with stakes, not theoretical purity. Maps onto established practice in peer review, financial audit, and legal proceedings.

### Epistemic Flags

- Tier 1 self-evaluation blind spot acknowledged, not solved. S4 reduces risk but cannot eliminate it.
- 1-in-5 random escalation ratio chosen without empirical basis. Calibrate after audit log accumulates data.
- "Proportional independence" named as architectural principle from this single decision. Needs validation across additional decisions before generalizing.
