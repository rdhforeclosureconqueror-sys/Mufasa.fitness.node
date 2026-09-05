# MIRROR MOTION CLOSURE D — FINAL ACCEPTANCE HANDOFF

## Role
Independent reviewer. Verify this PR against current main and return GO or CHANGES REQUIRED. Do not merge during review.

## Baseline
Built from current main after Closure C PR #683 merged with PR #684 source-frame deduplication hardening included.

## Purpose
Close the thread-harvest work without adding another motion authority. Extend the canonical acceptance gate so READY now requires:
- Phases 2–18 loaded and healthy;
- AvatarRuntime present;
- complete protected rest-pose coverage when mappedBoneCount is known;
- Closure B camera-review module loaded and healthy;
- Closure C camera-activation module loaded and healthy.

## Code changes
`public/mirror-motion-acceptance.js` now reads the two camera closure diagnostics and exposes:
- `mirrorMotionClosureStatus`;
- camera-review loaded status;
- camera-activation loaded status;
- closure failures through the existing first-failure contract.

Missing closure modules are WAITING, not READY. Runtime errors in either closure are FAIL. Phase failures still retain priority as the earliest upstream failures.

## Authority invariants
Diagnostics/acceptance only. No new camera stream, MoveNet detector, IK solver, retargeter, root writer, exercise authority, contact authority, animation authority, or measured Z-depth authority.

## Required automated review
1. Run `node --test test/mirror-motion-acceptance.test.js`.
2. Run camera review/activation tests.
3. Run focused Phase 13–16 tests.
4. Run full repository suite.
5. Confirm legacy `mirrorMotionPhase` remains diagnostic-only.
6. Confirm READY cannot occur when camera review or activation is missing/unhealthy.
7. Confirm a Phase 2–18 failure still wins over downstream closure symptoms.

## Live acceptance order
Only begin visual/movement judgment after the acceptance panel is READY. If it is not READY, fix the first reported boundary first.

1. Calibration / voice ownership
   - calibration voice speaks alone;
   - no Mufasa/browser fallback collision;
   - complete base/rest position captured;
   - Mufasa resumes afterward.
2. Standing neutral
   - stable rest-relative posture;
   - no unexplained knee/ankle jitter.
3. Squat
   - planted feet remain stable when appropriate;
   - knees do not buckle or split;
   - deliberate repositioning releases contact.
4. Jumping jack
   - feet remain free;
   - no identity collapse;
   - smoothing reduces jitter without obvious lag.
5. Turn left/right
   - front → quarter → side is stable;
   - bounded yaw follows without spin/flicker;
   - overlapping limbs keep stable authority.
6. Push-up transition
   - standing → hinge → crouch → hands down → plank;
   - simple forward bend does not trigger floor acquisition;
   - reverse to standing succeeds.
7. Lateral locomotion
   - deliberate side step moves avatar root;
   - contact release remains correct.
8. Camera-motion checkpoint
   - stand still and pan camera left/right;
   - camera still and side-step left/right;
   - small handheld shake;
   - repeat at two distances;
   - camera movement must not masquerade as member translation;
   - real side steps must remain visible.
9. Tracker loss/reacquisition
   - no stale contacts, yaw, transition assist, or camera offset survives.
10. Presentation modes
   - camera, avatar overlay, and avatar-only retain correct mirror/sign behavior.

## Final closure rule
If architecture is READY and the live script passes, freeze the mirror-motion foundation. Future changes should be driven by reproduced live failures or new product requirements, not more numbered phases.

## Explicitly separate future workstreams
Do not block this acceptance on:
- universal arbitrary-rig Skeleton Inspector/canonical mapper;
- full self/world collision physics;
- true measured Z-depth/3D reconstruction;
- literal Blender F-curves in live mirroring.