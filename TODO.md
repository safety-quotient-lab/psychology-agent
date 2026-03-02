# General-Purpose Psychology Agent — TODO

Forward-looking task list only. Completed and emergent work goes to
`lab-notebook.md`, not here. See `lab-notebook.md` for session history.

---

## Reconstruction Handoff (in progress)

- [ ] **Package shipped** — awaiting relay-agent results and `.git/` return.
- [ ] **Import .git/ on return** — original plan (cp -r) is now superseded: this machine
  has `e12828b` on `main`. On receipt of reconstructed `.git/`:
  1. Import reconstructed history to a temporary branch
  2. `git rebase` — rebase `e12828b` onto tip of 3 `[RECONSTRUCTED]` commits
  3. `git push --force-with-lease origin main` — update origin with reordered history
  4. Verify: `git log --oneline` shows 3 [RECONSTRUCTED] + 1 [Session 8] + /cycle commits

---

## Architecture (in progress — other machine context)

- [ ] **Item 1: General agent design** — prompt/identity, routing logic, Socratic
  protocol (dynamic calibration for humans; structural detection + direct mode
  for machine callers)
- [ ] **Item 2: Sub-agent protocol** — how sub-agents plug in, communicate scope,
  and declare validated boundaries
- [ ] **Item 3: Adversarial evaluator** — tiered activation logic, parsimony
  reasoning, overreach detection

---

## Skills

- [ ] **`/knock` as standalone skill** — extract knock-on analysis from `/hunt` Phase 5
  into a dedicated `/knock` skill (callable independently by user or agent). Add:
  domain classification step (Code/Data/Pipeline/Infrastructure/UX/Operational/Product),
  grounding step (verify actual dependencies before tracing orders), cross-domain
  patterns checklist. Update `/hunt` Phase 5 to reference `/knock` rather than
  embedding the protocol inline.

- [ ] **Memory topic-file pattern** — split MEMORY.md into an index file (~60 lines)
  + topic files read on demand. Candidate topics: `cogarch.md` (triggers quick-ref,
  working principles), `decisions.md` (design decisions table), `psq-status.md`.
  Add routing table to `/cycle` Step 7: what changed → which topic file to update.
  Update BOOTSTRAP.md Step 4 to reflect new structure.

---

## PSQ Sub-Agent Integration

Managed in safety-quotient/ context. Do not duplicate here.
Blocking: API surface, confidence calibration, scope boundaries.

---

