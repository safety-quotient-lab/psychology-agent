# PSQ Sub-Agent Status (managed in its own context)

**Production endpoint:** ✓ https://psq.unratified.org/score — live, TLS, Hetzner CX Ashburn
**Model version:** v35 (deployed 2026-03-08). Held-out r=0.680 (v23 was 0.684, Δ=-0.004 sidegrade).
**Score calibration:** ✓ isotonic-v2-2026-03-08. 6/10 dims improved, 4/10 regressed. RB +0.113, AD -0.062.
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
**Rescore status:** 1,000-text rescore COMPLETE — scored by Opus (not Sonnet as authorized).
  Cross-scorer concordance (Opus vs Sonnet) unmeasured. Gated in ACK turn 16.
**Factor analysis v3:** KMO=0.910, g-eigenvalue=6.824, 68.2% variance, 1 factor. Structural stability confirmed.
**Next:** Cross-scorer concordance study (n≥50, Opus vs Sonnet) → then retrain if concordance holds.
Do not duplicate PSQ improvement work in this context.
