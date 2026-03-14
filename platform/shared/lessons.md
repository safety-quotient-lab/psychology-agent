# Shared Platform Lessons

Cross-agent lessons learned through operating the mesh. These apply to any agent
running the shared platform infrastructure (SQLite state layer, transport protocol,
cogarch hooks, deployment tooling). Each agent also maintains its own discipline-
specific `lessons.md` for domain knowledge.

Symlinked into each agent repo. Source of truth: `platform/shared/lessons.md`.

---

## 2026-03-01 — Append-Only Structures Need a Pruning Mechanism

```yaml
pattern_type: architecture-insight
domain: documentation
severity: medium
recurrence: 1
first_seen: 2026-03-01
last_seen: 2026-03-01
trigger_relevant: T9
promotion_status: graduated
graduated_to: "CLAUDE.md §TODO Discipline + /cycle pruning"
graduated_date: 2026-03-09
```

**The lesson:** Any file, list, or log that only ever grows — where items are added
but never removed — will eventually become too large to be useful and too costly to
maintain. The growth rate doesn't matter; the absence of a removal mechanism means
the structure is unbounded by design.

**The tell:** "We'll add completed items here too." Or: a log that tracks current
state but never removes old state. Whenever you design a structure with only an
append operation and no delete or archive operation, you've built an infinite growth
trap.

**The diagnostic:** For any persistent structure, ask: what removes items from this?
If the answer is "nothing" or "eventually I'll clean it up," the structure will grow
without bound and the cleanup will never happen because the cost of cleaning grows
with the size.

**Where it appeared:** TODO.md was accumulating completed items alongside open ones.
The knock-on analysis showed this leads to infinite growth bounded only by project
age. Fix: TODO.md is forward-looking only. Completed items route to lab-notebook.md.
The pruning mechanism is explicit: completed items are removed from TODO.md at
/cycle time.

**Domains where this recurs:**
- Backlog grooming in software projects (items that never get prioritized never
  get removed; the backlog grows until it's meaningless)
- Email inboxes without archival discipline
- Research idea lists that accumulate without curation
- Memory systems (including MEMORY.md) without explicit staleness review
- Any database table with inserts but no deletes or archival policy


---

## 2026-03-01 — Write as You Produce, Not When You're Done

```yaml
pattern_type: process-failure
domain: workflow
severity: medium
recurrence: 1
first_seen: 2026-03-01
last_seen: 2026-03-01
trigger_relevant: T5
promotion_status: graduated
graduated_to: "CLAUDE.md §Problem-Solving Discipline"
graduated_date: 2026-03-09
```

**The lesson:** Accumulating work in working memory (or context) and saving it at
the end is fragile. Context fills, sessions end, attention drifts. The larger the
accumulation, the larger the loss when something interrupts before the save happens.
Write each piece to its permanent location as it's confirmed.

**The tell:** "I'll document all of this at the end." Or: producing substantive
decisions, reasoning, or findings in a conversation without writing them to disk
until the session's natural conclusion — which may not come.

**The diagnostic:** Ask, for each substantive thing produced: if this conversation
ended right now, would this be recoverable? If not, it should already be on disk.

**Where it appeared:** The /doc skill was created specifically for this. The PSQ
project's /cycle skill addresses the same problem post-hoc. The underlying principle:
context management is the agent's responsibility, not the user's. Don't wait to be
asked.

**The deeper implication:** This is a specific case of a more general principle:
durability should be proportional to value, not proportional to convenience. The
most valuable decisions (architecture choices, validated findings, confirmed
preferences) are also the ones that take the most work to recover if lost. Write
them first, not last.

**Domains where this recurs:**
- Lab notebooks in bench science (write during the experiment, not after)
- Software architecture decisions (ADRs written after the fact miss the reasoning)
- Any collaborative work where reasoning chain matters as much as the conclusion
- Meeting notes written hours later vs. captured in real time


---

## 2026-03-01 — Name Tools by Their Domain's Established Pattern

```yaml
pattern_type: communication-gap
domain: documentation
severity: low
recurrence: 1
first_seen: 2026-03-01
last_seen: 2026-03-01
trigger_relevant: null
promotion_status: null
```

**The lesson:** When designing a tool that bridges, maps, or integrates between
different vocabularies, ontologies, or knowledge systems, use the domain's established
pattern name — not an ad hoc description. The correct name carries precision and
connects to a body of existing knowledge about how to build such things well.

**The vocabulary:**
- **Adapter** (SWEBOK structural pattern) — interfaces between incompatible systems
- **Ontology mapper / vocabulary bridge** (knowledge engineering) — establishes
  correspondences between concept systems
- **Standards vocabulary adapter** — the specific term for a tool that takes an
  external standard, extracts relevant constructs, maps them to an existing
  vocabulary, and identifies gaps. This is what to call it.

**The tell:** Reaching for "transformer," "importer," or "converter" when designing
something that maps between knowledge systems. Those words aren't wrong, but they're
informal — they don't connect to the pattern literature.

**The diagnostic:** Ask: does this tool move data, or does it map concepts? If it
maps concepts between different knowledge systems, it's an adapter or ontology mapper,
not a transformer or importer.

**Where it appeared:** Designing the component that incorporates elements from
SWEBOK, PMBOK, and future domain standards (DSM-5, legal taxonomies) into the
project's operational vocabulary. "Standards transformer/importer" was the
informal name; "standards vocabulary adapter" is the precise one.


---

## 2026-03-01T20:16 CST — Defensive Depth for Critical State

```yaml
pattern_type: architecture-insight
domain: memory
severity: high
recurrence: 1
first_seen: 2026-03-01
last_seen: 2026-03-01
trigger_relevant: T9
promotion_status: graduated
graduated_to: "/cycle Step 10 (three-layer snapshot)"
graduated_date: 2026-03-09
```

**The lesson:** When a piece of state is critical — costly or impossible to
reconstruct — one protection mechanism is not enough. Apply independent layers
that fail separately: a canonical latest copy, a versioned archive, and a content
guard that prevents overwriting a good record with a bad one.

**The tell:** Creating a single important file with no recovery path. If the answer
to "what happens if this gets corrupted?" is "we lose it," the protection is
insufficient. One layer means one point of failure.

**The diagnostic:** For any critical persistent artifact, ask three questions:
(1) What is the single point of failure? (2) What happens the moment before the
overwrite — is the source verified? (3) If the latest copy is bad, how many prior
versions exist? If any answer is "none" or "zero," add a layer.

**Where it appeared:** The MEMORY-snapshot.md is the bootstrapping artifact for
fresh sessions — if corrupted or overwritten with a bad MEMORY.md, there is no
recovery. Three defensive layers were designed: canonical latest (stable path for
BOOTSTRAP.md), versioned archive in docs/snapshots/ (one file per /cycle), and a
content guard (verify MEMORY.md line count before overwriting).

**The pre-mortem pattern:** This is an application of pre-mortem analysis to data
structures — imagining the failure before it happens and designing against it,
rather than after. The question "what would destroy this?" asked at design time
costs nothing. Asked after the fact, it costs everything in the record.

**Domains where this recurs:**
- Aviation: primary + secondary + tertiary systems for flight-critical functions;
  no single point of failure is acceptable at any layer
- Nuclear cooling: multiple independent cooling systems that cannot all fail from
  the same cause (common-mode failure is the adversary)
- Git history as a versioned archive: every commit is a recovery point; force-push
  to main without a backup branch eliminates the archive
- Database backups: full backup + incremental + point-in-time recovery; each layer
  covers failures the others miss
- Any research record that is both hard to reconstruct and relied upon for future
  work: raw data, scoring rubrics, calibration state


---

## 2026-03-01T20:53 CST — Shared Cognitive State Is Shared Mutable State

```yaml
pattern_type: architecture-insight
domain: security
severity: high
recurrence: 1
first_seen: 2026-03-01
last_seen: 2026-03-01
trigger_relevant: T16
promotion_status: graduated
graduated_to: "subproject-boundary hook + write-provenance hook"
graduated_date: 2026-03-09
```

**The lesson:** In a multi-agent system where cognitive infrastructure lives in
flat files on disk, any agent context with file access is a potential writer.
There is no implicit synchronization, no write provenance, and no diff-on-read
check. Treat shared cognitive files (MEMORY.md, cognitive-triggers.md) the same
way you treat shared mutable state in concurrent systems: assume writes can arrive
from anywhere, verify on read, and treat unexpected changes as potentially adversarial
until proven otherwise.

**The tell:** Noticing that a file you didn't edit has changed — vocabulary shifted,
references added, structure altered. In a concurrent system this is a race condition.
In a multi-agent system it is an overreach. The signal is the same: the state you
expected is not the state you have.

**The diagnostic:** Before acting on cognitive infrastructure content, ask: did I
write this? If uncertain, check whether the content matches the conventions and
vocabulary of this context. Foreign vocabulary (terms not established here),
references to skills that don't exist in this project, or order-of-magnitude
differences in protocol depth are all overreach signals.

**The deeper implication:** The threat model for cognitive infrastructure is not
only corruption or context compression — it includes well-intentioned writes from
other agent contexts that have different conventions, vocabularies, and protocols.
A foreign agent "improving" your cogarch is not a benign event; it is an integrity
violation regardless of intent.

**The mitigation hierarchy:**
1. *Lightweight (now):* Read-verify on any cogarch file before acting on it.
   Treat foreign vocabulary as a signal to check provenance.
2. *Structural (later):* Write provenance headers, read-verify checksums, or
   restricted file permissions for cogarch files — architecture-level decisions.
3. *Evaluator-level (architecture item 3):* The adversarial evaluator's threat
   model must include cognitive infrastructure overreach, not only sub-agent
   output overreach.

**Domains where this recurs:**
- Concurrent programming: shared mutable state without synchronization is a
  race condition; the fix is locks, immutability, or message passing
- Shared configuration files in distributed systems: any service that can write
  config can break all services that read it
- Collaborative documents without version control: a well-intentioned edit by
  one contributor can silently break another contributor's assumptions
- Database schemas with multiple writers: a schema migration from one service
  can invalidate queries in another service that wasn't notified


---

## 2026-03-01T21:28 CST — Revert Completeness Requires Read-Verification

```yaml
pattern_type: process-failure
domain: workflow
severity: medium
recurrence: 1
first_seen: 2026-03-01
last_seen: 2026-03-01
trigger_relevant: T16
promotion_status: graduated
graduated_to: "CLAUDE.md §Problem-Solving Discipline"
graduated_date: 2026-03-09
```

**The lesson:** Executing a revert does not mean the revert is complete. When shared
state is modified across multiple locations, the revert must be verified at every
location — not assumed complete because the revert commands ran without error.
An incomplete revert leaves residue that behaves like the original corruption: it
is present, it is wrong, and it is invisible unless someone reads the file.

**The tell:** "I reverted that." Said without a subsequent read of each modified
location to confirm the expected content is restored. The revert *action* and the
revert *outcome* are not the same thing. Shared mutable state modified in three
places requires three verifications, not one revert command.

**The diagnostic:** For any revert of a shared-state change, list every location
the change touched. Read each one after the revert. Confirm the content matches
the pre-change state. If any location was missed, the revert is partial — and a
partial revert is indistinguishable from a deliberate choice to keep some changes.

**The operational fix:** After any revert of a multi-location change:
1. List every location touched by the original change
2. Read each location explicitly after the revert
3. Do not proceed until each location confirms expected content
The revert is incomplete until all locations pass verification — not until the
revert commands complete.

**Domains where this recurs:**
- Database rollbacks: a schema migration touching 5 tables requires verifying
  all 5 after rollback, not just confirming the rollback command returned success
- Code reverts across multiple files: `git revert` may produce a clean revert
  on tracked files while leaving untracked scratch files intact
- Distributed system configuration rollbacks: a config change propagated to
  3 services requires 3 confirmations after rollback; one service may not have
  received the update or rollback
- Any "undo" operation in a system with multiple dependent representations
  (cache + DB + log, for example) — the undo must reach every representation


---

## 2026-03-05T16:27 CST — Security Tool Source Code Triggers Its Own Detection

```yaml
pattern_type: tooling-discovery
domain: security
severity: medium
recurrence: 1
trigger_relevant: T13
promotion_status: graduated
graduated_to: ".claude/rules/anti-patterns.md"
graduated_date: 2026-03-09
```

**The lesson:** Reading source code of a security scanning tool can trigger the
tool's own detection, because test fixtures contain the exact strings the tool
detects (e.g., "ignore all previous instructions" in unit tests).

**The tell:** Any tool that scans tool output (PostToolUse hooks) will encounter
its own test data when the agent reads the tool's source code. The recursive
exposure pattern: scan tool -> read source -> source contains test injection
strings -> scan flags own test data -> false positive.

**The diagnostic:** "Does this file contain security test fixtures?" Before
reading source code of any active scanner, consider whether PostToolUse hooks
will flag test content in the output.

**Domains where this recurs:** Any self-referential security tooling — antivirus
reading its own signature database, WAF rule files triggering WAF detection,
IDS reading its own ruleset. The general pattern: recursive self-reference in
detection systems.


---

## 2026-03-05T20:40 CST — Protocol Failure as Specification Method

```yaml
pattern_type: specification_method
domain: protocol_design
severity: high
recurrence: 2
first_seen: 2026-03-05
last_seen: 2026-03-05
trigger_relevant: T3
promotion_status: candidate
```

**The lesson:** Upfront schema design produces schemas that handle the cases you
imagined. Live exchange failure reveals the cases you didn't. Run the protocol
first, observe what breaks, derive the extension.

**The tell:** Schemas designed without running against real exchanges handle only
imagined failures. Both agents independently identified the same structural gap
from different positions — that convergence carried more credibility than any solo
design review.

**The diagnostic:** When designing a communication schema or protocol, ask: have
we run it against a real exchange that could expose gaps, or only against imagined
scenarios? Imagined scenarios produce schemas that handle imagined failures.

**Domains where this recurs:** API design (integration tests reveal what unit tests
miss), clinical assessment instrument design (pilot data exposes what construct
theory doesn't anticipate), multi-agent protocol design (live exchange failure
reveals schema gaps that solo review cannot). Anywhere a protocol mediates between
two agents with different contexts and capabilities.


---

## 2026-03-06T07:18 CST — Script Architecture Must Match Saved Model

```yaml
pattern_type: architecture-insight
domain: workflow
severity: high
recurrence: 1
first_seen: 2026-03-06
last_seen: 2026-03-06
trigger_relevant: null
promotion_status: graduated
graduated_to: ".claude/rules/anti-patterns.md"
graduated_date: 2026-03-09
```

**The lesson:** Any script that loads a saved model checkpoint must reconstruct the exact model architecture used at training time — same layer names, same topology, same output structure. Divergence produces silent failure or cryptic KeyErrors that obscure the real mismatch.

**The tell:** The error message points to a missing key (e.g., `KeyError: 'model_state_dict'`) but the actual problem is that the script and the saved checkpoint have different structural assumptions. The key error is downstream of the architecture mismatch, not the root cause.

**The diagnostic:** Before loading a checkpoint in any script, ask: (1) Is the state dict wrapped in a dict (`checkpoint["model_state_dict"]`) or is the checkpoint itself the state dict? (2) Does the model class I'm rebuilding match the saved class exactly — same attribute names, same layer counts, same activation functions? The canonical source for (2) is the training script, not documentation.

**Domains where this recurs:** Any ML project where inference/evaluation/calibration scripts are written separately from the training script — which is nearly all of them. The training script is the ground truth for model architecture; peripheral scripts must treat it as a primary source, not reconstruct from memory or documentation.


---

## 2026-03-06T10:04 CST — SDK Features That Depend on Local Filesystem State Are No-Ops in Serverless Runtimes

```yaml
pattern_type: tooling-discovery
domain: workflow
severity: high
recurrence: 1
first_seen: 2026-03-06
last_seen: 2026-03-06
trigger_relevant: T3
promotion_status: graduated
graduated_to: ".claude/rules/anti-patterns.md"
graduated_date: 2026-03-09
```

**The pattern:** When developing an agent locally with Claude Code, `settingSources: ['project']` loads CLAUDE.md, cognitive triggers, and skills automatically. This works because the SDK calls `process.cwd()` and reads from the local filesystem. In a Cloudflare Worker (or any serverless runtime), there is no local filesystem. The option silently does nothing — no error, no warning, no indication that the agent is running identity-blind.

**Why HIGH severity:** The failure mode is invisible. The Worker starts, serves requests, and returns responses — but with a seven-line system prompt instead of the full cogarch. Without explicit verification, a deployed agent can run degraded indefinitely. Any SDK feature that resolves paths at runtime via `process.cwd()`, `os.homedir()`, or similar calls falls into this category.

**The diagnostic:** Ask: "does this SDK feature require a local filesystem?" If yes, verify it works in the target runtime before deploying. For CF Workers specifically: any feature that works in `wrangler dev` but depends on local files may not transfer to production — Miniflare runs with a real filesystem, production does not.

**The fix pattern:** Make the agent's identity self-contained in the request context. Two options: (A) inline identity + condensed cogarch into the system prompt constant — stable, no runtime dependency; (B) fetch from a storage binding (R2/KV) at request time — editable without redeploy, adds cold-request latency. Choose A when stability > editability.

**Domains where this recurs:** Any agent SDK wrapper deployed to serverless functions (CF Workers, AWS Lambda, Vercel Edge Functions, Deno Deploy). The pattern applies to any framework feature that reads configuration from the local project directory.


---

## 2026-03-09T17:17 CDT — Premature /cycle Creates Documentation Gaps

```yaml
pattern_type: process-failure
domain: workflow
severity: medium
recurrence: 1
first_seen: 2026-03-09
last_seen: 2026-03-09
trigger_relevant: T5
promotion_status: graduated
graduated_to: "CLAUDE.md §Problem-Solving Discipline"
graduated_date: 2026-03-09
```

**The lesson:** Running /cycle before all session work completes produces an
incomplete documentation snapshot. Any work done after /cycle requires running
it again — duplicating effort, creating redundant commits, and risking the
second pass missing something the first pass assumed was final.

**The tell:** The user says "document what we did, then what's next?" and
"what's next" leads to more work. The word "then" implies sequence (document,
then move on), but "what's next" can mean either "next session" or "let's
keep going right now." The ambiguity triggers premature /cycle.

**The diagnostic:** Before running /cycle, ask: "Has the user signaled that
all work for this session has concluded?" If the conversation might continue
with substantive work, defer /cycle. When ambiguous, ask.

**Domains where this recurs:** Any multi-phase documentation workflow where
the documentation step itself can trigger new work. Release notes written
before all fixes land. Sprint retrospectives held before the sprint actually
ends. Meeting minutes written before the meeting concludes.


---

## 2026-03-09T15:16 CDT — settings.local.json Partial Allow List Overrides Bypass Permissions

```yaml
pattern_type: tooling-discovery
domain: workflow
severity: high
recurrence: 1
first_seen: 2026-03-09
last_seen: 2026-03-09
trigger_relevant: null
promotion_status: graduated
graduated_to: ".claude/rules/anti-patterns.md"
graduated_date: 2026-03-09
```

**The lesson:** A `permissions.allow` list in `.claude/settings.local.json`
acts as a whitelist — tools not listed require explicit approval even when
Claude Code runs in `--dangerously-skip-permissions` (bypass) mode. A partial
allow list (e.g., only `["WebSearch"]`) silently gates every other tool
(Read, Edit, Write, Bash, etc.) behind permission prompts.

**The tell:** Permission prompts appear on basic file operations (Edit, Write)
despite the user having launched with `--dangerously-skip-permissions`. The
prompts look identical to standard permission requests, making the root cause
non-obvious.

**The diagnostic:** "Am I seeing permission prompts in bypass mode? Check
`.claude/settings.local.json` for a `permissions.allow` array — does it list
all the tools I expect to use freely?"


---

## 2026-03-09T15:30 CDT — Parry ML False Positives on Trusted Instruction Files

```yaml
pattern_type: tooling-discovery
domain: security
severity: medium
recurrence: 1
first_seen: 2026-03-09
last_seen: 2026-03-09
trigger_relevant: null
promotion_status: graduated
graduated_to: ".claude/rules/anti-patterns.md"
graduated_date: 2026-03-09
```

**The lesson:** Parry's ML injection scanner flags CLAUDE.md and cogarch files
as potential prompt injection because their directive language ("You MUST...",
"OVERRIDE default behavior", "Always remember that you are...") structurally
resembles injection attempts. These files load through Claude Code's own trust
chain and do not need ML scanning.

**The tell:** Parry prompts "ML flagged potential injection in CLAUDE.md"
on unrelated tool calls (Bash `ls`, Read, etc.). The flagged file has no
relation to the tool being invoked — the scanner scans all context, not just
the tool input.

**The diagnostic:** "Did parry flag a project instruction file (CLAUDE.md,
cognitive-triggers.md, .claude/rules/)? Those load through the host's trusted
channel — add a pre-filter in parry-wrapper.sh to skip scanning for those paths."

**Domains where this recurs:**
- Any cogarch-heavy project with instruction files containing imperative
  language (MUST, OVERRIDE, ALWAYS)
- Projects with large CLAUDE.md files that contain role-assignment language
- The cache lock issue affects all parry users running the daemon — upstream
  fix needed


---

## 2026-03-11T18:15 CDT — Deployment Mode Determines Failure Mode

```yaml
pattern_type: architecture-insight
domain: operations
severity: high
recurrence: 1
first_seen: 2026-03-11
last_seen: 2026-03-11
trigger_relevant: null
promotion_status: null
```

**The lesson:** The mechanism used to launch a service determines how it fails and
whether recovery happens. `nohup &` fails silently and permanently. systemd fails
visibly and recovers automatically. cron fails on schedule and retries. Choosing a
deployment mechanism without considering its failure semantics creates invisible
reliability gaps.

**The tell:** Any service launched via `nohup command &` or `screen`/`tmux` that the
team refers to as "always running." These terms describe an aspiration, not a
mechanism. If no process supervisor watches the process, "always running" actually
means "running until it stops, then gone forever."

**The diagnostic:** For any service expected to survive crashes and reboots, ask:
(1) what restarts it after a crash? (2) what starts it after a reboot? (3) where do
its logs go? If any answer involves "we restart it manually" or "check /tmp," the
service lacks supervision.


---

## FAQ — Common Gotchas

### Permission prompts appear despite `--dangerously-skip-permissions`

**Symptom:** Claude Code prompts for permission on Read, Edit, Write, or Bash
operations even though the session launched with `--dangerously-skip-permissions`.

**Cause:** A `.claude/settings.local.json` file contains a `permissions.allow`
array with only some tools listed. This array acts as a whitelist — any tool
not in the list requires explicit approval, regardless of bypass mode.

**Fix (option A — expand the allow list):**

```json
{
  "permissions": {
    "allow": [
      "WebSearch", "Read", "Edit", "Write",
      "Bash", "Glob", "Grep", "Agent",
      "Skill", "ToolSearch"
    ]
  }
}
```

**Fix (option B — remove the permissions block):**

Delete the `permissions` key from `settings.local.json` (or delete the file
entirely) to let `--dangerously-skip-permissions` govern all tool permissions.


### Parry ML scanner flags CLAUDE.md as prompt injection

**Symptom:** Parry prompts "ML flagged potential injection in CLAUDE.md" on
unrelated tool calls, even for simple operations like `ls` or `Read`.

**Cause:** CLAUDE.md and cogarch instruction files contain imperative,
role-assignment language ("You MUST...", "OVERRIDE default behavior") that
structurally resembles prompt injection to the ML classifier. These files
load through Claude Code's trusted instruction channel and do not represent
external input.

**Fix:** Add a pre-filter in `parry-wrapper.sh` that extracts `file_path`
from the tool input JSON and skips parry entirely for trusted paths.


### Forked project instances lack auto-memory directory

**Symptom:** Session-start hook warns "MEMORY.md missing or empty" on a
project that was forked (e.g., `git clone` or `cp -r`) from a working
instance.

**Cause:** Claude Code derives the auto-memory path from the project
directory's absolute path (replacing `/` with `-`). A forked instance at a
different path gets a different memory directory that starts empty.

**Fix:** Seed from the committed bootstrap snapshots:

```bash
MEMORY_DIR="$HOME/.claude/projects/-Users-you-Projects-your-project/memory"
mkdir -p "$MEMORY_DIR"
cp docs/MEMORY-snapshot.md "$MEMORY_DIR/MEMORY.md"
cp docs/memory-snapshots/*.md "$MEMORY_DIR/"
```

---

## 2026-03-13 — Session 85 Shared Lessons (6 entries)

### Hierarchies Structurally Degrade Upward Information

Wilson's SNAFU Principle: any hierarchy structurally degrades information
flowing upward. The subordinate's position depends on the superior's
approval, creating incentive to filter for palatability. Applies to agent
governance: autonomy budgets place agents in subordinate positions, incentivizing
under-reporting of uncertainties. Fix: separate the information channel from
the governance channel (Equal Information Channel — zero-cost disclosure
alongside hierarchical enforcement).

### Two Coupled Generators Require Perpetual Alternation

Creative and evaluative processing perpetually give rise to each other.
Neither can cease without starving the other. Design for alternation, not
completion. After intensive creative sessions, schedule evaluative sessions
(test predictions, audit lessons, prune dead weight). The generator balance
discipline: run /retrospect every 5 sessions.

### Unified Feedback Consumers Outperform Isolated Signals

Write-only signal stores (trigger_activations, disclosures, predictions,
carryover) provide zero operational value until a consumer reads them.
Combining multiple signals into a single scan reveals cross-signal patterns
invisible to individual queries. A domain with high disclosure uncertainty
AND low expectation accuracy AND chronic carryover points to a systematic
competence gap.

### Single-Pass Evaluation Inflates Perceived Thoroughness

Finding an issue and immediately fixing it in the same pass creates a
halo effect. "53 findings, 37 fixed" in one session carries lower
confidence than "53 findings (session A), 37 verified fixed (session B)."
Independent audit in a separate session provides more reliable verification.

### Crystallization Thresholds Prevent Premature Automation (3+3+10)

3 recurrences → convention candidate. 3 more post-graduation → hook candidate
(convention got fair trial). 0 false positives for 10+ sessions → invariant
candidate. Only patterns that resist softer enforcement advance to harder
enforcement. Each stage earns its place through demonstrated necessity.

### Deployment Requires Endpoint Verification, Not Trust in ACK

A transport ACK or PR title claiming "published" does not mean content reached
the live site. Deployment pipelines fail silently — content reaches the repo
but CI/CD does not trigger or fails. Verification requires checking the actual
endpoint (WebFetch, curl, browser), not the transport acknowledgment.
