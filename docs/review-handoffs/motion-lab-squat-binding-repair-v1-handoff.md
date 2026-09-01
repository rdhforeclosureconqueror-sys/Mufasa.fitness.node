# Independent Review Handoff — Motion Lab Squat Binding Repair v1

Historical handoff for PR #604. Its bone resolution and automatic reference-avatar recovery are retained in the [Motion Lab and Movement Lego integration repair](motion-lab-lego-integration-repair-handoff.md); use that handoff for current implementation and validation details.

## Problem reproduced from live diagnostics

The deployed Motion Lab exposed **Load Synthesized Squat v1 (Reference Only)**, but live device diagnostics showed two distinct failures:

1. `motion_targets_unbound` after attempting the synthesized squat on the Phase E reference avatar.
2. `incompatible_avatar_profile` when the synthesized squat button was pressed while the Avaturn personalized avatar was loaded.

The live Phase E avatar reports sanitized bone names such as `mixamorigHips`; the authored motion specs intentionally use canonical Mixamo names such as `mixamorig:Hips`. The existing `motion-spec-clip.js` compiler used exact string lookup only, so canonical targets could not bind to sanitized runtime node names.

## Repair

### 1. Canonical-to-sanitized bone resolution

`public/motion/motion-spec-clip.js` now resolves targets in this order:

- exact node-name match
- normalized alias match using lowercase alphanumeric-only keys
- fail closed if no match
- fail closed if a normalized key is ambiguous

Animation tracks are authored against the **actual runtime node name**, while diagnostics retain alias-binding information. This keeps motion specs canonical while respecting the loader's sanitized node names.

### 2. Squat button self-recovers the correct avatar

`motion-lab/motion-lab-bootstrap.js` no longer assumes the user already loaded the Phase E reference avatar. Pressing **Load Synthesized Squat v1 (Reference Only)** now explicitly loads `PocketPTAvatarProfiles.profiles.reference` first, then compiles the synthesized squat. It still does not autoplay.

This means a tester can be on the personalized Avaturn avatar and press the squat button; Motion Lab should switch to the compatible reference avatar rather than report `incompatible_avatar_profile`.

## Boundaries preserved

- No new camera or MoveNet loop.
- No squat FBX/GLB.
- No production motion-registry promotion.
- No scoring/coaching/biomechanical authority change.
- Existing push-up and generic Motion Lab lifecycle remain canonical.
- Ambiguous normalized bone aliases fail closed rather than choosing an arbitrary bone.

## Reviewer checklist

Run:

`node --test test/squat-motion-spec-v1.test.js test/motion-lab-synthesized-squat-preview-v1.test.js`

Then test on the deployed Motion Lab:

1. Initialize Runtime.
2. Start Session.
3. Load **Personalized Avaturn Avatar** intentionally.
4. Press **Load Synthesized Squat v1 (Reference Only)**.
5. Confirm Motion Lab automatically replaces it with the Phase E reference avatar.
6. Confirm `animation_clip` becomes PASS and the loaded motion is `squat/synthesized_engineering_v1` with zero unbound targets.
7. Press Play.
8. Visually inspect for skeletal explosion, root teleport, catastrophic foot sliding, left/right asymmetry, and whether the motion reads as a squat.
9. Repeat from a fresh session using the Phase E reference avatar directly.
10. Re-test **Load Push-Up Motion (Reference Only)** to make sure alias binding did not regress existing motion-spec playback.

## Approval boundary

A reviewer may issue **GO for binding/runtime plumbing** only if the automated checks pass and the live Motion Lab reports zero unbound/ambiguous targets.

A separate **visual GO** requires actual playback observation.

This repair does not make the synthesized squat biomechanically validated or product-ready.
