# Phase 24 — Exercise Form Rule Engine for Pilot Movements

## Scope
Phase 24 intentionally supports only the three default pilot movements:

- Bodyweight Squat → `squat`
- Push-Up → `pushup`
- Lunge → `lunge`

It does not attempt to support the full exercise database, backend authentication, payment, or avatar/3D behavior.

## Current form logic before Phase 24
Before this phase, local rep analysis was squat-centric. The runtime used MoveNet keypoints to compute squat depth, switched from `up` to `down` when squat `depthScore` crossed a down threshold, then counted a rep when depth returned above the up threshold. Generic form-engine corrections could still contribute depth/deeper feedback, which made feedback unreliable for pilot workouts and could surface a “go deeper” cue even when a squat was visually deep.

## New pilot form-rule engine behavior
The pilot rule engine maps the active exercise to a movement pattern, gates feedback by required keypoint confidence, evaluates movement-specific geometry, tracks movement phases, and separates:

- rep detected
- good rep
- form warning

A rep is counted only after the expected phase cycle completes:

- squat: `standing` → `bottom` → `standing`
- pushup: `top` → `bottom` → `top`
- lunge: `standing/split stance` → `bottom` → `standing/split stance`

## Squat rules
Required MoveNet keypoints:

- shoulders
- hips
- knees
- ankles

The squat rule uses hip/knee vertical level and knee angle. Depth is good if hips are at or below knee level within tolerance, or if knee angle indicates adequate depth. If hips are at or below knee level, the engine reports `depth good` and does not emit “go deeper.”

## Push-up rules
Required MoveNet keypoints:

- shoulders
- elbows
- wrists
- hips

The push-up rule uses elbow angle to identify top and bottom phases, plus a simple detectable hip-sag/body-line warning. A good rep requires the top/bottom/top cycle and a bottom position without a detectable hip-sag warning.

## Lunge rules
Required MoveNet keypoints:

- hips
- knees
- ankles

The lunge rule uses front-knee bend and back-knee drop to identify the bottom phase. A good rep requires a standing/split-stance to bottom to standing/split-stance cycle with acceptable lower-body visibility.

## Confidence gates
When required keypoints are not reliable enough, the engine shows:

> I need to see your hips, knees, and ankles.

It does not issue depth criticism from unreliable lower-body data.

## Visible status
The app now exposes a pilot form-rule status panel with:

- movement pattern
- phase
- depth/status
- keypoint confidence status
- good rep or needs work

The same fields are also appended to pose diagnostics during live pose updates.

## Database strategy for later phases
The full exercise database should not be handled by writing bespoke logic for every exercise from scratch. Instead, exercises should gradually map to movement patterns such as `squat`, `hinge`, `pushup`, `row`, `lunge`, `carry`, `plank`, or `mobility`. Each movement pattern can then own a small set of geometry rules and confidence gates. Exercise-specific records should add metadata such as stance, equipment, unilateral side, range-of-motion target, and allowed substitutions rather than duplicating the entire rule engine per exercise.

## Rollback notes
To roll back Phase 24, remove the pilot form-rule engine and adapter from `public/workout-runtime.js`, remove the pilot status panel and diagnostics additions from `public/index.html`, remove the pilot mapping export from `public/fitness.js`, and delete the focused Phase 24 test/report files.
