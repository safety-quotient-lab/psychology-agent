# PSQ Sub-Agent Status (managed in its own context)

**Production endpoint:** ✓ https://psq.unratified.org/score — live, TLS, Hetzner CX Ashburn
**Model version:** v37 (deployed 2026-03-08). Sonnet-only retrained.
**Score calibration:** ✓ quantile-binned-v4-2026-03-08 (n_bins=20). 9/10 dims MAE ≤ v3. TC exception +0.005 (negligible).
**Confidence calibration:** ✓ B1 RESOLVED (Session 26) — r_confidence field added; scale=0 intentional.
**HI calibration:** ✓ B2 RESOLVED (Session 26) — quantile-binned isotonic v2; MAE -3.9%.
**Model files:** ✓ v35 ONNX + calibration.json on Hetzner. v23 tagged as v23-production-backup.
**Service:** systemd psq-server active. 42ms inference. onnxruntime-node postinstall fix.
**Wrangler secret:** PSQ_ENDPOINT_URL → https://psq.unratified.org
**Firewall:** ufw SSH + HTTP/HTTPS only. Port 3000 closed from public.
**Integration:** unratified-agent psq-scoring session active (initial run + interpretation + ACK merged).
**AR (11th dimension):** Pipeline complete. label_separated.py + instruments.json updated.
Automated labeling: `scripts/label_ar_automated.sh` (claude -p batched). 998-text stratified
subset prepared (ar-labeling-1k-stratified.jsonl, seed=42). Inter-rater reliability validated:
Sonnet r=0.934/90%, Haiku r=0.822/85%. Haiku selected for production labeling (~10x cheaper).
Awaiting user terminal run.
**Haiku v2 scoring:** ✓ Complete — all 11 dims × 998 texts. Mean pile-up 32.7%.
**Scorer comparison:** ✓ Complete (Session 34) — 100-text Sonnet subset.
  Sonnet 24.7% vs Haiku 31.2% pile-up. Compression belongs mainly to Haiku.
**Construct problems confirmed:** CC (51% pile-up even with Sonnet, r=0.644) + DA (39%, r=0.595).
**Viable dims (9/11):** TE, HI, AD, ED, RC, RB, TC, cooling, AR. Drop CC + DA.
**Open issues:** WEIRD assumptions, v27 regression, factor analysis pending.
**PSQ-Lite:** TE + HI(raw) + TC adopted by unratified-agent (provisional). Proposed revision: TE + TC + AR.
**Concordance study:** ✓ COMPLETE (Session 45) — gate FAILS. Mean ICC(2,1) = 0.495 (poor).
  1/10 dims pass ICC ≥ 0.70 (only RC at 0.755). Opus scores systematically higher (+0.25 avg).
  Sonnet-only revert endorsed. Production models (v23, v35) confirmed clean.
**B3 recalibration:** ✓ COMPLETE (Steps 1-6). calibration-v4 deployed on v37. 9/10 dims improve.
  AD n_bins sensitivity tested (10/20/30); n_bins=20 selected. CO n=153 (low confidence).
**Opus remediation:** ✓ COMPLETE — v37 deployed with Sonnet-only training data.
**B4 partial correlations:** ✗ PENDING — work order sent (turn 22). Awaiting psq-agent.
**B5 bifactor CFA:** ✓ COMPLETE (turn 34). semopy ML, N=4,432 Sonnet labels.
  omega_h=0.942 — g-PSQ validated as reliable composite. Bipolar factor: 5 items
  (TE/HI/AD vs RC/RB); TC marginal, CC non-significant. ED singleton confirmed.
  DA paradox revised (rotation artifact; DA g=0.825, CO g=0.717 lowest).
  RMSEA=0.141 (misfit from TC/CC on bipolar + N-sensitivity).
**B5-R respecification:** ✓ COMPLETE (turn 36). RMSEA 0.1414→0.1365. omega_s(bipolar)
  doubled (0.033→0.072). Standardized loadings delivered.
**B5-S structural comparison:** ✓ COMPLETE (turn 38). M5 wins 4-way comparison
  (M3/M4/M5/M5b). RMSEA=0.1286. M5b (cc_f) adds zero fit — CC structurally diffuse.
  M5 accepted as final structural model (turn 39). B5 work stream closed.
**Factor analysis v3:** KMO=0.910, g-eigenvalue=6.824, 68.2% variance, 1 factor. But criterion
  validity shows profile shape predicts while g-PSQ does not → bifactor investigation.
**Design decisions (Session 45):** Single-scorer constraint, calibration success criterion revised,
  calibration deploy timing (post-model-stabilization). See architecture.md.
**Next:** Await B4 partial correlations from psq-agent (only remaining psq-scoring work order).
Do not duplicate PSQ improvement work in this context.
