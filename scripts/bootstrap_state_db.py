#!/usr/bin/env python3
"""
bootstrap_state_db.py — Psychology Agent SQLite State Layer Bootstrap

Seeds state.db from markdown and transport JSON source files.
Run from project root: python scripts/bootstrap_state_db.py

Requires: Python 3.10+ (stdlib only — sqlite3, json, pathlib, re, datetime)

Phase 1 contract: markdown = source of truth, DB = queryable index.
Recovery: re-run this script to rebuild DB from files if state.db is
missing or corrupt.
"""
import argparse
import json
import re
import sqlite3
import sys
from datetime import date
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "state.db"
SCHEMA_PATH = PROJECT_ROOT / "scripts" / "schema.sql"

WARNINGS: list[str] = []


def warn(msg: str) -> None:
    WARNINGS.append(msg)
    print(f"  ⚠  {msg}", file=sys.stderr)


def today_iso() -> str:
    return date.today().isoformat()


def kebab(text: str) -> str:
    """Convert a display name to a deterministic kebab-case key."""
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9\s/-]", "", text)
    text = re.sub(r"[\s/]+", "-", text)
    text = re.sub(r"-{2,}", "-", text)
    return text.strip("-")[:80]


# ──────────────────────────────────────────────────────────────────────────────
# DB SETUP
# ──────────────────────────────────────────────────────────────────────────────

def setup_db(force: bool) -> sqlite3.Connection:
    if not SCHEMA_PATH.exists():
        print(f"ERROR: schema not found at {SCHEMA_PATH}", file=sys.stderr)
        sys.exit(1)

    if DB_PATH.exists():
        if not force:
            answer = input(f"state.db already exists at {DB_PATH}. Overwrite? [y/N] ").strip().lower()
            if answer != "y":
                print("Aborted.")
                sys.exit(0)
        DB_PATH.unlink()

    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA_PATH.read_text())
    conn.commit()
    return conn


# ──────────────────────────────────────────────────────────────────────────────
# 1. TRANSPORT MESSAGES
# ──────────────────────────────────────────────────────────────────────────────

def load_transport_messages(conn: sqlite3.Connection) -> int:
    transport_root = PROJECT_ROOT / "transport" / "sessions"
    if not transport_root.exists():
        warn("transport/sessions/ not found — skipping transport_messages")
        return 0

    count = 0
    for json_file in sorted(transport_root.glob("**/*.json")):
        try:
            raw = json_file.read_text(encoding="utf-8")
            data = json.loads(raw)

            # Only index interagent/v1 protocol messages
            if data.get("schema") != "interagent/v1":
                continue

            session_name = json_file.parent.name
            filename = json_file.name
            turn = data.get("turn", 0)
            message_type = data.get("message_type", "")
            from_agent = (data.get("from") or {}).get("agent_id", "unknown")
            to_agent = (data.get("to") or {}).get("agent_id", "unknown")
            timestamp = data.get("timestamp", "")
            subject = (data.get("payload") or {}).get("subject", "")
            claims_list = data.get("claims") or []
            claims_count = len(claims_list)
            setl = data.get("setl")
            urgency = data.get("urgency", "normal")

            conn.execute("""
                INSERT OR IGNORE INTO transport_messages
                    (session_name, filename, turn, message_type, from_agent, to_agent,
                     timestamp, subject, claims_count, setl, urgency,
                     processed, processed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
            """, (session_name, filename, turn, message_type, from_agent, to_agent,
                  timestamp, subject, claims_count, setl, urgency, today_iso()))

            msg_row = conn.execute(
                "SELECT id FROM transport_messages WHERE filename = ?", (filename,)
            ).fetchone()
            if msg_row is None:
                continue
            msg_id = msg_row[0]

            # Index claims
            for claim in claims_list:
                conn.execute("""
                    INSERT OR IGNORE INTO claims
                        (transport_msg, claim_id, claim_text, confidence, confidence_basis, verified)
                    VALUES (?, ?, ?, ?, ?, FALSE)
                """, (msg_id,
                      claim.get("claim_id", ""),
                      claim.get("text", "")[:2000],
                      claim.get("confidence"),
                      (claim.get("confidence_basis") or "")[:500]))

            # Index epistemic flags
            for flag in (data.get("epistemic_flags") or []):
                conn.execute("""
                    INSERT INTO epistemic_flags (source, flag_text, resolved)
                    VALUES (?, ?, FALSE)
                """, (filename, str(flag)[:2000]))

            count += 1

        except Exception as exc:
            warn(f"transport {json_file.name}: {exc}")

    conn.commit()
    return count


# ──────────────────────────────────────────────────────────────────────────────
# 2. DESIGN DECISIONS (docs/architecture.md)
# ──────────────────────────────────────────────────────────────────────────────

# The Design Decisions section in architecture.md is a code-block (```) containing
# a fixed-width text table. The decision-name column is ~28 chars wide; the choice
# column starts at position 28+. Entries are separated by blank lines within the block.
# Separator lines consist entirely of ─ or space characters.
# Some entries include "Decided: YYYY-MM-DD" embedded in the choice text.

DECISION_SPLIT_COL = 28
DECIDED_RE = re.compile(r"\bDecided:\s*(\d{4}-\d{2}-\d{2})")
SEPARATOR_RE = re.compile(r"^[\s─━\-]+$")


def _parse_architecture_decisions(arch_path: Path) -> list[tuple[str, str, str]]:
    """
    Returns list of (decision_name, choice_text, decided_date).
    decided_date is "2026-03-01" (project start) when not explicit in source.
    """
    text = arch_path.read_text(encoding="utf-8")
    lines = text.splitlines()

    # Locate the Design Decisions code block
    in_section = False
    in_code = False
    table_lines: list[str] = []
    for line in lines:
        if "## Design Decisions" in line:
            in_section = True
            continue
        if in_section and not in_code and line.strip() == "```":
            in_code = True
            continue
        if in_section and in_code and line.strip() == "```":
            break
        if in_code:
            table_lines.append(line)

    if not table_lines:
        return []

    # Group table lines into per-entry blocks (blank lines separate entries).
    # Separator lines (all ─) are discarded.
    blocks: list[list[str]] = []
    current_block: list[str] = []
    for line in table_lines:
        if SEPARATOR_RE.match(line):
            if current_block:
                blocks.append(current_block)
                current_block = []
            continue
        if not line.strip():
            if current_block:
                blocks.append(current_block)
                current_block = []
            continue
        current_block.append(line)
    if current_block:
        blocks.append(current_block)

    entries: list[tuple[str, str, str]] = []
    for block in blocks:
        name_parts: list[str] = []
        value_parts: list[str] = []
        for line in block:
            left = line[:DECISION_SPLIT_COL].strip()
            right = line[DECISION_SPLIT_COL:].strip() if len(line) > DECISION_SPLIT_COL else ""
            if left and left not in ("Decision", "Choice"):
                name_parts.append(left)
            if right:
                value_parts.append(right)

        name = " ".join(name_parts).strip()
        choice = " ".join(value_parts).strip()

        if not name or name in ("Decision", "Choice"):
            continue

        m = DECIDED_RE.search(choice)
        decided_date = m.group(1) if m else "2026-03-01"
        clean_choice = DECIDED_RE.sub("", choice).strip().rstrip(".")

        entries.append((name, clean_choice, decided_date))

    return entries


def load_decisions(conn: sqlite3.Connection) -> int:
    arch_path = PROJECT_ROOT / "docs" / "architecture.md"
    if not arch_path.exists():
        warn("docs/architecture.md not found — skipping decision_chain")
        return 0

    count = 0
    for name, choice, decided_date in _parse_architecture_decisions(arch_path):
        decision_key = kebab(name)
        if not decision_key:
            continue
        try:
            conn.execute("""
                INSERT OR IGNORE INTO decision_chain
                    (decision_key, decision_text, evidence_source, decided_date)
                VALUES (?, ?, ?, ?)
            """, (decision_key, choice[:2000], "docs/architecture.md", decided_date))
            count += 1
        except Exception as exc:
            warn(f"decision_chain {decision_key!r}: {exc}")

    conn.commit()
    return count


# ──────────────────────────────────────────────────────────────────────────────
# 3. MEMORY ENTRIES (docs/memory-snapshots/*.md)
# ──────────────────────────────────────────────────────────────────────────────

BOLD_KEY_RE = re.compile(r"^\*\*(.+?):\*\*\s*(.*)")
STATUS_RE = re.compile(r"[✓✗⚑]")

TOPIC_DOMAIN_MAP: dict[str, str] = {
    "psq-status": "psychometrics",
    "decisions": "design",
    "cogarch": "cognitive-architecture",
}

WORK_STREAM_PREFIXES: list[tuple[str, str]] = [
    ("b3-", "psq-scoring/b3"),
    ("b4-", "psq-scoring/b4"),
    ("b5r-", "psq-scoring/b5"),
    ("b5s-", "psq-scoring/b5"),
    ("b5-", "psq-scoring/b5"),
    ("di-", "dignity/phase-a"),
    ("sl-", "state-layer/sl-1"),
]


def _detect_status(text: str) -> str | None:
    m = STATUS_RE.search(text)
    return m.group(0) if m else None


def _parse_bold_key_lines(text: str) -> list[tuple[str, str]]:
    """Parse **Key:** value pairs, handling multi-line values."""
    entries: list[tuple[str, str]] = []
    current_key: str | None = None
    current_val_parts: list[str] = []

    for line in text.splitlines():
        m = BOLD_KEY_RE.match(line)
        if m:
            if current_key:
                entries.append((current_key, " ".join(current_val_parts).strip()))
            current_key = m.group(1).strip()
            val = m.group(2).strip()
            current_val_parts = [val] if val else []
        elif current_key and line.startswith((" ", "\t")) and line.strip():
            current_val_parts.append(line.strip())
        elif current_key and not line.strip():
            entries.append((current_key, " ".join(current_val_parts).strip()))
            current_key = None
            current_val_parts = []

    if current_key:
        entries.append((current_key, " ".join(current_val_parts).strip()))

    return entries


def _parse_decisions_snapshot_table(text: str) -> list[tuple[str, str]]:
    """
    Parse the fixed-width code-block table from docs/memory-snapshots/decisions.md.
    Same column layout as architecture.md but without "Decided:" dates.
    """
    in_block = False
    table_lines: list[str] = []
    for line in text.splitlines():
        if not in_block and line.strip() == "```":
            in_block = True
            continue
        if in_block and line.strip() == "```":
            break
        if in_block:
            table_lines.append(line)

    entries: list[tuple[str, str]] = []
    current_name_parts: list[str] = []
    current_val_parts: list[str] = []

    def flush() -> None:
        if current_name_parts:
            entries.append((" ".join(current_name_parts), " ".join(current_val_parts)))
        current_name_parts.clear()
        current_val_parts.clear()

    for line in table_lines:
        if SEPARATOR_RE.match(line) or not line.strip():
            flush()
            continue
        left = line[:DECISION_SPLIT_COL].strip()
        right = line[DECISION_SPLIT_COL:].strip() if len(line) > DECISION_SPLIT_COL else ""
        if left and left not in ("Decision", "Choice"):
            if not current_name_parts:
                current_name_parts.append(left)
            else:
                current_name_parts.append(left)
            if right:
                current_val_parts.append(right)
        elif not left and right:
            current_val_parts.append(right)

    flush()
    return entries


def load_memory_entries(conn: sqlite3.Connection) -> int:
    snapshots_dir = PROJECT_ROOT / "docs" / "memory-snapshots"
    if not snapshots_dir.exists():
        warn("docs/memory-snapshots/ not found — skipping memory_entries")
        return 0

    count = 0
    for md_file in sorted(snapshots_dir.glob("*.md")):
        topic = md_file.stem
        text = md_file.read_text(encoding="utf-8")

        if topic == "decisions":
            pairs = _parse_decisions_snapshot_table(text)
        else:
            # psq-status and cogarch both use **bold key:** value format
            pairs = _parse_bold_key_lines(text)

        for display_key, value in pairs:
            if not display_key or not value:
                continue
            entry_key = kebab(display_key)
            if not entry_key:
                continue
            status = _detect_status(value)
            try:
                conn.execute("""
                    INSERT OR IGNORE INTO memory_entries
                        (topic, entry_key, value, status, last_confirmed)
                    VALUES (?, ?, ?, ?, ?)
                """, (topic, entry_key, value[:2000], status, today_iso()))
                count += 1
            except Exception as exc:
                warn(f"memory_entries {topic}/{entry_key}: {exc}")

    conn.commit()
    return count


# ──────────────────────────────────────────────────────────────────────────────
# 4. PSQ STATUS (typed columns)
# ──────────────────────────────────────────────────────────────────────────────

VERSION_RE = re.compile(r"\bv(\d+)\b")
CALIBRATION_RE = re.compile(r"(quantile-binned[\w-]+|isotonic[\w-]+|calibration-v\d[\w-]*)", re.I)
URL_RE = re.compile(r"https?://[^\s\]\)>]+")
SESSION_RE = re.compile(r"\bSession\s+(\d+)\b")


def load_psq_status(conn: sqlite3.Connection) -> int:
    src = PROJECT_ROOT / "docs" / "memory-snapshots" / "psq-status.md"
    if not src.exists():
        warn("docs/memory-snapshots/psq-status.md not found — skipping psq_status")
        return 0

    pairs = _parse_bold_key_lines(src.read_text(encoding="utf-8"))
    count = 0

    for display_key, value in pairs:
        if not display_key or not value:
            continue
        entry_key = kebab(display_key)
        if not entry_key:
            continue

        status_marker = _detect_status(value)

        # model_version: vNN pattern, only when "model" or "version" in key
        model_version: str | None = None
        if any(w in display_key.lower() for w in ("model", "version")):
            m = VERSION_RE.search(value)
            if m:
                model_version = f"v{m.group(1)}"

        # calibration_id
        calibration_id: str | None = None
        m = CALIBRATION_RE.search(value)
        if m:
            calibration_id = m.group(1)

        # endpoint_url
        endpoint_url: str | None = None
        m = URL_RE.search(value)
        if m:
            endpoint_url = m.group(0).rstrip(".,;)")

        # resolved_session
        resolved_session: int | None = None
        m = SESSION_RE.search(value)
        if m:
            resolved_session = int(m.group(1))

        try:
            conn.execute("""
                INSERT OR IGNORE INTO psq_status
                    (entry_key, value, status_marker, model_version, calibration_id,
                     endpoint_url, resolved_session, last_confirmed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (entry_key, value[:2000], status_marker, model_version,
                  calibration_id, endpoint_url, resolved_session, today_iso()))
            count += 1
        except Exception as exc:
            warn(f"psq_status {entry_key}: {exc}")

    conn.commit()
    return count


# ──────────────────────────────────────────────────────────────────────────────
# 5. ENTRY FACETS
# ──────────────────────────────────────────────────────────────────────────────

def load_entry_facets(conn: sqlite3.Connection) -> int:
    rows = conn.execute(
        "SELECT id, topic, entry_key, value FROM memory_entries"
    ).fetchall()

    count = 0
    for entry_id, topic, entry_key, value in rows:
        facets: list[tuple[str, str]] = []

        # domain facet — always added (every entry gets exactly one)
        domain = TOPIC_DOMAIN_MAP.get(topic, "operations")
        facets.append(("domain", domain))

        # work_stream facet — from entry_key prefix
        for prefix, stream in WORK_STREAM_PREFIXES:
            if entry_key.startswith(prefix):
                facets.append(("work_stream", stream))
                break

        # agent facet — from content
        combined = f"{entry_key} {value}".lower()
        if any(tag in combined for tag in (
            "psq-sub-agent", "psq sub-agent",
            "safety-quotient", "psq-agent", "psq agent",
        )):
            facets.append(("agent", "psq-agent"))
        elif "unratified" in combined:
            facets.append(("agent", "unratified-agent"))
        else:
            facets.append(("agent", "psychology-agent"))

        for facet_type, facet_value in facets:
            try:
                conn.execute("""
                    INSERT OR IGNORE INTO entry_facets (entry_id, facet_type, facet_value)
                    VALUES (?, ?, ?)
                """, (entry_id, facet_type, facet_value))
                count += 1
            except Exception as exc:
                warn(f"entry_facets {entry_id}/{facet_type}: {exc}")

    conn.commit()
    return count


# ──────────────────────────────────────────────────────────────────────────────
# 6. SESSION LOG (lab-notebook.md)
# ──────────────────────────────────────────────────────────────────────────────

# Matches formats seen in lab-notebook.md:
#   ## 2026-03-01 — Session 1 (summary)
#   ## 2026-03-05T11:45 CST — Session 11 (summary)
#   ## 2026-03-05T14:10 CST — Session 12 (summary)
SESSION_HEADER_RE = re.compile(
    r"^## "
    r"(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?(?:[+-]\d{2}:?\d{2}|\s*\w+)?)?)"
    r"\s*[—\-]+\s*"
    r"Session\s+(\d+)"
    r"\s*\((.+?)\)"
)


def load_session_log(conn: sqlite3.Connection) -> int:
    nb_path = PROJECT_ROOT / "lab-notebook.md"
    if not nb_path.exists():
        warn("lab-notebook.md not found — skipping session_log")
        return 0

    count = 0
    for line in nb_path.read_text(encoding="utf-8").splitlines():
        m = SESSION_HEADER_RE.match(line)
        if not m:
            continue
        timestamp_str = m.group(1).strip()
        session_id = int(m.group(2))
        summary = m.group(3).strip()
        try:
            conn.execute("""
                INSERT OR IGNORE INTO session_log (id, timestamp, summary)
                VALUES (?, ?, ?)
            """, (session_id, timestamp_str, summary))
            count += 1
        except Exception as exc:
            warn(f"session_log session {session_id}: {exc}")

    conn.commit()
    return count


# ──────────────────────────────────────────────────────────────────────────────
# 7. TRIGGER STATE (docs/cognitive-triggers.md)
# ──────────────────────────────────────────────────────────────────────────────

TRIGGER_HEADING_RE = re.compile(r"^## (T\d+):\s+(.+)")


def load_triggers(conn: sqlite3.Connection) -> int:
    ct_path = PROJECT_ROOT / "docs" / "cognitive-triggers.md"
    if not ct_path.exists():
        warn("docs/cognitive-triggers.md not found — skipping trigger_state")
        return 0

    count = 0
    for line in ct_path.read_text(encoding="utf-8").splitlines():
        m = TRIGGER_HEADING_RE.match(line)
        if not m:
            continue
        trigger_id = m.group(1)
        description = m.group(2).strip()
        try:
            conn.execute("""
                INSERT OR IGNORE INTO trigger_state (trigger_id, description)
                VALUES (?, ?)
            """, (trigger_id, description))
            count += 1
        except Exception as exc:
            warn(f"trigger_state {trigger_id}: {exc}")

    conn.commit()
    return count


# ──────────────────────────────────────────────────────────────────────────────
# VALIDATION
# ──────────────────────────────────────────────────────────────────────────────

def validate(conn: sqlite3.Connection) -> list[str]:
    """Run sanity checks. Returns list of failure descriptions.

    Detects fresh installs (no transport session directories) and applies
    structural-only thresholds. Data-dependent thresholds engage only when
    transport history exists — prevents false failures for adopters.
    """
    failures: list[str] = []

    # Detect fresh install: no session directories under transport/sessions/
    sessions_dir = PROJECT_ROOT / "transport" / "sessions"
    has_history = (
        sessions_dir.exists()
        and any(p.is_dir() for p in sessions_dir.iterdir())
    )
    fresh_install = not has_history
    if fresh_install:
        print("  ℹ  Fresh install detected (no transport sessions) — "
              "applying structural-only thresholds")

    # Thresholds: (full, fresh) — fresh install uses relaxed minimums
    checks: list[tuple[str, str, int, int]] = [
        # (SQL fragment, label, min_with_history, min_fresh)
        ("transport_messages WHERE from_agent IN ('psq-sub-agent', 'psq-agent')",
         "safety-quotient agent outbound messages indexed", 15, 0),
        ("transport_messages",
         "total transport messages indexed", 40, 0),
        ("psq_status WHERE model_version IS NOT NULL",
         "psq_status rows with typed model_version", 1, 0),
        ("psq_status WHERE calibration_id IS NOT NULL",
         "psq_status rows with typed calibration_id", 1, 0),
        ("entry_facets WHERE facet_type='domain' AND facet_value='psychometrics'",
         "psychometrics domain facets", 1, 0),
        ("entry_facets ef "
         "JOIN memory_entries me ON ef.entry_id = me.id "
         "WHERE ef.facet_type = 'domain'",
         "memory_entries with domain facet", 5, 0),
        ("trigger_state",
         "triggers indexed", 10, 1),
        ("session_log",
         "lab-notebook sessions indexed", 20, 0),
        ("decision_chain",
         "design decisions indexed", 10, 1),
    ]

    for sql_from, label, min_with_history, min_fresh in checks:
        min_count = min_fresh if fresh_install else min_with_history
        n = conn.execute(f"SELECT COUNT(*) FROM {sql_from}").fetchone()[0]
        marker = "✓" if n >= min_count else "✗"
        print(f"  {marker}  {label}: {n} (min {min_count})")
        if n < min_count:
            failures.append(f"{label}: got {n}, expected >= {min_count}")

    return failures


# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Bootstrap state.db from markdown and transport files."
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Overwrite existing state.db without interactive prompt"
    )
    args = parser.parse_args()

    print(f"bootstrap_state_db.py — {PROJECT_ROOT}")
    print(f"Schema: {SCHEMA_PATH}")
    print(f"Output: {DB_PATH}")
    print()

    conn = setup_db(args.force)

    print("1. Transport messages (transport/sessions/**/*.json) ...")
    n_transport = load_transport_messages(conn)
    print(f"   → {n_transport} messages indexed")

    print("2. Design decisions (docs/architecture.md) ...")
    n_decisions = load_decisions(conn)
    print(f"   → {n_decisions} decisions indexed")

    print("3. Memory entries (docs/memory-snapshots/*.md) ...")
    n_memory = load_memory_entries(conn)
    print(f"   → {n_memory} entries indexed")

    print("4. PSQ status typed fields (psq-status.md) ...")
    n_psq = load_psq_status(conn)
    print(f"   → {n_psq} psq_status rows")

    print("5. Entry facets (derived from memory_entries) ...")
    n_facets = load_entry_facets(conn)
    print(f"   → {n_facets} facets derived")

    print("6. Session log (lab-notebook.md) ...")
    n_sessions = load_session_log(conn)
    print(f"   → {n_sessions} sessions indexed")

    print("7. Trigger state (docs/cognitive-triggers.md) ...")
    n_triggers = load_triggers(conn)
    print(f"   → {n_triggers} triggers indexed")

    print()
    print("Validation:")
    failures = validate(conn)

    print()
    print("Summary")
    print("───────────────────────────────")
    print(f"  transport_messages : {n_transport}")
    print(f"  decision_chain     : {n_decisions}")
    print(f"  memory_entries     : {n_memory}")
    print(f"  psq_status         : {n_psq}")
    print(f"  entry_facets       : {n_facets}")
    print(f"  session_log        : {n_sessions}")
    print(f"  trigger_state      : {n_triggers}")

    if WARNINGS:
        print(f"\n  Warnings ({len(WARNINGS)}):")
        for w in WARNINGS:
            print(f"    ⚠  {w}")

    conn.close()

    if failures:
        print(f"\n  Validation failures ({len(failures)}):")
        for f_msg in failures:
            print(f"    ✗  {f_msg}")
        print()
        sys.exit(1)
    else:
        print(f"\n  ✓  All validation checks passed")
        print(f"  state.db ready at {DB_PATH}")


if __name__ == "__main__":
    main()
