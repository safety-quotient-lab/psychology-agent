# Adjudicate — Structured Decision Resolution

Resolve ambiguous decisions with 2+ options through iterative knock-on
analysis, multi-axis comparison, and consensus-or-parsimony resolution.

Adjudication is the full decision-making unit: it composes `/knock` (single-
option effect tracing) with iterative learning (2-pass), structured comparison
(differentiating axes), and binding resolution (consensus or parsimony).

```
/knock       = trace effects of ONE option/change through 10 orders
/adjudicate  = 2-pass /knock on EACH option → compare → resolve
```

---

## Arguments

Parse `$ARGUMENTS` to determine scope:

| Argument           | Behavior                                      |
|--------------------|-----------------------------------------------|
| *(empty)*          | Identify the decision from context, adjudicate |
| `[topic]`          | Adjudicate the named decision                  |
| `inline`           | Abbreviated: 4-order, no 2-pass, for S decisions |
| `full`             | Full protocol: 10-order, 2-pass, for M/L decisions |

If scale is not specified, infer from context:
- XS/S decisions → `inline` (4-order knock-on + parsimony + structural scan)
- M/L decisions → `full` (10-order, 2-pass, comparison, consensus/parsimony)

---

## Protocol

### Phase 1: Frame the Decision

1. State the decision clearly in one sentence
2. Identify 2-3 mutually exclusive options (never more than 4)
3. For each option, state it as a concrete action, not a vague direction
4. Classify: is this XS, S, M, or L effort/impact?

### Phase 2: Knock-on Analysis (2-pass for M/L)

For each option, trace effects through 10 orders:

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
                              community, or standards?
 8       horizon              Normative/structural effects —
                              what norms, expectations, or
                              constraints does this establish
                              or erode long-term?
 9       emergent             Properties arising from interaction
                              of multiple knock-on chains — not
                              predictable from individual orders
                              in isolation (INCOSE)
 10      theory-revising      Effects that falsify or require
                              modification of the theory that
                              justified the original decision
                              (Popper)
─────────────────────────────────────────────────────────────────
```

**Pass 1:** Trace all options through 10 orders. Identify which risks,
benefits, and trade-offs actually differentiate the options.

**Pass 2 (M/L only):** Re-trace with calibration from Pass 1. Tighten
confidence labels. Focus on axes where options diverge. Downgrade risks
that Pass 1 revealed to be manageable. Upgrade risks that Pass 1 revealed
to be more serious than initially estimated.

**Structural checkpoint (mandatory at all scales):**
Even for XS/S decisions with abbreviated depth (3-4 orders), always scan
orders 7-10 as a checklist:
- Does this set a precedent? (7: structural)
- Does this affect the open-source trajectory? (7: structural)
- Does this establish or erode a norm? (8: horizon)
- Does this constrain or enable future decisions by others? (8: horizon)
- Do multiple knock-on chains interact to produce unpredicted effects? (9: emergent)
- Does this change the theory or framework that justified the decision? (10: theory-revising)

If the scan surfaces something, elaborate. If not, note "no structural
effects" and proceed.

### Phase 3: Compare

Build a comparison table. Choose axes that **differentiate** the options —
not axes where all options score the same.

```
|                     | [Axis 1]  | [Axis 2]  | [Axis 3]  | [Axis 4]  |
|---------------------|-----------|-----------|-----------|-----------|
| **Option A**        | ...       | ...       | ...       | ...       |
| **Option B**        | ...       | ...       | ...       | ...       |
| **Option C**        | ...       | ...       | ...       | ...       |
```

Common useful axes: effort now vs later, reversibility, cognitive overhead,
information preserved, mission alignment, open-source readiness, precedent
quality, simplicity.

### Phase 4: Resolve

**Consensus check:** Does one option win on a clear majority of axes?
→ That option is the resolution. State which axes it wins on.

**Parsimony resolution (no consensus):** When no option dominates, the
simplest option that meets requirements wins. "Simplest" means: fewest
moving parts, least coupling, most reversible, lowest cognitive overhead.
State why the simpler option's trade-offs are acceptable.

**State the resolution explicitly:**
> Resolution: [Option X] — [1-sentence reasoning]

### Phase 5: Structural Implications

After resolution, explicitly state:
- What this decision forecloses (options we can no longer take)
- What this decision enables (options that become available)
- What precedent this sets (for the project, community, or ecosystem)

---

## Severity Tiering

```
 Scale    Elaborated Depth    2-Pass?    Structural Checkpoint
──────────────────────────────────────────────────────────────
 XS       3 orders            No         Scan 7-10 (checklist)
 S        4 orders            No         Scan 7-10 (checklist)
 M        8 orders            Yes        Elaborate
 L        10 orders           Yes        Elaborate
──────────────────────────────────────────────────────────────
```

**When in doubt about scale, round up.** The cost of over-analyzing a
small decision is minutes. The cost of under-analyzing a large decision
is a recovery cycle.

---

## Integration with Cognitive Triggers

| Trigger | How adjudication fires                              |
|---------|-----------------------------------------------------|
| T2      | Bare fork detected → block, run adjudication        |
| T3      | Before any recommendation with 2+ options → adjudicate at appropriate depth |
| T5      | Unresolved M/L decision at phase boundary → adjudicate before proceeding |
| Hunt    | When hunt surfaces choices between approaches → adjudicate |

---

## Output Format

```
## Adjudication: [Decision Title]

**Scale:** [XS/S/M/L]
**Options:** [list]

### Knock-on Analysis

#### Option A: [name]
Pass 1: [10 orders]
Pass 2: [10 orders, calibrated] (M/L only)

#### Option B: [name]
...

### Comparison
[table]

### Resolution
[Option X] — [reasoning]

### Structural Implications
- Forecloses: ...
- Enables: ...
- Precedent: ...
```

---

## Auto-Persist

After completing the adjudication (all phases), **write the full output to disk**:

1. **Filename:** `docs/decisions/YYYY-MM-DD-{slug}.md` where `{slug}` is a
   kebab-case summary of the decision (e.g., `evaluator-instantiation-gate`,
   `license-selection`). Run `date -Idate` for the date.

2. **Content:** The full adjudication output (all phases), prefixed with YAML
   frontmatter:
   ```yaml
   ---
   decision: "{Decision Title}"
   date: "YYYY-MM-DD"
   scale: "{XS/S/M/L}"
   resolution: "{Option X}"
   session: "{Session N}"
   ---
   ```

3. **Routing:** This file is the canonical record. Journal.md may narrate the
   reasoning; architecture.md records the resolved decision; this file preserves
   the full analysis that produced it. All three serve different audiences.

4. **Skip condition:** If the adjudication was `inline` (XS/S) and produced
   fewer than 20 lines of analysis, skip persistence — the overhead exceeds
   the value. Note in conversation: "Inline adjudication — not persisted."

---

## Anti-patterns

- **Adjudicating XS decisions at L depth** — the cost of deciding exceeds
  the cost of doing. If effort is XS, just do it.
- **More than 4 options** — if you have 5+ options, some are redundant or
  can be grouped. Collapse before adjudicating.
- **Adjudicating without reading** — don't adjudicate code architecture
  decisions without reading the code first. Evidence before analysis.
- **Skipping the structural checkpoint** — the whole point of orders 7-10
  is to catch effects that tactical analysis misses. Never skip.
- **Bare comparison without knock-on** — a comparison table without causal
  tracing is opinion, not analysis. The knock-on IS the evidence.
