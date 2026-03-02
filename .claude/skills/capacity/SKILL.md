# /capacity — Cognitive Architecture Capacity Assessment

Assess remaining capacity across every constrained dimension of the cognitive
architecture. Run at session start, when approaching a new phase of work, or
when the system feels crowded.

---

## Dimensions to Assess

### 1. MEMORY.md (hard constraint)

```bash
wc -l ~/.claude/projects/-home-kashif-projects-psychology/memory/MEMORY.md
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
wc -l /home/kashif/projects/psychology/CLAUDE.md
```

Advisory limit ~200 lines. Holds stable conventions — grows slowly.
Report: `N lines used (~M available before advisory limit)`

### 3. cognitive-triggers.md (practical constraint)

```bash
wc -l ~/.claude/projects/-home-kashif-projects-psychology/memory/cognitive-triggers.md
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
```

For each trigger, assess: does it cover its moment reliably? Are there
common moments in recent sessions that had no firing trigger?

Known gap candidates to check:
- Session approaching end (persist everything)
- Mistake caught by user (distinct from pushback)
- External standard consulted (term collision check)

### 5. Design Decisions Space

Count rows in the Design Decisions table in MEMORY.md.
Each row costs ~2–3 lines. At current MEMORY.md size:
`remaining_lines / 2.5 ≈ capacity for new decisions`

### 6. Skills Inventory

```bash
ls /home/kashif/projects/psychology/.claude/skills/
```

List skills, note which need restart to load (created mid-session).
Check CLAUDE.md Skills section is current.

### 7. Lessons.md Health

```bash
wc -l /home/kashif/projects/psychology/lessons.md
grep -c "^## " /home/kashif/projects/psychology/lessons.md
```

No hard limit, but large lessons.md becomes harder to scan.
Above ~30 entries: consider whether any lessons have been fully
internalized and could be archived.

---

## Output Format

```
## Capacity Assessment — YYYY-MM-DDTHH:MM TZ

### Hard Constraints
MEMORY.md:              NNN / 200 lines  [NN remaining | status]
CLAUDE.md:              NNN lines        [~NN available]
cognitive-triggers.md:  NNN lines        [~NN before ceiling]

### Trigger Coverage
Active triggers: T1–T12 (12 total)
Coverage gaps:  [list or "none identified"]
Recommended:    [any new triggers worth adding]

### Design Decisions Space
Current decisions: N rows (~NN lines)
Remaining MEMORY.md capacity: ~NN decisions before pressure

### Skills
Loaded: /doc  /hunt  /cycle  /capacity
Mid-session (need restart): [list or "none"]

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
