# Motion Lab Lunge Post-Split Generated Repetitions — Review Handoff

Date: 2026-09-09
Branch: `fix/lunge-post-split-generated-reps-20260909`
Base: current `main` after merged PR #749

## Owner-observed failure

The personalized Coach Avatar now loads correctly and reaches the approved `split_plant` position, but visually remains at the split instead of completing the lunge repetitions.

Expected owner behavior:

`standing -> split/plant -> descend -> bottom -> ascend -> top` x3 `-> return to standing`

The owner explicitly does **not** want the three repetitions hand-keyframed bone-by-bone. The Motion Intelligence system is expected to generate the leg mechanics from the authored pelvis trajectory plus planted-foot constraints and two-bone IK.

## First failing boundary

The v3 lunge Motion Spec already contains the complete three-repetition phase sequence:

- `split_plant`
- `rep1_descent`
- `rep1_bottom`
- `rep1_top`
- `rep2_descent`
- `rep2_bottom`
- `rep2_top`
- `rep3_descent`
- `rep3_bottom`
- `rep3_top`
- `stand_finish`

Each loaded phase deliberately preserves the approved split bone pose. The repetitions are supposed to be created by vertical pelvis/root displacement plus generated leg IK while the feet remain anchored.

The discovered engine conflict was in `public/motion/motion-lab-intelligence-adapter.js`:

1. The compiler applies the authored downward pelvis/root offset for a descent or bottom phase.
2. `solvePhaseContacts()` then sees that both planted contacts moved away from their anchors.
3. The old path calls `solveRootAnchorCorrection(...)` first.
4. That root correction moves the pelvis/root back toward the original split position to restore the foot anchors.
5. Generated two-bone leg IK runs only **after** that correction.
6. Because the root descent was already cancelled, the IK has little/no descent geometry left to solve.
7. Result: the avatar visually stays at or near `split_plant` even though the repetition phases exist in the timeline.

This means the first failure is not missing repetition definitions. It is **constraint ownership/order**: root contact correction was cancelling the movement generator before generated IK could create knee flexion.

## Implementation change

`public/motion/motion-lab-intelligence-adapter.js`

Generated two-bone IK now owns planted-foot correction whenever active kinematic chains are present.

New rule:

- **Generated IK active (`chains.length > 0`)**: preserve the authored root/pelvis trajectory. Skip global root-anchor correction. Let the generated leg chains rotate thigh/knee segments to reach the planted contact anchors.
- **Contact-only constraint (`chains.length === 0`)**: keep the existing root-anchor correction behavior unchanged.

The adapter version becomes:

`1.2.0-generated-ik-preserves-root-trajectory`

Diagnostics expose:

- `correctionStatus: SKIPPED_FOR_GENERATED_IK` when the generated chain solver owns contact correction.
- `rootTrajectoryPreserved: true` on generated-IK phases.

The existing downstream checks remain in force:

- two-bone chain solve must return `SOLVED`
- chain length residual must remain within tolerance
- planted contact residual must remain within tolerance
- final kinematic validation must PASS

So this does **not** disable contact validation. It changes which solver is allowed to satisfy the contact constraint.

## Why this is the architecture we want

For the current phase-first lunge:

- `split_plant` is the owner-approved top pose.
- pelvis trajectory describes the motion intent (`down` / `up`).
- foot anchors describe the environmental constraints.
- generated leg IK derives the actual knee/thigh mechanics required to satisfy both.

That is the intended exercise-motion generator contract:

`approved pose + trajectory intent + contacts + kinematic chains -> solved phase poses -> animation clip`

The owner should not have to manually author each lunge knee angle or every frame.

## Regression coverage

Added:

`test/lunge-post-split-generated-reps.test.js`

It verifies:

1. the lunge still defines all three descent/bottom/ascent repetition cycles after `split_plant`;
2. each bottom phase has greater downward root displacement than its descent phase;
3. each top returns to the split root height;
4. loaded bone targets intentionally remain the split pose, proving repetition mechanics are expected from generated root+IK behavior rather than manual replacement rotations;
5. generated IK is enabled;
6. the adapter identifies generated IK as the contact-solve owner;
7. root correction is skipped only for generated-IK phases;
8. contact-only phases retain the legacy root-anchor correction path.

## Dev-bot review checklist

### Static / automated

- [ ] Review the actual latest PR head, not this handoff's remembered state.
- [ ] Run `node --test test/lunge-post-split-generated-reps.test.js`.
- [ ] Run existing Motion Lab / lunge / generated-IK tests.
- [ ] Run repository-required suite (`npm test` or canonical project command).
- [ ] Run `npm run readiness:update -- ...` for the affected Motion Lab readiness card using the repository CLI; do not edit readiness JSON directly.
- [ ] Run `npm run readiness:validate`.

### Engine behavior

- [ ] Confirm contact-only phases still call `solveRootAnchorCorrection`.
- [ ] Confirm generated-IK phases do not move the root back toward the split before leg IK runs.
- [ ] Confirm generated IK still receives the authored root position from each phase.
- [ ] Confirm both left and right leg chains solve at `rep1_descent`, `rep1_bottom`, and equivalent rep2/rep3 phases.
- [ ] Confirm contact residual validation remains active after the chain solve.
- [ ] Confirm no other generated-IK motion relies on the old root-first correction ordering.

### Motion Lab manual acceptance

1. [ ] Start Motion Lab.
2. [ ] Load the personalized Coach Avatar.
3. [ ] Load current Stationary Left Lunge v3.
4. [ ] Confirm the personalized avatar stays loaded.
5. [ ] Press Play.
6. [ ] Confirm standing transitions into the approved split/plant position.
7. [ ] Confirm the pelvis visibly descends after split.
8. [ ] Confirm the rear knee moves down toward the floor instead of the whole split pose remaining frozen.
9. [ ] Confirm both feet remain acceptably planted through loaded phases.
10. [ ] Confirm the avatar rises back to the split top.
11. [ ] Confirm the down/up cycle repeats exactly three times.
12. [ ] Confirm after rep 3 the loaded contact state releases and the avatar returns to standing.
13. [ ] Confirm there is no embedded animation stacking, skeleton explosion, root teleport, or duplicate avatar.
14. [ ] Confirm diagnostics show `rootTrajectoryPreserved: true` and `SKIPPED_FOR_GENERATED_IK` during loaded generated-IK phases.

## First-failure sequence for review

If the lunge still stops or fails, report the first failing boundary in this order:

1. `split_plant` reached
2. `rep1_descent` phase present
3. authored root Y differs from split
4. generated IK recognized as contact owner
5. root trajectory preserved
6. left chain solved
7. right chain solved
8. contact residual passed
9. `rep1_bottom` pose captured
10. `rep1_top` pose captured
11. rep cycle instantiated for reps 2 and 3
12. loaded contacts released at finish
13. standing finish reached
14. compiled tracks visibly animate the Coach Avatar

Do not reduce these failures to a generic `animation failed` or `lunge failed` status.

## Scope / risk boundary

This PR changes the generic Motion Lab intelligence adapter, but only changes behavior when generated kinematic chains are active. Contact-only correction retains the previous path.

Primary risk to review: another generated-IK exercise could have depended on root-first anchor correction. If such a case exists, either confirm the new ownership rule is correct for that exercise too, or narrow the skip condition to an explicit trajectory/solver ownership flag before merge.

The current lunge is the motivating proof because its v3 contract explicitly says the pelvis/root trajectory creates the descent and generated IK solves the legs around planted contacts.

## Merge decision

**READY** only when automated tests pass and manual Motion Lab acceptance shows the personalized Coach Avatar visibly completes all three generated lunge repetitions and returns to standing with acceptable foot anchoring.

**NEEDS FIX** if the avatar remains frozen at split, the whole body translates down without knee flexion, either foot visibly slides beyond acceptance, an IK chain fails, or another generated-IK exercise regresses.
