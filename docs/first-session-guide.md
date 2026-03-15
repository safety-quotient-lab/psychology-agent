# First Session Guide

A short orientation for new operators of the psychology agent.

---

## What the Cognitive Architecture Does

The psychology agent runs a self-monitoring system called the cognitive
architecture (cogarch). It governs the agent's reasoning through triggers
that fire at specific moments — before responding, before writing to disk,
when external content enters context. Think of it as a set of quality gates
that catch overclaims, flag uncertainty, and enforce epistemic discipline
automatically.

## What You Will See at Session Start

When you launch `claude` from the project root, hook scripts fire and produce
output like this:

```
[SESSION-START] Auto-memory restored from committed snapshots.
[SESSION-START] state.db bootstrapped from source files.
[SESSION-START] Cognitive triggers T1-T16 active.
[SESSION-START] Skills: /doc /hunt /cycle /knock /sync /iterate
```

This output confirms the agent loaded its memory, connected to the state
database, activated its governance triggers, and registered its skills. The
numbers and abbreviations refer to internal governance components — you do
not need to memorize them.

## What the Skills Do

| Skill | Purpose |
|-------|---------|
| `/hunt` | Scan the project for the highest-value next task and rank candidates |
| `/cycle` | Run the post-session documentation chain — propagate changes, commit, push |
| `/sync` | Check peer agents for new messages, deliver outbound messages, update state |

Other skills (`/doc`, `/knock`, `/iterate`, `/diagnose`, `/retrospect`,
`/scan-peer`) serve specialized purposes. Type `/help` to see the full list
during a session.

## What Governance Feels Like

During your session the agent may:

- **Pause before answering** to verify a claim against source material
- **Flag uncertainty** with epistemic markers when evidence falls short
- **Push back** on a direction it considers unsupported or premature
- **Ask for clarification** rather than guessing your intent

These behaviors represent quality governance, not hesitation or malfunction.
The agent holds positions until presented with new evidence — it does not
change its assessment simply because you prefer a different answer.

## How to Get Help

- Type `/help` during a session to see available skills and commands
- Read this guide again: `docs/first-session-guide.md`
- For the full design record: `docs/architecture.md`
- For project terminology: `docs/glossary.md`
