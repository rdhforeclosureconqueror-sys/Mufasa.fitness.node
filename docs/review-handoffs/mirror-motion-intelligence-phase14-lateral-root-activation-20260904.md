# MIRROR MOTION INTELLIGENCE — PHASE 14 REVIEW HANDOFF

## PURPOSE

Activate the reviewed Phase 13 camera-space lateral intent as bounded avatar-root X translation without creating a second retargeter or claiming Z-depth.

## BASE

Phase 13 head: `04e5575cea5ce910a084bd83bd4929e4816fe024`.

A separate catch-up PR (#663) exists because Phase 13 was originally merged into the PR #661 fix branch rather than directly into main.

## LIVE ORDER

Phase 12 now activates Phase 13 first and Phase 14 second. Phase 13 remains the lateral-intent estimator. Phase 14 is the sole lateral-root activation authority.

## PRESENTATION SEMANTICS

The canonical normalized-pose contract is `mirrored-image-normalized`, x-axis=image-right, flipHorizontal=true. `WorkoutPresentationState` is the single visible-presentation authority.

Phase 14 therefore maps camera-space +X to avatar-root +X only in `avatar_overlay` and `avatar_only`. In `camera` mode it applies no root X because the avatar is hidden.

Reviewer must verify this visually in the actual workout UI and confirm no double mirror exists in the renderer/camera path.

## IMPLEMENTATION

- wraps the existing AvatarRuntime renderer boundary;
- calls `PocketPTMirrorMotionPhase13.process(packet)` rather than duplicating lateral estimation;
- holds the accepted lateral intent only across the existing Avaturn solver call;
- patches the existing solver `observe()` path rather than creating a second solver;
- applies root X after the solver has performed its existing vertical translation/floor orientation/yaw logic;
- preserves any pre-existing solver root-X delta;
- uses bounded translation (`rootScale=.45`, `maxRootX=.32`) and a small causal smoothing alpha;
- resets applied lateral state on Phase 2 tracker/person reset and solver replacement;
- rejects measured-depth claims;
- fails open when Phase 13 is unavailable/not ready.

## ACTIVATION / LOAD DIAGNOSTICS

Phase 12 loads `/mirror-motion-phase13.js` then `/mirror-motion-phase14.js` with distinct first-failure boundaries and registers both stages in the startup resource audit.

Phase 14 debug reports: renderer/solver patch state, renderer bind state, presentation mode, camera-space intent, render sign, applied root X, applications, bypasses, context resets, measured-depth authority, last issue, process errors, and first failing boundary.

## REQUIRED REVIEW

1. Confirm PR #663 or equivalent Phase-13-to-main catch-up is not lost.
2. Verify Phase 12 -> 13 -> 14 load ordering and distinct load failures.
3. Verify only one lateral estimator (Phase 13) and one lateral root activation authority (Phase 14) exist.
4. Verify only the existing Avaturn solver is used.
5. Visually test avatar_overlay and avatar_only left/right stepping; confirm sign follows the member naturally.
6. Verify camera-only mode does not apply hidden avatar movement authority.
7. Test multiple camera distances, squat, jumping jack, floor transition, side/quarter turns, tracker reacquisition, camera shake/pan, and low-confidence shoulders/hips.
8. Verify bounded root translation does not pull planted feet/hands into obvious sliding; report if Phase 4/5 contact logic requires a later world-contact compensation phase.
9. Run Phase 1–14 focused tests plus full suite.
10. Return GO or CHANGES REQUIRED with exact evidence. Do not merge without owner approval.

## SCOPE BOUNDARY

No new MoveNet detector/camera loop. No new exercise authority. No second IK solver. No second retargeter. No Z-depth. No root Z translation.