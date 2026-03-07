# PSQ Sub-Agent Status (managed in its own context)

**Production endpoint:** ✓ https://psq.unratified.org/score — live, TLS, Hetzner CX Ashburn
**Score calibration:** ✓ isotonic regression (n=1897), +3.5–21.6% MAE/dim.
**Confidence calibration:** ✓ B1 RESOLVED (Session 26) — r_confidence field added; scale=0 intentional.
**HI calibration:** ✓ B2 RESOLVED (Session 26) — quantile-binned isotonic v2; MAE -3.9%.
**Model files:** ✓ best.pt (256 MB) + calibration.json present locally. SHA256 verified.
**Service:** systemd psq-server active. 84ms inference. onnxruntime-node postinstall fix.
**Wrangler secret:** PSQ_ENDPOINT_URL → https://psq.unratified.org
**Firewall:** ufw SSH + HTTP/HTTPS only. Port 3000 closed from public.
**Integration:** unratified-agent psq-scoring session active (initial run + interpretation + ACK merged).
**AR (11th dimension):** Pipeline complete. label_separated.py + instruments.json updated.
Automated labeling: `scripts/label_ar_automated.sh` (claude -p batched). 998-text stratified
subset prepared (ar-labeling-1k-stratified.jsonl, seed=42). Inter-rater reliability validated:
Sonnet r=0.934/90%, Haiku r=0.822/85%. Haiku selected for production labeling (~10x cheaper).
Awaiting user terminal run.
**Open issues:** contractual_clarity n=57 (small sample), 5 dims r<0.6 excluded,
DA validity, WEIRD assumptions, v27 regression.
**PSQ-Lite:** TE + HI(raw) + TC adopted by unratified-agent (provisional). Proposed revision: TE + TC + AR.
Do not duplicate PSQ improvement work in this context.
