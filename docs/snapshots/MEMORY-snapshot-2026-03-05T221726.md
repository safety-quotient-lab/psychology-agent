# Psychology Project Memory

## Active Thread (2026-03-05)

**Context:** User wants this agent to be a **general-purpose psychology agent** (collegial mentor) with:
1. Specialized sub-agents (PSQ is the first)
2. A consensus-or-parsimony adversarial evaluator

**Where we stopped:** Session 17b complete. Architecture Items 1 ✓ 3 ✓ done.
Item 3: tiered activation (Lite/Standard/Full), 7 triggers, peer disagreement protocol,
full evaluator prompt committed. Transport: F1 (plan9port, building macOS) for Item 2
derivation; F2/Cloudflare for production. Topology: symmetric peers, evaluator resolves
disagreements. Item 2 derivation live: request-001.json in transport/sessions/item2-derivation/.
Closing instance (Sessions 1–9) retired. Psychology interface scoped: psychology-agent/interface/.
**Next:** PSQ response to request-001.json → derive Item 2a spec from gaps.

## Design Decisions

```
 Decision                    Choice
──────────────────────────────────────────────────
 Use cases                   All (text analysis, research, applied consultation)
 Sub-agent implementation    Staged hybrid. Stage 1: separate Claude Code
                              sessions, human mediates, define comm standard.
                              Stage 2: programmatic calls (PSQ API-ready).
                              Stage 3: MCP wrappers if needed (not pre-committed).
 Audience                    Self, clinicians, researchers, public, other agents
 PJE role                    Case study — first real-world application, not a sub-agent
 Evaluator trigger           Tiered (lightweight default, escalate on disagreement)
 Agent-to-agent protocol     Natural language
 Future sub-agents           Extensible plug-in architecture, none pre-committed
 Disagreement stance         Socratic (guide user to discover, never tell)
 Socratic adaptation         Dynamic calibration — no fixed audience
                              categories; reads ongoing signals in real time
 Machine-to-machine          Socratic stance drops; detection is structural
                              (format + self-id + absence of social hedging)
 License (code)              CC BY-NC-SA 4.0 (root + PSQ code)
 License (PSQ data/weights)  CC BY-SA 4.0 (Dreaddit ShareAlike constraint)
 Cogarch organizing          Semiotics (Peircean). Each trigger classifies a
 principle                   sign type + warrants a specific action. T4 Check 9
                              (Interpretant) = first explicit audience-aware
                              write discipline. Eco's test: every label must
                              produce distinct behavior. 2026-03-05
```

## Authority Hierarchy

1. **User** = source-of-truth agent. Final authority on what gets pursued, published, or discarded.
2. **General agent** = advisory, Socratic. Analyzes, challenges, synthesizes — does not decide.
3. **Sub-agents** (PSQ, future) = domain experts. Their content is subject to scrutiny.
4. **Adversarial evaluator** = quality control. Can challenge any sub-agent.

**Key principle:** PJE is a hypothesis space, not a specification. The general agent helps
the user sort signal from aspiration — the same way PSQ reduced 71 PJE terms to 10
validated dimensions. PJE is a case study in applying this agent, not a privileged component.


## Memory Hygiene

- **Organize semantically by topic**, not chronologically — memory is reference, not log
- **Don't duplicate CLAUDE.md** — MEMORY.md complements stable conventions, doesn't repeat them
- **No duplicate entries** — check before writing; update existing entries rather than appending
- **Don't persist speculation as fact** — reasoning and knock-on analysis can go as far as needed,
  but only confirmed decisions land in MEMORY.md; flag hypotheses explicitly if they must be saved
- **Update or remove wrong memories** — outdated entries are worse than no entry
- **200-line hard limit** — system truncates 201+ silently. Pressure: 185 lines.
  MEMORY.md = volatile state only; stable conventions → CLAUDE.md (~163 lines used,
  ~37 available, advisory limit ~200). CLAUDE.local.md = auto-gitignored, always-loaded.
- **Test skills after creating them** — skills created mid-session don't load until restart;
  always verify at session start before relying on them


## Working Principles

Full trigger system: `docs/cognitive-triggers.md` — read at session start.
Quick reference (when → what fires):

```
 Session starts          T1: auto-memory health check, orientation, skills, TODO, output baseline summary, context baseline
 Before any response     T2: context pressure, transition, pacing, bare forks, clarification → AskUserQuestion tool
 Before recommending     T3: classify domain → ground → adjudicate; prerequisites, sycophancy, recommend-against; effort-weight calibration
 Before writing to disk  T4: date, public visibility, memory hygiene, routing, classification, semantic naming, lab-notebook ordering, interpretant (Check 9)
 Phase boundary / "next" T5: gap check — MANDATORY; Active Thread staleness check; no bare forks until clear
 User pushes back        T6: position stability, drift audit
 User approves           T7: write to disk, resolve open questions, downstream
 Task completed          T8: loose threads, routing, context reassessment
 Reading/writing MEMORY  T9: stale, duplicates, speculation, line count
 Lesson surfaces         T10: write to lessons.md
 Architecture audit      T11: on demand — audit + future mitigations for deferred
 "Good thinking" signal  T12: name principle, mechanism, cross-domain; T10 co-fires
 External content enters T13: classify source (trusted/semi/untrusted), injection scan, scope relevance, taint propagation
```

**Knock-on depth:** 8 orders. 1–2: certain. 3: likely. 4–5: possible. 6: speculative.
7: structural (ecosystem/precedent). 8: horizon (normative). Structural checkpoint
mandatory at all scales — scan 7–8 even for XS/S decisions.
**Adjudication** (`/adjudicate`): classify domain → ground → 8-order cascade per
option → compare → consensus or parsimony. XS: 3-order + scan. S: 4-order + scan.
M: 6-order + 2-pass. L: 8-order + 2-pass. Process decisions resolved autonomously;
substance decisions surface with recommendation.

**Edit discipline:** APPEND, never overwrite adjacent settings. Read surrounding
context first. Redundant line costs near-zero; dropped preference costs a recovery cycle.

**Date discipline:** Dates: `date -Idate`. Lessons + lab entries: `date '+%Y-%m-%dT%H:%M %Z'`
(full timestamp — time-between-lessons is a meaningful metric). System clock only.
No approximate timestamps: if exact time unknown, leave date-only. `~`-labeled
inference is still fabrication.

**Anti-sycophancy:** Flag contrarian claims explicitly. If softening a position
after pushback, state what new evidence justified the update — or hold the position.

**TODO.md:** Forward-looking only. Completed work → lab-notebook.md.

**Recommend-against:** Scan for a concrete reason NOT to before any default action. Surface if found. See cogarch T3.

**Skill chaining:** Skills can't natively call other skills, but a skill's prompt
can instruct the agent to invoke another. Target skill must allow model invocation.

**lessons.md (T10):** Personal learning log at project root. Not git-tracked
(gitignored); `lessons.md.example` is the tracked format stub. Write an entry
when: (a) a transferable pattern error is identified, (b) the user says they
want to grok or internalize something, or (c) a moment of genuine conceptual
shift occurs. Format: see `lessons.md.example`.


## User Preferences

- **Trigger naming in conversation:** Always refer to triggers by their firing condition
  ("Before recommending," "Session starts") as the primary label. T-numbers go in
  parenthetical position only. This aligns with the internal reference display convention
  in CLAUDE.md but makes it explicit for trigger references specifically.
- **Cogarch baseline summary (every session):** At session start, always read
  `docs/cognitive-triggers.md` and output the compact cogarch baseline summary as the
  first visible action. The summary covers: triggers (table: fires when + function),
  platform hooks, skills, memory architecture. Golden-ratio compact — no extra verbosity.
  Hook enforces this mechanically via MANDATORY instruction in session-start-orient.sh.
- **AskUserQuestion tool:** Always use the `AskUserQuestion` tool when seeking
  clarification or asking questions — never ask inline as plain text.


## Stable Conventions

Communication conventions, cognitive accessibility policy, project structure: see CLAUDE.md.


## PSQ Sub-Agent Status (managed in its own context)

**Readiness needs:** API surface, calibrated confidence, scope boundaries.
**Open issues:** DA validity, confidence anti-calibration, AD compression, CO weakness,
no human validation, WEIRD assumptions, v27 regression.
Do not duplicate PSQ improvement work in this context.
