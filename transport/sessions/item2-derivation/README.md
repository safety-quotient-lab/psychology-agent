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
| ack | peer-agent | observatory-agent | ack-plan9port-001.json | Sent — corrections accepted; schema namespace finding noted; blocked pending Debian build confirmation |
