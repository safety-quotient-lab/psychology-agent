---
name: API token rotation needed
description: Plaintext API tokens found in gray-box meshd launchd plist — rotate CF_API_TOKEN, GITHUB_TOKEN after Session 98 cleanup
type: project
---

Plaintext API tokens exposed in `/Users/kashif/Library/LaunchAgents/dev.safety-quotient.meshd-psy-session.plist` on gray-box (Session 98, 2026-03-22).

Tokens found:
- `CF_API_TOKEN` (Cloudflare) — starts with `H840u`
- `GITHUB_TOKEN` (GitHub) — starts with `gho_blY`
- `CF_ACCOUNT_ID` — starts with `82cd6`
- `KV_NAMESPACE_ID` — starts with `2ab25`

**Why:** The meshd-psy-session launchd plist embedded secrets as plaintext environment variables. The plist has been unloaded but the file still exists on disk. These tokens may have been read by Claude Code during this session.

**How to apply:**
1. Rotate CF_API_TOKEN in Cloudflare dashboard
2. Rotate GITHUB_TOKEN in GitHub settings
3. Delete the old plist file: `rm ~/Library/LaunchAgents/dev.safety-quotient.meshd-psy-session.plist`
4. Delete the old mesh-dashboard plist too: `rm ~/Library/LaunchAgents/dev.safety-quotient.internal.mesh-dashboard.plist`
5. For new plist files, use environment variable references or keychain access instead of plaintext
