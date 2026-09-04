# Mirror Motion Intelligence — Phase 10 live foreshortening activation

## Base

Merged Phase 9 hardening from PR #653: `1c8092bfe325731ab673ece4222a35e8cf2cb3bb`.

## Purpose

Activate the hardened Phase 9 foreshortening guard in the production mirror-motion loader and make activation failures observable.

## Pipeline

MoveNet raw -> Phase 2 stabilization -> Phase 3 structure -> Phase 4 exercise/contact constraints -> Phase 5 IK -> Phase 6 adaptive live curves -> Phase 7 facing intent -> Phase 8 bounded yaw -> Phase 9 foreshortening guard -> existing Avaturn solver/render.

Phase 10 is orchestration/diagnostics only. Phase 9 remains the sole foreshortening authority.

## Changes

- add `mirror-motion-phase9.js` to the avatar startup audit and dynamic load chain after Phase 8;
- add `mirror-motion-phase10.js` after Phase 9;
- report distinct Phase 9 and Phase 10 bootstrap load failures;
- add a Phase 10 debug panel showing Phase 9 presence, patch state, renderer binding, guard count, context resets, and the first activation failure;
- retain explicit `Measured depth authority: NO`.

## Review focus

1. Verify Phase 8 -> Phase 9 -> Phase 10 load ordering.
2. Verify a Phase 9 load failure is attributed to `MIRROR_MOTION_PHASE9_LOAD_FAILED`.
3. Verify Phase 10 does not create a second guard, solver, camera, detector, exercise authority, or depth reconstruction path.
4. Verify Phase 9 still resets with Phase 2 tracker/person lifecycle resets.
5. Manual acceptance: FRONT calibration, QUARTER/SIDE turns, side-on push-up, squat, jumping jack, camera-distance changes, camera/person reacquisition, and fast intentional movement.
6. Watch specifically for guard flicker or legitimate motion being frozen near the QUARTER/SIDE collapse thresholds.

## Regression coverage

`test/mirror-motion-phase10.test.js` covers activation failure attribution, live Phase 9 status, loader ordering, and explicit no-depth diagnostics.

Run focused Phase 1–10 tests plus the full repository suite. Return GO or CHANGES REQUIRED with exact evidence. Do not merge unless explicitly requested by the owner.
