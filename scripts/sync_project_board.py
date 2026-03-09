#!/usr/bin/env python3
"""
sync_project_board.py — Reconcile TODO.md against a GitHub Projects board.

Called by /cycle (Step 11b) to keep the project board in sync with the
canonical TODO.md task list. Dry-run by default; pass --apply to execute.

Usage:
    python scripts/sync_project_board.py              # dry-run (default)
    python scripts/sync_project_board.py --apply      # execute changes

Requires: Python 3.10+ (stdlib only), gh CLI authenticated
"""
import argparse
import difflib
import json
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
CONFIG_PATH = PROJECT_ROOT / "cogarch.config.json"
TODO_PATH = PROJECT_ROOT / "TODO.md"

MATCH_THRESHOLD = 0.6


# ──────────────────────────────────────────────────────────────────────────────
# DATA STRUCTURES
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class TodoItem:
    """A single item parsed from TODO.md."""
    title: str
    description: str
    done: bool
    raw_line: str


@dataclass
class BoardItem:
    """A single item from the GitHub Projects board."""
    item_id: str
    title: str
    status: str


@dataclass
class ReconciliationAction:
    """A planned change to apply to the board."""
    action: str          # "mark_done", "add", "flag_orphan"
    title: str
    detail: str
    set_done: bool = False  # For "add" actions: set status to Done after creating


@dataclass
class SyncReport:
    """Summary of all reconciliation results."""
    matched: list[str] = field(default_factory=list)
    actions: list[ReconciliationAction] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ──────────────────────────────────────────────────────────────────────────────

def load_config() -> dict:
    """Load project_tracking config from cogarch.config.json."""
    if not CONFIG_PATH.exists():
        print("ERROR: cogarch.config.json not found", file=sys.stderr)
        sys.exit(1)

    with open(CONFIG_PATH) as config_file:
        full_config = json.load(config_file)

    tracking_config = full_config.get("project_tracking")
    if not tracking_config:
        print("ERROR: project_tracking section missing from cogarch.config.json",
              file=sys.stderr)
        sys.exit(1)

    if not tracking_config.get("enabled", False):
        print("Project tracking disabled in config — nothing to do.")
        sys.exit(0)

    return tracking_config


# ──────────────────────────────────────────────────────────────────────────────
# TODO.md PARSING
# ──────────────────────────────────────────────────────────────────────────────

def parse_todo_items() -> list[TodoItem]:
    """Extract checklist items from TODO.md.

    Recognizes:
        - [ ] **Bold title** — description text
        - [x] **Bold title** — description (COMPLETE)
    """
    if not TODO_PATH.exists():
        print("ERROR: TODO.md not found", file=sys.stderr)
        sys.exit(1)

    content = TODO_PATH.read_text()
    items: list[TodoItem] = []
    # Match both **bold** and `backtick` title formats
    # Allow optional parenthetical (e.g., "(Rank 4)") between title and em-dash
    title_pattern = re.compile(
        r"^- \[([ xX])\] (?:\*\*(.+?)\*\*|`(.+?)`)(?:\s*\([^)]*\))?(?:\s*[—–-]\s*(.*))?$",
        re.MULTILINE,
    )

    for match in title_pattern.finditer(content):
        checkbox = match.group(1).strip().lower()
        title = (match.group(2) or match.group(3) or "").strip()
        description = (match.group(4) or "").strip()
        done = checkbox == "x"
        items.append(TodoItem(
            title=title,
            description=description,
            done=done,
            raw_line=match.group(0),
        ))

    return items


# ──────────────────────────────────────────────────────────────────────────────
# GITHUB PROJECTS BOARD QUERIES
# ──────────────────────────────────────────────────────────────────────────────

def run_gh(args: list[str], capture: bool = True) -> subprocess.CompletedProcess:
    """Run a gh CLI command, returning the completed process."""
    command = ["gh"] + args
    result = subprocess.run(
        command,
        capture_output=capture,
        text=True,
    )
    if result.returncode != 0:
        error_text = result.stderr.strip() if result.stderr else f"exit code {result.returncode}"
        raise RuntimeError(f"gh command failed: {' '.join(command)}\n{error_text}")
    return result


def fetch_board_items(project_number: int, owner: str) -> list[BoardItem]:
    """Fetch all items from the GitHub Projects board via gh CLI."""
    result = run_gh([
        "project", "item-list", str(project_number),
        "--owner", owner,
        "--format", "json",
    ])
    data = json.loads(result.stdout)
    items: list[BoardItem] = []

    for entry in data.get("items", []):
        item_id = entry.get("id", "")
        title = entry.get("title", "")
        status = entry.get("status", "")
        items.append(BoardItem(item_id=item_id, title=title, status=status))

    return items


def fetch_project_id(project_number: int, owner: str) -> str:
    """Query the project node ID needed for GraphQL mutations."""
    query = """
    query($owner: String!, $number: Int!) {
      organization(login: $owner) {
        projectV2(number: $number) {
          id
        }
      }
    }
    """
    result = run_gh([
        "api", "graphql",
        "-f", f"query={query}",
        "-f", f"owner={owner}",
        "-F", f"number={project_number}",
    ])
    data = json.loads(result.stdout)

    # Try organization first, then user
    org_data = data.get("data", {}).get("organization")
    if org_data and org_data.get("projectV2"):
        return org_data["projectV2"]["id"]

    # Fallback: query as user
    user_query = """
    query($owner: String!, $number: Int!) {
      user(login: $owner) {
        projectV2(number: $number) {
          id
        }
      }
    }
    """
    result = run_gh([
        "api", "graphql",
        "-f", f"query={user_query}",
        "-f", f"owner={owner}",
        "-F", f"number={project_number}",
    ])
    data = json.loads(result.stdout)
    user_data = data.get("data", {}).get("user")
    if user_data and user_data.get("projectV2"):
        return user_data["projectV2"]["id"]

    raise RuntimeError(f"Could not find project #{project_number} for owner '{owner}'")


def fetch_status_field(project_id: str) -> tuple[str, dict[str, str]]:
    """Fetch the Status field ID and its option IDs from the project.

    Returns:
        (field_id, {option_name: option_id})
    """
    query = """
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 50) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
    """
    result = run_gh([
        "api", "graphql",
        "-f", f"query={query}",
        "-f", f"projectId={project_id}",
    ])
    data = json.loads(result.stdout)
    fields = data.get("data", {}).get("node", {}).get("fields", {}).get("nodes", [])

    for field_node in fields:
        if field_node.get("name") == "Status":
            field_id = field_node["id"]
            options = {
                option["name"]: option["id"]
                for option in field_node.get("options", [])
            }
            return field_id, options

    raise RuntimeError("Status field not found on project board")


def add_item_to_board(project_number: int, owner: str, title: str) -> str:
    """Add a new item to the project board. Returns the item ID."""
    result = run_gh([
        "project", "item-create", str(project_number),
        "--owner", owner,
        "--title", title,
        "--format", "json",
    ])
    data = json.loads(result.stdout)
    return data.get("id", "")


def update_item_status(
    project_id: str,
    item_id: str,
    field_id: str,
    option_id: str,
) -> None:
    """Update a project item's status field via GraphQL mutation."""
    mutation = """
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId,
          itemId: $itemId,
          fieldId: $fieldId,
          value: { singleSelectOptionId: $optionId }
        }
      ) {
        projectV2Item {
          id
        }
      }
    }
    """
    run_gh([
        "api", "graphql",
        "-f", f"query={mutation}",
        "-f", f"projectId={project_id}",
        "-f", f"itemId={item_id}",
        "-f", f"fieldId={field_id}",
        "-f", f"optionId={option_id}",
    ])


# ──────────────────────────────────────────────────────────────────────────────
# FUZZY MATCHING
# ──────────────────────────────────────────────────────────────────────────────

def normalize_title(text: str) -> str:
    """Normalize a title for fuzzy comparison."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text


def _significant_tokens(text: str) -> set[str]:
    """Extract significant tokens — words 3+ chars, uppercased acronyms, hyphenated compounds."""
    normalized = normalize_title(text)
    return {word for word in normalized.split() if len(word) >= 3}


def find_best_match(
    todo_title: str,
    board_items: list[BoardItem],
) -> BoardItem | None:
    """Find the best fuzzy match for a TODO title among board items.

    Uses two signals: SequenceMatcher ratio AND significant token overlap
    (Jaccard similarity). Either exceeding its threshold counts as a match.
    This handles paraphrased titles that share key terms but differ in phrasing.

    Returns None if no match exceeds either threshold.
    """
    normalized_todo = normalize_title(todo_title)
    todo_tokens = _significant_tokens(todo_title)
    best_match: BoardItem | None = None
    best_score = 0.0

    for board_item in board_items:
        normalized_board = normalize_title(board_item.title)

        # Signal 1: sequence similarity
        seq_ratio = difflib.SequenceMatcher(
            None, normalized_todo, normalized_board,
        ).ratio()

        # Signal 2: Jaccard token overlap
        board_tokens = _significant_tokens(board_item.title)
        if todo_tokens and board_tokens:
            intersection = todo_tokens & board_tokens
            union = todo_tokens | board_tokens
            jaccard = len(intersection) / len(union)
        else:
            jaccard = 0.0

        # Combined score — weighted toward whichever signal is stronger
        score = max(seq_ratio, jaccard)

        if score > best_score:
            best_score = score
            best_match = board_item

    if best_score >= MATCH_THRESHOLD and best_match:
        return best_match
    return None


# ──────────────────────────────────────────────────────────────────────────────
# RECONCILIATION
# ──────────────────────────────────────────────────────────────────────────────

def reconcile(
    todo_items: list[TodoItem],
    board_items: list[BoardItem],
    status_map: dict[str, str],
) -> SyncReport:
    """Compare TODO.md items against board items and produce a sync plan.

    Reconciliation rules:
        - TODO done + board still Todo       → mark Done on board
        - TODO item not on board             → add to board
        - Board item not in TODO.md          → flag as orphan (no deletion)
        - Already matching                   → skip
    """
    report = SyncReport()
    matched_board_ids: set[str] = set()
    done_status = status_map.get("done", "Done")

    # Build a shrinking pool so each board item matches at most one TODO item
    available_board = list(board_items)

    for todo_item in todo_items:
        board_match = find_best_match(todo_item.title, available_board)

        if board_match:
            matched_board_ids.add(board_match.item_id)
            available_board = [b for b in available_board if b.item_id != board_match.item_id]

            if todo_item.done and board_match.status != done_status:
                report.actions.append(ReconciliationAction(
                    action="mark_done",
                    title=todo_item.title,
                    detail=(
                        f"TODO.md marked done; board status "
                        f"'{board_match.status}' → '{done_status}'"
                    ),
                ))
            else:
                report.matched.append(
                    f"'{todo_item.title}' ↔ '{board_match.title}' "
                    f"(status: {board_match.status})"
                )
        else:
            status_label = "as Done" if todo_item.done else "as Todo"
            report.actions.append(ReconciliationAction(
                action="add",
                title=todo_item.title,
                detail=f"Exists in TODO.md but not on board — will add {status_label}",
                set_done=todo_item.done,
            ))

    # Flag board items that have no corresponding TODO entry
    for board_item in board_items:
        if board_item.item_id not in matched_board_ids:
            report.actions.append(ReconciliationAction(
                action="flag_orphan",
                title=board_item.title,
                detail=(
                    f"On board (status: {board_item.status}) "
                    f"but not found in TODO.md — flagged, not deleted"
                ),
            ))

    return report


# ──────────────────────────────────────────────────────────────────────────────
# EXECUTION
# ──────────────────────────────────────────────────────────────────────────────

def apply_actions(
    report: SyncReport,
    config: dict,
    project_id: str | None = None,
    field_id: str | None = None,
    status_options: dict[str, str] | None = None,
    board_items: list[BoardItem] | None = None,
) -> None:
    """Execute the planned reconciliation actions against the board."""
    project_number = config["project_number"]
    owner = config["owner"]
    status_map = config.get("status_map", {})
    done_status = status_map.get("done", "Done")

    for action in report.actions:
        if action.action == "add":
            status_label = " (→ Done)" if action.set_done else ""
            print(f"  ADDING: {action.title}{status_label}")
            try:
                new_item_id = add_item_to_board(project_number, owner, action.title)
                print(f"    ✓ Added successfully")
                # If the TODO item was done, immediately set board status to Done
                if action.set_done and new_item_id and all([project_id, field_id, status_options]):
                    done_option_id = status_options.get(done_status)
                    if done_option_id:
                        update_item_status(project_id, new_item_id, field_id, done_option_id)
                        print(f"    ✓ Status set to Done")
            except RuntimeError as error:
                report.errors.append(f"Failed to add '{action.title}': {error}")
                print(f"    ✗ Failed: {error}", file=sys.stderr)

        elif action.action == "mark_done":
            print(f"  UPDATING: {action.title} → {done_status}")
            if not all([project_id, field_id, status_options, board_items]):
                report.errors.append(
                    f"Cannot update '{action.title}': missing project metadata"
                )
                continue

            done_option_id = status_options.get(done_status)
            if not done_option_id:
                report.errors.append(
                    f"Cannot update '{action.title}': "
                    f"'{done_status}' option not found on board"
                )
                continue

            # Find the board item ID for this title
            matched_board_item = find_best_match(action.title, board_items)
            if not matched_board_item:
                report.errors.append(
                    f"Cannot update '{action.title}': board item not found"
                )
                continue

            try:
                update_item_status(
                    project_id, matched_board_item.item_id,
                    field_id, done_option_id,
                )
                print(f"    ✓ Updated successfully")
            except RuntimeError as error:
                report.errors.append(
                    f"Failed to update '{action.title}': {error}"
                )
                print(f"    ✗ Failed: {error}", file=sys.stderr)

        elif action.action == "flag_orphan":
            print(f"  ORPHAN: {action.title} — {action.detail}")


# ──────────────────────────────────────────────────────────────────────────────
# OUTPUT
# ──────────────────────────────────────────────────────────────────────────────

def print_report(report: SyncReport, dry_run: bool) -> None:
    """Print a structured summary of reconciliation results."""
    mode_label = "DRY RUN" if dry_run else "APPLIED"
    print(f"\n{'=' * 60}")
    print(f"  Project Board Sync — {mode_label}")
    print(f"{'=' * 60}\n")

    if report.matched:
        print(f"Already in sync ({len(report.matched)}):")
        for entry in report.matched:
            print(f"  ✓ {entry}")
        print()

    action_counts = {"add": 0, "mark_done": 0, "flag_orphan": 0}
    for action in report.actions:
        action_counts[action.action] = action_counts.get(action.action, 0) + 1

    if report.actions:
        print(f"Actions ({'planned' if dry_run else 'executed'}):")
        for action in report.actions:
            prefix = {
                "add": "+",
                "mark_done": "→",
                "flag_orphan": "?",
            }.get(action.action, " ")
            print(f"  {prefix} [{action.action}] {action.title}")
            print(f"      {action.detail}")
        print()

    if report.errors:
        print(f"Errors ({len(report.errors)}):")
        for error in report.errors:
            print(f"  ✗ {error}")
        print()

    print("Summary:")
    print(f"  In sync:      {len(report.matched)}")
    print(f"  To add:       {action_counts['add']}")
    print(f"  To update:    {action_counts['mark_done']}")
    print(f"  Orphaned:     {action_counts['flag_orphan']}")
    if report.errors:
        print(f"  Errors:       {len(report.errors)}")
    print()


# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Reconcile TODO.md against a GitHub Projects board.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Execute changes (default: dry-run, print what would change)",
    )
    args = parser.parse_args()
    dry_run = not args.apply

    # Load configuration
    config = load_config()
    project_number = config["project_number"]
    owner = config["owner"]
    status_map = config.get("status_map", {})

    # Parse TODO.md
    todo_items = parse_todo_items()
    print(f"Parsed {len(todo_items)} items from TODO.md")

    # Fetch board state
    print(f"Fetching board items from project #{project_number} ({owner})...")
    try:
        board_items = fetch_board_items(project_number, owner)
    except RuntimeError as error:
        print(f"ERROR: Could not fetch board items: {error}", file=sys.stderr)
        sys.exit(1)
    print(f"Found {len(board_items)} items on board")

    # Reconcile
    report = reconcile(todo_items, board_items, status_map)

    # Apply or dry-run
    if not dry_run and report.actions:
        actionable = [
            action for action in report.actions
            if action.action in ("add", "mark_done")
        ]
        if actionable:
            print("\nApplying changes...")
            # Fetch project metadata for status updates
            project_id = None
            field_id = None
            status_options = None

            needs_status_update = any(
                action.action == "mark_done" or
                (action.action == "add" and action.set_done)
                for action in report.actions
            )
            if needs_status_update:
                try:
                    project_id = fetch_project_id(project_number, owner)
                    field_id, status_options = fetch_status_field(project_id)
                except RuntimeError as error:
                    report.errors.append(
                        f"Could not fetch project metadata for status updates: {error}"
                    )

            apply_actions(
                report, config,
                project_id=project_id,
                field_id=field_id,
                status_options=status_options,
                board_items=board_items,
            )

    print_report(report, dry_run)


if __name__ == "__main__":
    main()
