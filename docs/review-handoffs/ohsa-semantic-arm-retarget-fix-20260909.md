# OHSA Semantic Arm Retarget Fix — Independent Review Supplement

Date: 2026-09-09
PR: #752
Branch: `feat/motion-lab-overhead-squat-assessment-20260909`
Status: **RETEST REQUIRED — OWNER VISUAL ACCEPTANCE NOT YET RECORDED**

## Trigger

Owner mobile screenshots of the Overhead Squat Assessment showed the upper arms following an implausible path through/across the torso/head even though the movement description correctly required straight arms overhead.

## First failing boundary

The failure is at **rotation semantics during canonical-to-Coach retargeting**, not at the OHSA movement description.

Before this fix, the pipeline did this:

`semantic intent "arms overhead" -> canonical Mixamo local Euler offset (-145° X) -> strip mixamorig prefix -> apply same local XYZ offset to Avaturn LeftArm/RightArm`

That is only bone-name remapping. It is not complete rotation retargeting.

`motion-spec-clip.js` interprets authored rotations as rest-relative **local XYZ** offsets on the loaded target bone. Two armatures may use the same semantic bone name while their local bone axes point in different directions. Therefore the same X/Y/Z Euler offset can create a different physical motion on another rig.

## System correction

New module:

`public/motion/motion-spec-semantic-direction-policy.js`

For Motion Specs that declare `semanticPosePolicy.targets`, the policy:

1. resolves the actual target-rig upper-arm bone;
2. resolves its actual forearm child;
3. measures the current world-space shoulder-to-elbow segment direction;
4. computes the shortest world-space quaternion that aligns that segment with the requested semantic direction;
5. converts the desired world orientation back into the target bone's local parent space;
6. compiles the Motion Spec from that rig-correct semantic basis;
7. restores the avatar's original rest quaternion after compilation.

Existing motions without semantic targets are passed through unchanged.

## OHSA change

The OHSA no longer says:

`LeftArm local X = -145°`

or

`RightArm local X = -145°`.

Raw upper-arm and forearm local offsets are zero. The spec instead declares two semantic targets:

- left shoulder-to-elbow segment -> world up `[0, 1, 0]`
- right shoulder-to-elbow segment -> world up `[0, 1, 0]`

This means **overhead is defined by where the limb must point**, not by which arbitrary local rig axis must rotate.

## Why this is a system-level upgrade

This creates a reusable distinction:

- **Semantic movement language:** overhead, forward, down, planted, knee toward floor, pelvis down, etc.
- **Rig translation:** determine how the loaded armature must rotate to satisfy that semantic request.

Do not allow exercise descriptions to contain rig-specific Euler guesses unless that target rig's local axis convention has been explicitly verified.

Future movement definitions should increasingly use semantic body-segment directions and constraints where the requested result is geometric rather than rig-axis-specific.

## Automated proof required

Run:

```bash
node --test test/overhead-squat-assessment-motion-spec.test.js
```

The regression constructs a synthetic arm whose rest shoulder-to-elbow vector points along local +X, then verifies the semantic solver still points it to world +Y and restores the original rest quaternion after compilation.

Also run existing Motion Lab lunge/squat/compiler/retarget regressions.

## Owner visual retest — stop at first failure

1. Initialize Motion Lab.
2. Load **Overhead Squat Assessment v1 (Coach Avatar)**.
3. Inspect `setup_overhead` before judging the squat.
4. Front view: each upper arm should travel from its own shoulder upward; neither arm should cross through the chest, opposite shoulder, neck, or head.
5. Side view: arms should remain overhead rather than swinging through the torso.
6. Verify elbows remain straight.
7. Then inspect first descent, first bottom, ascent, and all three reps.

### Decision

- **GO:** arm paths are anatomically plausible for the reference demonstration, remain overhead, and do not intersect the torso/head because of rig-axis mismatch.
- **CALIBRATION REQUIRED:** semantic overhead direction is correct but owner wants small spacing/twist refinement near the ears. Refine without reintroducing source-rig Euler assumptions.
- **NO-GO:** an arm still crosses through the body/head, left/right identities are swapped, semantic policy diagnostics do not appear, or an existing motion regresses.
