# Independent Review Handoff — Squat v4 Hip-Back Geometry Lock

## Role
You are the independent reviewer. Do not assume the authoring bot is correct. Do not merge solely because static tests pass. Human side-view inspection remains required.

## Base
Branch was created from main SHA `7e2db47a5aac4b5279f2579efc856c92d5570716` after merged PR #608.

## Human finding that triggered this change
Side-view Motion Lab screenshots showed that squat v3 had adequate depth and improved foot grounding, but the descent remained too knee-dominant. The knees translated forward while the pelvis did not move posteriorly enough, so the movement did not read strongly enough as “sit the hips down and back.”

## Goal
Preserve:
- approximately 180° standing knee geometry,
- approximately 90° bottom knee geometry,
- bilateral planted-foot constraint,
- current squat depth,

while shifting the canonical reference toward:
- more posterior pelvis travel,
- less ankle-driven forward-knee bias,
- a measurable side-view hip/knee/toe geometry envelope.

Arms remain secondary and are not the acceptance focus.

## Files changed
- `public/motion/contracts/bodyweight-squat.v1.json`
- `public/motion/movement-contract-validator.js`
- `public/motion/squat-motion-spec.js`
- `test/movement-contract-squat-v1.test.js`
- `test/squat-motion-spec-v1.test.js`

## Important rule boundary
The new knee/toe envelope is a **canonical generated-reference style constraint**, not a universal statement that every valid human squat must keep the knee behind the toes. The contract explicitly preserves that distinction.

## What v4 changes
Motion ID:
`squat/synthesized_engineering_v4_hip_back_geometry_lock`

Compared with v3:
- bottom vertical root drop remains `-0.22` avatar heights,
- bottom posterior root travel increases from `-0.075` to `-0.14` avatar heights,
- hip contribution increases,
- ankle pitch is reduced from 44° to 28° at bottom,
- deep thigh/knee flexion remains,
- dual-foot anchor enforcement remains active.

The contract adds measured side-view checks:
- minimum posterior pelvis travel,
- maximum generated-reference knee-forward-of-toe travel,
- minimum pelvis-posterior-to-knee separation.

Do not approve based only on authored offsets. Measure the resulting shipped Phase E skeleton.

## Required automated checks
Run at minimum:

`node --test test/squat-motion-spec-v1.test.js test/movement-contract-squat-v1.test.js test/motion-spec-real-avatar.test.js test/motion-lab-synthesized-squat-preview-v1.test.js test/motion-lab-inspection-controls.test.js`

Also run broader motion tests if available.

## Required runtime review
1. Open Motion Lab on the shipped Phase E reference avatar.
2. Load Squat v4.
3. Use the 90° side preset or one-finger orbit.
4. Pause near bottom.
5. Verify both feet remain visually planted.
6. Verify the hips moved back materially more than in v3.
7. Verify the knees no longer dominate the descent by shooting forward.
8. Verify squat depth is still approximately the intended 90° bottom knee geometry.
9. Verify no whole-body slide, foot drag, pelvis teleport, skeleton explosion, or obvious balance failure was introduced.
10. Return to front view and confirm left/right symmetry remains reasonable.

## Numerical review requested
Using actual posed world-space/sagittal-projected markers, report:
- left and right inside-knee angles at bottom,
- left/right foot-anchor residual,
- pelvis posterior displacement from standing,
- knee forward displacement relative to toe marker,
- pelvis posterior displacement relative to knee marker.

Compare those measurements with `public/motion/contracts/bodyweight-squat.v1.json`.

## NO-GO conditions
Request changes if any of the following occur:
- foot lift or material foot slide,
- depth regresses materially,
- knee still visibly dominates while hip posterior travel is insufficient,
- the generated-reference toe-line envelope fails,
- the pelvis does not remain meaningfully posterior to the knee in the selected side projection,
- added posterior travel makes the avatar fall backward or introduces whole-body translation,
- static constants pass but measured runtime geometry fails.

## Animation-evidence architecture note
The source animation breakdowns in `motion-sources/` are intended as reusable evidence, not complete exercise clips to paste together blindly. The efficient architecture is hybrid:

1. preserve source provenance/hash and, where licensing permits, source clips in a controlled asset store;
2. extract reusable neutral mechanics/segments into canonical primitive profiles;
3. normalize them to the canonical skeleton/coordinate system;
4. let exercise contracts select primitive mechanics and reject source behavior that violates hard constraints;
5. synthesize a clean exercise motion;
6. validate against runtime geometry and later human MoveNet evidence.

Directly concatenating raw animation clips can be useful for prototyping, but it often carries incompatible root motion, timing, style, stance, skeleton assumptions, and contact behavior across segment boundaries. A future motion-segment bank can make reuse faster without giving up the contract/constraint layer.

## Boundary
Development-only. No production scoring or biomechanical-validation claim. Human runtime acceptance is still required.
