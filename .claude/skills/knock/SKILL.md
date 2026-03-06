# Knock — Single-Option Effect Tracing

Trace the effects of ONE option, change, or decision through 10 orders of
knock-on analysis. This skill produces the evidence that `/adjudicate` uses
when comparing multiple options — but it runs independently for single-option
analysis, impact assessment, or pre-decision exploration.

```
/knock       = trace effects of ONE option/change through 10 orders
/adjudicate  = 2-pass /knock on EACH option → compare → resolve
```

---

## Arguments

Parse `$ARGUMENTS` to determine scope:

| Argument        | Behavior |
|-----------------|----------|
| *(empty)*       | Identify the change or option from conversation context |
| `[topic]`       | Trace knock-on effects for the named change |
| `inline`        | Abbreviated: 4 orders + structural scan (7–10) |
| `full`          | Full depth: all 10 orders elaborated |

Default depth: infer from apparent scale. Small/tactical changes → `inline`.
Architecture decisions, policy changes, or anything affecting multiple files → `full`.

---

## Protocol

### Step 1: State the Change

One sentence describing the specific change being traced. Not vague ("improve X")
— concrete ("add route Y to worker.js" or "extend depth from 8 to 10 orders").

### Step 2: Classify the Domain

| Domain | Signal | Primary effect vectors |
|---|---|---|
| **Code** | file changes, API surfaces, dependencies | builds → tests → deploys → users |
| **Data** | schema, model, training data changes | pipeline → scores → downstream consumers |
| **Pipeline** | CI/CD, build, deploy changes | reliability → velocity → trust |
| **Infrastructure** | hosting, transport, networking | availability → latency → cost |
| **UX** | interface, accessibility, communication | perception → adoption → feedback |
| **Operational** | process, workflow, documentation | velocity → consistency → knowledge |
| **Product** | features, scope, direction | users → market → mission alignment |

### Step 3: Ground the Analysis

Before tracing orders, verify actual dependencies:

- Read relevant files or sections that the change touches
- Identify what directly depends on the changed thing
- Identify what the changed thing depends on
- Note any assumptions that would change the analysis if wrong

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
 7       structural           Ecosystem/precedent effects —
                              how does this shape what others do?
                              What precedent for open-source,
                              community, or standards? (PMBOK)
 8       horizon              Normative/structural effects —
                              what norms, expectations, or
                              constraints does this establish
                              or erode long-term?
 9       emergent             Properties arising from interaction
                              of multiple knock-on chains — not
                              predictable from individual orders
                              in isolation (INCOSE SE Handbook,
                              ISO/IEC 15288)
 10      theory-revising      Effects that falsify or require
                              modification of the theory that
                              justified the original decision
                              (Popper, 1959)
─────────────────────────────────────────────────────────────────
```

**Output format:**

```
**Knock-on analysis (10 orders) — [change label]:**

**1. [Label]** *(certain)*          — [direct immediate effect]
**2. [Label]** *(certain–likely)*   — [what systems/files activate]
**3. [Label]** *(likely)*           — [what consumes Order 2's outputs]
**4. [Label]** *(likely–possible)*  — [aggregate effects]
**5. [Label]** *(possible)*         — [what humans observe or trust]
**6. [Label]** *(speculative)*      — [compounding over time]
**7. [Label]** *(structural)*       — [ecosystem/precedent effects]
**8. [Label]** *(horizon)*          — [normative long-term effects]
**9. [Label]** *(emergent)*         — [cross-chain interaction effects]
**10. [Label]** *(theory-revising)* — [effects that modify justifying theory]
```

**For `inline` mode:** Trace orders 1–4, then scan 7–10 as a checklist:
- Does this set a precedent? (7)
- Does this establish or erode a norm? (8)
- Do multiple chains interact unpredictably? (9)
- Does this change the theory behind the decision? (10)

Elaborate only if the scan surfaces something. Otherwise note "no structural effects."

### Step 5: Surface Mitigations and Assumptions

After the cascade:

- **Key mitigations:** actions that would reduce negative effects at orders 4+
- **Assumptions:** conditions the analysis depends on; state what would change
  if the assumption broke
- **Cross-domain patterns:** does this change echo a pattern from another domain?
  (Name the pattern if so — T12 may co-fire)

### Step 6: Recommend-Against Scan (T3)

Before presenting the analysis, scan for a concrete reason NOT to proceed with
this change. Vague concern does not count — only specific, articulable objections.
If found, surface the objection. If not, note "no recommend-against signal."

---

## Integration

| Context | How /knock fires |
|---|---|
| `/hunt` Phase 5 | /hunt invokes /knock for each option when decisions surface |
| `/adjudicate` Phase 2 | /adjudicate runs /knock per option, then compares |
| Standalone | User or agent invokes /knock directly for single-option analysis |
| T3 (Before recommending) | Agent may invoke /knock before making a recommendation |

---

## Confidence Discipline

- **Orders 1–2:** State as fact — direct causal effects
- **Order 3:** "Likely" — based on known, verified dependencies
- **Orders 4–5:** "Possible" — requires compounding; state assumptions explicitly
- **Order 6:** "Speculative" — be honest about confidence
- **Order 7:** "Structural" — ecosystem effects; confidence depends on ecosystem knowledge
- **Order 8:** "Horizon" — normative effects; lowest individual-order confidence
- **Order 9:** "Emergent" — cross-chain effects; confidence depends on completeness
  of individual-order traces. If individual traces are incomplete, Order 9 carries
  compounding uncertainty
- **Order 10:** "Theory-revising" — meta-level; the most consequential finding when
  it occurs, but also the rarest. Most analyses will note "no theory-revising effects
  identified" — this is the expected outcome, not a failure

Never inflate confidence. If an order produces nothing meaningful, say so rather
than fabricating an effect to fill the slot.

---

## Anti-patterns

- **Filling all 10 slots for trivial changes** — a variable rename does not have
  emergent or theory-revising effects. Use `inline` for small changes.
- **Tracing from assumptions instead of dependencies** — read the code/docs first.
  The grounding step exists for a reason.
- **Conflating structural with speculative** — Order 7 (structural) is about what
  precedent this sets for others. Order 6 (speculative) is about how it compounds
  for this project. Different audiences, different effects.
- **Skipping the recommend-against scan** — the whole point of Step 6 is to catch
  the case where the analysis looks good but the change should not happen.
