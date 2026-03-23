---
name: dns-overwrite-caution
description: Never overwrite existing DNS records without verifying the current target first. observatory.unratified.org was a Workers site, got overwritten by tunnel route.
type: feedback
---

Do not use `cloudflared tunnel route dns --overwrite-dns` on hostnames
that might serve existing websites or services.

**Why:** Session 99 accidentally overwrote `observatory.unratified.org`
(a Cloudflare Workers-hosted site) with a tunnel CNAME. The original
DNS record was destroyed with no built-in undo.

**How to apply:** Before routing ANY hostname to a tunnel:
1. `dig +short HOSTNAME CNAME` to check current target
2. `curl -sf https://HOSTNAME/` to verify what currently serves there
3. Only use `--overwrite-dns` on hostnames confirmed to point to our
   infrastructure (or on brand-new hostnames)
4. For unratified.org zone — extra caution, multiple non-agent services live there
