#!/usr/bin/env python3
"""Parse Claude Code JSONL transcripts into readable output.

Extracts assistant text, tool calls, tool results, and user messages
from the JSONL format that Claude Code background agents produce.

Usage:
    python scripts/parse-jsonl.py <file.jsonl>
    python scripts/parse-jsonl.py <file.jsonl> --summary
    python scripts/parse-jsonl.py <file.jsonl> --type assistant
    python scripts/parse-jsonl.py <file.jsonl> --type tool_result
    python scripts/parse-jsonl.py <file.jsonl> --json
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path


def parse_content_blocks(content):
    """Extract readable text from message content blocks."""
    if isinstance(content, str):
        return [{"kind": "text", "text": content}]

    blocks = []
    for block in content or []:
        if isinstance(block, str):
            blocks.append({"kind": "text", "text": block})
        elif block.get("type") == "text":
            blocks.append({"kind": "text", "text": block["text"]})
        elif block.get("type") == "tool_use":
            name = block.get("name", "unknown")
            inp = block.get("input", {})
            summary = summarize_tool_input(name, inp)
            blocks.append({"kind": "tool_use", "name": name, "summary": summary})
        elif block.get("type") == "tool_result":
            tool_id = block.get("tool_use_id", "")
            result_content = block.get("content", "")
            if isinstance(result_content, list):
                result_content = "\n".join(
                    b.get("text", "") for b in result_content if isinstance(b, dict)
                )
            truncated = result_content[:500]
            if len(result_content) > 500:
                truncated += f"... ({len(result_content)} chars total)"
            blocks.append({"kind": "tool_result", "tool_use_id": tool_id,
                           "content": truncated,
                           "error": block.get("is_error", False)})
    return blocks


def summarize_tool_input(name, inp):
    """One-line summary of a tool call."""
    if name == "Read":
        return inp.get("file_path", "?")
    if name == "Write":
        path = inp.get("file_path", "?")
        content = inp.get("content", "")
        return f"{path} ({len(content)} chars)"
    if name == "Edit":
        path = inp.get("file_path", "?")
        old = (inp.get("old_string", "") or "")[:60]
        return f"{path}: {old!r}..."
    if name == "Bash":
        cmd = inp.get("command", "?")
        return cmd[:120]
    if name == "Grep":
        return f"/{inp.get('pattern', '?')}/ in {inp.get('path', '.')}"
    if name == "Glob":
        return f"{inp.get('pattern', '?')} in {inp.get('path', '.')}"
    if name == "Agent":
        return inp.get("description", inp.get("prompt", "?")[:80])
    if name == "AskUserQuestion":
        questions = inp.get("questions", [])
        if questions:
            return questions[0].get("question", "?")[:80]
        return "?"
    # Generic fallback
    keys = list(inp.keys())[:3]
    return ", ".join(f"{k}={str(inp[k])[:40]}" for k in keys)


def parse_entry(line_num, raw):
    """Parse a single JSONL line into a structured entry."""
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        return None

    entry_type = obj.get("type", "unknown")
    timestamp = obj.get("timestamp", "")

    # Skip progress/hook entries — they add noise
    if entry_type == "progress":
        return None

    message = obj.get("message", {})
    role = message.get("role", "")
    content = message.get("content", [])

    blocks = parse_content_blocks(content)

    return {
        "line": line_num,
        "type": entry_type,
        "role": role,
        "timestamp": timestamp,
        "blocks": blocks,
        "stop_reason": message.get("stop_reason"),
    }


def format_entry(entry, compact=False):
    """Format a parsed entry for terminal display."""
    ts = entry["timestamp"]
    if ts:
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            ts = dt.strftime("%H:%M:%S")
        except (ValueError, AttributeError):
            ts = ts[:19]

    role_labels = {"assistant": "ASSISTANT", "user": "USER/TOOL"}
    label = role_labels.get(entry["role"], entry["type"].upper())

    lines = []
    for block in entry["blocks"]:
        kind = block["kind"]
        if kind == "text":
            text = block["text"]
            if compact:
                text = text[:200]
                if len(block["text"]) > 200:
                    text += "..."
            lines.append(f"[{ts}] {label}: {text}")
        elif kind == "tool_use":
            lines.append(f"[{ts}] TOOL → {block['name']}: {block['summary']}")
        elif kind == "tool_result":
            err = " (ERROR)" if block.get("error") else ""
            content = block["content"]
            if compact:
                content = content[:150]
            lines.append(f"[{ts}] RESULT{err}: {content}")

    return "\n".join(lines)


def summarize(entries):
    """Print a statistical summary of the transcript."""
    total = len(entries)
    by_role = {}
    tool_calls = {}
    for e in entries:
        role = e["role"] or e["type"]
        by_role[role] = by_role.get(role, 0) + 1
        for b in e["blocks"]:
            if b["kind"] == "tool_use":
                name = b["name"]
                tool_calls[name] = tool_calls.get(name, 0) + 1

    timestamps = [e["timestamp"] for e in entries if e["timestamp"]]
    duration = ""
    if len(timestamps) >= 2:
        try:
            t0 = datetime.fromisoformat(timestamps[0].replace("Z", "+00:00"))
            t1 = datetime.fromisoformat(timestamps[-1].replace("Z", "+00:00"))
            secs = (t1 - t0).total_seconds()
            mins = int(secs // 60)
            duration = f"{mins}m {int(secs % 60)}s"
        except (ValueError, AttributeError):
            pass

    print(f"Entries: {total}")
    if duration:
        print(f"Duration: {duration}")
    print(f"By role: {json.dumps(by_role, indent=2)}")
    if tool_calls:
        sorted_tools = sorted(tool_calls.items(), key=lambda x: -x[1])
        print("Tool calls:")
        for name, count in sorted_tools:
            print(f"  {name}: {count}")


def main():
    parser = argparse.ArgumentParser(description="Parse Claude Code JSONL transcripts")
    parser.add_argument("file", help="Path to .jsonl file")
    parser.add_argument("--summary", action="store_true",
                        help="Show statistical summary only")
    parser.add_argument("--type", dest="filter_type", choices=["assistant", "user", "tool_result"],
                        help="Filter to entries of this type")
    parser.add_argument("--compact", action="store_true",
                        help="Truncate long text blocks")
    parser.add_argument("--json", action="store_true",
                        help="Output parsed entries as JSON")
    parser.add_argument("--last", type=int, default=0,
                        help="Show only last N entries")
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        print(f"File not found: {path}", file=sys.stderr)
        sys.exit(1)

    entries = []
    with open(path) as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            entry = parse_entry(i, line)
            if entry is None:
                continue
            if args.filter_type:
                if args.filter_type == "tool_result":
                    has_result = any(b["kind"] == "tool_result" for b in entry["blocks"])
                    if not has_result:
                        continue
                elif entry["role"] != args.filter_type:
                    continue
            entries.append(entry)

    if not entries:
        print("No matching entries found.", file=sys.stderr)
        sys.exit(0)

    if args.last > 0:
        entries = entries[-args.last:]

    if args.summary:
        summarize(entries)
        return

    if args.json:
        json.dump(entries, sys.stdout, indent=2)
        print()
        return

    for entry in entries:
        text = format_entry(entry, compact=args.compact)
        if text:
            print(text)
            print()


if __name__ == "__main__":
    main()
