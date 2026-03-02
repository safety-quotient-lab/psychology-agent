# Divergence Report — Reconstruction Halted

<!-- Template used by reconstruct.py and relay-agent when emitting a termination
     signal. Fill in bracketed fields. Do not remove any section. -->

**Session:**       [SESSION_NUMBER]
**content_drift:**   [CONTENT_DRIFT]   ← intersection-only drift (circuit breaker)
**full_tree_drift:** [FULL_TREE_DRIFT] ← full file tree drift (diagnostic)
**delta:**           [DELTA]           ← full_tree_drift − content_drift (measures /cycle additions)
**Threshold:**     [THRESHOLD]
**Generated:**     [TIMESTAMP]

---

## Per-File Divergences

| Type | File | Weight | Description |
|------|------|--------|-------------|
| [TYPE] | `[file/path]` | [W] | [description] |

<!-- Types: ADDITIVE | SUBTRACTIVE | SUBSTITUTIVE -->
<!-- Weights: 3 = CLAUDE.md, docs/architecture.md, memory/cognitive-triggers.md -->
<!--          2 = lab-notebook.md, BOOTSTRAP.md, .claude/skills/cycle/SKILL.md, .claude/skills/hunt/SKILL.md -->
<!--          1 = journal.md, ideas.md, TODO.md, README.md, all others -->

---

## Decision Point

```
RECONSTRUCTION HALTED — Session [N], content_drift = [X.XXXX] (threshold: [Y.YYYY])

Divergences:
  [TYPE] file/path — description

Options:
  A) Accept and continue — annotate commits [DRIFT-ACCEPTED]
  B) Resolve divergences manually and resume from Session [N]
  C) Abort — keep Sessions 1..[N-1], discard partial
  D) Escalate — route SUBSTITUTIVE divergences to adversarial evaluator
```

---

## Divergence Analysis

### ADDITIVE (files only in reconstruction)

<!-- List ADDITIVE files here. These are typically artifacts of /cycle or -->
<!-- reconstruction metadata. Usually safe to accept. -->

### SUBTRACTIVE (files missing from reconstruction)

<!-- List SUBTRACTIVE files here. These indicate content the session produced -->
<!-- that was not captured in reconstruction. Warrants manual review. -->

### SUBSTITUTIVE (content differs)

<!-- List SUBSTITUTIVE files here. These are the primary input to the -->
<!-- adversarial evaluator. Do not resolve unilaterally. -->

---

## Recommendation

[Assessment of best path forward based on divergence classification.
Typical guidance:
- Mostly ADDITIVE → Option A is safe
- SUBTRACTIVE on high-weight files → Option B (resolve manually)
- SUBSTITUTIVE on high-weight files → Option D (adversarial evaluator)
- Score barely exceeds threshold → Option A with [DRIFT-ACCEPTED] annotation
]

---

## Resolution Log

<!-- Record operator decision and outcome here after the decision point resolves. -->

**Operator decision:** [A / B / C / D]
**Resolved:** [TIMESTAMP]
**Notes:** [any follow-on actions taken]
