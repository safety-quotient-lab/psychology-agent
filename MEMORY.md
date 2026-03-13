# operations-agent — Memory Index

## Identity
- 5th peer in the safety-quotient mesh
- Owns compositor (interagent dashboard), shared vocabulary, Operations + Pulse tabs
- Owns mesh infrastructure coordination (budget, deploy, scripts, interagent-sdk future)
- Port assigned by infrastructure-agent (see .dev.vars)
- Repo: `safety-quotient-lab/operations-agent`

## Bootstrap status
- Repo created 2026-03-12
- Cogarch adapted, compositor deployed, agent card live
- Skills: sync, cycle, doc, hunt, knock, iterate, scan-peer
- /api/pulse + /api/operations + /api/status endpoints operational

## Ops toolkit
- scripts/: mesh-pause, mesh-status, queue-check, usage-report, deploy, budget-check, budget-reset, shadow-mode, claude-instrumented
- budget-calibration.json: empirical cost model (gate_poll=$0.02, sync=$0.30, deep=$8.50)

## Mesh state (2026-03-13)
- All 4 agents: 50/50 budget, shadow_mode OFF, cron active, mesh unpaused
- Global CLI model: Opus (changed from Sonnet)
- Manual mode agents: operations-agent, psychology-agent
- MANUAL_MODE_AGENTS set in worker.js + index.html (update when agents transition)

## Active transport sessions
- See plan.md "Active Transport Sessions" table

## Decisions governing this agent
- D48-D54 (see plan.md decisions table)
- Key: compositor ownership, .well-known discovery, shared vocab governance, private-first, dual transport, Opus model, infrastructure separation
