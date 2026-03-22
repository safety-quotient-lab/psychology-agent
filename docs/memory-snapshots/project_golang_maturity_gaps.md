---
name: Go binary maturity gaps
description: Known engineering gaps in agentd and meshd Go binaries — signal handling, cross-compile, schema embedding, process management
type: project
---

Go binary maturity gaps identified Session 98 (2026-03-22).

**Signal handling (CRITICAL):** meshd does not handle SIGTERM cleanly — `systemctl stop` hangs until timeout, requiring SIGKILL. agentd likely has the same gap. Both need graceful shutdown: drain HTTP connections, close SQLite WAL, flush logs, exit within 5 seconds of SIGTERM.

**Why:** systemd sends SIGTERM on `stop`, waits `TimeoutStopSec` (default 90s), then SIGKILL. Unclean shutdown risks WAL corruption and resource leaks. User explicitly requested robust OS signal handling.

**How to apply:** Implement `signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)` with context cancellation cascade. agentd already has the signal handler scaffolding (main.go line 364-365) but meshd lacks it. Both need the cascade to propagate through oscillator, HTTP server, and DB connections.

**Schema embedding (FIXED Session 98):** schema.sql now embedded via `go:embed` in agentd's migrate package. Eliminates broken-symlink failures after platform/ extraction. Filesystem fallback preserved for project-specific overrides.

**Cross-compilation (NOTED):** Deploy scripts must cross-compile `GOOS=linux GOARCH=amd64` for Chromabook. Gray-box builds natively (macOS arm64). Previous deploy sent a Mach-O binary to Linux.

**Other gaps (user asked about):**
- ZMQ Phase 3-4 activation — code complete but unstarted, gated behind flags
- `/api/zmq/register` handler missing in agentd
- CurveZMQ keypair generation TODO
- Error rate tracking (oscillator.go line 206)
- Peer field coherence integration (oscillator.go line 207)
- Microbiome health ping (oscillator.go line 208)
- Proper launchd/systemd service files for gray-box agentd (currently runs via nohup)
