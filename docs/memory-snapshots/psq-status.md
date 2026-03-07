<!-- PROVENANCE: Restored 2026-03-06 by /cycle Step 11 orphan check
     Source: docs/memory-snapshots/psq-status.md -->

# PSQ Sub-Agent Status (managed in its own context)

**Production endpoint:** ✓ https://psq.unratified.org/score — live, TLS, Hetzner CX Ashburn
**Score calibration:** ✓ isotonic-v2-2026-03-06. Quantile-binned isotonic (n_bins=20).
  All 10 dims calibrated. HI dead zone resolved (B2 (HI calibration dead zone) fix, Session 26).
  Historical MAE improvement: +3.5–21.6% per dimension vs. raw.
**Confidence calibration:** ✓ B1 (confidence head dead) FIXED (Session 26). r_confidence field added to score output.
  calibration_note surfaces held-out Pearson r per dimension. scale=0 behavior (intentional
  constant function overriding anti-calibrated head) now explicit. Limitation:
  confidence-is-static-r (MEDIUM — not HIGH; behavior is intentional design).
**Model transfer:** ✓ rsync complete. SHA256 verified (Hetzner matches Chromebook source).
  41 files, 531 MB. best.pt on Hetzner; local copy lost.
**Service:** systemd psq-server active. 84ms inference. onnxruntime-node postinstall fix.
**Wrangler secret:** PSQ_ENDPOINT_URL → https://psq.unratified.org
**Firewall:** ufw SSH + HTTP/HTTPS only. Port 3000 closed from public.
**Integration:** psq-scoring session turn 7 complete — 5 ICESCR texts scored, B2 (HI calibration dead zone) validated.
**B3 (TE uniformity) CLOSED 2026-03-07:**
  v29 REJECTED (TE=0.734, overall=0.668). v30 single-task ceiling=0.762.
  F3 (500 texts): drove v31 (TE=0.773, overall=0.679) — REJECTED.
  F3b (700 texts): drove v32 (TE=0.739, overall=0.676) — REJECTED.
  F4 (350 texts: 200 prosocial + 150 esconv, distribution-rebalanced): drove v33 (TE=0.742, overall=0.672) — REJECTED.
  5 consecutive rejections. 1,550 total expansion texts. SE(r)≈0.10 noise floor at n=99 binding.
  B3 CLOSED — v23 TE=0.795 accepted as production ceiling. F1 (recalibrate n_bins=20) deferred permanently.
**Known open issues:**
  - DA validity (authority_dynamics construct)
  - DA trend: 0.588 (v23) → 0.531 (v29) → 0.501 (v31) → 0.558 (v32) → 0.544 (v33); noisy, not a trend
  - AD: 0.713 (v23) → 0.671 (v31) → 0.732 (v32) → 0.678 (v33); stochastic variance (SE(r)≈0.10)
  - CO weakness (r=0.534–0.538 across v23/v32/v33)
  - No human validation (only Dreaddit training data)
  - WEIRD assumptions
  - B3 CLOSED — TE ceiling accepted at v23 0.795
  - HI direction anomaly: hostile social media anchor HI=6.88 > policy brief HI=6.15 on 0–10 safety scale (counterintuitive, not investigated)
**PSQ-Lite:** TE + HI(raw) + TC adopted by unratified-agent for advocacy content (provisional).
Do not duplicate PSQ improvement work in this context.
