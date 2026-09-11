# Thriller retarget anatomy safety — implementation handoff

This implements the work specified by merged #785 without reopening or rewriting the merged handoff.

## First-failure model

The existing Thriller runtime already proves clip selection, 162/162 target-name binding, and mixer-root identity. The remaining failure class is transform-space incompatibility: source/offline-retargeted local transforms can resolve to the correct target bone name while still carrying source-skeleton segment translations, scale, or uncompensated rest orientation that is unsafe on the mounted personalized Avaturn skeleton.

The new reusable `retarget-motion-compatibility.js` policy uses the existing Gym Compatibility seam without replacing the canonical Motion Lab bootstrap. The page entry preloads the policy and installs a guarded `PocketPTDisposableMotionSession` assignment before the Initialize Runtime button can be used; therefore every session created during canonical bootstrap is protected, including the first session. After canonical runtime READY, the existing integration verifies that the final wrapped runtime still carries the retarget-safety authority before the compatibility panel reports READY. This avoids a startup race and does not create a Thriller-only table of bone offsets.

## Reusable source-profile -> canonical -> target-profile correction

Before a retargeted clip is exposed to Play:

- capture the runtime fixture rest pose and the mounted target rest pose;
- preserve skeletal quaternion motion but convert it through source-rest delta -> target-rest local space;
- keep only root/Hips translation as locomotion and rebase it from source-rest to target-rest, scaled by measured skeleton span when sane;
- remove non-root translation channels because those encode source skeleton segment placement/length rather than a portable rotational degree of freedom;
- remove animation scale channels so personalized-avatar proportions remain authoritative;
- preserve the original 162/162 source binding evidence while reporting the normalized playable-track count separately;
- surface `RETARGET_SOURCE_FIRST_RISK` with bone, property, timestamp, baseline, sampled value, delta and ratio when a source channel first conflicts with the target rest pose.

For the known 54-bone x position/quaternion/scale shape, the focused regression proves the policy reduces 162 source tracks to 55 structurally portable tracks: 54 quaternion tracks plus one rebased Hips position track. This is a general retarget policy, not a hard-coded Thriller bone list.

## Hard anatomy gate

Playback now gains a required boundary before success:

`RETARGETED_POSE_ANATOMY_VALID`

The policy validates the mounted avatar after the first playback tick and on subsequent rendered frames. It fails closed for:

- non-finite transform values;
- animated scale distortion;
- non-root local-position drift;
- parent-child distance / limb-length distortion;
- catastrophic root displacement / unit mismatch.

On failure it removes any provisional `THRILLER_VISIBLE_PLAYBACK_CONFIRMED`, stops the action, restores the captured valid target pose before the next render, and reports:

`FIRST FAILURE: RETARGETED_POSE_ANATOMY_INVALID`

It also emits `RETARGETED_POSE_ANATOMY_FIRST_OFFENDER` in the existing boundary list so the consolidated diagnostic includes the exact bone, property, timestamp, baseline, sampled value, delta and ratio without creating another debug panel.

Only after the anatomy boundary passes is `THRILLER_VISIBLE_PLAYBACK_CONFIRMED=PASS` retained.

## Regression evidence authored in this PR

`test/thriller-retarget-motion-compatibility.test.js` proves:

1. the 162-channel source shape normalizes to 55 structurally safe channels;
2. catastrophic non-root translation returns `RETARGETED_POSE_ANATOMY_INVALID` with exact offender fields;
3. rotation-only motion preserves limb structure and passes;
4. a technically animated/exploded pose cannot retain Thriller playback success;
5. a valid pose inserts anatomy PASS before visible-playback confirmation.

The Gym Compatibility integration contract is also extended to verify the safety policy is preloaded through the protected Motion Lab asset route, guards `PocketPTDisposableMotionSession` assignment before runtime initialization is released, and remains present on the final canonical runtime before the compatibility panel reports READY.

## Scope / non-regression

No changes to Godot, GO_TO_MAT, MoveNet/TensorFlow, rep counting, timers, leaderboards, Yoga Motion Specs, Pose Editor semantics, Thriller source FBX files, or Parts 2–4 binaries.

## Required acceptance after deployment

Use Thriller Part 1 only first:

1. Initialize Motion Lab and load the personalized Avaturn avatar.
2. Confirm the avatar remains intact before playback.
3. Select Thriller Part 1 and copy the diagnostic; capture `RETARGET_CLIP_NORMALIZED` and any `RETARGET_SOURCE_FIRST_RISK` evidence.
4. Press Play. The body must remain connected and proportional while visibly moving.
5. Confirm `RETARGETED_POSE_ANATOMY_VALID=PASS` occurs before `THRILLER_VISIBLE_PLAYBACK_CONFIRMED=PASS`.
6. Stop and Restart; the avatar must return to a valid starting/rest pose.
7. If anatomy fails, use the exact `RETARGETED_POSE_ANATOMY_FIRST_OFFENDER` fields as the new first failure. Do not weaken the gate.

Do not regenerate or tune Parts 2–4 until Part 1 passes this reusable path on the physical acceptance device.

## Repository readiness

This is significant tracked avatar/motion work. Canonical readiness evidence must be recorded with `npm run readiness:update -- ...` and validated with `npm run readiness:validate`. Do not hand-edit readiness JSON. Human movement quality/device acceptance remains owner-controlled.
