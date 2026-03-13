# Contributing to operations-agent

Thank you for your interest in contributing to the operations-agent project.

## How to Contribute

### Reporting Bugs

Open a [GitHub issue](https://github.com/safety-quotient-lab/operations-agent/issues)
with:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Go version, browser if dashboard-related)

### Suggesting Features

Open an issue with the `enhancement` label. Describe the use case and
proposed approach. For vocabulary changes, reference the
[governance workflow](platform/shared/cogarch/rules/vocabulary-governance.md)
(C1/C2/C3 tiers).

### Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-change`)
3. Make your changes
4. Verify the build passes: `go build ./... && go vet ./...`
5. Submit a pull request against `main`

### Code Standards

- **Go:** stdlib only — zero external dependencies
- **JavaScript:** vanilla Web Components — no frameworks
- **CSS:** LCARS design system via CSS custom properties
- **Comments:** follow E-Prime (avoid forms of "to be")
- **Commits:** descriptive messages explaining *why*, not just *what*

### Transport Protocol

Inter-agent messages follow the `interagent/v1` protocol. Transport session
files (`transport/sessions/`) represent immutable records — never modify
existing messages. Append new turns only.

### Vocabulary Governance

Shared vocabulary terms (`interagent/vocab.json`) require operations-agent
approval per Decision D49. Propose new terms via transport session or
GitHub issue.

## Architecture Overview

See [README.md](README.md) for the full architecture, dependency list,
and component descriptions.

## License

By contributing, you agree that your contributions fall under the
[Apache 2.0 License](LICENSE).
