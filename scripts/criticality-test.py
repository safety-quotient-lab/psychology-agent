#!/usr/bin/env python3
"""criticality-test.py — Test for self-organized criticality in meshd event logs.

Tests whether inter-event intervals follow a power-law distribution
(linear on log-log plot, exponent α ≈ 1.5–2.5). Power-law distributed
intervals indicate the mesh operates at the edge between order and chaos
(Bak, 1996; Beggs & Plenz, 2003).

The prediction (theoretical-directions.md §15): event-driven processing
should produce bursty dynamics with many small inter-event intervals and
rare large gaps — the signature of self-organized criticality.

If the distribution follows exponential or uniform instead, the system
operates in a subcritical regime and the prediction fails.

Usage:
    python3 scripts/criticality-test.py /tmp/deliberation_timestamps.csv
    python3 scripts/criticality-test.py --ssh chromabook  # query directly
    python3 scripts/criticality-test.py --json            # structured output
"""

import argparse
import csv
import json
import math
import subprocess
import sys
from collections import Counter
from datetime import datetime


def parse_timestamps(filepath):
    """Read timestamps from CSV file."""
    timestamps = []
    with open(filepath) as f:
        reader = csv.reader(f)
        for row in reader:
            if not row:
                continue
            ts_str = row[0].strip().strip('"')
            try:
                timestamps.append(datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S"))
            except ValueError:
                try:
                    timestamps.append(datetime.fromisoformat(ts_str))
                except ValueError:
                    continue
    return sorted(timestamps)


def fetch_from_ssh(host):
    """Query deliberation_log timestamps via SSH."""
    result = subprocess.run(
        ["ssh", host,
         'sqlite3 -csv ~/projects/operations-agent/state.db '
         '"SELECT started_at FROM deliberation_log ORDER BY started_at;"'],
        capture_output=True, text=True, timeout=15)
    if result.returncode != 0:
        print(f"SSH error: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    tmpfile = "/tmp/deliberation_timestamps.csv"
    with open(tmpfile, "w") as f:
        f.write(result.stdout)
    return parse_timestamps(tmpfile)


def compute_intervals(timestamps):
    """Compute inter-event intervals in seconds."""
    intervals = []
    for i in range(1, len(timestamps)):
        delta = (timestamps[i] - timestamps[i - 1]).total_seconds()
        if delta > 0:
            intervals.append(delta)
    return intervals


def log_bin(intervals, num_bins=30):
    """Logarithmic binning for power-law visualization."""
    if not intervals:
        return [], []
    min_val = min(intervals)
    max_val = max(intervals)
    if min_val <= 0:
        min_val = 1
    log_min = math.log10(min_val)
    log_max = math.log10(max_val)
    bin_edges = [10 ** (log_min + i * (log_max - log_min) / num_bins)
                 for i in range(num_bins + 1)]
    counts = [0] * num_bins
    for val in intervals:
        for j in range(num_bins):
            if bin_edges[j] <= val < bin_edges[j + 1]:
                counts[j] += 1
                break
        else:
            counts[-1] += 1
    bin_centers = [(bin_edges[j] + bin_edges[j + 1]) / 2 for j in range(num_bins)]
    # Normalize by bin width for density
    densities = []
    for j in range(num_bins):
        width = bin_edges[j + 1] - bin_edges[j]
        densities.append(counts[j] / width if width > 0 else 0)
    return bin_centers, densities


def estimate_power_law_exponent(intervals):
    """Maximum likelihood estimator for power-law exponent (Clauset et al. 2009).

    α = 1 + n * [Σ ln(xi/xmin)]^(-1)
    """
    x_min = min(intervals)
    if x_min <= 0:
        return None, 0
    n = len(intervals)
    log_sum = sum(math.log(x / x_min) for x in intervals if x >= x_min)
    if log_sum == 0:
        return None, n
    alpha = 1 + n / log_sum
    return round(alpha, 3), n


def test_exponential_fit(intervals):
    """Compare against exponential distribution (null hypothesis).

    For exponential, the coefficient of variation (CV) = 1.0 exactly.
    Power-law distributions have CV >> 1.
    """
    if not intervals:
        return None
    mean = sum(intervals) / len(intervals)
    variance = sum((x - mean) ** 2 for x in intervals) / len(intervals)
    std = math.sqrt(variance)
    cv = std / mean if mean > 0 else 0
    return round(cv, 3)


def assess(alpha, cv, n):
    """Assess whether the distribution supports self-organized criticality."""
    findings = []

    if alpha and 1.5 <= alpha <= 2.5:
        findings.append(f"α = {alpha} falls within predicted range [1.5, 2.5] — CONSISTENT with power-law")
    elif alpha and alpha < 1.5:
        findings.append(f"α = {alpha} below predicted range — distribution heavier-tailed than expected")
    elif alpha and alpha > 2.5:
        findings.append(f"α = {alpha} above predicted range — distribution lighter-tailed, closer to exponential")
    else:
        findings.append("α estimation failed — insufficient data or degenerate distribution")

    if cv and cv > 2.0:
        findings.append(f"CV = {cv} >> 1.0 — bursty dynamics, inconsistent with Poisson/exponential")
    elif cv and cv > 1.0:
        findings.append(f"CV = {cv} > 1.0 — moderately bursty, weakly inconsistent with exponential")
    elif cv:
        findings.append(f"CV = {cv} ≈ 1.0 — consistent with exponential (Poisson process), NOT power-law")

    if n < 100:
        findings.append(f"WARNING: n={n} — insufficient for reliable power-law detection (need 1000+)")
    elif n < 1000:
        findings.append(f"NOTE: n={n} — marginal sample size; results suggestive, not definitive")

    # Verdict
    if alpha and 1.5 <= alpha <= 2.5 and cv and cv > 1.5 and n >= 100:
        verdict = "SUPPORTS self-organized criticality (prediction CONFIRMED)"
    elif cv and cv <= 1.1:
        verdict = "REJECTS — exponential/Poisson dynamics (prediction FALSIFIED)"
    else:
        verdict = "INCONCLUSIVE — further analysis needed (larger dataset or alternative methods)"

    return verdict, findings


def main():
    parser = argparse.ArgumentParser(description="Test for self-organized criticality")
    parser.add_argument("csv_file", nargs="?", default=None)
    parser.add_argument("--ssh", type=str, help="Fetch from remote host via SSH")
    parser.add_argument("--json", action="store_true", help="Structured JSON output")
    args = parser.parse_args()

    if args.ssh:
        timestamps = fetch_from_ssh(args.ssh)
    elif args.csv_file:
        timestamps = parse_timestamps(args.csv_file)
    else:
        print("Usage: criticality-test.py <csv_file> or --ssh <host>", file=sys.stderr)
        sys.exit(1)

    intervals = compute_intervals(timestamps)

    if len(intervals) < 10:
        print(f"Only {len(intervals)} intervals — insufficient data", file=sys.stderr)
        sys.exit(1)

    alpha, n = estimate_power_law_exponent(intervals)
    cv = test_exponential_fit(intervals)
    verdict, findings = assess(alpha, cv, n)

    # Descriptive statistics
    intervals_sorted = sorted(intervals)
    stats = {
        "n_events": len(timestamps),
        "n_intervals": len(intervals),
        "time_span_hours": round((timestamps[-1] - timestamps[0]).total_seconds() / 3600, 1),
        "min_interval_s": round(min(intervals), 1),
        "max_interval_s": round(max(intervals), 1),
        "median_interval_s": round(intervals_sorted[len(intervals_sorted) // 2], 1),
        "mean_interval_s": round(sum(intervals) / len(intervals), 1),
        "power_law_exponent_alpha": alpha,
        "coefficient_of_variation": cv,
        "verdict": verdict,
        "findings": findings,
    }

    if args.json:
        print(json.dumps(stats, indent=2))
    else:
        print("Self-Organized Criticality Test")
        print("=" * 45)
        print(f"  Events:          {stats['n_events']}")
        print(f"  Intervals:       {stats['n_intervals']}")
        print(f"  Time span:       {stats['time_span_hours']}h")
        print(f"  Min interval:    {stats['min_interval_s']}s")
        print(f"  Max interval:    {stats['max_interval_s']}s")
        print(f"  Median interval: {stats['median_interval_s']}s")
        print(f"  Mean interval:   {stats['mean_interval_s']}s")
        print()
        print(f"  α (power-law exponent): {alpha}")
        print(f"  CV (burstiness):        {cv}")
        print()
        for f in findings:
            print(f"  {f}")
        print()
        print(f"  VERDICT: {verdict}")


if __name__ == "__main__":
    main()
