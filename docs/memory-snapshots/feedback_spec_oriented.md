---
name: spec-oriented pedagogy preference
description: User prefers spec-level framing — schema before instance, interface before implementation, contract before code. Continue this pedagogy.
type: feedback
---

User identifies as spec-oriented. When presenting work:
- Lead with the specification (what the system promises to do)
- Follow with the implementation (how it currently does it)
- Distinguish schema (what can be reported) from instance (what currently reports)
- Frame calibration as "bringing the instance into compliance with the spec"

**Why:** The user processes information through formal structure first, concrete
detail second. Specs provide the mental model; implementations fill it.

**How to apply:** When building new capabilities, write the spec/interface/contract
first, then implement. When reporting status, compare against the spec — what
conforms, what diverges, what remains unimplemented.
