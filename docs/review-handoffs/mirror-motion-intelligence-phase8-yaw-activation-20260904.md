# Mirror Motion Intelligence — Phase 8 bounded yaw activation

## Base

Hardened Phase 7 stacked head: `0307b01c32370fb70fa1c06357b609af68eeb5c7` (includes merged PR #649).

## Purpose

Activate the already-reviewed Phase 7 facing/turn intent in the existing Avaturn quaternion solver without creating a second retargeter and without claiming MoveNet measured Z depth.

## Live pipeline

`MoveNet raw -> Phase 2 temporal stabilization -> Phase 3 structural model -> Phase 4 exercise/contact constraints -> Phase 5 IK -> Phase 6 adaptive live curves -> Phase 7 facing intent -> Phase 8 bounded yaw activation -> existing Avaturn solver/render`

## Behavior

- Phase 7 remains the facing authority and emits `orientationIntent`.
- Phase 8 loads after Phase 7 and wraps the existing avatar renderer.
- During a renderer call, Phase 8 makes the current `orientationIntent` available to the existing Avaturn solver.
- The solver prototype is patched at the bounded `observe()` boundary rather than replaced.
- Once full-body calibration is active, the existing root target quaternion is decomposed into rest-relative delta, a bounded Y-axis yaw is inserted, and the previous root delta is preserved.
- Trusted yaw is clamped to +/-65 degrees.
- Weak/held intent preserves the most recent accepted yaw for at most 8 frames, then releases to neutral instead of holding a stale turn indefinitely.
- Any `measuredDepth: true` input is rejected from yaw authority. MoveNet remains 2D evidence.
- FRONT trusted intent returns yaw to neutral.
- The existing solver remains responsible for interpolation, floor/body orientation, limb rotation, rest pose, and final render transforms.

## Loader change

`public/runtime-state.js` now loads Phase 7 followed by Phase 8 in the live avatar feature chain and reports distinct Phase 7/8 load failures.

## Diagnostics

Adds `Mirror Motion Phase 8 Debug` with:

- first failing boundary;
- renderer patch/bind state;
- solver patch state;
- frame count;
- yaw application count;
- weak-intent hold/release counts;
- facing intent state/confidence;
- currently applied yaw;
- explicit `Measured depth authority: NO`;
- last issue and process-error count.

## Regression coverage

`test/mirror-motion-phase8.test.js` covers:

- bounded yaw application;
- preservation of the solver's existing root-orientation delta;
- bounded weak-confidence hold then release;
- rejection of measured-depth claims;
- FRONT return to neutral;
- Phase 7-before-Phase 8 loader ordering and load diagnostics;
- Phase 8 debug fields.

## Review focus

Independently verify:

1. the quaternion composition preserves the existing root/floor rotation rather than overwriting it;
2. mirrored-camera left/right semantics are correct in live acceptance;
3. weak-confidence hold does not keep a stale side-facing yaw too long;
4. Phase 8 never retries a downstream renderer failure or duplicates render side effects;
5. Phase 8 does not create a second solver or retarget authority;
6. the Phase 7 -> Phase 8 wrapper ordering is correct;
7. camera reconnect/person reacquisition cannot preserve inappropriate facing state after the upstream Phase 7 reset path is exercised.

## Verification request

Run focused Phase 1-8 Node tests plus the full repository suite. Manually test FRONT -> QUARTER -> SIDE -> FRONT in both turn directions, confidence dropout while side-facing, squat while turning slightly, side-on push-up entry, camera reconnect, avatar overlay, and avatar-only mode.

Return `GO` or `CHANGES REQUIRED` with exact evidence. Do not merge during independent review unless explicitly requested by the owner.
