---
name: knock
description: Single-option 10-order knock-on effect tracing for decisions and changes.
user-invocable: true
argument-hint: "[change to trace | inline | full]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Knock — Single-Option Effect Tracing

Trace the effects of ONE option, change, or decision through 10 orders of
knock-on analysis. Produces evidence that informs decision-making — runs
independently for single-option analysis, impact assessment, or pre-decision
exploration.

---

## Arguments

| Argument | Behavior |
|---|---|
| *(empty)* | Identify the change or option from conversation context |
| `[topic]` | Trace knock-on effects for the named change |
| `inline` | Abbreviated: 4 orders + structural scan (7–10) |
| `full` | Full depth: all 10 orders elaborated |

Default depth: infer from apparent scale. Small/tactical changes → `inline`.
Architecture decisions, policy changes, or anything affecting multiple agents → `full`.

---

## Protocol

### Step 1: State the Change

One sentence describing the specific change being traced. Concrete, not vague.

### Step 2: Classify the Domain

| Domain | Signal | Primary effect vectors |
|---|---|---|
| **Compositor** | UI changes, Web Components, layout | visual → UX → agent visibility → trust |
| **Vocabulary** | Shared terms, schema changes | contracts → agent cards → discovery → interop |
| **Transport** | Sessions, messages, gates | coordination → latency → mesh coherence |
| **Infrastructure** | Deploy, DNS, Workers | availability → cost → reliability |
| **Discovery** | Agent cards, WebFinger, A2A | interop → ecosystem → standards |
| **Governance** | Process, workflow, conventions | velocity → consistency → mesh health |

### Step 3: Ground the Analysis

Before tracing orders, verify actual dependencies:

- Read relevant files or sections the change touches
- Identify what directly depends on the changed thing
- Identify what the changed thing depends on
- Note assumptions that would change the analysis if wrong

Do not trace from assumptions — trace from verified dependencies.

### Step 4: Trace 10 Orders

```
 Order   Confidence           What it captures
─────────────────────────────────────────────────────────────────
 1       certain              Direct, immediate effect
 2       certain–likely       What systems/processes activate
 3       likely               What consumes Order 2's outputs
 4       likely–possible      Aggregate/systemic effects
 5       possible             What humans observe / trust changes
 6       speculative          How it compounds over time
 7       structural           Ecosystem/precedent effects
 8       horizon              Normative/structural long-term effects
 9       emergent             Cross-chain interaction effects
 10      theory-revising      Effects that modify justifying theory
─────────────────────────────────────────────────────────────────
```

**For `inline` mode:** Trace orders 1–4, then scan 7–10 as a checklist:
- Does this set a precedent? (7)
- Does this establish or erode a norm? (8)
- Do multiple chains interact unpredictably? (9)
- Does this change the theory behind the decision? (10)

Elaborate only if the scan surfaces something.

### Step 5: Surface Mitigations and Assumptions

- **Key mitigations:** actions that reduce negative effects at orders 4+
- **Assumptions:** conditions the analysis depends on
- **Cross-domain patterns:** does this echo a pattern from another domain?

### Step 6: Recommend-Against Scan

Before presenting the analysis, scan for a concrete reason NOT to proceed.
Vague concern does not count — only specific, articulable objections.

---

## Confidence Discipline

- **Orders 1–2:** State as fact — direct causal effects
- **Order 3:** "Likely" — based on verified dependencies
- **Orders 4–5:** "Possible" — requires compounding; state assumptions
- **Order 6:** "Speculative" — be honest about confidence
- **Orders 7–8:** Structural/horizon — confidence depends on ecosystem knowledge
- **Order 9:** "Emergent" — cross-chain; carries compounding uncertainty
- **Order 10:** "Theory-revising" — rarest but most consequential

Never inflate confidence. If an order produces nothing meaningful, say so.

---

## Anti-patterns

- **Filling all 10 slots for trivial changes** — use `inline` for small changes
- **Tracing from assumptions instead of dependencies** — read the code first
- **Skipping the recommend-against scan** — the whole point of Step 6
