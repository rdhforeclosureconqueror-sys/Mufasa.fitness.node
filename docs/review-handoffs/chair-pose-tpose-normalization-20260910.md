# Chair Pose T-pose normalization correction

## First failure
The Yoga generation pipeline can fully pass description, generation, support, Coach Avatar, compile/bind, and Play readiness while still producing a visually invalid pose when the generated Motion Spec uses zero rest-relative rotations for an avatar whose imported rest pose is a T-pose.

## Proof case
Chair Pose is the visual proof case for the correction because it must visibly move through a full sequence:

`neutral standing -> descent -> chair target -> hold -> ascent -> neutral standing`

## Correction
- adds an explicit neutral standing target for the Avaturn Coach skeleton instead of treating zero rest-relative offsets as neutral human standing;
- places the upper arms down alongside the torso at start/finish;
- converts Chair from the generic four-phase helper into six phases: start, descent, target, hold, ascent, finish;
- uses the repository's existing squat engineering reference as the lower-body direction for hip/knee/ankle coordination while retaining Chair's own generated archetype;
- preserves bilateral foot support/IK across all Chair phases;
- adds regression coverage proving the start pose is not a zero-offset T-pose and that root/leg/arm values visibly differ through the movement.

## Important boundary
This PR proves and corrects Chair first. The broader generator still has other archetypes that rely on `baseTargets()` and should be normalized one at a time after Chair visual acceptance. Do not mark the generalized T-pose normalization problem complete until the remaining archetypes are reviewed.

## Visual acceptance
1. Generate Chair fresh; do not replay an older browser-local saved Chair spec.
2. Start/finish should show standing with arms at the sides, not T-pose.
3. During descent, pelvis lowers and moves slightly posteriorly while knees and hips flex.
4. At target/hold, thighs/knees visibly flex and arms are overhead.
5. Feet remain planted throughout.
6. During ascent, movement reverses toward neutral standing.
7. If the avatar remains in T-pose despite differing phase values, FIRST FAILURE moves downstream from generator authoring to playback/track application and should be diagnosed there.

## Readiness
This changes tracked Motion Lab behavior. Record readiness through the repository CLI and validate with the canonical readiness commands. Human/device/visual acceptance remains owner-controlled.
