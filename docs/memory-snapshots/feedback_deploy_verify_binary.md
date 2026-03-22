---
name: deploy-verify-binary
description: After deploying, verify the running process uses the NEW binary — systemd may auto-restart with the old one
type: feedback
---

After deploying a new binary via scp + systemctl restart, verify the running
process actually uses the new file. Check `/proc/{PID}/exe` — if it shows
`(deleted)`, the process still runs the old binary from before the file swap.

**Why:** Session 97 deployed meshd 4 times before realizing the old process
hadn't stopped. meshd's graceful shutdown hangs (goroutine leak in ZMQ/SSE),
so `systemctl stop` sits at `deactivating` for minutes. `systemctl start`
sees the unit already running and does nothing. Result: old binary serves
despite file replacement.

**How to apply:** Always `kill -9` the old PID, wait for it to die, THEN
swap the binary file, THEN start the unit. Do this in a single SSH command
to avoid race conditions with systemd auto-restart.
