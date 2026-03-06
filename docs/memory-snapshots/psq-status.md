# PSQ Sub-Agent Status (managed in its own context)

**Production endpoint:** ✓ https://psq.unratified.org/score — live, TLS, Hetzner CX Ashburn
**Score calibration:** ✓ isotonic regression (n=1897), +3.5–21.6% MAE/dim.
**Confidence calibration:** ⚑ BUG B1 — confidence head dead (outputs constants for ALL inputs).
r-based proxy (scale=0, shift=r) functions as static replacement but model head produces no signal.
**Model transfer:** ✓ rsync complete. SHA256 verified. 41 files, 531 MB.
**best.pt recovery:** ✓ FOUND on Hetzner (255 MB, 2026-03-01). Local copy lost.
Recovery: `rsync -avz root@178.156.229.103:/opt/psychology-agent/safety-quotient/models/psq-student/ ~/Projects/safety-quotient/models/psq-student/`
B1+B2 fixes deferred until best.pt recovered locally.
**Service:** systemd psq-server active. 84ms inference. onnxruntime-node postinstall fix.
**Wrangler secret:** PSQ_ENDPOINT_URL → https://psq.unratified.org
**Firewall:** ufw SSH + HTTP/HTTPS only. Port 3000 closed from public.
**Integration:** unratified-agent psq-scoring session active (initial run + interpretation + ACK merged).
**Known bugs:** B1 confidence head dead (HIGH — outputs constants), B2 HI calibration
dead zone (MEDIUM — raw 5.85–7.65 → 6.69). Both route to psq-agent context for fix.
**Open issues:** contractual_clarity n=57 (small sample), 5 dims r<0.6 excluded,
DA validity, WEIRD assumptions, v27 regression.
**PSQ-Lite:** TE + HI(raw) + TC adopted by unratified-agent for advocacy content (provisional).
Do not duplicate PSQ improvement work in this context.
