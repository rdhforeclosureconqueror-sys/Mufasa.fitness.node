# OHSA Ear-Aligned Arms + Palms-In — Review Handoff

Date: 2026-09-09
Branch: `fix/ohsa-ear-aligned-palms-in-20260909`
Base: current `main` after merged PR #753

## Owner visual finding

The semantic world-up arm fix stopped the worst cross-body retargeting, but the overhead squat still looked mechanically wrong:

1. as the torso/head inclined during descent, the arms remained vertical to the room instead of staying aligned beside the ears;
2. the palms were oriented incorrectly; the assessment demonstration requires palms facing inward.

The owner supplied front/back visual evidence showing both failures.

## Root cause

This is **both a movement-description problem and an engine-capability problem**.

### Description problem

The prior Motion Spec defined overhead as `worldDirection: [0,1,0]`. That is an absolute room/world constraint. An overhead squat assessment needs a body-relative relationship: the upper arm should remain aligned with the ear/head line as the trunk/head angle changes.

The prior description also never encoded palm orientation.

### Engine gap

The semantic engine only supported `bone_direction_world`. It could not express:

- a body segment parallel to another body segment after phase pose changes;
- hand roll/palm-plane orientation around the hand's long axis.

## Corrective architecture

### 1. Ear-relative upper-arm alignment

OHSA now uses `bone_direction_reference` for each upper arm:

- driven segment: shoulder/upper-arm bone -> forearm child;
- reference segment: `Neck -> Head`;
- rule: shoulder-to-elbow remains parallel to the current Neck-to-Head direction.

This solve runs **after each phase's hips/spine transforms are applied**, including generated grounding samples. Therefore the local shoulder quaternion may change while the semantic relationship remains constant.

Expected physical result:

`torso/head inclines -> ear line inclines -> arms incline with ear line`

not:

`torso/head inclines -> arms stay vertical to room`.

### 2. Palms facing inward

OHSA now uses `hand_plane_faces_reference` for each hand.

The solver:

1. uses Hand -> Middle1 as the hand long axis;
2. estimates the hand/palm plane from Index1 and Pinky1 landmarks;
3. builds an inward target toward the Head/body centerline;
4. projects both current palm normal and inward target perpendicular to the hand long axis;
5. rotates only around the long axis until the palm plane faces inward.

Left and right use mirrored landmark order so their palm normals resolve toward the centerline rather than the same global side.

## Files changed

- `public/motion/motion-spec-semantic-direction-policy.js`
- `public/motion/overhead-squat-assessment-motion-spec.js`
- `public/motion/contracts/overhead-squat-assessment.v1.json`
- `test/overhead-squat-assessment-motion-spec.test.js`
- this handoff

## Automated review

Run:

```bash
node --test test/overhead-squat-assessment-motion-spec.test.js
```

Then run existing Motion Lab compiler, lunge, squat, Coach-retarget, grounding and local-playback regressions.

Important new assertions:

- OHSA has exactly two body-relative upper-arm targets;
- OHSA has exactly two palms-in hand-plane targets;
- an inclined Neck-to-Head fixture causes the upper arm to incline with it instead of world-up;
- phase-specific top/bottom local shoulder solutions differ when torso geometry differs;
- a synthetic hand twists around its long axis until its palm plane faces the body/head reference;
- bottom holds, mirrored ascent and dense grounding remain intact.

## Owner visual acceptance — stop at first failure

1. Load personalized Coach Avatar.
2. Load OHSA v1.2.
3. Inspect `setup_overhead` from the front:
   - left upper arm beside left ear;
   - right upper arm beside right ear;
   - no arm crossing chest/head;
   - palms face inward.
4. Inspect `setup_overhead` from the right side:
   - hands/arms visually aligned with ear line;
   - elbows remain straight.
5. Play/pause at `rep1_descent_mid`:
   - as head/torso incline, arms travel with the ear line;
   - arms must not remain vertical to room;
   - palms remain inward.
6. Inspect `rep1_bottom`:
   - arms remain beside ears relative to head;
   - palms remain inward;
   - feet remain grounded.
7. Inspect mirrored ascent.
8. Play all three reps and confirm repeatability.

## First-failure order

Report the first failing boundary only:

1. semantic policy module loaded;
2. Coach semantic target bone resolution;
3. Neck / Head reference resolution;
4. per-phase ancestor pose applied;
5. left arm ear-line solve;
6. right arm ear-line solve;
7. left hand landmarks resolved;
8. left palm-plane twist solved;
9. right hand landmarks resolved;
10. right palm-plane twist solved;
11. derived phase targets compiled;
12. grounding/IK preserved;
13. visible setup alignment;
14. visible descent alignment;
15. visible bottom alignment;
16. three-rep repeatability.

## Readiness boundary

Do not hand-edit readiness JSON. Record the corrective implementation using the repository's `npm run readiness:update -- ...` workflow, then run `npm run readiness:validate` before treating the work as complete. Owner visual acceptance remains human authority.
