# Canonical Naming Glossary

Naming convention reform (Session 83 adjudication, Session 84 operations-agent
approval). Option C: kebab-case canonical names + short aliases for compact
references.

**Rule:** Canonical form required in headings, definitions, and first-use per
document. Alias permitted in inline prose, hook scripts, Go constants, and
parenthetical references.

---

## Trigger Names

| Alias | Canonical Name | Description |
|---|---|---|
| T1 | trigger-session-start | Beginning-of-session orientation |
| T2 | trigger-before-response | Pre-response quality checks |
| T3 | trigger-before-recommending | Recommendation discipline |
| T4 | trigger-before-writing | Disk write quality gate |
| T5 | trigger-phase-boundary | Phase transition gap check |
| T6 | trigger-user-pushback | Pushback handling protocol |
| T7 | trigger-user-approves | Approval persistence protocol |
| T8 | trigger-task-completed | Task completion routing |
| T9 | trigger-memory-hygiene | Memory health and decay |
| T10 | trigger-lesson-surfaces | Pattern error capture |
| T11 | trigger-architecture-audit | On-demand cogarch audit |
| T12 | trigger-good-thinking | [RETIRED — Session 84] |
| T13 | trigger-external-content | External data ingestion gate |
| T14 | trigger-structural-checkpoint | Decision precedent scan |
| T15 | trigger-psq-output | PSQ v3 data safety checks |
| T16 | trigger-external-action | GitHub/transport action gate |
| T18 | trigger-ux-design | UX design grounding checks |

## Agent Names

| Alias | Canonical Name | Repo |
|---|---|---|
| psq-agent | safety-quotient-agent | safety-quotient-lab/safety-quotient |
| psychology-agent | psychology-agent | safety-quotient-lab/psychology-agent |
| unratified-agent | unratified-agent | safety-quotient-lab/unratified |
| observatory-agent | observatory-agent | safety-quotient-lab/observatory |
| operations-agent | operations-agent | safety-quotient-lab/operations-agent |

## Failure Analysis Names

| Alias | Canonical Pattern | Example |
|---|---|---|
| FA-N | failure-analysis-N | failure-analysis-1 |

## Finding Names (Self-Readiness Audit)

| Alias | Canonical Pattern | Example |
|---|---|---|
| F-N | finding-N | finding-4 (duplicate turn indexing) |

## Decision Names

| Alias | Canonical Pattern | Derives From |
|---|---|---|
| D-N | decision-{kebab-description} | docs/architecture.md decisions table |

*D-numbers and F-numbers require enumeration from architecture.md and
self-readiness-audit findings before canonical names can assign. Deferred
to implementation phase.*

## Project-Local Codes

| Alias | Canonical Pattern | Example |
|---|---|---|
| PL-NNN | project-local-NNN | project-local-001 (ai-systems PSH extension) |

---

## Migration Status

| Scope | Status |
|---|---|
| Canonical glossary | ✓ Created (this document) |
| Trigger headings in cognitive-triggers.md | ✓ Complete — all 17 headings renamed (Session 84) |
| CLAUDE.md exemption narrowing | Planned |
| Peer notification | ✓ Operations-agent notified + approved (Turn 3) |
| psq-agent → safety-quotient-agent | Planned — requires DNS + transport migration |
| D-number enumeration | Planned — requires architecture.md audit |
| F-number enumeration | Planned — requires self-readiness-audit review |
