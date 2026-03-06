<!-- PROVENANCE: Restored 2026-03-06 by /cycle Step 11 orphan check
     Source: docs/memory-snapshots/psq-status.md -->

# PSQ Sub-Agent Status (managed in its own context)

**Production endpoint:** ✓ https://psq.unratified.org/score — live, TLS, Hetzner CX Ashburn
**Score calibration:** ✓ isotonic-v2-2026-03-06. Quantile-binned isotonic (n_bins=20).
  All 10 dims calibrated. HI dead zone resolved (B2 fix, Session 26).
  Historical MAE improvement: +3.5–21.6% per dimension vs. raw.
**Confidence calibration:** ✓ B1 FIXED (Session 26). r_confidence field added to score output.
  calibration_note surfaces held-out Pearson r per dimension. scale=0 behavior (intentional
  constant function overriding anti-calibrated head) now explicit. Limitation:
  confidence-is-static-r (MEDIUM — not HIGH; behavior is intentional design).
**Model transfer:** ✓ rsync complete. SHA256 verified (Hetzner matches Chromebook source).
  41 files, 531 MB. best.pt on Hetzner; local copy lost.
**Service:** systemd psq-server active. 84ms inference. onnxruntime-node postinstall fix.
**Wrangler secret:** PSQ_ENDPOINT_URL → https://psq.unratified.org
**Firewall:** ufw SSH + HTTP/HTTPS only. Port 3000 closed from public.
**Integration:** psq-scoring session turn 7 complete — 5 ICESCR texts scored, B2 validated.
**Known open issues:**
  - DA validity (authority_dynamics construct)
  - AD compression (r=0.502)
  - CO weakness (cooling_capacity r<0.6)
  - No human validation (only Dreaddit training data)
  - WEIRD assumptions
  - v27 regression (held-out r degradation vs. earlier versions)
  - TE uniformity: 4/5 ICESCR texts scored TE=6.46 (raw range 5.59–6.07 mapping to same calibrated value — possible residual plateau, not investigated)
  - HI direction anomaly: hostile social media anchor HI=6.88 > policy brief HI=6.15 on 0–10 safety scale (counterintuitive, not investigated)
**PSQ-Lite:** TE + HI(raw) + TC adopted by unratified-agent for advocacy content (provisional).
Do not duplicate PSQ improvement work in this context.
