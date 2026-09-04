# Mirror Motion Phase 5 independent hardening review — 2026-09-04

## Verdict

CHANGES REQUIRED on merged Phase 5 implementation before treating the IK layer as safe to build on.

Reviewed source: Phase 5 implementation merged from PR #643 into the Phase 4 feature branch.

## Findings fixed

1. Phase 5 accepted any Phase 3 segment length as authoritative even before Phase 3 had accumulated its minimum calibration sample count. This allowed IK to solve against provisional body proportions.
2. Phase 5 treated coasted endpoints as usable because it rejected only `dropped` stability state. A retained Phase 4 anchor plus a coasted wrist/ankle could therefore drive IK.
3. Per-chain bend history survived contact release. A deliberate squat step or push-up contact release could later re-establish the same contact while reusing stale bend-side history from the old stance.
4. With no existing bend history, a low-confidence middle joint could still become the initial bend-side authority through the `weak_joint_fallback` path and seed potentially incorrect persistent history.

## Hardening

- Require a Phase 3 segment model to be explicitly calibrated or have at least the configured minimum structural samples before using its length.
- Reject both `coasted` and `dropped` keypoints from IK endpoint/root/joint authority.
- Clear each chain's bend history immediately when its required Phase 4 contact is absent/released.
- Require either existing bend history or a trustworthy current middle joint before solving; otherwise skip rather than invent a bend side.
- Expose contact-history-clear counts in Phase 5 diagnostics.

## Regression coverage

Added coverage that verifies:

- uncalibrated segment lengths do not drive IK;
- coasted anchored endpoints do not drive IK;
- low-confidence middle joints cannot seed new bend history;
- contact release clears the affected chain history;
- existing planted squat/push-up solving, unreachable geometry and fail-open behavior remain covered.

## Scope boundary

No 3D IK, depth reconstruction, quaternion retarget rewrite, collision solving, camera/MoveNet duplication, exercise authority, or rep-count authority is added.

## Verification request

Run:

`node --test test/pose-stability-engine.test.js test/mirror-motion-phase2.test.js test/mirror-motion-phase3.test.js test/mirror-motion-phase4.test.js test/mirror-motion-phase5.test.js`

Then run the full repository suite and perform real-camera squat, deliberate step/re-anchor, side-on push-up, contact loss/reacquisition, and camera reconnect acceptance.
