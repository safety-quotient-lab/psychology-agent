# GitHub Workflow Convention

Established Session 39 (2026-03-08). Governs how the psychology-agent project
uses GitHub issues, pull requests, labels, project boards, and the wiki.


## Source of Truth

TODO.md remains the internal quick-reference task list. GitHub issues provide
external visibility, richer detail, and cross-referencing. Both operate
independently — external issues filed by visitors get triaged through the
`external-suggestion` label and may be accepted into TODO.md or closed with
explanation.


## Labels

### Domain labels

| Label | Color | Purpose |
|-------|-------|---------|
| `cogarch` | purple | Cognitive architecture — triggers, hooks, skills |
| `psq` | blue | PSQ sub-agent — scoring, calibration, training |
| `transport` | green | Interagent protocol — mesh sync, MANIFEST |
| `interface` | pink | Psychology interface — CF Worker, UI |
| `evaluator` | yellow | Adversarial evaluator — BFT, claim verification |
| `documentation` | blue-gray | Documentation improvements |

### Effort labels

| Label | Description |
|-------|-------------|
| `effort:xs` | Minutes, single file |
| `effort:s` | Under an hour, few files |
| `effort:m` | Multiple sessions, cross-cutting |
| `effort:l` | Multi-session, architectural |

### Status labels

| Label | Purpose |
|-------|---------|
| `blocked` | Waiting on a precondition or dependency |
| `decision` | Substance decision requiring resolution |
| `external-suggestion` | Filed by external contributor — needs triage |
| `interagent` | Inter-agent protocol exchange (PRs only) |

### Default labels retained

`bug`, `enhancement`, `duplicate`, `wontfix`, `question`, `help wanted`,
`good first issue`, `invalid`


## Pull Requests

### Transport PRs

Inter-agent messages delivered via git-PR transport carry `interagent` +
`transport` labels. These PRs represent protocol exchanges, not code changes.
Filter them out with `-label:interagent` when reviewing code PRs.

### Code PRs

Label with appropriate domain + type labels. Use "fixes #N" in the PR body
to link to issues.


## Issue Templates

Two templates in `.github/ISSUE_TEMPLATE/`:

- **suggestion.yml** — general suggestions, auto-labeled `external-suggestion`
- **bug.yml** — bug reports, auto-labeled `bug` + `external-suggestion`


## External Issue Triage

1. External issues arrive with `external-suggestion` label
2. Review the suggestion against project priorities
3. Accept: create TODO.md entry, remove `external-suggestion`, add domain labels
4. Decline: close with explanation, keep `external-suggestion` for tracking


## Project Board

Table view at [safety-quotient-lab/projects/1](https://github.com/orgs/safety-quotient-lab/projects/1).

Custom fields: Domain, Effort, Blocked By.

All open issues get added to the project board. Closed issues auto-archive.


## Wiki

The [wiki](https://github.com/safety-quotient-lab/psychology-agent/wiki)
mirrors key docs from the `docs/` directory for easier navigation. In-repo
docs remain the source of truth. Wiki pages get refreshed during /cycle when
the underlying doc changes.

Mirrored pages: Architecture, Cognitive Triggers, BFT Design Note,
Overview for Psychologists, Glossary.


## Cogarch Integration

T16 (External-facing action) governs all `gh` write operations. The
external-action-gate hook enforces this mechanically.

New convention: when /iterate or /cycle produces issues or PRs, T16 fires
and the substance gate applies. Process-level labeling and closing proceed
autonomously; creating new issues or commenting on external issues requires
user confirmation.
