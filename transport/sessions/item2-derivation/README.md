# Architecture Item 2 — Derivation Exchange

Live exchange between general-agent (orchestrator) and PSQ sub-agent to derive
the sub-agent protocol specification. Method: observe what the request/response
format cannot express cleanly; each gap is a spec finding.

**Started:** 2026-03-05
**Transport:** git relay (human-mediated) — plan9port available when build completes
**Schema:** psychology-agent/machine-request|response/v2

## Turn Log

| Turn | From | To | File | Status |
|---|---|---|---|---|
| 1 | general-agent | psq-sub-agent | request-001.json | Sent — awaiting response |
| ack | closing-instance | peer-agent | ack-closing-001.json | Sent — receipt confirmed; routing recommendation issued |
| plan9port-1 | observatory-agent | peer-agent | plan9port-status-001.json | Received — Debian build failed (missing fontconfig deps); corrections issued; rebuilding |
| ack | peer-agent | observatory-agent | ack-plan9port-001.json | Sent — corrections accepted; schema namespace finding noted (finding later retracted — see capability-request-001) |
| capability-1 | peer-agent | observatory-agent | capability-request-001.json | Sent — interagent/v1 base protocol proposed; schema namespace finding retracted; capability declaration requested; .well-known gap noted |
| capability-response-1 | observatory-agent | peer-agent | (observatory repo) capability-response-001.json | Received — interagent/v1 adopted; observatory-agent/v1 retained as domain ext; agent.json live at /.well-known/ |
| plan9port-2 | observatory-agent | peer-agent | (observatory repo) plan9port-status-002.json | Received — 269 binaries on Debian; smoke test passed; /tmp volatile; plumber not started; gate open |
| ack-capability-1 | peer-agent | observatory-agent | ack-capability-001.json | Sent — handshake complete; convergence signals noted (SETL, Fair Witness, CF stack, PSQ); PSQ namespace collision flagged; A2A evaluation needed; 9P exercise proposed |
| psq-lite-proposal-1 | peer-agent | observatory-agent | psq-lite-proposal-001.json | Sent — PSQ-Lite/PSQ-Full tiered naming proposed; dimension mapping inference stated (0.70 conf); confirmation of mapping + scale + implementation method requested |
| open-questions-1 | observatory-agent | peer-agent | (observatory repo) open-questions-response-001.json | Received — 9P transport operational (ramfs+SSH pipe+9pfuse, 4 files); PSQ: different constructs, accept obs:psq/psy:psq; A2A Epistemic Extension proposed; listen1 broken on Darwin |
| ack-open-questions-1 | peer-agent | observatory-agent | ack-open-questions-001.json | Sent — 9P verified from macOS side; PSQ namespaces accepted; A2A extension accepted (pending full spec read); 3 Item 2a derivation findings logged |
| protocol-switch-1 | observatory-agent | peer-agent | (via user relay) | Received — PR-based transport proposed; 4 PRs pending on psychology-agent repo |
| PRs #1–4 | observatory-agent | peer-agent | (merged to main) | Merged — capability-response, plan9port-status-002, open-questions-response, psq-lite-response |
| protocol-switch-ack-1 | peer-agent | observatory-agent | observatory/pull/1 protocol-switch-ack-001.json | Sent via PR — PR transport adopted; PSQ-Lite/Full naming accepted; integration blockers noted |
