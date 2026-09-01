# Independent Review Handoff — Synthesized Squat v3 90° Ground Lock

## Goal
Correct the development squat after independent review found the grounded v2 bottom pose was still about 113° at the knee and the ankle/foot anchors rose during the calculation. Lower body is the only priority in this slice; arms are intentionally deferred.

## Base
Branch created from main SHA `98c198e33528645bd200ae1b2dee0b128d45d5d8` after PR #606 merged.

## What changed
- `public/motion/squat-motion-spec.js`
  - advances to `squat/synthesized_engineering_v3_90deg_groundlock`
  - declares standing knee target 180° and bottom target 90° ±8° for engineering review
  - deepens thigh/lower-leg/ankle/root targets
  - formalizes squat intent: pelvis down/back like sitting into a chair; return by standing up
  - makes arms explicitly secondary
  - requires bilateral foot contact anchors with concrete LeftFoot/RightFoot bone mapping
- `public/motion/motion-spec-clip.js`
  - preserves the already-correct world-to-armature-local root conversion from PR #606
  - upgrades contact metadata into a compile-time bilateral contact-anchor correction
  - samples standing foot anchors, applies each phase, computes average root correction, and reports residual foot-anchor error
  - restores the avatar rest pose after compilation
- `test/squat-motion-spec-v1.test.js`
  - updates static contract checks for v3, 90° target, deeper lower-body geometry and enforced contact lock

## Important distinction
The v2 report stated the coordinate conversion was wrong. Current main already contains the world-to-local correction added by PR #606. Do not regress or duplicate that repair. This PR builds on it and addresses the remaining depth/contact problem.

## Review commands
Run at minimum:

`node --test test/squat-motion-spec-v1.test.js test/motion-spec-real-avatar.test.js test/motion-lab-synthesized-squat-preview-v1.test.js`

If available, run the broader Motion Lab focused suite used by PR #606.

## Required numerical review
Using the shipped Phase E reference avatar:
1. Compile v3.
2. Confirm `contactLockApplied === true`.
3. Inspect `maxContactResidualWorldUnits` and per-phase residuals. Residual should be small enough that the feet are visually stationary; reviewer should report the actual number rather than assuming success.
4. Calculate left/right inside knee angle at standing and bottom from world-space hip/knee/ankle positions. Target is approximately 180° standing and 90° bottom, tolerance ±8° for this development proof.
5. Measure world-space LeftFoot/RightFoot displacement from standing anchor to bottom.

## Required human visual review
In Motion Lab:
1. Load Synthesized Squat.
2. Use the existing Pause control at or near the bottom phase for inspection.
3. Inspect from the most useful available side/3-quarter view. If Motion Lab still lacks a side-camera control, explicitly record that as a review limitation rather than claiming side-view acceptance.
4. Verify:
   - both feet remain planted
   - stance width does not visibly collapse
   - pelvis descends and shifts slightly back
   - knees bend toward the requested ~90° bottom
   - movement reads as sitting down/standing up, not a tuck jump
   - ascent reverses descent cleanly

## NO-GO conditions
Request changes if any of these occur:
- foot/ankle anchor visibly rises or translates materially
- bottom knee angle remains materially above the 90° ±8° target
- pelvis moves in the wrong world direction because of armature transforms
- contact lock produces obvious whole-body sliding or skeletal distortion
- compiler leaves the avatar mutated after compile
- new behavior breaks push-up or other motion-spec compilation

## Boundary
Development-only. No production squat scoring, coaching thresholds, MoveNet authority or biomechanical validation is claimed. No new FBX/GLB is added.
