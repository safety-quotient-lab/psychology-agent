# Rules Filesystem — Cogarch Convention

Rules organize by cognitive function, following the agent's own
architecture rather than external taxonomies.

## Structure

```
.claude/rules/
├── anti-patterns.md          # Universal — always mounted
├── README.md                 # This file
├── domain/                   # Domain-specific (activate by file glob)
│   ├── evaluation.md         # Psychometric methodology
│   ├── javascript.md         # Code conventions
│   ├── lcars.md              # LCARS visual pattern catalog gate
│   ├── markdown.md           # Documentation formatting
│   ├── sqlite.md             # State layer conventions
│   └── transport.md          # Interagent protocol
├── layer/                    # Cognitive layer (activate by agent state)
│   ├── fluid.md              # Gf — novel/deliberative work
│   ├── crystallized.md       # Gc — routine/pattern-matched work
│   └── metacognitive.md      # Gm — reflective/self-monitoring work
└── mode/                     # Behavioral mode (activate by task context)
    ├── generative.md         # Brainstorming, exploring, diverging
    ├── evaluative.md         # Checking, validating, converging
    └── neutral.md            # Building, implementing, fixing
```

## Three Activation Channels

| Directory | Activation | Mechanism |
|---|---|---|
| Root (`anti-patterns.md`) | Every session | Claude Code loads unconditionally |
| `domain/` | File glob match | Claude Code native — `paths` frontmatter |
| `layer/` | Cognitive state | T2 trigger check — agent reads matching rule when determining Gf/Gc/Gm routing |
| `mode/` | Task context | T2 trigger check — agent reads matching rule when detecting generative/evaluative/neutral mode |

Domain rules fire mechanically (file paths). Layer and mode rules
mount deliberately (agent reads them based on its own state assessment).
This maps to the Plan 9 namespace model: three orthogonal namespaces
composed by union at task time.

## Graduation Criteria

A convention becomes a rule when:
1. It attaches to a specific scope (file glob, layer, or mode)
2. AND either: validated across 2+ sessions, OR breaking it produces
   visible defect

Universal conventions stay in CLAUDE.md. Domain-specific conventions
with file affinity crystallize into `domain/` rules. Layer and mode
conventions crystallize when the cognitive pattern stabilizes.

## Self-Modification Protocol (tentative — under observation)

Autonomous rule modification follows a domain-scoped policy with
tag-and-notify governance. Configurable per directory.

### Domain rules (`domain/`)

Autonomous `claude -p` sessions MAY create or modify domain rules.
Every autonomous change MUST include governance frontmatter:

```yaml
---
proposed_by: "autonomous-session-{N}"
proposed_at: "{ISO 8601}"
rationale: "{why this crystallization — what pattern recurred}"
status: proposed   # proposed | ratified | rejected
---
```

The change takes effect immediately (pre-cognitive loading). A
PostToolUse hook detects `.claude/rules/domain/` writes and fires a
notification (macOS notification + transport mesh event):
"Rule proposed: domain/{file}.md modified by autonomous session {N}"

**Next human session:** T1 surfaces proposed rule changes awaiting
ratification. Human sets `status: ratified` (permanent) or
`status: rejected` (agent reverts, rationale recorded as lesson).

**Rationale:** Domain rules constrain *what you do with specific files*
— low governance risk. A wrong LCARS convention produces an ugly panel.
Fixable. The tag-and-notify mechanism provides audit trail and human
veto window without blocking autonomous learning.

### Layer and mode rules (`layer/`, `mode/`)

Autonomous `claude -p` sessions MUST NOT modify layer or mode rules.
These constrain *how the agent thinks* — relaxing evidence requirements
or evaluation gates autonomously produces subtle, distributed harm
rather than visible breaks. Human confirmation required per EF-1
amendment procedure.

The autonomous agent may *propose* layer/mode changes by drafting the
change in a transport message or session note. The human reviews and
applies manually.

**Rationale:** Modifying your own cognitive constraints autonomously
edges toward what the governance-captures-itself invariant protects
against. The consequence difference between rule directories warrants
the harder gate.

### Configurability

This policy represents a tentative decision (Session 96). The
domain-scoped boundary and the tag-and-notify mechanism both carry
observation markers — adjust based on operational experience:

- If autonomous domain rule changes prove consistently good → consider
  extending tag-and-notify to layer/mode rules
- If autonomous domain rule changes prove problematic → tighten to
  human-approval-required across all directories
- The PostToolUse hook provides the configurability lever — modify
  the hook to adjust the policy without changing rule files

## Staleness

Rules represent structural knowledge — no decay tracking. Manual
review during architecture audits (/retrospect, /diagnose) suffices.
If a rule's scope stops matching any work the agent performs, flag
for review — do not auto-retire.

## Relationship to PSH

PSH classifies *entities* (transport messages, decisions, memory
entries) for retrieval and faceted search. Rules organize by
*cognitive function* (layer, mode, domain) for behavioral governance.
Different concerns, complementary systems. PSH categories may appear
in rule descriptions for cross-reference but do not drive rule
activation.
