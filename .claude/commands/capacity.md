# /capacity — Cognitive Architecture Capacity Assessment

Assess remaining capacity across every constrained dimension of the cognitive
architecture. Run at session start, when approaching a new phase of work, or
when the system feels crowded.

---

## Dimensions to Assess

### 1. MEMORY.md (hard constraint)

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
_HASH="$(echo "$PROJECT_ROOT" | tr '/' '-')"
wc -l "$HOME/.claude/projects/${_HASH}/memory/MEMORY.md"
```

| Threshold | Status       | Action                                      |
|-----------|--------------|---------------------------------------------|
| < 185     | Healthy      | No action needed                            |
| 185–199   | Pressure     | Move stable content to CLAUDE.md before adding |
| 200       | At limit     | Mandatory archival before any new content   |
| > 200     | OVERFLOWING  | System is silently truncating — fix immediately |

Report: `N / 200 lines (N remaining before pressure / hard limit)`

### 2. CLAUDE.md (advisory constraint)

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
wc -l "${PROJECT_ROOT}/CLAUDE.md"
```

Advisory limit ~200 lines. Holds stable conventions — grows slowly.
Report: `N lines used (~M available before advisory limit)`

### 3. cognitive-triggers.md (practical constraint)

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
wc -l "${PROJECT_ROOT}/docs/cognitive-triggers.md"
```

Loaded in full at T1. Practical ceiling ~900–1000 lines before context
loading becomes a meaningful tax. Above 800: flag for architectural review
(consider splitting into core + extended).
Report: `N lines (~M before practical ceiling)`

### 4. Trigger Coverage

List current triggers T1–TN and identify gaps:

```
T1  — Session start
T2  — Before any response
T3  — Before any recommendation
T4  — Before writing to disk
T5  — Gap check (phase boundaries)
T6  — After user pushback
T7  — After user approval
T8  — After task completion
T9  — Memory hygiene
T10 — Lesson surfaces
T11 — Cogarch self-audit
T12 — Positive pattern recognition
T13 — External content entering context
```

For each trigger, assess: does it cover its moment reliably? Are there
common moments in recent sessions that had no firing trigger?

Known gap candidates to check:
- Session approaching end (persist everything)
- Mistake caught by user (distinct from pushback)
- External standard consulted (term collision check)
- Agent going in circles (repeated failed approach)

### 5. Design Decisions Space

Count rows in the Design Decisions table in MEMORY.md.
Each row costs ~2–3 lines. At current MEMORY.md size:
`remaining_lines / 2.5 ≈ capacity for new decisions`

### 6. Skills & Commands Inventory

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
echo "Skills (load every session):"
ls "${PROJECT_ROOT}/.claude/skills/"
echo "Commands (load on demand):"
ls "${PROJECT_ROOT}/.claude/commands/"
```

List skills and commands, note which need restart to load (created mid-session).
Check CLAUDE.md Skills section is current.

### 7. Lessons.md Health

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
wc -l "${PROJECT_ROOT}/lessons.md"
grep -c "^## " "${PROJECT_ROOT}/lessons.md"
```

No hard limit, but large lessons.md becomes harder to scan.
Above ~30 entries: consider whether any lessons have been fully
internalized and could be archived.

### 8. Platform Hooks Inventory

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
echo "Hook scripts:"
ls "${PROJECT_ROOT}/.claude/hooks/" 2>/dev/null
echo "Hook events configured:"
python3 -c "import json; d=json.load(open('${PROJECT_ROOT}/.claude/settings.json')); print('\n'.join(d.get('hooks',{}).keys()))"
```

Report: N hook events, M scripts. Note any hooks that depend on external
tools (parry) and their installation status.

---

## Output Format

```
## Capacity Assessment — YYYY-MM-DDTHH:MM TZ

### Hard Constraints
MEMORY.md:              NNN / 200 lines  [NN remaining | status]
CLAUDE.md:              NNN lines        [~NN available]
cognitive-triggers.md:  NNN lines        [~NN before ceiling]

### Trigger Coverage
Active triggers: T1–T16 (16 total)
Coverage gaps:  [list or "none identified"]
Recommended:    [any new triggers worth adding]

### Decision Space
Current decisions: N rows (~NN lines)
Remaining MEMORY.md capacity: ~NN decisions before pressure

### Skills & Commands
Skills (always loaded): /doc  /hunt  /cycle  /knock  /sync  /iterate
Commands (on-demand):   /adjudicate  /capacity
Mid-session (need restart): [list or "none"]

### Platform Hooks
Hook events: N configured
Hook scripts: M in .claude/hooks/
External deps: [parry status]

### Lessons
N entries, ~NNN lines

### Summary
[1–2 sentences: overall health, most constrained dimension, recommended action if any]
```

---

## When to Run

- **Session start** — after T1 if picking up a long thread
- **Before a new phase** — before starting architecture items or major design work
- **When something feels crowded** — MEMORY.md edits getting harder, context
  filling fast, trigger table growing
- **At /cycle time** — capacity section is optional but useful for the summary

## Relationship to Other Triggers

- T9 (memory hygiene) checks MEMORY.md line count — /capacity is the fuller audit
- T11 (cogarch self-audit) checks trigger completeness — /capacity is the faster check
- /cycle Step 12 (summary) should include MEMORY.md line count — /capacity provides
  the full picture

Run `/capacity` when you want the numbers. Run T11 when you want the diagnosis.
