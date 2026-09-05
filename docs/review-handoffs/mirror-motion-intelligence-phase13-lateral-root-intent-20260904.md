# MIRROR MOTION INTELLIGENCE — PHASE 13 REVIEW HANDOFF

## PURPOSE

Phase 13 adds a review-first camera-space lateral root-translation intent. It does not yet move the avatar root.

## BASE

PR #661 corrected head:

`534c893e26e0c2fa8d8f2c5726e001a911a7dae4`

Current consolidated main at start of this phase:

`405b3acf2c2d0640ed119277c376310a9c223b0e`

The Phase 13 branch intentionally starts from PR #661 so the startup-audit correction through Phase 12 is preserved.

## WHY THIS PHASE

The existing Avaturn solver already owns vertical root translation, floor/upright body orientation, torso roll, head tracking, and the hardened Phase 8 root yaw. It does not yet have a dedicated reviewed signal for whole-body lateral translation when the subject steps or shifts left/right.

Without root lateral travel, lateral subject movement can be absorbed incorrectly by limb geometry and make the avatar feel pinned in place.

## IMPLEMENTATION

`public/mirror-motion-phase13.js`

Phase 13:

- uses left/right shoulders and hips from the existing pose packet;
- computes shoulder center, hip center, and a combined body-center X;
- normalizes lateral displacement by shoulder-to-hip body scale so camera distance does not directly change the intent magnitude;
- requires multiple trustworthy calibration frames before publishing movement intent;
- ignores coasted/dropped or low-confidence landmarks;
- uses a normalized dead zone for small jitter;
- clamps extreme lateral intent;
- resets calibration on Phase 2 tracker/person lifecycle resets;
- explicitly publishes camera-space intent only;
- explicitly retains `measuredDepth: false`;
- has no avatar-root write authority in this phase.

Packet metadata:

`lateralIntent.cameraSpaceNormalized`

Positive means increasing camera/image X. Phase 13 does not decide render-space sign.

## MIRROR SEMANTICS

Do not activate this signal by blindly assigning camera-space positive X to avatar-root positive X.

The activation phase must resolve presentation semantics for at least:

- avatar overlay on mirrored camera preview;
- avatar-only presentation;
- any non-mirrored diagnostic view.

Phase 13 deliberately leaves this unresolved rather than encoding a sign convention in the estimator.

## DIAGNOSTICS

`Mirror Motion Phase 13 Debug` reports:

- first failing boundary;
- calibrated yes/no;
- calibration frame count;
- current camera-space lateral intent;
- context resets;
- process errors;
- `Measured depth authority: NO`;
- `Avatar root authority: NO (review-first)`.

## REGRESSION COVERAGE

`test/mirror-motion-phase13.test.js` covers:

- calibration before authority;
- camera-scale-normalized displacement;
- jitter dead zone;
- bounded large displacement;
- low-confidence fail-open behavior;
- explicit no-depth/no-root-authority diagnostics.

## REVIEW FOCUS

Attack:

1. subject stepping left/right at multiple camera distances;
2. squat with hips translating slightly during descent;
3. jumping jack without whole-body travel;
4. standing -> floor push-up transition;
5. side-facing and quarter-facing states;
6. tracker/person reacquisition;
7. mirrored preview versus avatar-only sign expectations;
8. low-confidence/coasted shoulders or hips;
9. camera shake/pan that could masquerade as subject lateral motion.

The last item is especially important: this phase estimates subject motion relative to the camera image. It cannot distinguish camera movement from subject movement without an external camera-motion reference.

## SCOPE BOUNDARY

No production loader activation.
No avatar-root X mutation.
No new MoveNet/camera authority.
No new IK solver or retargeter.
No measured Z depth.

Return `GO` or `CHANGES REQUIRED` with exact evidence. Do not merge unless approved by the owner.
