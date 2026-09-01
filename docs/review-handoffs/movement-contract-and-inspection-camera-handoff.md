# Independent Review Handoff — Squat Movement Contract + Motion Lab Inspection Camera

## Goal
Turn the squat from a collection of authored rotations into a contract-driven generated movement and give reviewers mobile-first camera control to inspect front, side, back and arbitrary angles.

## Important coaching correction
Do **not** encode a universal `knees must stay behind toes` rule. Forward knee travel depends on squat style, anatomy, stance and ankle dorsiflexion. The contract instead requires:

- both feet/heels remain planted,
- knees track in the same general direction as the feet without material valgus/varus collapse,
- pelvis descends and moves slightly posterior as if sitting into a chair,
- ankle dorsiflexion, pelvis depth and forward knee travel remain coordinated,
- excessive/uncoordinated knee translation is a compensation signal,
- actual bottom knee angle is measured from hip-knee-ankle geometry.

This distinction is deliberate. A knee crossing the toe line by itself is not a hard failure.

## New movement-contract architecture

### `public/motion/contracts/bodyweight-squat.v1.json`
Canonical development coaching contract containing:

- setup/stance intent,
- dual-foot hard contact,
- no-flight rule,
- phase order,
- movement intent by phase,
- 180° standing / 90° bottom engineering knee target,
- pelvis down/back cue,
- knee-tracking policy,
- required Lego primitives,
- coaching cues,
- compensation signals for heel rise, knee valgus/varus, foot turnout/flattening, asymmetric shift, excessive forward lean, insufficient depth and excessive/uncoordinated knee translation.

Compensation signals are movement-screen observations, not diagnoses.

### `public/motion/movement-contract-validator.js`
Adds two layers:

1. `preflight(spec, contract)` — structural/hard-constraint check before treating a recipe as a valid exercise composition.
2. `evaluatePoseSample(sample, contract)` — numeric/runtime evaluator for measured knee angle, foot-anchor residual and selected compensation signals.

This is the start of the intended generator hierarchy:

`exercise contract -> hard constraints -> Lego primitives -> source evidence -> synthesized motion -> runtime geometry validation -> human review`

### `public/motion/squat-motion-spec.js`
Now references `/motion/contracts/bodyweight-squat.v1.json` and explicitly carries the coaching/knee-tracking intent alongside its numeric targets.

## Motion Lab inspection camera

### `public/motion/motion-lab-inspection-controls.js`
Loaded through the existing protected `/dev/motion-lab-assets/:filename` route. It wraps the canonical disposable Motion Lab session factory without creating another renderer or RAF owner.

Features:

- Front 0° preset
- Right 90° preset
- Back 180° preset
- Left 90° preset
- Reset View
- one-finger drag on mobile canvas
- click-drag on desktop
- horizontal orbit around avatar
- limited vertical orbit for elevated/lowered inspection
- camera-only transform; avatar/skeleton are not rotated
- pointer listeners registered through the canonical session ownership API so disposal removes them

## Review requirements

Run:

`node --test test/squat-motion-spec-v1.test.js test/movement-contract-squat-v1.test.js test/motion-lab-inspection-controls.test.js test/motion-spec-real-avatar.test.js test/motion-lab-synthesized-squat-preview-v1.test.js`

Then human-test Motion Lab on iPhone/Safari:

1. Initialize Runtime and start a session.
2. Load Synthesized Squat v3.
3. Pause near the bottom.
4. Tap Front, Right, Back and Left presets.
5. Drag one finger on the viewer; verify the camera orbits smoothly and the page does not scroll while the finger is on the canvas.
6. Confirm camera movement does not alter the avatar pose or restart playback.
7. From side view, assess actual knee/ankle/hip relationship. Do not fail solely because the knee passes the toe line; fail for heel lift, loss of balance, material contact-anchor movement, collapse, or excessive/uncoordinated knee translation.
8. From front view, inspect stance symmetry and knee tracking relative to feet.

## NO-GO

Request changes if:

- the new inspection asset is not served through the Motion Lab access gate,
- controls create a second renderer/RAF owner,
- pointer listeners leak across session disposal,
- camera controls rotate/mutate the avatar or skeleton,
- preset angles are materially incorrect,
- the movement contract can pass without dual-foot contact/no-flight,
- the runtime treats `knee beyond toe` alone as a universal invalid squat,
- compensation signals are presented as medical diagnoses,
- v3 still misses the actual skeleton knee-angle/foot-lock requirements from the existing squat-v3 handoff.

## Boundary
Development-only. This does not promote squat scoring thresholds, medical claims, or production coaching authority. The 90° target is an engineering reference target for this development squat and still requires human/device validation.
