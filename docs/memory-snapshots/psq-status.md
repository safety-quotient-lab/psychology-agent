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
**B3 (TE uniformity) F3b COMPLETE; v32 REJECTED 2026-03-07:**
  v29 REJECTED (TE=0.734, overall=0.668). v30 single-task ceiling=0.762.
  F3 (unlabeled-pool expansion, 500 texts): drove v31 (TE=0.773, overall=0.679) — REJECTED.
  F3b (unlabeled-pool expansion, 700 texts): drove v32 (TE=0.739, overall=0.676) — REJECTED.
  TE REGRESSED −0.034 vs v31 despite 700 high-quality texts. 1,200 total expansion texts insufficient.
  B3 (TE uniformity) STALLED — diminishing returns. Strategy decision pending.
  B3 (TE uniformity) F1 (recalibrate n_bins=20) deferred until a model beats v23.
**Known open issues:**
  - DA validity (authority_dynamics construct)
  - DA trend: 0.588 (v23) → 0.531 (v29) → 0.501 (v31) → 0.558 (v32); v32 recovered, not a trend
  - AD: 0.713 (v23) → 0.671 (v31) → 0.732 (v32); v32 recovered above v23
  - CO weakness (r=0.534 in v32, near v23 0.538)
  - No human validation (only Dreaddit training data)
  - WEIRD assumptions
  - B3 (TE uniformity) F1 (recalibrate n_bins=20): deferred — recalibrate best model after training
  - HI direction anomaly: hostile social media anchor HI=6.88 > policy brief HI=6.15 on 0–10 safety scale (counterintuitive, not investigated)
**PSQ-Lite:** TE + HI(raw) + TC adopted by unratified-agent for advocacy content (provisional).
Do not duplicate PSQ improvement work in this context.
