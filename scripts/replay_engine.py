#!/usr/bin/env python3
"""replay_engine.py — Hippocampal replay consolidation engine (Phase 3).

Theoretical source: docs/event-sourced-memory.md §2.3-2.4
Mitigations: B3 forgetting curve (exp decay), B6 synaptic homeostasis
(normalize + prune). See §3.1 for biological grounding.
"""
import argparse, json, math, os, sqlite3
from collections import defaultdict
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
SHARED_DIR = PROJECT_ROOT / "mesh" / "memory" / "shared"
DECAY_LAMBDA = 0.1       # forgetting rate — B3 mitigation (Ebbinghaus, 1885)
CO_OCCUR_WINDOW = 30     # seconds — one response cycle (§2.4)
PRUNE_THRESHOLD = 0.05   # synaptic pruning floor — B6 (Huttenlocher, 1979)


def _parse_ts(ts_str: str) -> datetime:
    try: return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    except ValueError: return datetime.now()

def _payload(raw) -> dict:
    if isinstance(raw, dict): return raw
    try: return json.loads(raw)
    except (json.JSONDecodeError, TypeError): return {}

def _decay(cur: int, ev_s) -> float:
    return math.exp(-DECAY_LAMBDA * (cur - (ev_s or 0)))


def load_events(db_path: str, lookback: int) -> tuple[list[dict], int]:
    """Load unconsolidated events within the lookback window."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    current = conn.execute(
        "SELECT COALESCE(MAX(session_id), 0) FROM event_log"
    ).fetchone()[0]
    rows = conn.execute(
        "SELECT * FROM event_log WHERE consolidated = 0 AND session_id >= ?",
        (max(0, current - lookback),),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows], current


def analyze_co_occurrence(events: list[dict], current_session: int) -> dict:
    """Analyzer 1 — Hebbian: co-occurrence within CO_OCCUR_WINDOW,
    time-weighted decay, homeostatic normalization, pruning."""
    matrix = defaultdict(float)
    by_time = sorted(events, key=lambda e: e["timestamp"])
    for i, ev_a in enumerate(by_time):
        ts_a, decay_a = _parse_ts(ev_a["timestamp"]), _decay(current_session, ev_a.get("session_id"))
        for j in range(i + 1, len(by_time)):
            ev_b = by_time[j]
            if (_parse_ts(ev_b["timestamp"]) - ts_a).total_seconds() > CO_OCCUR_WINDOW:
                break
            weight = (decay_a + _decay(current_session, ev_b.get("session_id"))) / 2.0
            pair = tuple(sorted([ev_a["event_type"], ev_b["event_type"]]))
            matrix[pair] += weight
    # B6: synaptic homeostasis — normalize to constant total then prune
    total = sum(matrix.values()) or 1.0
    return {
        f"{a}|{b}": round(v / total, 4)
        for (a, b), v in matrix.items()
        if v / total >= PRUNE_THRESHOLD
    }


def analyze_governance(events: list[dict], current_session: int) -> dict:
    """Analyzer 4 — governance effectiveness: fire_rate + result distribution."""
    session_count = len({e.get("session_id") for e in events if e.get("session_id")}) or 1
    per_trigger = defaultdict(lambda: {"fires": 0.0, "results": defaultdict(int)})
    for ev in (e for e in events if e["event_type"] == "trigger_fired"):
        payload = _payload(ev.get("payload", "{}"))
        tid = payload.get("trigger", "unknown")
        per_trigger[tid]["fires"] += _decay(current_session, ev.get("session_id"))
        per_trigger[tid]["results"][payload.get("result", "UNKNOWN")] += 1
    return {
        tid: {
            "fire_rate": round(d["fires"] / session_count, 3),
            "result_distribution": dict(d["results"]),
            "total_fires": sum(d["results"].values()),
        }
        for tid, d in per_trigger.items()
    }


def write_results(associations: dict, governance: dict, dry_run: bool):
    """Write consolidated results to mesh/memory/shared/."""
    SHARED_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().isoformat(timespec="seconds")
    outputs = {
        SHARED_DIR / "associations.json": {"updated_at": stamp, "associations": associations},
        SHARED_DIR / "trigger-effectiveness.json": {"updated_at": stamp, "trigger_effectiveness": governance},
    }
    if dry_run:
        print("[dry-run] Would write associations.json and trigger-effectiveness.json")
        return
    for path, data in outputs.items():
        path.write_text(json.dumps(data, indent=2) + "\n")
        print(f"Wrote {path}")


def mark_consolidated(db_path: str, event_ids: list[str], dry_run: bool):
    """Flag processed events as consolidated in event_log."""
    if dry_run or not event_ids:
        return
    conn = sqlite3.connect(db_path)
    conn.execute(
        f"UPDATE event_log SET consolidated = 1 WHERE event_id IN ({','.join('?' for _ in event_ids)})",
        event_ids,
    )
    conn.commit()
    conn.close()


def main():
    parser = argparse.ArgumentParser(description="Hippocampal replay consolidation engine")
    parser.add_argument("--db-path", default=str(PROJECT_ROOT / "state.db"))
    parser.add_argument("--lookback-sessions", type=int, default=5)
    parser.add_argument("--dry-run", action="store_true", help="Analyze without writing results")
    args = parser.parse_args()

    events, current_session = load_events(args.db_path, args.lookback_sessions)
    if not events:
        print("No unconsolidated events found — nothing to replay.")
        return

    associations = analyze_co_occurrence(events, current_session)
    governance = analyze_governance(events, current_session)
    write_results(associations, governance, args.dry_run)
    mark_consolidated(args.db_path, [e["event_id"] for e in events], args.dry_run)

    prefix = "[dry-run] " if args.dry_run else ""
    print(f"\n{prefix}Replay complete:")
    print(f"  Events processed: {len(events)}")
    print(f"  Association pairs: {len(associations)}")
    print(f"  Triggers tracked: {len(governance)}")
    for tid, m in sorted(governance.items()):
        print(f"    {tid}: rate={m['fire_rate']}, dist={m['result_distribution']}")


if __name__ == "__main__":
    main()
