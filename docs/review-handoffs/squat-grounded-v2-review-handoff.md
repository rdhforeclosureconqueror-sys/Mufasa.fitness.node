# Independent Review Handoff — Grounded Synthesized Squat v2

Historical handoff for PR #605. The [Motion Lab and Movement Lego integration repair](motion-lab-lego-integration-repair-handoff.md) preserves the grounded v2 identity and contact policy while correcting compiler root units and calibrating partial-depth offsets on the real Phase E rig. Use that report for current verification and remaining human acceptance.

## Purpose

Human Motion Lab review of synthesized squat v1 found a clear visual failure: both feet rose off the ground and the motion read like a slow tuck jump rather than a squat. This revision is intended to correct that failure while preserving the Movement Lego synthesis approach.

## User-observed failure

- Feet did not remain planted.
- The knees/legs folded upward relative to the body.
- The result looked like a slow jump tuck rather than a grounded squat.
- The user specifically pointed to the previously studied Kettlebell Swing reference as better evidence for a grounded lower-body chain.

## Technical findings behind the revision

1. The v1 squat authored `mixamorig:Hips` pitch as a bone target, but `motion-spec-clip.js` treats the root bone separately and reads root rotation from `phase.root.rotationOffsetEulerDegrees`. That meant the authored hip-pitch target was not actually driving the compiled root rotation.
2. The Kettlebell Swing evidence shows the upper-leg and lower-leg X rotations moving in opposite directional ranges. v1 used the reverse sign relationship (`thigh < 0`, `lower leg > 0`), which is consistent with the observed tuck-like folding on this skeleton.
3. Ground contact is the visual priority for this revision. There is no jump or takeoff primitive in the squat recipe.

## Changes to review

### `public/motion/squat-motion-spec.js`

- Motion advances to `squat/synthesized_engineering_v2_grounded`, version 2.
- Hip pitch is moved onto `phase.root.rotationOffsetEulerDegrees`, the channel actually compiled for the root bone.
- Thigh X offsets are now positive while lower-leg X offsets are negative, following the directional relationship observed in the Kettlebell Swing evidence.
- Root descent is coordinated at approximately 0.16 avatar heights at mid-depth and 0.32 at bottom.
- Forward root travel is reduced to keep the squat centered.
- Every phase still declares bilateral foot contact.
- Adds explicit `groundingPolicy` referencing `motion-sources/kettlebell-swing-reference.source.json`.

### `motion-lab/motion-lab-bootstrap.js`

- Keeps the same explicit Motion Lab load path.
- Status copy identifies the loaded motion as grounded Squat Engineering Reference v2 and tells the reviewer to inspect planted feet.

### Tests

`test/squat-motion-spec-v1.test.js` now checks:
- version/motion ID
- bilateral contacts in every phase
- opposite-signed thigh/lower-leg direction at bottom
- root descent instead of takeoff
- hip hinge authored on the actual root rotation channel

## Evidence boundary

Kettlebell Swing reference observed mechanics include:

- Hips Y start/end: 76.6062 / 76.6062
- Hips X rotation range: 2.0945°–51.5032°
- Left/Right UpLeg X ranges: positive 13.8°–103.7° / 15.9°–103.6°
- Left/Right Leg X ranges: negative -64.3°–-13.0° / -64.0°–-16.3°

Do not copy ballistic kettlebell timing or arm styling. The evidence is used only for the grounded leg-chain relationship and root/hip coordination.

## Required independent checks

Run:

`node --test test/squat-motion-spec-v1.test.js test/motion-lab-synthesized-squat-preview-v1.test.js`

Then perform a real Motion Lab playback and verify all of the following:

1. Both feet remain visually planted through descent, bottom, and ascent.
2. The avatar's pelvis descends toward the feet rather than the feet rising toward the pelvis.
3. Knees bend as part of a grounded chain rather than tucking upward.
4. The torso remains coherent and does not invert.
5. The motion visibly reads as a squat rather than a jump tuck, knee raise, or good morning.
6. Start and finish return to the same standing reference without root teleport.
7. Diagnostics show the grounded v2 motion ID and zero unbound targets.

## Verdict rules

- **GO** only if the feet remain planted enough that the movement clearly reads as a grounded squat engineering reference.
- **NO-GO** if either foot visibly lifts, the pelvis fails to descend, the knees tuck upward, or the motion is not recognizably squat-like.
- Even a GO here is only for development Motion Lab use. It is not biomechanical validation, product scoring authority, or MoveNet validation.
