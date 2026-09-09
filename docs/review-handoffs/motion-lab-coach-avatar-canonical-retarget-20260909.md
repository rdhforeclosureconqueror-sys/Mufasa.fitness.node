# Motion Lab Coach Avatar Canonical Retarget — Implementation Handoff

Date: 2026-09-09
Branch: `feat/motion-lab-coach-avatar-canonical-retarget-20260909`
Base: `main` at `21d043aee99cab795af87b76d13b739d04ca6e41`

## Owner decision

PocketPT exercise demos should use the personalized Avaturn avatar as the authoritative **Coach Avatar**. The legacy Phase E avatar remains a development/reference fallback, not the default demo performer.

This PR establishes that architecture on the Stationary Left Lunge v2.3 path without renaming the existing avatar IDs. The current personalized ID remains `avaturn-personalized-candidate` for compatibility, but its profile is now explicitly marked `role: coach` and `canonicalDemoTarget: true`.

## Root cause being removed

Before this PR, `motion-lab-lunge-preview.js` explicitly checked for `phase-e-reference` and silently loaded the reference avatar whenever another avatar was active. The lunge Motion Spec also targets Mixamo names such as `mixamorig:Hips`, `mixamorig:LeftUpLeg`, and `mixamorig:RightLeg`, while the Avaturn skeleton uses semantic names such as `Hips`, `LeftUpLeg`, and `RightLeg`.

That created two separate compatibility worlds and prevented the personalized Coach Avatar from playing the authored lunge.

## What changed

### 1. Personalized avatar is declared the Coach Avatar

`public/motion/avatar-profiles.js`

- Personalized display name becomes `PocketPT Personalized Coach Avatar`.
- `role: "coach"`.
- `canonicalDemoTarget: true`.
- Phase E reference remains available with `role: "legacy-reference"` and `canonicalDemoTarget: false`.

No avatar IDs or asset paths were changed.

### 2. Lunge no longer substitutes the Phase E reference avatar

`public/motion/motion-lab-lunge-preview.js`

The lunge loader now:

1. Requires `PocketPTAvatarProfiles.profiles.personalized`.
2. Loads the personalized Coach Avatar if it is not already active.
3. Builds a Coach-targeted copy of the canonical lunge Motion Spec.
4. Compiles that retargeted spec through the existing `runtime.loadMotionSpec(...)` path.
5. Returns retarget diagnostics with the motion-load result.

The Phase E reference avatar is not loaded by the lunge path anymore.

### 3. Canonical Mixamo names are remapped to Avaturn names

Current mapping rule:

- `mixamorig:Hips` -> `Hips`
- `mixamorig:Spine` -> `Spine`
- `mixamorig:Spine1` -> `Spine1`
- `mixamorig:LeftUpLeg` -> `LeftUpLeg`
- `mixamorig:LeftLeg` -> `LeftLeg`
- `mixamorig:LeftFoot` -> `LeftFoot`
- `mixamorig:RightUpLeg` -> `RightUpLeg`
- `mixamorig:RightLeg` -> `RightLeg`
- `mixamorig:RightFoot` -> `RightFoot`

The same conversion is applied consistently to:

- `skeleton.rootBone`
- phase `boneTargets`
- `groundingPolicy.contactBones`
- `groundingPolicy.kinematicChains`
- `acceptedAuthoringAdjustment.bone`

This is important: the PR does not only rename visible animation tracks. It also retargets grounding and IK references.

### 4. Toe contact mismatch is explicit, not hidden

The registered Avaturn native animation target set does not declare `LeftToeBase` / `RightToeBase`. Lunge v2.3 uses the rear toe as its loaded contact.

For this first Coach Avatar proof:

- `LeftToeBase` -> `LeftFoot`
- `RightToeBase` -> `RightFoot`

These appear under `coachRetarget.degradedContactAliases` so the fallback is visible in diagnostics and must receive visual acceptance. Do **not** treat this fallback as final biomechanical approval.

### 5. Motion Lab lunge button identifies the new path

At runtime, the lunge preview wiring updates the button label to:

`Load Stationary Lunge Left v2.3 (Coach Avatar)`

and gives it a Coach-retarget tooltip.

### 6. Regression coverage

`test/motion-lab-coach-avatar-lunge-retarget.test.js`

Coverage verifies:

- Mixamo canonical names become Avaturn coach bone names.
- root, phase targets, contact bones, IK chain bones, and accepted authoring adjustment are retargeted.
- toe contact fallback is reported.
- when the Coach Avatar is already loaded, the lunge does not replace it.
- when the Phase E reference is loaded, the lunge replaces it with the personalized Coach Avatar before compiling.

## Backend / dev verification checklist

Check each item before calling this PR ready.

### Static / automated

- [ ] Branch is based on the stated current `main` base or has been cleanly rebased with no loss of behavior.
- [ ] `npm test` / repository-required test suite passes.
- [ ] `test/motion-lab-coach-avatar-lunge-retarget.test.js` passes.
- [ ] Existing lunge v2.3 regression tests still pass.
- [ ] Existing Motion Lab lifecycle/resource tests still pass.
- [ ] Existing pose-editor and motion-direction-authoring tests still pass.
- [ ] No test still requires Stationary Lunge to restore `phase-e-reference`; update only tests whose old expectation represented the behavior intentionally replaced by this PR.
- [ ] No production/member route is unintentionally changed; this remains within the Motion Lab/dev exercise-demo path.

### Skeleton / retarget contract

- [ ] Personalized GLB resolves `Hips`.
- [ ] Resolves `Spine`.
- [ ] Resolves `Spine1`.
- [ ] Resolves `LeftUpLeg`.
- [ ] Resolves `LeftLeg`.
- [ ] Resolves `LeftFoot`.
- [ ] Resolves `RightUpLeg`.
- [ ] Resolves `RightLeg`.
- [ ] Resolves `RightFoot`.
- [ ] Compiled lunge reports zero required unbound motion targets.
- [ ] Compiled lunge reports zero ambiguous motion targets.
- [ ] Generated animation tracks bind to the loaded Coach Avatar rather than the Phase E reference.
- [ ] Existing rest-relative-local behavior is preserved; no currently playing/paused embedded clip is used as the new rest pose.

### Grounding / IK

- [ ] Front-foot contact remains stable through loaded phases.
- [ ] Rear contact remains stable enough to make the current `RightToeBase -> RightFoot` fallback acceptable for development use.
- [ ] If rear-foot anchoring visibly pivots/slides incorrectly, mark this PR **NEEDS FIX** rather than silently accepting it.
- [ ] Both generated lunge IK chains resolve on the Coach Avatar.
- [ ] Contact/IK failure reports the first failing phase/boundary through existing diagnostics.

### Motion Lab manual acceptance

1. [ ] Initialize Motion Lab runtime.
2. [ ] Start session.
3. [ ] Load **Personalized Avaturn / Coach Avatar**.
4. [ ] Confirm only the personalized avatar is visible.
5. [ ] Press **Load Stationary Lunge Left v2.3 (Coach Avatar)**.
6. [ ] Confirm the avatar remains personalized; Phase E reference does not replace it.
7. [ ] Confirm Play becomes available after a ready load.
8. [ ] Press Play.
9. [ ] Confirm the Coach Avatar performs the complete lunge sequence.
10. [ ] Confirm standing -> step -> split plant -> three repetitions -> step back -> standing finish are all present.
11. [ ] Confirm no duplicate avatar appears.
12. [ ] Confirm there is no embedded-animation stacking.
13. [ ] Confirm there is no major skeleton explosion, twisted hierarchy, detached mesh, or root teleport.
14. [ ] Confirm loaded-foot anchoring is visually acceptable for this development phase.
15. [ ] Copy the consolidated diagnostic summary and confirm the active avatar profile is `avaturn-personalized-candidate` and target skeleton is `avaturn-native-v1`.

## First-failure rules

If the Coach Avatar does not animate, report the first failing boundary in this order:

1. Coach profile available
2. Coach avatar asset loaded
3. Skeleton inventoried
4. Canonical bone remap built
5. Required coach bones resolved
6. Rest pose available
7. Contact bones resolved
8. IK chains resolved
9. Motion spec compiled
10. Generated tracks bound
11. Play action created
12. Frames advance
13. Avatar visibly changes pose

Do not collapse these into a generic `animation failed` message.

## Scope boundary / next migration

This PR makes Stationary Lunge v2.3 the first canonical Motion Spec that uses the personalized Coach Avatar as its authoritative demo target.

After this PR is accepted, use the same retarget contract to migrate the other generated Motion Specs (beginning with synthesized squat). The raw Phase E fixture / legacy push-up clip path should not be force-retargeted merely by renaming its avatar profile; it should either be converted into the canonical Motion Spec language or receive an explicit verified retarget adapter.

The long-term rule is:

`Movement definition -> canonical semantic joints -> Coach skeleton map -> rest-relative transforms -> generated clip -> personalized Coach Avatar`

The Phase E reference avatar remains a debugging/reference asset, not the owner-facing demo performer.

## Merge decision

- **READY** only if automated tests pass and the personalized Coach Avatar visibly completes the lunge without reference-avatar substitution.
- **NEEDS FIX** if the Phase E avatar appears, required Coach bones are unbound, Play remains unavailable after a ready motion load, or the foot-contact fallback produces unacceptable instability.
