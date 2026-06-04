# Phase 29 — Coach Demo Exercise Template Builder Foundation

Date: 2026-06-04
Branch: work

## Scope

Phase 29 starts the private coach/admin foundation for a future custom exercise template builder. It does not expose unfinished custom exercise judging to normal users and does not change payment, avatar/3D, Push-Up Challenge, or backend auth weakening.

## Current behaviors preserved

- Normal users still get the pilot-safe Request New Exercise message: “Custom exercise creation is coming soon. For this pilot, use Squat, Push-Up, Lunge, or Push-Up Challenge.”
- Unknown/custom exercises still return tracking unavailable instead of falling back to squat scoring.
- Built-in pilot form rules for Squat, Push-Up, and Lunge remain in the Phase 24 form-rule engine.
- Push-Up Challenge runtime remains present and unchanged.

## Coach/admin template draft behavior

- Coach/admin/trainer roles can see/open a private builder entry labeled “Create Exercise Template Draft.”
- Normal users do not see that builder entry and continue to receive the pilot-safe message.
- Draft creation captures:
  - exerciseName
  - movementPattern
  - description
  - equipment
  - difficulty
  - createdBy
  - status
  - createdAt
  - updatedAt
- Supported movement patterns are:
  - squat
  - push
  - pull
  - lunge
  - hinge
  - curl
  - core
  - carry
  - rotation
  - other

## Demo recording slots

Each draft includes demo slots:

- front_view — required
- side_view — required
- optional_extra_view — optional

## Position recording behavior

The builder stores coach-defined movement positions such as:

- start
- bottom
- top
- extension
- contraction
- finish
- standing

Examples supported by the data model include push-up `bottom, top, bottom`, curl `extension, contraction, extension`, and squat `standing, bottom, standing`.

## Demo capture behavior

- Demo capture requires the camera to be connected.
- Demo capture requires MoveNet to be loaded.
- The frontend captures about five seconds of pose frames per demo/test run.
- The backend stores per-frame:
  - timestamp
  - keypoints
  - visibleKeypointCount
  - confidence summary
  - derivedAngles
  - detectedBodyAlignment
- Capture quality reports average confidence and average visible keypoints.
- Simple phase suggestions are generated from captured angle changes.
- Suggested phases are private draft data and are not final until coach review.

## Raw video storage

Raw video is not stored in Phase 29. Backend demo/test routes reject raw video-like payload fields.

## Template schema

Stored templates include:

- id
- exerciseName
- movementPattern
- status
- description
- equipment
- difficulty
- createdBy
- createdAt
- updatedAt
- demoSlots
- demoCaptures
- positions
- positionPresets
- phases
- requiredKeypoints
- measurementRules
- repCycle
- feedbackRules
- testRuns
- approvedBy
- approvedAt

Statuses are:

- draft
- demo_recorded
- phase_review
- testing
- approved
- active
- rejected

## Test mode behavior

After phase review, coach/admin users can run a private Test Template capture. The draft template judges whether the test attempt would count and records rejected reasons. Test mode is not saved as a public workout result.

## Approval behavior

Approval is guarded. A template cannot become approved/active until:

1. front_view and side_view demo captures exist.
2. keypoints and derived measurements are stored.
3. phases are reviewed.
4. a passing test mode run exists.
5. coach/admin/trainer approval is submitted.

The approval route can set status to `approved` or `active`; normal users cannot call it.

## Runtime safety behavior

- `draft`, `demo_recorded`, `phase_review`, `testing`, and `rejected` templates are not eligible for public scoring.
- Only `active` templates are eligible for future custom template scoring.
- Public workout runtime still maps unknown/custom exercises to the “Tracking unavailable for this exercise” guard.
- The active scoring endpoint returns only active templates and only minimal scoring fields.

## Backend routes added

All builder mutation/read routes require auth and admin/trainer/super_admin role:

- POST `/api/exercise-templates`
- GET `/api/exercise-templates`
- GET `/api/exercise-templates/:id`
- PUT `/api/exercise-templates/:id`
- POST `/api/exercise-templates/:id/demo-captures`
- POST `/api/exercise-templates/:id/test-runs`
- POST `/api/exercise-templates/:id/approve`

Public scoring safety route:

- GET `/api/exercise-templates/active/scoring` — requires auth and only returns active templates with minimal scoring fields.

## Deferred to future phases

- Better visual phase editor.
- Multi-angle comparison.
- Template quality scoring.
- Threshold tuning UI.
- User-facing active custom exercise scoring.
- Raw demo video storage, if explicitly approved later.

## Tests run

- `node --test test/phase29-coach-demo-exercise-template-builder.test.js` — pass.
- `npm test` — pass.
- `npm run lint` — pass.
- `npm run pilot:nonsecurity-checks` — pass.
- `git status --short` — used before and after implementation.

## Rollback notes

To roll back Phase 29 only, revert these files:

- `public/index.html`
- `public/workout-runtime.js`
- `server.js`
- `src/services/exerciseTemplateService.js`
- `test/phase29-coach-demo-exercise-template-builder.test.js`
- `reports/phase29-coach-demo-exercise-template-builder.md`

Do not revert prior Phase 24, 26, 27, or 28 code.

## Stop point

Stopped after Phase 29 foundation only.
