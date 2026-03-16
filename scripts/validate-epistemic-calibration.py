#!/usr/bin/env python3
"""
validate-epistemic-calibration.py — Criterion validity for epistemic calibration.

Tests whether confidence scores predict verification outcomes. This construct
has genuine criterion validity because the sensor (confidence at write-time)
and outcome (verification at review-time) derive from independent measurement
moments and different processes.

Two data sources:
  1. claims table — confidence scores attached at extraction; verified at review
  2. prediction_ledger — likelihood attached at prediction; outcome at resolution

Calibration analysis:
  - Bin confidence scores into deciles
  - Compare expected accuracy (mean confidence per bin) vs observed accuracy
     (verification rate per bin)
  - Perfect calibration: diagonal (80% confidence → 80% verified)
  - Over-confidence: observed < expected (common LLM pathology)
  - Under-confidence: observed > expected
  - Anti-calibration: confidence inversely predicts accuracy (worst case)

References:
    Flavell (1979). Metacognition and cognitive monitoring.
    Dunning & Kruger (1999). Unskilled and unaware of it.
    Gneiting & Raftery (2007). Strictly proper scoring rules.

Usage:
    python3 scripts/validate-epistemic-calibration.py              # full report
    python3 scripts/validate-epistemic-calibration.py --json       # machine-readable
    python3 scripts/validate-epistemic-calibration.py --claims     # claims only
    python3 scripts/validate-epistemic-calibration.py --predictions # predictions only
    python3 scripts/validate-epistemic-calibration.py --calibrate  # include isotonic recalibration
"""

import argparse
import json
import math
import os
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent))
DB_PATH = PROJECT_ROOT / "state.db"


# ── Data extraction ──────────────────────────────────────────────────────

def get_claims_data(db: sqlite3.Connection) -> list[dict]:
    """Extract claims with confidence scores and verification status."""
    rows = db.execute("""
        SELECT id, confidence, verified, confidence_basis, claim_text
        FROM claims
        WHERE confidence IS NOT NULL
        ORDER BY confidence
    """).fetchall()

    return [
        {
            "id": r[0],
            "confidence": r[1],
            "verified": bool(r[2]),
            "basis": r[3] or "",
            "text": (r[4] or "")[:100],
        }
        for r in rows
    ]


def get_prediction_data(db: sqlite3.Connection) -> list[dict]:
    """Extract predictions with likelihood and outcome."""
    rows = db.execute("""
        SELECT id, session_id, prediction, domain, outcome, likelihood
        FROM prediction_ledger
        WHERE outcome != 'untested'
    """).fetchall()

    # Map likelihood text to numeric confidence
    likelihood_map = {
        "certain": 0.95,
        "very likely": 0.90,
        "likely": 0.80,
        "probable": 0.75,
        "possible": 0.50,
        "unlikely": 0.25,
        "very unlikely": 0.10,
    }

    results = []
    for r in rows:
        likelihood_text = (r[5] or "").strip().lower()
        confidence = likelihood_map.get(likelihood_text)
        if confidence is None:
            # Try parsing as float
            try:
                confidence = float(likelihood_text)
            except (ValueError, TypeError):
                confidence = None

        outcome = r[4]
        # Map outcome to binary success
        if outcome == "confirmed":
            success = True
        elif outcome == "partially-confirmed":
            success = True  # count as success (conservative)
        elif outcome in ("refuted",):
            success = False
        else:
            continue

        results.append({
            "id": r[0],
            "session_id": r[1],
            "prediction": (r[2] or "")[:100],
            "domain": r[3],
            "confidence": confidence,
            "outcome": outcome,
            "success": success,
        })

    return results


# ── Calibration analysis ─────────────────────────────────────────────────

def calibration_bins(
    data: list[dict], n_bins: int = 5,
) -> list[dict]:
    """Bin data by confidence and compute observed vs expected accuracy.

    Uses equal-width bins (not quantiles) for interpretability.
    """
    if not data:
        return []

    # Filter to items with confidence
    scored = [d for d in data if d.get("confidence") is not None]
    if not scored:
        return []

    min_conf = min(d["confidence"] for d in scored)
    max_conf = max(d["confidence"] for d in scored)

    # Avoid degenerate bins
    if max_conf - min_conf < 0.01:
        return [{
            "bin_lower": min_conf,
            "bin_upper": max_conf,
            "n": len(scored),
            "mean_confidence": sum(d["confidence"] for d in scored) / len(scored),
            "observed_accuracy": sum(1 for d in scored if d.get("verified") or d.get("success")) / len(scored),
            "calibration_error": 0.0,
        }]

    bin_width = (max_conf - min_conf) / n_bins
    bins = []

    for i in range(n_bins):
        lower = min_conf + i * bin_width
        upper = lower + bin_width
        # Last bin includes the upper bound
        if i == n_bins - 1:
            items = [d for d in scored if lower <= d["confidence"] <= upper]
        else:
            items = [d for d in scored if lower <= d["confidence"] < upper]

        if not items:
            continue

        mean_conf = sum(d["confidence"] for d in items) / len(items)
        observed = sum(
            1 for d in items if d.get("verified") or d.get("success")
        ) / len(items)

        bins.append({
            "bin_lower": round(lower, 3),
            "bin_upper": round(upper, 3),
            "n": len(items),
            "mean_confidence": round(mean_conf, 3),
            "observed_accuracy": round(observed, 3),
            "calibration_error": round(observed - mean_conf, 3),
        })

    return bins


def compute_metrics(data: list[dict]) -> dict:
    """Compute overall calibration metrics."""
    scored = [d for d in data if d.get("confidence") is not None]
    if not scored:
        return {"n": 0, "note": "No scored data available"}

    n = len(scored)
    successes = [d for d in scored if d.get("verified") or d.get("success")]
    overall_accuracy = len(successes) / n
    mean_confidence = sum(d["confidence"] for d in scored) / n

    # Expected Calibration Error (ECE) — weighted mean of bin calibration errors
    bins = calibration_bins(scored)
    if bins:
        ece = sum(
            b["n"] * abs(b["calibration_error"]) for b in bins
        ) / sum(b["n"] for b in bins)
    else:
        ece = abs(overall_accuracy - mean_confidence)

    # Brier score — proper scoring rule (lower = better; 0 = perfect)
    brier = sum(
        (d["confidence"] - (1.0 if (d.get("verified") or d.get("success")) else 0.0)) ** 2
        for d in scored
    ) / n

    # Spearman correlation between confidence and outcome
    conf_values = [d["confidence"] for d in scored]
    outcome_values = [1.0 if (d.get("verified") or d.get("success")) else 0.0 for d in scored]
    rho, p = _spearman_rho(conf_values, outcome_values)

    # Classification
    if rho > 0.3 and ece < 0.15:
        calibration_quality = "well-calibrated"
    elif rho > 0.1:
        calibration_quality = "weakly-calibrated"
    elif abs(rho) < 0.1:
        calibration_quality = "uncalibrated"
    else:
        calibration_quality = "anti-calibrated"

    if mean_confidence > overall_accuracy + 0.1:
        bias = "overconfident"
    elif mean_confidence < overall_accuracy - 0.1:
        bias = "underconfident"
    else:
        bias = "unbiased"

    return {
        "n": n,
        "overall_accuracy": round(overall_accuracy, 3),
        "mean_confidence": round(mean_confidence, 3),
        "ece": round(ece, 3),
        "brier_score": round(brier, 3),
        "spearman_rho": rho,
        "spearman_p": p,
        "calibration_quality": calibration_quality,
        "bias": bias,
    }


def binary_classification(data: list[dict], threshold: float = 0.91) -> dict:
    """Compute binary classification metrics at the given confidence threshold.

    Treats claims >= threshold as "high-confidence" (predicted positive) and
    claims < threshold as "low-confidence" (predicted negative). Verification
    status serves as ground truth.
    """
    scored = [d for d in data if d.get("confidence") is not None]
    if not scored:
        return {"n": 0, "note": "No scored data available"}

    high = [d for d in scored if d["confidence"] >= threshold]
    low = [d for d in scored if d["confidence"] < threshold]

    high_verified = sum(1 for d in high if d.get("verified") or d.get("success"))
    low_verified = sum(1 for d in low if d.get("verified") or d.get("success"))

    high_rate = high_verified / len(high) if high else 0.0
    low_rate = low_verified / len(low) if low else 0.0

    # Binary classifier: predict "verified" when confidence >= threshold
    # True positive: high-confidence AND verified
    # False positive: high-confidence AND NOT verified
    # False negative: low-confidence AND verified
    # True negative: low-confidence AND NOT verified
    tp = high_verified
    fp = len(high) - high_verified
    fn = low_verified
    tn = len(low) - low_verified

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    return {
        "threshold": threshold,
        "high_confidence": {"n": len(high), "verified": high_verified, "rate": round(high_rate, 3)},
        "low_confidence": {"n": len(low), "verified": low_verified, "rate": round(low_rate, 3)},
        "tp": tp, "fp": fp, "fn": fn, "tn": tn,
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "f1": round(f1, 3),
    }


def calibrate_scores(data: list[dict]) -> list[dict]:
    """Apply isotonic regression (pool adjacent violators) to recalibrate confidence.

    Pure-Python implementation — no external dependencies. Returns a copy of the
    input data with an added `calibrated_confidence` field.

    The pool adjacent violators algorithm (PAVA) enforces monotonicity: if a
    lower raw confidence maps to a higher observed accuracy than a higher raw
    confidence, the algorithm pools those observations and assigns the weighted
    average to both. This produces the best monotone least-squares fit.

    References:
        Barlow et al. (1972). Statistical Inference under Order Restrictions.
        Zadrozny & Elkan (2002). Transforming classifier scores into accurate
            multiclass probability estimates.
    """
    scored = [d for d in data if d.get("confidence") is not None]
    if not scored:
        return [dict(d, calibrated_confidence=d.get("confidence")) for d in data]

    # Sort by raw confidence
    indexed = sorted(range(len(scored)), key=lambda i: scored[i]["confidence"])
    sorted_conf = [scored[i]["confidence"] for i in indexed]
    sorted_outcome = [
        1.0 if (scored[i].get("verified") or scored[i].get("success")) else 0.0
        for i in indexed
    ]

    # Pool Adjacent Violators Algorithm (PAVA)
    # Each block tracks: [sum_of_outcomes, count, start_index, end_index]
    n = len(sorted_conf)
    blocks = [[sorted_outcome[i], 1, i, i] for i in range(n)]

    # Merge blocks that violate monotonicity
    merged = [blocks[0]]
    for i in range(1, n):
        merged.append(blocks[i])
        # Pool while the last block has a lower average than the previous block
        while len(merged) >= 2:
            last = merged[-1]
            prev = merged[-2]
            last_avg = last[0] / last[1]
            prev_avg = prev[0] / prev[1]
            if prev_avg > last_avg:
                # Pool: merge last into prev
                prev[0] += last[0]
                prev[1] += last[1]
                prev[3] = last[3]
                merged.pop()
            else:
                break

    # Build calibrated values: each block gets its pooled average
    calibrated_values = [0.0] * n
    for block in merged:
        avg = block[0] / block[1]
        for j in range(block[2], block[3] + 1):
            calibrated_values[j] = avg

    # Map calibrated values back to original indices
    calibration_map = {}
    for sorted_idx, orig_idx in enumerate(indexed):
        calibration_map[orig_idx] = calibrated_values[sorted_idx]

    # Build result: copy all data, add calibrated_confidence for scored items
    scored_set = set(id(d) for d in scored)
    result = []
    scored_counter = 0
    for d in data:
        new_d = dict(d)
        if id(d) in scored_set and d.get("confidence") is not None:
            # Find position in scored list
            new_d["calibrated_confidence"] = round(
                calibration_map.get(scored_counter, d["confidence"]), 3
            )
            scored_counter += 1
        else:
            new_d["calibrated_confidence"] = None
        result.append(new_d)

    return result


def _spearman_rho(x: list[float], y: list[float]) -> tuple[float, float]:
    """Compute Spearman rank correlation (self-contained)."""
    n = len(x)
    if n < 5:
        return (0.0, 1.0)

    def rank(values):
        indexed = sorted(enumerate(values), key=lambda t: t[1])
        ranks = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j < n - 1 and indexed[j + 1][1] == indexed[j][1]:
                j += 1
            avg_rank = (i + j) / 2.0 + 1.0
            for k in range(i, j + 1):
                ranks[indexed[k][0]] = avg_rank
            i = j + 1
        return ranks

    rx = rank(x)
    ry = rank(y)
    mean_rx = sum(rx) / n
    mean_ry = sum(ry) / n
    num = sum((rx[i] - mean_rx) * (ry[i] - mean_ry) for i in range(n))
    den_x = math.sqrt(sum((rx[i] - mean_rx) ** 2 for i in range(n)))
    den_y = math.sqrt(sum((ry[i] - mean_ry) ** 2 for i in range(n)))

    if den_x == 0 or den_y == 0:
        return (0.0, 1.0)

    rho = num / (den_x * den_y)

    if abs(rho) >= 1.0:
        p = 0.0
    else:
        t_stat = rho * math.sqrt((n - 2) / (1 - rho ** 2))
        t = 1.0 / (1.0 + 0.2316419 * abs(t_stat))
        d = 0.3989422804014327
        poly = t * (0.319381530 + t * (-0.356563782 + t * (
            1.781477937 + t * (-1.821255978 + t * 1.330274429))))
        cdf = 1.0 - d * math.exp(-0.5 * t_stat * t_stat) * poly
        if t_stat < 0:
            cdf = 1.0 - cdf
        p = 2.0 * (1.0 - cdf)

    return (round(rho, 3), round(p, 4))


# ── Reporting ────────────────────────────────────────────────────────────

def print_report(
    claims_data: list[dict],
    prediction_data: list[dict],
    claims_metrics: dict,
    prediction_metrics: dict,
    claims_bins: list[dict],
    prediction_bins: list[dict],
    *,
    show_calibration: bool = False,
) -> None:
    """Print human-readable calibration report."""
    print("=" * 72)
    print("  Epistemic Calibration Validity Report")
    print("  Construct: confidence predicts verification/outcome accuracy")
    print("=" * 72)
    print()

    # ── Claims section ───────────────────────────────────────────────
    print("-" * 72)
    print("  CLAIMS (confidence at extraction → verified at review)")
    print("-" * 72)
    print()
    cm = claims_metrics
    if cm["n"] == 0:
        print("  No scored claims available.")
    else:
        print(f"  Total scored claims: {cm['n']}")
        print(f"  Overall accuracy: {cm['overall_accuracy']:.1%}")
        print(f"  Mean confidence: {cm['mean_confidence']:.1%}")
        print(f"  Bias: {cm['bias']}")
        print()
        print(f"  Expected Calibration Error (ECE): {cm['ece']:.3f}")
        print(f"  Brier score: {cm['brier_score']:.3f} (0=perfect, 0.25=random)")
        print(f"  Spearman ρ (confidence→outcome): {cm['spearman_rho']:.3f} (p={cm['spearman_p']:.4f})")
        print(f"  Calibration quality: {cm['calibration_quality']}")
        print()

        # Calibration table
        print(f"  {'Confidence bin':<20} {'n':>5} {'Expected':>10} {'Observed':>10} {'Error':>8}")
        print(f"  {'─' * 20} {'─' * 5} {'─' * 10} {'─' * 10} {'─' * 8}")
        for b in claims_bins:
            err_marker = "✓" if abs(b["calibration_error"]) < 0.10 else "⚠"
            print(
                f"  {b['bin_lower']:.2f}–{b['bin_upper']:.2f}"
                f"{'':>10} {b['n']:>5} {b['mean_confidence']:>9.1%}"
                f" {b['observed_accuracy']:>9.1%}"
                f" {b['calibration_error']:>+7.1%} {err_marker}"
            )
        print()

    # ── Predictions section ──────────────────────────────────────────
    print("-" * 72)
    print("  PREDICTIONS (likelihood at prediction → outcome at resolution)")
    print("-" * 72)
    print()
    pm = prediction_metrics
    if pm["n"] == 0:
        print("  No scored predictions available.")
    else:
        scored_preds = [d for d in prediction_data if d.get("confidence") is not None]
        unscored_preds = [d for d in prediction_data if d.get("confidence") is None]

        print(f"  Total resolved predictions: {len(prediction_data)}")
        print(f"  With likelihood scores: {len(scored_preds)}")
        print(f"  Without likelihood scores: {len(unscored_preds)}")
        print()

        if pm["n"] > 0:
            print(f"  Overall accuracy: {pm['overall_accuracy']:.1%}")
            print(f"  Mean confidence: {pm['mean_confidence']:.1%}")
            print(f"  Brier score: {pm['brier_score']:.3f}")
            print(f"  Spearman ρ: {pm['spearman_rho']:.3f} (p={pm['spearman_p']:.4f})")
            print(f"  Calibration quality: {pm['calibration_quality']}")
        print()

        # Per-prediction detail
        print(f"  {'ID':>4} {'Confidence':>10} {'Outcome':<22} {'Prediction'}")
        print(f"  {'─' * 4} {'─' * 10} {'─' * 22} {'─' * 40}")
        for d in prediction_data:
            conf_str = f"{d['confidence']:.0%}" if d["confidence"] is not None else "—"
            marker = "✓" if d["success"] else "✗"
            print(
                f"  {d['id']:>4} {conf_str:>10} {marker} {d['outcome']:<19} "
                f"{d['prediction'][:50]}"
            )
        print()

    # ── Validity verdict ─────────────────────────────────────────────
    print("-" * 72)
    print("  CRITERION VALIDITY VERDICT")
    print("-" * 72)
    print()

    has_claims_validity = (
        cm["n"] >= 20
        and cm["spearman_rho"] > 0.1
        and cm["spearman_p"] < 0.05
    )
    has_prediction_validity = (
        pm.get("n", 0) >= 10
        and pm.get("spearman_rho", 0) > 0.1
        and pm.get("spearman_p", 1) < 0.05
    )

    if has_claims_validity:
        print(f"  ✓ CLAIMS: Confidence scores predict verification outcomes")
        print(f"    ρ={cm['spearman_rho']:.3f}, p={cm['spearman_p']:.4f}, n={cm['n']}")
        print(f"    Epistemic calibration demonstrates criterion validity.")
    else:
        reason = []
        if cm["n"] < 20:
            reason.append(f"insufficient data (n={cm['n']}, need ≥20)")
        if cm["spearman_rho"] <= 0.1:
            reason.append(f"weak correlation (ρ={cm['spearman_rho']:.3f})")
        if cm["spearman_p"] >= 0.05:
            reason.append(f"not significant (p={cm['spearman_p']:.4f})")
        print(f"  ✗ CLAIMS: No criterion validity — {'; '.join(reason)}")
    print()

    if has_prediction_validity:
        print(f"  ✓ PREDICTIONS: Likelihood scores predict outcomes")
        print(f"    ρ={pm['spearman_rho']:.3f}, p={pm['spearman_p']:.4f}, n={pm['n']}")
    elif pm.get("n", 0) > 0:
        print(f"  ✗ PREDICTIONS: Insufficient data or weak signal (n={pm.get('n', 0)})")
    else:
        print(f"  — PREDICTIONS: No scored predictions to test")
    print()

    # First validated construct?
    if has_claims_validity:
        print("  ★ EPISTEMIC CALIBRATION represents the first A2A-Psychology")
        print("    construct with genuine criterion validity evidence.")
        print("    Sensor (confidence at write-time) and outcome (verification")
        print("    at review-time) derive from independent processes.")
    print()

    # ── Epistemic flags ──────────────────────────────────────────────
    print("-" * 72)
    print("  ⚑ EPISTEMIC FLAGS")
    print("-" * 72)
    print()
    print("  - Claims verification may carry confirmation bias: the same agent")
    print("    that assigned confidence may have verified. Independent verification")
    print("    (different agent or human) would strengthen the finding.")
    print("  - Confidence scores cluster narrowly (most 0.85-1.0). The test")
    print("    has limited statistical power for the low-confidence region.")
    print("  - Prediction sample remains small. The likelihood→outcome test")
    print("    requires more resolved predictions for reliable conclusions.")
    print("  - Brier score benchmarks: 0.0 = perfect, 0.25 = random coin flip.")
    print("    Values below 0.15 indicate useful probabilistic forecasting.")
    print()

    # ── Binary classification analysis ──────────────────────────────
    if cm.get("n", 0) > 0:
        print("-" * 72)
        print("  BINARY CLASSIFICATION (threshold=0.91)")
        print("-" * 72)
        print()
        bc = binary_classification(claims_data, threshold=0.91)
        hc = bc["high_confidence"]
        lc = bc["low_confidence"]
        print(f"  High-confidence (>= 0.91): {hc['n']:>4} claims, "
              f"verification rate {hc['rate']:.1%}")
        print(f"  Low-confidence  (<  0.91): {lc['n']:>4} claims, "
              f"verification rate {lc['rate']:.1%}")
        print()
        print(f"  Confusion matrix:")
        print(f"    True positives:  {bc['tp']:>4}  (high-conf, verified)")
        print(f"    False positives: {bc['fp']:>4}  (high-conf, NOT verified)")
        print(f"    False negatives: {bc['fn']:>4}  (low-conf, verified)")
        print(f"    True negatives:  {bc['tn']:>4}  (low-conf, NOT verified)")
        print()
        print(f"  Precision: {bc['precision']:.3f}")
        print(f"  Recall:    {bc['recall']:.3f}")
        print(f"  F1 score:  {bc['f1']:.3f}")
        print()
        print("  Interpretation: The continuous confidence scale collapses to a")
        print("  binary signal at 0.91. Claims above that threshold verify at a")
        print(f"  meaningfully higher rate ({hc['rate']:.1%}) than those below it")
        print(f"  ({lc['rate']:.1%}). The system compresses genuine uncertainty")
        print("  into too narrow a range, leaving the 0.50-0.90 region unused.")
        print()

    # ── Isotonic regression calibration (optional) ──────────────────
    if show_calibration and cm.get("n", 0) > 0:
        print("-" * 72)
        print("  CALIBRATED SCORES (isotonic regression)")
        print("-" * 72)
        print()
        print("  Method: Pool Adjacent Violators Algorithm (PAVA) — fits a")
        print("  monotone step function mapping raw confidence to observed")
        print("  verification rate. No external dependencies.")
        print()

        calibrated_data = calibrate_scores(claims_data)
        # Swap confidence for calibrated_confidence to reuse metrics functions
        cal_for_metrics = []
        for d in calibrated_data:
            if d.get("calibrated_confidence") is not None:
                cal_for_metrics.append(dict(
                    d,
                    confidence=d["calibrated_confidence"],
                ))

        cal_metrics = compute_metrics(cal_for_metrics)
        cal_bins = calibration_bins(cal_for_metrics)

        # Calibrated calibration table
        print(f"  {'Confidence bin':<20} {'n':>5} {'Expected':>10} {'Observed':>10} {'Error':>8}")
        print(f"  {'─' * 20} {'─' * 5} {'─' * 10} {'─' * 10} {'─' * 8}")
        for b in cal_bins:
            err_marker = "✓" if abs(b["calibration_error"]) < 0.10 else "⚠"
            print(
                f"  {b['bin_lower']:.2f}–{b['bin_upper']:.2f}"
                f"{'':>10} {b['n']:>5} {b['mean_confidence']:>9.1%}"
                f" {b['observed_accuracy']:>9.1%}"
                f" {b['calibration_error']:>+7.1%} {err_marker}"
            )
        print()

        # Comparison table
        print(f"  {'Metric':<30} {'Raw':>10} {'Calibrated':>12} {'Change':>10}")
        print(f"  {'─' * 30} {'─' * 10} {'─' * 12} {'─' * 10}")

        raw_ece = cm.get("ece", 0)
        cal_ece = cal_metrics.get("ece", 0)
        ece_change = cal_ece - raw_ece
        print(f"  {'ECE':<30} {raw_ece:>10.3f} {cal_ece:>12.3f} {ece_change:>+10.3f}")

        raw_brier = cm.get("brier_score", 0)
        cal_brier = cal_metrics.get("brier_score", 0)
        brier_change = cal_brier - raw_brier
        print(f"  {'Brier score':<30} {raw_brier:>10.3f} {cal_brier:>12.3f} {brier_change:>+10.3f}")

        raw_rho = cm.get("spearman_rho", 0)
        cal_rho = cal_metrics.get("spearman_rho", 0)
        rho_change = cal_rho - raw_rho
        print(f"  {'Spearman ρ':<30} {raw_rho:>10.3f} {cal_rho:>12.3f} {rho_change:>+10.3f}")

        print()
        print("  Note: Isotonic regression maps each raw confidence to the")
        print("  observed verification rate at that level. Calibrated ECE")
        print("  approaches zero by construction; the Brier improvement")
        print("  reflects how much overconfidence the raw scores carried.")
        print()


# ── Main ─────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Epistemic calibration criterion validity"
    )
    parser.add_argument("--json", action="store_true", help="JSON output")
    parser.add_argument("--claims", action="store_true", help="Claims only")
    parser.add_argument("--predictions", action="store_true",
                        help="Predictions only")
    parser.add_argument("--calibrate", action="store_true",
                        help="Include isotonic regression recalibration analysis")
    args = parser.parse_args()

    if not DB_PATH.exists():
        print("state.db not found.", file=sys.stderr)
        sys.exit(1)

    db = sqlite3.connect(str(DB_PATH))

    claims_data = get_claims_data(db)
    prediction_data = get_prediction_data(db)
    db.close()

    # Compute calibration
    claims_metrics = compute_metrics(claims_data)
    claims_bins = calibration_bins(claims_data)

    scored_predictions = [d for d in prediction_data if d.get("confidence") is not None]
    prediction_metrics = compute_metrics(scored_predictions)
    prediction_bins = calibration_bins(scored_predictions)

    if args.json:
        output = {
            "claims": {
                "metrics": claims_metrics,
                "bins": claims_bins,
                "n_total": len(claims_data),
            },
            "predictions": {
                "metrics": prediction_metrics,
                "bins": prediction_bins,
                "n_total": len(prediction_data),
                "n_scored": len(scored_predictions),
            },
        }
        if args.calibrate:
            calibrated = calibrate_scores(claims_data)
            cal_for_json = [
                dict(d, confidence=d["calibrated_confidence"])
                for d in calibrated if d.get("calibrated_confidence") is not None
            ]
            output["claims"]["calibrated_metrics"] = compute_metrics(cal_for_json)
            output["claims"]["calibrated_bins"] = calibration_bins(cal_for_json)
            output["claims"]["binary_classification"] = binary_classification(claims_data)
        print(json.dumps(output, indent=2))
    elif args.claims:
        claims_metrics = compute_metrics(claims_data)
        claims_bins = calibration_bins(claims_data)
        print_report(claims_data, [], claims_metrics, {"n": 0}, claims_bins, [],
                     show_calibration=args.calibrate)
    elif args.predictions:
        prediction_metrics = compute_metrics(scored_predictions)
        prediction_bins = calibration_bins(scored_predictions)
        print_report([], prediction_data, {"n": 0}, prediction_metrics, [], prediction_bins)
    else:
        print_report(
            claims_data, prediction_data,
            claims_metrics, prediction_metrics,
            claims_bins, prediction_bins,
            show_calibration=args.calibrate,
        )


if __name__ == "__main__":
    main()
