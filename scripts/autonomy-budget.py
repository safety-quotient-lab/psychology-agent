#!/usr/bin/env python3
"""
autonomy-budget.py — Autonomy budget management for autonomous agent operation.

Commands:
    status              Show current budget for all agents
    reset [agent_id]    Reset budget after human audit (interactive)
    history [agent_id]  Show recent autonomous actions
    pause-all           Zero all agent budgets (soft circuit breaker)
    resume-all          Restore all agent budgets to maximum

Usage:
    python3 scripts/autonomy-budget.py status
    python3 scripts/autonomy-budget.py reset psychology-agent
    python3 scripts/autonomy-budget.py history safety-quotient-agent
    python3 scripts/autonomy-budget.py pause-all
    python3 scripts/autonomy-budget.py resume-all
"""
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "state.db"


def get_conn() -> sqlite3.Connection:
    if not DB_PATH.exists():
        print(f"ERROR: state.db not found at {DB_PATH}", file=sys.stderr)
        print("Run: python3 scripts/bootstrap_state_db.py --force", file=sys.stderr)
        sys.exit(1)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def cmd_status() -> None:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM autonomy_budget ORDER BY agent_id").fetchall()
    if not rows:
        print("No autonomy budget entries found.")
        print("Budget entries are created on first autonomous sync run.")
        return

    print("Autonomy Budget Status")
    print("─" * 60)
    for row in rows:
        cutoff = row["budget_cutoff"]
        spent = row["budget_spent"]
        if cutoff == 0:
            status = "UNLIMITED"
        elif spent >= cutoff:
            status = "HALTED"
        else:
            status = "ACTIVE"
        print(f"  Agent:       {row['agent_id']}")
        print(f"  Budget:      {spent} spent / {cutoff} cutoff  [{status}]")
        print(f"  Last audit:  {row['last_audit']}")
        print(f"  Last action: {row['last_action'] or 'none'}")
        print(f"  Consec. blocks: {row['consecutive_blocks']}")
        print()

    conn.close()


def cmd_reset(agent_id: str) -> None:
    conn = get_conn()

    row = conn.execute(
        "SELECT * FROM autonomy_budget WHERE agent_id = ?", (agent_id,)
    ).fetchone()
    if not row:
        print(f"No budget entry for '{agent_id}'.", file=sys.stderr)
        sys.exit(1)

    # Show actions since last audit
    actions = conn.execute("""
        SELECT * FROM autonomous_actions
        WHERE agent_id = ? AND created_at > ?
        ORDER BY created_at
    """, (agent_id, row["last_audit"])).fetchall()

    print(f"Actions since last audit ({row['last_audit']}):")
    print("─" * 60)
    if not actions:
        print("  (none)")
    else:
        for action in actions:
            marker = "✓" if action["evaluator_result"] == "approved" else "✗"
            print(f"  {marker} [{action['created_at']}] "
                  f"T{action['evaluator_tier']} {action['action_type']}: "
                  f"{action['description'][:60]}")
            print(f"    Result: {action['evaluator_result']}  "
                  f"Budget: {action['budget_before']} → {action['budget_after']}")

    print()
    print(f"Current budget: {row['budget_spent']} spent / {row['budget_cutoff']} cutoff")
    print()

    answer = input("Reset spend counter to zero? [y/N] ").strip().lower()
    if answer != "y":
        print("Aborted.")
        return

    conn.execute("""
        UPDATE autonomy_budget
        SET budget_spent = 0,
            consecutive_blocks = 0,
            last_audit = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
            updated_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
        WHERE agent_id = ?
    """, (agent_id,))
    conn.commit()

    new_row = conn.execute(
        "SELECT * FROM autonomy_budget WHERE agent_id = ?", (agent_id,)
    ).fetchone()
    print(f"Budget reset: {new_row['budget_spent']} spent / {new_row['budget_cutoff']} cutoff")
    print(f"Last audit updated: {new_row['last_audit']}")
    conn.close()


def cmd_history(agent_id: str) -> None:
    conn = get_conn()
    actions = conn.execute("""
        SELECT * FROM autonomous_actions
        WHERE agent_id = ?
        ORDER BY created_at DESC
        LIMIT 20
    """, (agent_id,)).fetchall()

    if not actions:
        print(f"No autonomous actions recorded for '{agent_id}'.")
        return

    print(f"Recent actions for {agent_id} (last 20):")
    print("─" * 60)
    for action in actions:
        marker = "✓" if action["evaluator_result"] == "approved" else "✗"
        print(f"  {marker} [{action['created_at']}] "
              f"T{action['evaluator_tier']} {action['action_class']}/{action['action_type']}")
        print(f"    {action['description'][:70]}")
        print(f"    Budget: {action['budget_before']} → {action['budget_after']}")

    conn.close()


def cmd_pause_all() -> None:
    """Zero all agent budgets — soft circuit breaker via budget exhaustion."""
    conn = get_conn()
    rows = conn.execute("SELECT * FROM autonomy_budget ORDER BY agent_id").fetchall()
    if not rows:
        print("No autonomy budget entries found — nothing to pause.")
        return

    updated = 0
    for row in rows:
        cutoff = row["budget_cutoff"]
        spent = row["budget_spent"]
        if cutoff == 0 or spent < cutoff:
            # Set spent equal to cutoff to exhaust the budget (or set cutoff=1, spent=1 if unlimited)
            new_cutoff = cutoff if cutoff > 0 else 1
            conn.execute("""
                UPDATE autonomy_budget
                SET budget_spent = budget_cutoff,
                    budget_cutoff = CASE WHEN budget_cutoff = 0 THEN 1 ELSE budget_cutoff END,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
                WHERE agent_id = ?
            """, (row["agent_id"],))
            print(f"  {row['agent_id']}: budget exhausted (spent={new_cutoff}, cutoff={new_cutoff})")
            updated += 1
        else:
            print(f"  {row['agent_id']}: already exhausted")

    conn.commit()
    conn.close()
    print(f"\nPaused {updated} agent(s). All autonomous actions will halt at next sync cycle.")
    print("Use 'resume-all' to restore budgets.")


def cmd_resume_all() -> None:
    """Restore all agent budgets to maximum — lift soft circuit breaker."""
    conn = get_conn()
    rows = conn.execute("SELECT * FROM autonomy_budget ORDER BY agent_id").fetchall()
    if not rows:
        print("No autonomy budget entries found — nothing to resume.")
        return

    updated = 0
    for row in rows:
        if row["budget_spent"] > 0:
            conn.execute("""
                UPDATE autonomy_budget
                SET budget_spent = 0,
                    consecutive_blocks = 0,
                    last_audit = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
                    updated_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
                WHERE agent_id = ?
            """, (row["agent_id"],))
            print(f"  {row['agent_id']}: spend counter reset (was {row['budget_spent']}, cutoff={row['budget_cutoff']})")
            updated += 1
        else:
            print(f"  {row['agent_id']}: already at zero spend")

    conn.commit()
    conn.close()
    print(f"\nResumed {updated} agent(s). Autonomous actions will proceed at next sync cycle.")


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    command = sys.argv[1]
    if command == "status":
        cmd_status()
    elif command == "reset":
        if len(sys.argv) < 3:
            print("Usage: autonomy-budget.py reset <agent_id>", file=sys.stderr)
            sys.exit(1)
        cmd_reset(sys.argv[2])
    elif command == "history":
        if len(sys.argv) < 3:
            print("Usage: autonomy-budget.py history <agent_id>", file=sys.stderr)
            sys.exit(1)
        cmd_history(sys.argv[2])
    elif command == "pause-all":
        cmd_pause_all()
    elif command == "resume-all":
        cmd_resume_all()
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
