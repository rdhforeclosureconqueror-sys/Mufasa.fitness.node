# Mirror Motion Phase 4 independent hardening review

## Reviewed target

- PR: #641 — Phase 4: add exercise-aware mirror constraints and contact anchors
- Reviewed head: `aae2f0a5033324509c83a3b6591a9f936a8712d4`
- Base: merged Phase 3 hardening `61ec29a707a7661501851be47d6c9eb1f0738920`
- Review branch: `review/mirror-motion-phase4-hardening-20260904`

## Verdict

CHANGES REQUIRED before merging PR #641.

## Findings fixed

### 1. Stale exercise authority could keep the wrong Phase 4 pattern active

`selectedExercise()` preferred `window.__selectedExercise`. PocketPT initializes that compatibility snapshot from the first strength block when the workout is activated, while `WorkoutProgressionRuntime.getCurrentExerciseMeta()` is the existing current-exercise authority during progression.

Risk: a multi-exercise workout could progress away from squat while Phase 4 still applies squat context/anchors.

Fix: prefer `WorkoutProgressionRuntime.getCurrentExerciseMeta()` and only fall back to `__selectedExercise` / active-workout metadata.

### 2. Push-up anchor scale was fragile in side-on camera views

Body scale used only left/right shoulder and hip separation. Those projections can collapse when a person is side-on during push-ups, shrinking allowed contact drift and causing false anchor releases.

Fix: include shoulder-midpoint to hip-midpoint torso length and use the strongest trustworthy projected body-size reference. No arbitrary pixel fallback is introduced.

### 3. Push-up anchors had no acquisition/release hysteresis

One frame classified horizontal could immediately create four contact anchors. One noisy transition frame could immediately release them.

Risk: detector noise around the horizontal boundary could visibly lock/unlock hands and feet.

Fix: require consecutive horizontal frames before contact activation and consecutive transition frames before contact release. Defaults are three frames to enter and two frames to exit. Streaks are reset on exercise/context reset and exposed in diagnostics.

### 4. Correction diagnostics counted no-op contacts as corrections

`applyAnchor()` incremented correction counters even when measured drift was zero because every maintained contact passed through the correction path.

Fix: distinguish `contact_anchor_maintained` from `contact_anchor_corrected`, and increment correction counters only when drift exceeds a small body-scale-normalized correction floor.

## Regression coverage added

- progression runtime current exercise overrides stale `__selectedExercise`;
- zero-drift planted contacts do not inflate correction counters;
- push-up contacts require confirmed horizontal posture;
- a single noisy transition frame does not release established push-up contacts;
- side-on push-up geometry retains a usable torso-derived body scale and does not falsely release a small wrist drift;
- diagnostics expose push-up entry/exit streaks.

## Scope boundary

This review does not add IK, 3D reconstruction, collision solving, quaternion retargeting, F-curve behavior, a new exercise authority, or a second camera/MoveNet pipeline.

## Verification

Run at minimum:

`node --test test/pose-stability-engine.test.js test/mirror-motion-phase2.test.js test/mirror-motion-phase3.test.js test/mirror-motion-phase4.test.js`

Then run the full repository suite and real-camera acceptance for squat stance changes, standing-to-floor push-up transition, side-on push-ups, push-up classifier noise, jumping jacks, exercise progression, camera reconnect, avatar overlay, and avatar-only modes.

No CI/full-suite execution is claimed by this review unless a workflow run is subsequently attached to the review head.
