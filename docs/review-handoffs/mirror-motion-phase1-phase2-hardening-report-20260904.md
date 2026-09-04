# Mirror Motion Intelligence — Phase 1 + Phase 2 hardening report

## Audited base

- Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`
- Audited `main`: `24a2262c95cbcee5812e2722d51b0118e2b0cbc7`
- Phase 1 predecessor: merged PR #635
- Phase 2 predecessor: merged PR #636
- Corrective branch: `fix/mirror-motion-phase1-phase2-hardening-20260904`

## Findings fixed

### 1. Velocity responsiveness was algebraically dead

Phase 1 calculated `max(confidenceWeight, velocityWeight * confidenceWeight)`. Because `velocityWeight <= 1`, the velocity term could never exceed `confidenceWeight`, so velocity never increased smoothing responsiveness.

Fix: apply a confidence-gated velocity boost that increases response for deliberate speed without allowing a low-confidence fast outlier to become authoritative.

### 2. Source timestamps could move tracker time backward

The tracker clamped frame delta but still assigned a backward source timestamp to internal state. That could make coast-age calculations negative and incorrectly extend coasting eligibility.

Fix: enforce monotonic internal timestamps.

### 3. Fully dropped points retained unsafe downstream payload

A dropped point returned the original raw coordinates/confidence. That depended on every downstream consumer correctly honoring `stabilityState`.

Fix: neutralize dropped output (`score/confidence = 0`, position undefined) while preserving `rawConfidence` for diagnostics.

### 4. Stabilizer load failures could remain mislabeled as loading

Phase 2 set `STABILIZER_LOADING` first, then `recordFailure()` refused to replace an existing first failure. Concrete failures such as loader unavailable, export missing, or load failed could therefore be hidden.

Fix: separate persistent dependency failures from per-frame first-failure state and allow concrete failures to replace the transient loading marker.

### 5. Tracker history could survive a disconnected/restarted stream

Phase 2 exposed a manual reset API but did not automatically clear temporal history after a meaningful frame gap/person loss.

Fix: reset stabilizer history after a 750 ms frame gap, prolonged person loss, or person reacquisition after a long absence. Diagnostics now count tracker resets.

## Diagnostics additions

- persistent failure
- tracker reset count
- raw confidence on stabilized output
- per-point smoothing alpha
- displacement, max-jump allowance, and observed speed
- coast age

## Regression coverage added

Phase 1 tests now cover:

- same-confidence slow vs fast motion produces different alpha;
- backward timestamps cannot move internal time backward;
- dropped invalid points are neutralized.

Phase 2 tests now cover:

- concrete load failure replacing transient loading status;
- long frame-gap tracker reset;
- persistent failure and tracker-reset visibility in debug text.

## Scope intentionally not expanded

This corrective PR does not add Phase 3 structural constraints, left/right identity recovery, IK, exercise-state constraints, or body-scale-normalized jump limits. Those remain later-phase work.
