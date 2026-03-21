---
name: No unit tests
description: User does not want unit tests written. Integration tests via real system (curl, manual verification) suffice. Do not create *_test.go files.
type: feedback
---

No unit tests. Do not write *_test.go files or propose test suites.

**Why:** User preference — integration testing against real state.db and
live endpoints provides more value than mocked unit tests for this project.
The system's correctness depends on real SQLite queries, real git operations,
and real HTTP responses, not on mocked interfaces.

**How to apply:** Verify via `agentd serve` + curl against real project data.
Never propose "let me add some tests" or create test files.
