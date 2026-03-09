---
decision: "Bootstrap validation thresholds for adopter portability"
date: "2026-03-09"
scale: "S"
resolution: "Option A — adaptive thresholds"
session: "Session 54"
---

## Adjudication: Bootstrap Validation Thresholds for Adopter Portability

**Scale:** S — single script, focused change, easily reversible. Touches
infrastructure layer (low DOF), so structural checkpoint warranted.

**Options:**
- **A:** Add detection logic to `bootstrap_state_db.py` that lowers
  data-dependent thresholds when transport/sessions is empty (fresh
  install), keeping structural checks only
- **B:** Leave script as-is, rely on adaptation guide documentation to
  explain expected failures

### Knock-on Analysis

#### Option A: Adaptive thresholds

**Order 1 (certain):** Bootstrap script detects empty transport history
and applies relaxed thresholds. Fresh adopters see 9/9 PASS on first
run. Existing psychology-agent behavior unchanged.

**Order 2 (certain–likely):** Verification checklist item becomes
achievable for adopters. Guide no longer needs apologetic footnote.
Adopter's first experience with cogarch tooling produces a clean result.

**Order 3 (likely):** Adopters gain trust in the bootstrap pipeline from
day one. They can use it as a regression test going forward — if they
break something, the checks catch it. Without adaptive thresholds, they
learn to ignore failures, defeating the purpose.

**Order 4 (likely–possible):** As adopters accumulate data, thresholds
scale naturally (sessions detected → full thresholds engage). Risk of a
"second cliff" exists but the detection logic is binary (sessions exist
or not), making the transition predictable.

#### Option B: Document-only

**Order 1 (certain):** No code changes. Guide explains that 7/9 failures
are expected for fresh installs.

**Order 2 (certain–likely):** Adopters see a wall of ✗ marks on first
run. Must distinguish "expected failure" from "real failure" by reading
documentation. Cognitive load shifts from tool to human.

**Order 3 (likely):** Some adopters skip the bootstrap check entirely
because "it fails anyway." Boy-who-cried-wolf problem.

**Order 4 (likely–possible):** Documentation explaining expected failures
becomes stale as the script evolves. Creates coupling between script
thresholds and guide prose — manual synchronization the cogarch avoids.

#### Structural Checkpoint

- **Precedent (7):** A sets the precedent that infrastructure-layer tools
  adapt to deployment context. B sets the precedent that adopters work
  around domain-specific assumptions via documentation.
- **Open-source trajectory (7):** A makes the cogarch more adoptable. B
  signals "not ready for external use" on first run.
- **Norms (8):** A establishes that validation checks degrade gracefully.
- **Theory-revising (10):** B partially undermines the DOF gradient — if
  infrastructure tools require documentation workarounds, they carry
  hidden domain-layer assumptions. The tool isn't truly "low DOF."

### Comparison

|                      | First-run  | Maintenance | DOF integrity | Reversibility | Simplicity |
|----------------------|-----------|-------------|---------------|---------------|------------|
| **A: Adaptive**      | 9/9 PASS  | Low         | Strong        | Full          | Moderate   |
| **B: Document-only** | 7/9 FAIL  | Medium      | Weakened      | N/A           | Simple     |

### Resolution

> **Option A** — The bootstrap script carried domain-specific thresholds
> that violated the infrastructure layer's "inherit as-is" contract.
> Adaptive detection (empty transport → relaxed thresholds) makes the tool
> genuinely portable without adding significant complexity. Implementation:
> detect whether `transport/sessions/` contains any session directories; if
> empty, apply structural-only thresholds (triggers ≥ 1, decisions ≥ 1,
> all others ≥ 0).

### Structural Implications

- **Forecloses:** Using fixed thresholds as a "you must have this much
  data" gate. (Acceptable — served no intentional purpose.)
- **Enables:** Adopters can use bootstrap as a genuine regression test
  from day one. Opens path to config-driven thresholds (cogarch.config.json)
  in the future.
- **Precedent:** Infrastructure-layer tools should adapt to deployment
  context, not assume a specific data profile. Strengthens the DOF
  gradient principle.
