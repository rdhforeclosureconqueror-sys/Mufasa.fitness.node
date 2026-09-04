# Mirror Motion Intelligence — Phase 3 post-merge hardening report

## Audited base

- Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`
- Reviewed merged Phase 3: PR #639
- Audited post-merge main: `7c58361c0c87c344641a0511d5ce14b4ebc4fdc3`
- Corrective branch: `fix/mirror-motion-phase3-hardening-20260904`

## Findings

### 1. Structural state did not follow Phase 2 lifecycle resets

Phase 2 correctly resets temporal tracking after meaningful frame gaps/person loss/reacquisition, but Phase 3 kept its learned limb lengths and previous left/right positions until an explicit Phase 3 reset. That could carry one person's structural model into a reacquired/new tracking session.

Fix: Phase 3 now observes Phase 2 `trackerResets`. When that counter changes, Phase 3 clears segment calibration and identity history before processing the next stabilized packet. Diagnostics expose structural reset count and reason.

### 2. High-confidence outliers contaminated calibration before correction

The original `process()` updated the segment model from the current frame before checking whether that frame violated the model. A large but high-confidence knee jump therefore pulled the learned thigh length toward the bad measurement and weakened the correction applied immediately afterward.

Fix: seed calibration uses a median, and once a segment is calibrated only bounded near-model measurements may update it. Structural outliers are rejected from calibration before constraint projection. Rejections are counted in diagnostics.

### 3. Coasted points could participate in left/right identity recovery

Identity recovery only checked numeric confidence. A coasted point can still carry a decayed confidence above the identity threshold, so extrapolated points could trigger a left/right swap.

Fix: identity recovery and identity-history updates now require finite, sufficiently confident points that are neither `coasted` nor `dropped`.

### 4. Identity recovery used an arbitrary 100 px fallback body scale

When shoulder/hip body scale could not be measured, the original engine substituted `100`. That made swap thresholds resolution/camera dependent and allowed identity decisions without a real body-scale measurement.

Fix: body scale is now unavailable (`null` in output) when it cannot be measured, and identity recovery is skipped until scale is trustworthy.

## Regression coverage

Added/strengthened tests for:

- calibrated outlier rejection without model drift;
- robust median seed calibration;
- coasted joints refusing identity recovery;
- Phase 3 reset following Phase 2 tracker reset;
- new reset/outlier diagnostics.

The pre-existing impossible-thigh test is especially important: under the original ordering, the bad frame updated the model before correction, so the expected correction target and the implementation were inconsistent.

## Scope boundary

No Phase 4 exercise-state constraints, IK, foot planting, quaternion retarget rewrite, 3D depth reconstruction, or new camera/MoveNet ownership is added here.

## Verification note

The corrective branch is structurally based directly on the audited post-Phase-3 main commit. Independent CI/full-suite execution and live camera/avatar visual acceptance should still be performed before merge.
