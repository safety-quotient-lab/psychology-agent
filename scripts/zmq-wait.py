#!/usr/bin/env python3
"""
zmq-wait — Block until a ZMQ message arrives from a mesh peer.

Subscribes to one or more peer PUB sockets and waits for the first
message matching an optional topic filter. Prints the message as JSON
to stdout, then exits 0. Intended for use as a Claude Code hook or
shell-level gate: the calling process regains control when the message
lands.

Usage:
    zmq-wait.py <pub_address> [--topic transport] [--timeout 300]
    zmq-wait.py tcp://192.168.1.50:9002 --topic transport --timeout 0

Exit codes:
    0  message received (JSON on stdout)
    1  timeout expired with no message
    2  usage / connection error
"""

import argparse
import json
import signal
import sys
import time

import zmq


def main():
    parser = argparse.ArgumentParser(
        description="Block until a ZMQ message arrives from a mesh peer."
    )
    parser.add_argument(
        "pub_address",
        help="Peer PUB socket address to subscribe to (e.g. tcp://host:9002)",
    )
    parser.add_argument(
        "--topic",
        default="",
        help="Topic filter (empty = all topics). Common: transport, health, peer",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=0,
        help="Seconds to wait before giving up (0 = wait forever, default: 0)",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress status messages on stderr",
    )
    args = parser.parse_args()

    # Handle SIGINT/SIGTERM gracefully
    def handle_signal(signum, _frame):
        if not args.quiet:
            print(f"\n[zmq-wait] interrupted (signal {signum})", file=sys.stderr)
        sys.exit(1)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    ctx = zmq.Context()
    sub = ctx.socket(zmq.SUB)

    try:
        sub.connect(args.pub_address)
    except zmq.ZMQError as exc:
        print(f"[zmq-wait] connect failed: {exc}", file=sys.stderr)
        sys.exit(2)

    # Subscribe to the requested topic (empty string = all)
    sub.setsockopt_string(zmq.SUBSCRIBE, args.topic)

    if args.timeout > 0:
        sub.setsockopt(zmq.RCVTIMEO, args.timeout * 1000)

    if not args.quiet:
        topic_display = args.topic if args.topic else "(all)"
        timeout_display = f"{args.timeout}s" if args.timeout > 0 else "forever"
        print(
            f"[zmq-wait] listening on {args.pub_address} "
            f"topic={topic_display} timeout={timeout_display}",
            file=sys.stderr,
        )

    try:
        frame = sub.recv_string()
    except zmq.Again:
        if not args.quiet:
            print("[zmq-wait] timeout — no message received", file=sys.stderr)
        sys.exit(1)
    except zmq.ZMQError as exc:
        print(f"[zmq-wait] recv error: {exc}", file=sys.stderr)
        sys.exit(2)
    finally:
        sub.close()
        ctx.term()

    # Parse: "topic {json_payload}"
    space_idx = frame.find(" ")
    if space_idx < 0:
        # No payload — just a topic
        result = {"topic": frame, "raw": frame}
    else:
        topic = frame[:space_idx]
        payload = frame[space_idx + 1 :]
        try:
            data = json.loads(payload)
            result = {"topic": topic, **data}
        except json.JSONDecodeError:
            result = {"topic": topic, "raw": payload}

    json.dump(result, sys.stdout, indent=2, default=str)
    print()  # trailing newline
    sys.exit(0)


if __name__ == "__main__":
    main()
