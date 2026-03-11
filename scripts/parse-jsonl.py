#!/usr/bin/env python3
"""Parse Claude Code JSONL transcripts into readable output.

Handles all 8 entry types: assistant, user, system, progress,
file-history-snapshot, queue-operation, last-prompt, pr-link.

Deduplicates streaming assistant chunks (multiple JSONL lines per API
request) and exposes thinking blocks, system events, hook progress,
bash output streaming, and agent delegation.

Usage:
    parse-jsonl.py <file.jsonl>                        # full transcript
    parse-jsonl.py <file.jsonl> --summary              # statistics
    parse-jsonl.py <file.jsonl> --type assistant        # filter by type
    parse-jsonl.py <file.jsonl> --type system           # system events
    parse-jsonl.py <file.jsonl> --type progress         # hooks + bash output
    parse-jsonl.py <file.jsonl> --type thinking         # thinking blocks only
    parse-jsonl.py <file.jsonl> --type tool_use         # tool calls only
    parse-jsonl.py <file.jsonl> --type tool_result      # tool results only
    parse-jsonl.py <file.jsonl> --dedupe                # merge streaming chunks
    parse-jsonl.py <file.jsonl> --compact --last 20     # truncated tail
    parse-jsonl.py <file.jsonl> --json                  # structured JSON output
    parse-jsonl.py <file.jsonl> --tokens                # token usage report
    parse-jsonl.py <file.jsonl> --turns                 # turn-by-turn overview
"""

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path


# ── Content block parsers ───────────────────────────────────────────

def parse_content_blocks(content):
    """Extract structured blocks from message content."""
    if isinstance(content, str):
        return [{"kind": "text", "text": content}]

    blocks = []
    for block in content or []:
        if isinstance(block, str):
            blocks.append({"kind": "text", "text": block})
            continue

        block_type = block.get("type", "")

        if block_type == "text":
            blocks.append({"kind": "text", "text": block["text"]})

        elif block_type == "thinking":
            thinking_text = block.get("thinking", "")
            blocks.append({
                "kind": "thinking",
                "text": thinking_text,
                "has_signature": bool(block.get("signature")),
            })

        elif block_type == "tool_use":
            name = block.get("name", "unknown")
            inp = block.get("input", {})
            caller = block.get("caller", {})
            blocks.append({
                "kind": "tool_use",
                "id": block.get("id", ""),
                "name": name,
                "summary": summarize_tool_input(name, inp),
                "input": inp,
                "caller_type": caller.get("type", "direct"),
            })

        elif block_type == "tool_result":
            tool_id = block.get("tool_use_id", "")
            result_content = block.get("content", "")
            if isinstance(result_content, list):
                result_content = "\n".join(
                    b.get("text", "") for b in result_content if isinstance(b, dict)
                )
            blocks.append({
                "kind": "tool_result",
                "tool_use_id": tool_id,
                "content": result_content,
                "error": block.get("is_error", False),
            })

    return blocks


def summarize_tool_input(name, inp):
    """One-line summary of a tool call."""
    summarizers = {
        "Read": lambda i: i.get("file_path", "?"),
        "Write": lambda i: f"{i.get('file_path', '?')} ({len(i.get('content', ''))} chars)",
        "Edit": lambda i: f"{i.get('file_path', '?')}: {(i.get('old_string', '') or '')[:60]!r}...",
        "Bash": lambda i: i.get("command", "?")[:120],
        "Grep": lambda i: f"/{i.get('pattern', '?')}/ in {i.get('path', '.')}",
        "Glob": lambda i: f"{i.get('pattern', '?')} in {i.get('path', '.')}",
        "Agent": lambda i: i.get("description", i.get("prompt", "?")[:80]),
        "Skill": lambda i: f"/{i.get('skill', '?')} {i.get('args', '')}".strip(),
        "AskUserQuestion": lambda i: (i.get("questions", [{}])[0].get("question", "?")[:80]
                                       if i.get("questions") else "?"),
        "ToolSearch": lambda i: i.get("query", "?"),
        "WebFetch": lambda i: i.get("url", "?")[:100],
        "WebSearch": lambda i: i.get("query", "?")[:100],
    }
    if name in summarizers:
        return summarizers[name](inp)
    # Generic fallback
    keys = list(inp.keys())[:3]
    return ", ".join(f"{k}={str(inp[k])[:40]}" for k in keys) if keys else "(no input)"


# ── Entry parsers by type ───────────────────────────────────────────

def parse_assistant(obj, line_num):
    """Parse an assistant entry (model response chunk)."""
    message = obj.get("message", {})
    blocks = parse_content_blocks(message.get("content", []))
    usage = message.get("usage", {})

    return {
        "line": line_num,
        "type": "assistant",
        "role": "assistant",
        "timestamp": obj.get("timestamp", ""),
        "blocks": blocks,
        "request_id": obj.get("requestId", ""),
        "message_id": message.get("id", ""),
        "model": message.get("model", ""),
        "stop_reason": message.get("stop_reason"),
        "usage": {
            "input_tokens": usage.get("input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0),
            "cache_creation": usage.get("cache_creation_input_tokens", 0),
            "cache_read": usage.get("cache_read_input_tokens", 0),
        } if usage else None,
    }


def parse_user(obj, line_num):
    """Parse a user entry (user message or tool result)."""
    message = obj.get("message", {})
    blocks = parse_content_blocks(message.get("content", []))
    return {
        "line": line_num,
        "type": "user",
        "role": "user",
        "timestamp": obj.get("timestamp", ""),
        "blocks": blocks,
        "is_meta": obj.get("isMeta", False),
        "permission_mode": obj.get("permissionMode", ""),
    }


def parse_system(obj, line_num):
    """Parse a system entry (turn duration, compaction, errors, hooks)."""
    # System entries encode their subtype in different ways
    data = {}
    content = obj.get("message", {}).get("content", "")

    # Detect subtype from fields
    if "durationMs" in obj:
        subtype = "turn_duration"
        data = {"duration_ms": obj["durationMs"]}
    elif "hookInfos" in obj:
        subtype = "stop_hook_summary"
        hook_infos = obj.get("hookInfos", [])
        data = {
            "hooks_run": len(hook_infos),
            "prevented_continuation": obj.get("preventedContinuation", False),
            "hook_errors": obj.get("hookErrors", []),
        }
    elif "compactMetadata" in obj:
        subtype = "compact_boundary"
        meta = obj["compactMetadata"]
        data = {
            "trigger": meta.get("trigger", ""),
            "pre_tokens": meta.get("preTokens", 0),
            "post_tokens": meta.get("postTokens", 0),
        }
    elif "retryInMs" in obj:
        subtype = "api_error"
        data = {
            "retry_in_ms": obj.get("retryInMs", 0),
            "retry_attempt": obj.get("retryAttempt", 0),
            "max_retries": obj.get("maxRetries", 0),
        }
    elif isinstance(content, str) and content.startswith("<local-command"):
        subtype = "local_command"
        data = {"content": content[:200]}
    else:
        subtype = "other"
        data = {"raw_keys": list(obj.keys())[:8]}

    return {
        "line": line_num,
        "type": "system",
        "role": "system",
        "subtype": subtype,
        "timestamp": obj.get("timestamp", ""),
        "blocks": [],
        "data": data,
    }


def parse_progress(obj, line_num):
    """Parse a progress entry (hooks, bash output, agent progress)."""
    data = obj.get("data", {})
    progress_type = data.get("type", "unknown")

    if progress_type == "hook_progress":
        return {
            "line": line_num,
            "type": "progress",
            "role": "progress",
            "subtype": "hook",
            "timestamp": obj.get("timestamp", ""),
            "blocks": [],
            "data": {
                "hook_event": data.get("hookEvent", ""),
                "hook_name": data.get("hookName", ""),
                "command": data.get("command", ""),
            },
        }
    elif progress_type == "bash_progress":
        output = data.get("output", "") or data.get("fullOutput", "")
        return {
            "line": line_num,
            "type": "progress",
            "role": "progress",
            "subtype": "bash",
            "timestamp": obj.get("timestamp", ""),
            "blocks": [],
            "data": {
                "output": output,
                "elapsed_seconds": data.get("elapsedTimeSeconds", 0),
                "total_lines": data.get("totalLines", 0),
            },
        }
    elif progress_type == "agent_progress":
        return {
            "line": line_num,
            "type": "progress",
            "role": "progress",
            "subtype": "agent",
            "timestamp": obj.get("timestamp", ""),
            "blocks": [],
            "data": {
                "message": str(data.get("message", ""))[:200],
            },
        }
    else:
        return {
            "line": line_num,
            "type": "progress",
            "role": "progress",
            "subtype": progress_type,
            "timestamp": obj.get("timestamp", ""),
            "blocks": [],
            "data": {k: str(v)[:100] for k, v in data.items()},
        }


def parse_file_history(obj, line_num):
    """Parse a file-history-snapshot entry."""
    snapshot = obj.get("snapshot", {})
    backups = snapshot.get("trackedFileBackups", {})
    return {
        "line": line_num,
        "type": "file-history-snapshot",
        "role": "file-history-snapshot",
        "timestamp": obj.get("timestamp", ""),
        "blocks": [],
        "data": {
            "files_tracked": len(backups),
            "file_paths": list(backups.keys())[:10],
        },
    }


def parse_queue_operation(obj, line_num):
    """Parse a queue-operation entry."""
    return {
        "line": line_num,
        "type": "queue-operation",
        "role": "queue-operation",
        "timestamp": obj.get("timestamp", ""),
        "blocks": [],
        "data": {
            "operation": obj.get("operation", ""),
            "content": str(obj.get("content", ""))[:200],
        },
    }


def parse_last_prompt(obj, line_num):
    """Parse a last-prompt entry."""
    return {
        "line": line_num,
        "type": "last-prompt",
        "role": "last-prompt",
        "timestamp": obj.get("timestamp", ""),
        "blocks": [],
        "data": {"prompt": obj.get("lastPrompt", "")[:200]},
    }


def parse_pr_link(obj, line_num):
    """Parse a pr-link entry."""
    return {
        "line": line_num,
        "type": "pr-link",
        "role": "pr-link",
        "timestamp": obj.get("timestamp", ""),
        "blocks": [],
        "data": {"url": obj.get("url", obj.get("link", ""))},
    }


PARSERS = {
    "assistant": parse_assistant,
    "user": parse_user,
    "system": parse_system,
    "progress": parse_progress,
    "file-history-snapshot": parse_file_history,
    "queue-operation": parse_queue_operation,
    "last-prompt": parse_last_prompt,
    "pr-link": parse_pr_link,
}


def parse_entry(line_num, raw):
    """Parse a single JSONL line into a structured entry."""
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        return None

    entry_type = obj.get("type", "unknown")
    parser_fn = PARSERS.get(entry_type)
    if parser_fn:
        return parser_fn(obj, line_num)

    # Unknown type — preserve raw keys for debugging
    return {
        "line": line_num,
        "type": entry_type,
        "role": entry_type,
        "timestamp": obj.get("timestamp", ""),
        "blocks": [],
        "data": {"raw_keys": list(obj.keys())[:10]},
    }


# ── Streaming chunk deduplication ───────────────────────────────────

def dedupe_streaming_chunks(entries):
    """Merge multiple assistant JSONL lines from the same API request.

    Claude Code streams responses as multiple JSONL lines sharing one
    requestId. Each line carries one content block. This merges them
    into a single entry per request with all blocks combined.
    """
    merged = []
    request_groups = defaultdict(list)
    request_order = []

    for entry in entries:
        if entry["type"] == "assistant" and entry.get("request_id"):
            rid = entry["request_id"]
            if rid not in request_groups:
                request_order.append(("request", rid, len(merged)))
                merged.append(None)  # placeholder
            request_groups[rid].append(entry)
        else:
            request_order.append(("entry", None, len(merged)))
            merged.append(entry)

    # Fill placeholders with merged entries
    for kind, rid, idx in request_order:
        if kind == "request" and rid:
            chunks = request_groups[rid]
            combined_blocks = []
            for chunk in chunks:
                combined_blocks.extend(chunk.get("blocks", []))

            # Use first chunk as base, merge usage from last
            base = dict(chunks[0])
            base["blocks"] = combined_blocks
            base["stop_reason"] = chunks[-1].get("stop_reason")
            last_usage = chunks[-1].get("usage")
            if last_usage:
                base["usage"] = last_usage
            base["chunk_count"] = len(chunks)
            merged[idx] = base

    return [e for e in merged if e is not None]


# ── Formatting ──────────────────────────────────────────────────────

def format_timestamp(ts):
    """Format ISO timestamp to HH:MM:SS."""
    if not ts:
        return "        "
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.strftime("%H:%M:%S")
    except (ValueError, AttributeError):
        return ts[:8]


def format_entry(entry, compact=False, show_thinking=False):
    """Format a parsed entry for terminal display."""
    ts = format_timestamp(entry["timestamp"])
    entry_type = entry["type"]
    lines = []

    # ── assistant / user entries (have blocks) ──
    if entry.get("blocks"):
        role_labels = {"assistant": "ASSISTANT", "user": "USER/TOOL"}
        label = role_labels.get(entry.get("role", ""), entry_type.upper())

        if entry.get("is_meta"):
            label = "META"

        for block in entry["blocks"]:
            kind = block["kind"]

            if kind == "text":
                text = block["text"]
                if compact:
                    text = text[:300]
                    if len(block["text"]) > 300:
                        text += f"... ({len(block['text'])} chars)"
                lines.append(f"[{ts}] {label}: {text}")

            elif kind == "thinking":
                if show_thinking:
                    text = block["text"]
                    if compact:
                        text = text[:300]
                        if len(block["text"]) > 300:
                            text += f"... ({len(block['text'])} chars)"
                    lines.append(f"[{ts}] THINKING: {text}")
                else:
                    lines.append(f"[{ts}] THINKING: ({len(block['text'])} chars)")

            elif kind == "tool_use":
                caller = ""
                if block.get("caller_type") and block["caller_type"] != "direct":
                    caller = f" [{block['caller_type']}]"
                lines.append(f"[{ts}] TOOL{caller} -> {block['name']}: {block['summary']}")

            elif kind == "tool_result":
                err = " (ERROR)" if block.get("error") else ""
                content = block["content"]
                if compact:
                    content = content[:200]
                    if len(block["content"]) > 200:
                        content += f"... ({len(block['content'])} chars)"
                lines.append(f"[{ts}] RESULT{err}: {content}")

        # Show deduplication info
        chunk_count = entry.get("chunk_count")
        if chunk_count and chunk_count > 1:
            lines.append(f"         ({chunk_count} streaming chunks merged)")

        return "\n".join(lines)

    # ── system entries ──
    if entry_type == "system":
        subtype = entry.get("subtype", "")
        data = entry.get("data", {})

        if subtype == "turn_duration":
            ms = data.get("duration_ms", 0)
            secs = ms / 1000
            lines.append(f"[{ts}] SYSTEM/TURN: {secs:.1f}s")

        elif subtype == "stop_hook_summary":
            hooks = data.get("hooks_run", 0)
            prevented = data.get("prevented_continuation", False)
            errors = data.get("hook_errors", [])
            extra = ""
            if prevented:
                extra += " BLOCKED"
            if errors:
                extra += f" ({len(errors)} errors)"
            lines.append(f"[{ts}] SYSTEM/HOOKS: {hooks} hooks ran{extra}")

        elif subtype == "compact_boundary":
            trigger = data.get("trigger", "?")
            pre = data.get("pre_tokens", 0)
            post = data.get("post_tokens", 0)
            lines.append(f"[{ts}] SYSTEM/COMPACT: {trigger} ({pre} -> {post} tokens)")

        elif subtype == "api_error":
            retry = data.get("retry_in_ms", 0)
            attempt = data.get("retry_attempt", 0)
            lines.append(f"[{ts}] SYSTEM/API_ERROR: retry {attempt}, waiting {retry}ms")

        elif subtype == "local_command":
            lines.append(f"[{ts}] SYSTEM/CMD: {data.get('content', '')[:150]}")

        else:
            lines.append(f"[{ts}] SYSTEM/{subtype.upper()}: {json.dumps(data)[:150]}")

        return "\n".join(lines)

    # ── progress entries ──
    if entry_type == "progress":
        subtype = entry.get("subtype", "")
        data = entry.get("data", {})

        if subtype == "hook":
            event = data.get("hook_event", "")
            cmd = data.get("command", "")
            # Compact: just show the script name
            cmd_short = cmd.rsplit("/", 1)[-1] if "/" in cmd else cmd
            lines.append(f"[{ts}] HOOK/{event}: {cmd_short}")

        elif subtype == "bash":
            output = data.get("output", "")
            if compact:
                output = output[:200]
            elapsed = data.get("elapsed_seconds", 0)
            if output.strip():
                lines.append(f"[{ts}] BASH_OUT ({elapsed}s): {output}")

        elif subtype == "agent":
            msg = data.get("message", "")
            lines.append(f"[{ts}] AGENT_PROGRESS: {msg[:200]}")

        else:
            lines.append(f"[{ts}] PROGRESS/{subtype}: {json.dumps(data)[:150]}")

        return "\n".join(lines)

    # ── file-history-snapshot ──
    if entry_type == "file-history-snapshot":
        data = entry.get("data", {})
        count = data.get("files_tracked", 0)
        files = data.get("file_paths", [])
        short_paths = [p.rsplit("/", 1)[-1] for p in files[:5]]
        extra = f"... +{count - 5}" if count > 5 else ""
        lines.append(f"[{ts}] FILE_SNAPSHOT: {count} files [{', '.join(short_paths)}{extra}]")
        return "\n".join(lines)

    # ── queue-operation ──
    if entry_type == "queue-operation":
        data = entry.get("data", {})
        op = data.get("operation", "?")
        content = data.get("content", "")[:100]
        lines.append(f"[{ts}] QUEUE/{op.upper()}: {content}")
        return "\n".join(lines)

    # ── last-prompt ──
    if entry_type == "last-prompt":
        prompt = entry.get("data", {}).get("prompt", "")[:150]
        lines.append(f"[{ts}] LAST_PROMPT: {prompt}")
        return "\n".join(lines)

    # ── pr-link ──
    if entry_type == "pr-link":
        url = entry.get("data", {}).get("url", "")
        lines.append(f"[{ts}] PR_LINK: {url}")
        return "\n".join(lines)

    # ── unknown ──
    data = entry.get("data", {})
    lines.append(f"[{ts}] {entry_type.upper()}: {json.dumps(data)[:150]}")
    return "\n".join(lines)


# ── Filter logic ────────────────────────────────────────────────────

FILTER_TYPES = [
    "assistant", "user", "system", "progress", "thinking",
    "tool_use", "tool_result", "file-history-snapshot",
    "queue-operation", "last-prompt", "pr-link",
]


def matches_filter(entry, filter_type):
    """Check whether an entry matches the requested filter."""
    if not filter_type:
        return True

    # Virtual filters (match on block kind, not entry type)
    if filter_type == "thinking":
        return any(b.get("kind") == "thinking" for b in entry.get("blocks", []))
    if filter_type == "tool_use":
        return any(b.get("kind") == "tool_use" for b in entry.get("blocks", []))
    if filter_type == "tool_result":
        return any(b.get("kind") == "tool_result" for b in entry.get("blocks", []))

    return entry.get("type") == filter_type


# ── Summary and reporting ───────────────────────────────────────────

def summarize(entries, all_entries):
    """Print a statistical summary of the transcript."""
    # Count by type (from unfiltered set)
    by_type = defaultdict(int)
    tool_calls = defaultdict(int)
    system_subtypes = defaultdict(int)
    progress_subtypes = defaultdict(int)
    total_thinking_chars = 0
    total_text_chars = 0
    request_ids = set()

    for e in all_entries:
        by_type[e.get("type", "unknown")] += 1

        if e.get("type") == "system":
            system_subtypes[e.get("subtype", "other")] += 1
        if e.get("type") == "progress":
            progress_subtypes[e.get("subtype", "other")] += 1
        if e.get("request_id"):
            request_ids.add(e["request_id"])

        for b in e.get("blocks", []):
            if b["kind"] == "tool_use":
                tool_calls[b["name"]] += 1
            elif b["kind"] == "thinking":
                total_thinking_chars += len(b.get("text", ""))
            elif b["kind"] == "text" and e.get("role") == "assistant":
                total_text_chars += len(b.get("text", ""))

    # Timestamps
    timestamps = [e["timestamp"] for e in all_entries if e.get("timestamp")]
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

    # Turn durations
    turn_durations = []
    for e in all_entries:
        if e.get("type") == "system" and e.get("subtype") == "turn_duration":
            turn_durations.append(e["data"]["duration_ms"])

    print(f"Total entries: {len(all_entries)}")
    if duration:
        print(f"Duration: {duration}")
    print(f"API requests: {len(request_ids)}")
    print()

    print("Entry types:")
    for t, c in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"  {t}: {c}")
    print()

    if tool_calls:
        print("Tool calls:")
        for name, count in sorted(tool_calls.items(), key=lambda x: -x[1]):
            print(f"  {name}: {count}")
        print()

    if system_subtypes:
        print("System events:")
        for sub, count in sorted(system_subtypes.items(), key=lambda x: -x[1]):
            print(f"  {sub}: {count}")
        print()

    if progress_subtypes:
        print("Progress events:")
        for sub, count in sorted(progress_subtypes.items(), key=lambda x: -x[1]):
            print(f"  {sub}: {count}")
        print()

    if total_thinking_chars:
        print(f"Thinking: {total_thinking_chars:,} chars ({total_thinking_chars // 1000}k)")
    if total_text_chars:
        print(f"Assistant text: {total_text_chars:,} chars ({total_text_chars // 1000}k)")

    if turn_durations:
        avg = sum(turn_durations) / len(turn_durations) / 1000
        total = sum(turn_durations) / 1000
        print(f"Turns: {len(turn_durations)}, avg {avg:.1f}s, total {total:.0f}s")


def report_tokens(entries):
    """Print token usage report from assistant entries."""
    total_input = 0
    total_output = 0
    total_cache_create = 0
    total_cache_read = 0
    request_count = 0
    seen_requests = set()

    for e in entries:
        if e.get("type") != "assistant":
            continue
        rid = e.get("request_id", "")
        if rid in seen_requests:
            continue
        seen_requests.add(rid)

        usage = e.get("usage")
        if not usage:
            continue

        request_count += 1
        total_input += usage.get("input_tokens", 0)
        total_output += usage.get("output_tokens", 0)
        total_cache_create += usage.get("cache_creation", 0)
        total_cache_read += usage.get("cache_read", 0)

    print(f"API requests with usage data: {request_count}")
    print(f"Input tokens:  {total_input:>10,}")
    print(f"Output tokens: {total_output:>10,}")
    print(f"Cache create:  {total_cache_create:>10,}")
    print(f"Cache read:    {total_cache_read:>10,}")
    total = total_input + total_output + total_cache_create + total_cache_read
    print(f"Total:         {total:>10,}")


def report_turns(entries):
    """Print turn-by-turn overview."""
    # A turn starts with a non-meta user entry and ends at the next one
    turns = []
    current_turn = None

    for e in entries:
        if (e.get("type") == "user" and e.get("role") == "user"
                and not e.get("is_meta")
                and any(b.get("kind") == "text" for b in e.get("blocks", []))):
            # New turn begins
            if current_turn:
                turns.append(current_turn)
            user_text = ""
            for b in e.get("blocks", []):
                if b.get("kind") == "text":
                    user_text = b["text"]
                    break
            current_turn = {
                "user": user_text[:120],
                "timestamp": e.get("timestamp", ""),
                "tool_calls": [],
                "assistant_chars": 0,
                "thinking_chars": 0,
            }
        elif current_turn:
            for b in e.get("blocks", []):
                if b.get("kind") == "tool_use":
                    current_turn["tool_calls"].append(b["name"])
                elif b.get("kind") == "text" and e.get("role") == "assistant":
                    current_turn["assistant_chars"] += len(b.get("text", ""))
                elif b.get("kind") == "thinking":
                    current_turn["thinking_chars"] += len(b.get("text", ""))

    if current_turn:
        turns.append(current_turn)

    for i, turn in enumerate(turns, 1):
        ts = format_timestamp(turn["timestamp"])
        user = turn["user"][:80]
        tools = turn["tool_calls"]
        tool_summary = ""
        if tools:
            tool_counts = defaultdict(int)
            for t in tools:
                tool_counts[t] += 1
            tool_summary = " | " + ", ".join(f"{n}x{c}" if c > 1 else n
                                              for n, c in tool_counts.items())
        chars = turn["assistant_chars"]
        thinking = f" +{turn['thinking_chars']}t" if turn["thinking_chars"] else ""

        print(f"Turn {i:>3} [{ts}] {user}")
        if tool_summary or chars:
            print(f"          -> {chars} chars{thinking}{tool_summary}")
        print()


# ── Main ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Parse Claude Code JSONL transcripts",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Filter types:
  assistant          Model response text and tool calls
  user               User messages and tool results
  system             Turn duration, compaction, API errors, hooks
  progress           Hook execution, bash output, agent delegation
  thinking           Extended thinking blocks (virtual filter)
  tool_use           Tool call blocks only (virtual filter)
  tool_result        Tool result blocks only (virtual filter)
  file-history-snapshot  File version tracking
  queue-operation    Message queue events
  last-prompt        Last user prompt records
  pr-link            Pull request URL tracking
""",
    )
    parser.add_argument("file", help="Path to .jsonl file")
    parser.add_argument("--summary", action="store_true",
                        help="Show statistical summary")
    parser.add_argument("--type", dest="filter_type", choices=FILTER_TYPES,
                        help="Filter to entries of this type")
    parser.add_argument("--compact", action="store_true",
                        help="Truncate long text blocks")
    parser.add_argument("--json", action="store_true",
                        help="Output parsed entries as JSON")
    parser.add_argument("--last", type=int, default=0,
                        help="Show only last N entries")
    parser.add_argument("--first", type=int, default=0,
                        help="Show only first N entries")
    parser.add_argument("--dedupe", action="store_true",
                        help="Merge streaming assistant chunks by request ID")
    parser.add_argument("--thinking", action="store_true",
                        help="Show full thinking block text (default: char count only)")
    parser.add_argument("--tokens", action="store_true",
                        help="Show token usage report")
    parser.add_argument("--turns", action="store_true",
                        help="Show turn-by-turn overview")
    parser.add_argument("--no-progress", action="store_true",
                        help="Exclude progress entries (hooks, bash output)")
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        print(f"File not found: {path}", file=sys.stderr)
        sys.exit(1)

    # Parse all entries
    all_entries = []
    with open(path) as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            entry = parse_entry(i, line)
            if entry is not None:
                all_entries.append(entry)

    if not all_entries:
        print("No entries found.", file=sys.stderr)
        sys.exit(0)

    # Deduplicate streaming chunks
    if args.dedupe:
        all_entries = dedupe_streaming_chunks(all_entries)

    # Apply filters
    entries = all_entries
    if args.filter_type:
        entries = [e for e in entries if matches_filter(e, args.filter_type)]
    if args.no_progress:
        entries = [e for e in entries if e.get("type") != "progress"]

    # Slice
    if args.first > 0:
        entries = entries[:args.first]
    if args.last > 0:
        entries = entries[-args.last:]

    if not entries:
        print("No matching entries found.", file=sys.stderr)
        sys.exit(0)

    # Output modes
    if args.summary:
        summarize(entries, all_entries)
        return

    if args.tokens:
        report_tokens(all_entries)
        return

    if args.turns:
        report_turns(all_entries)
        return

    if args.json:
        json.dump(entries, sys.stdout, indent=2, default=str)
        print()
        return

    for entry in entries:
        text = format_entry(entry, compact=args.compact, show_thinking=args.thinking)
        if text:
            print(text)
            print()


if __name__ == "__main__":
    main()
