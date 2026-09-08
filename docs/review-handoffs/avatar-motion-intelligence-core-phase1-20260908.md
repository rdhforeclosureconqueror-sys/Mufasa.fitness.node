# Avatar Motion Intelligence Core — Phase 1 review handoff

## Purpose

Create the first shared, input-agnostic biomechanics/constraint layer that can eventually serve both:

- the live MoveNet -> mirror/avatar presentation pipeline; and
- Motion Spec -> generated avatar demonstrations in Motion Lab.

This phase is intentionally an extraction/foundation phase. It does **not** reroute either live runtime through the new core yet.

## Trigger

Human review of the synthesized stationary left lunge showed that the Motion Spec can describe a stationary lunge while the rendered avatar still drifts into a running-stride-like shape. The existing lunge spec already declares front-foot and rear-forefoot grounding, so the missing boundary is enforcement, not exercise intent.

The mirror-motion stack already contains mature concepts we need: structural segment constraints, exercise-aware contact anchors, contact-aware IK, bounded yaw, and first-failure diagnostics. Those concepts must become reusable without copying mirror-only 2D assumptions into generated 3D motion.

## New shared module

`public/motion/avatar-motion-intelligence-core.js`

The module is UMD-compatible and works on coordinate objects with `x`, `y`, and optional `z`.

It exposes:

- `constrainSegmentLength(proximal, distal, targetLength, options)`
  - applies calibrated chain-length correction using the Phase 3 tolerance model;
- `applyContactAnchor(point, anchor, bodyScale, options)`
  - preserves the Phase 4 bounded drift/correction/release model;
- `solveTwoBoneChain(root, joint, end, length1, length2, options)`
  - coordinate-agnostic two-bone IK using a bend hint, suitable for knees/elbows;
- `solveRootAnchorCorrection(contacts, options)`
  - combines multiple contact errors into one bounded root translation so generated motion can keep planted contacts without independently dragging feet;
- `boundYawIntent(intent, options)`
  - preserves bounded yaw and rejects false measured-depth authority;
- `validateKinematicPose(pose)`
  - returns PASS/FAILED plus the first violated segment/contact constraint.

## Preserved mirror constants

Phase 1 deliberately carries forward the existing accepted mirror values where the same concept applies:

- anchor max drift ratio: `0.18`
- anchor correction gain: `0.82`
- anchor correction minimum ratio: `0.015`
- structural segment length tolerance ratio: `0.22`
- maximum bounded yaw: `65 degrees`

Changing these values is not part of this phase.

## Runtime authority

No live authority changes in Phase 1.

The following remain untouched and authoritative for the current product:

- Mirror Phase 3 structural interpretation/calibration
- Mirror Phase 4 exercise/contact authority
- Mirror Phase 5 live 2D IK
- Mirror Phase 7 facing intent
- Mirror Phase 8 live root yaw application
- existing Avaturn solver/renderer
- current Motion Lab Motion Spec compiler/playback

The new core is a reusable foundation only until a separately reviewed adapter activates it.

## Why this is not a copy of the mirror pipeline

The mirror consumes 2D camera evidence. Motion Lab generates avatar transforms that require 3D relationships. Copying Phase 4/5 code verbatim would create a second 2D-only system and fail the architecture goal.

The Phase 1 core therefore extracts the invariant biomechanics concepts into coordinate-agnostic primitives while leaving camera-specific state/hysteresis/occlusion logic in the mirror pipeline.

## Focused regression coverage

`test/avatar-motion-intelligence-core-phase1.test.js`

Coverage includes:

1. preservation of canonical mirror constraint constants;
2. 3D segment-length enforcement;
3. bounded contact correction and excessive-drift release;
4. two-bone IK preserving both calibrated chain lengths in 2D and 3D;
5. stationary-lunge-style front-foot + rear-forefoot contacts producing one bounded root correction;
6. false depth rejection + yaw clamping;
7. first-failure kinematic validation.

Tests were added but were not executed in the GitHub connector environment. Do not treat code presence as test execution.

## Phase 2 target

Build a Motion Lab adapter that converts Motion Spec phases/keyframes and avatar rest-pose measurements into this core's normalized kinematic inputs, then enforces:

`Motion Spec -> contact plan -> calibrated chain constraints -> IK -> root/contact correction -> bounded orientation -> validated avatar transforms`

The synthesized lunge remains the first failing proof case. Phase 2 must not hand-author a prettier lunge; it must make the shared constraints responsible for the correction.

## Required reviewer questions

1. Does this module remain independent of MoveNet/browser-camera assumptions?
2. Are the contact and IK operations deterministic and fail-closed on invalid geometry?
3. Does root correction combine contacts rather than moving each planted foot independently?
4. Is fake Z-depth authority still rejected?
5. Did this PR avoid changing live mirror or Motion Lab authority?
6. Are the Phase 2 adapter boundaries clear enough to prevent a second retargeter/solver stack?
