#!/usr/bin/env python3
"""
bootstrap_lessons.py — Parse lessons.md and index entries into state.db.

Reads each ## heading as a lesson entry. Extracts YAML frontmatter if present,
falls back to title and date extraction from the heading. Upserts into the
lessons table via dual_write.py lesson subcommand.

Usage:
    python scripts/bootstrap_lessons.py              # dry-run (print, don't write)
    python scripts/bootstrap_lessons.py --apply       # write to state.db

Requires: Python 3.10+ (stdlib only)
"""
import re
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
LESSONS_PATH = PROJECT_ROOT / "lessons.md"


def parse_lessons(text: str) -> list[dict]:
    """Parse lessons.md into structured entries."""
    entries = []
    # Split on ## headings
    sections = re.split(r'^## ', text, flags=re.MULTILINE)

    for section in sections[1:]:  # skip preamble before first ##
        lines = section.strip().split('\n')
        if not lines:
            continue

        # Parse heading: "YYYY-MM-DD — Title" or "YYYY-MM-DDTHH:MM TZ — Title"
        heading = lines[0].strip()
        date_match = re.match(r'(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?(?:\s+\w+)?)\s*[—–-]\s*(.+)', heading)
        if not date_match:
            continue

        date_str = date_match.group(1).strip()
        title = date_match.group(2).strip()

        entry = {
            'title': title,
            'date': date_str.split('T')[0] if 'T' in date_str else date_str,
            'pattern_type': None,
            'domain': None,
            'severity': None,
            'recurrence': 1,
            'trigger_relevant': None,
            'promotion_status': None,
            'lesson_text': None,
        }

        body = '\n'.join(lines[1:])

        # Extract YAML frontmatter if present
        yaml_match = re.search(r'```yaml\s*\n(.*?)```', body, re.DOTALL)
        if yaml_match:
            yaml_text = yaml_match.group(1)
            for line in yaml_text.strip().split('\n'):
                kv = line.split(':', 1)
                if len(kv) != 2:
                    continue
                key = kv[0].strip().replace('-', '_')
                val = kv[1].strip()
                if val in ('null', 'None', ''):
                    val = None
                if key == 'recurrence' and val is not None:
                    try:
                        val = int(val)
                    except ValueError:
                        val = 1  # fallback for non-numeric values
                if key in entry:
                    entry[key] = val

        # Extract lesson text from **The lesson:** line
        lesson_match = re.search(r'\*\*The lesson:\*\*\s*(.+?)(?:\n\n|\n\*\*)', body, re.DOTALL)
        if lesson_match:
            entry['lesson_text'] = lesson_match.group(1).strip().replace('\n', ' ')

        entries.append(entry)

    return entries


def main() -> None:
    apply = "--apply" in sys.argv

    if not LESSONS_PATH.exists():
        print(f"lessons.md not found at {LESSONS_PATH}", file=sys.stderr)
        sys.exit(1)

    text = LESSONS_PATH.read_text()
    entries = parse_lessons(text)

    print(f"Parsed {len(entries)} lesson entries\n")

    with_frontmatter = sum(1 for e in entries if e['pattern_type'] is not None)
    without_frontmatter = len(entries) - with_frontmatter
    print(f"  With frontmatter: {with_frontmatter}")
    print(f"  Without frontmatter: {without_frontmatter}")
    print()

    for entry in entries:
        status = "✓" if entry['pattern_type'] else "○"
        print(f"  {status} [{entry['date']}] {entry['title']}")
        if entry['pattern_type']:
            print(f"    {entry['pattern_type']} / {entry['domain']} / {entry['severity']}")

    if not apply:
        print(f"\nDry run — pass --apply to write {len(entries)} entries to state.db")
        return

    print(f"\nWriting {len(entries)} entries to state.db...")
    for entry in entries:
        cmd = [
            sys.executable, str(PROJECT_ROOT / "scripts" / "dual_write.py"), "lesson",
            "--title", entry['title'],
            "--date", entry['date'],
        ]
        if entry['pattern_type']:
            cmd.extend(["--pattern-type", entry['pattern_type']])
        if entry['domain']:
            cmd.extend(["--domain", entry['domain']])
        if entry['severity']:
            cmd.extend(["--severity", entry['severity']])
        if entry['recurrence'] and entry['recurrence'] != 1:
            cmd.extend(["--recurrence", str(entry['recurrence'])])
        if entry['trigger_relevant']:
            cmd.extend(["--trigger-relevant", entry['trigger_relevant']])
        if entry['promotion_status']:
            cmd.extend(["--promotion-status", entry['promotion_status']])
        if entry['lesson_text']:
            cmd.extend(["--lesson-text", entry['lesson_text']])

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"  ERROR: {entry['title']}: {result.stderr.strip()}", file=sys.stderr)
        else:
            print(f"  {result.stdout.strip()}")

    print(f"\nDone. {len(entries)} lessons indexed.")

    # Flush WAL so meshd and other readers see the new data immediately
    import sqlite3
    db_path = PROJECT_ROOT / "state.db"
    if db_path.exists():
        conn = sqlite3.connect(str(db_path))
        conn.execute("PRAGMA wal_checkpoint(PASSIVE);")
        conn.close()
        print("WAL checkpoint complete — changes visible to all readers.")


if __name__ == "__main__":
    main()
