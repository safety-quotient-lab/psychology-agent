# TODO: LCARS Text Box Conformance — Operations Tab

## Reference Patterns

### Pattern A: Dense Command Dump (Analysis F, Com Link K)
- Gold section header capsule ("COMMAND CODES 43.2")
- Dense monospace text filling full width
- Key terms highlighted in alternating orange/purple
- No borders, no boxes — text floats on void
- Bottom title right-aligned ("SEQUENCE 102.4")
- **Maps to:** Status monologue, activity descriptions

### Pattern B: Structured Multi-Column Table (Ohniaka B3/B4)
- No cell borders — spacing + color create columns
- Column 1: purple (entity names)
- Column 2: purple (classifications)
- Column 3: yellow (identifiers/codes)
- Column 4: white (descriptions)
- Group sections separated by horizontal salmon/tan bars
- **Maps to:** Actions table, decisions table, messages table

### Pattern C: Numbered Entry List (Holodeck Programming)
- Left: numbered capsule label (row anchor)
- Right: description text, ALL CAPS, left-aligned
- Single line per entry, wraps within fixed width
- **Maps to:** Governance decisions panel, trigger list

### Pattern D: Text + Viz Dual Panel (README-sweep)
- Text left, visualization right, equal height
- Text: ALL CAPS, bold, cream/yellow
- Capsule buttons below text, right-aligned
- Subtitle bar between sections
- **Maps to:** Status monologue + sparklines side-by-side

## Changes Needed

1. **Status monologue**: convert from plain `<p>` to Pattern A (gold header capsule
   "MESH STATUS" + dense text with keyword highlighting)

2. **Actions table**: apply Ohniaka colored column CSS — purple agent names, yellow
   tier badges, white descriptions. Add group separator bars between time periods.

3. **Governance decisions**: convert from list to Pattern C — each decision gets a
   capsule label (D85, D86...) on the left, description text right-aligned

4. **Schedule readouts**: already LCARS-style key-value — minor polish: add gold
   section header capsule above

5. **Alpha matrix**: consider pairing with a text summary (Pattern D) — matrix left,
   monologue right

## Additional Notes

- The elbow in the interagent mesh header cell renders upside down — needs fixing
  (separate from text box work)
- ops-session and psy-session need inclusion as recognized identities
- Deliberation tree visualization (not chain) for Engineering cascade
