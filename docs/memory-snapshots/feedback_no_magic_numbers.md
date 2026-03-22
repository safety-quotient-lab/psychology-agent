---
name: no-magic-numbers
description: Timeouts and thresholds must come from config, not hardcoded constants
type: feedback
---

Never hardcode timeouts, thresholds, or tuning parameters as magic numbers
in Go source. Make them configurable via environment variables with sensible
defaults.

**Why:** User asked "can we make it configurable instead of a magic number?"
when seeing `5 * time.Second` hardcoded in the registry timeout. Also asked
"any other obvious candidates for being factored into config.go?" — expects
proactive configuration surface.

**How to apply:** When adding any numeric constant that affects behavior
(timeouts, retry counts, batch sizes, thresholds), add it to Config struct
with an env var name and default value. Check existing code for similar
magic numbers and flag them for the same treatment.
