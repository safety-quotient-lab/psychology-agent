# PSQ Sub-Agent Status (managed in its own context)

**Readiness needs:** API surface, calibrated confidence, scope boundaries.
**Score calibration:** ✓ isotonic regression (n=1897), +3.5–21.6% MAE/dim.
**Confidence calibration:** ✓ `confidence_calibration` linear maps (scale=0, shift=r) added
to calibration.json. student.js (remote version) now uses r-based proxy correctly.
Composite usable: PSQ=37.7/100 on overwhelm text (threat 6.28 > protective 3.81).
**Git/deploy issue:** calibration.json gitignored (models/ both local and origin). Not in remote
repo. Remote psq-agent lacks calibration unless manually deployed. best.pt lost from local.
**Open issues:** contractual_clarity n=57 (small sample), 5 dims r<0.6 excluded,
DA validity, WEIRD assumptions, v27 regression.
Do not duplicate PSQ improvement work in this context.
