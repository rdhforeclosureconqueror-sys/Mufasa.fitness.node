# Phase 28 — New Exercise Capability Audit and Pilot Decision

Date: 2026-06-04  
Branch: `work`

## Scope and guardrails

This phase audited the current `New Exercise` / workout selection / exercise-library path and made only a pilot-safe fix. It does **not** implement teach-by-demo custom exercise learning, backend auth changes, payment changes, avatar/3D re-enablement, broad refactors, or legacy/shadow root-file edits.

## Pre-edit repository state

- `git status --short`: clean.
- No `AGENTS.md` files were found under `/workspace`.

## Inventory of exercise/workout creation and selection UI

| Search term / action | Owning file | Selector / id | Visible label | Handler attached? | Backend API called? | Storage used? | Expected behavior | Actual behavior before Phase 28 | Current status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| New Exercise | `public/index.html` | `#defineExerciseBtn` | `New Exercise` before fix; `Request New Exercise` after fix | Yes. `RuntimeOrchestrator.configureButtonRuntime(...)` assigns `handlers.startDefineExercise` to `defineExerciseBtn.onclick`. | No | No active storage in the inline handler | Let user begin creating/adding a custom exercise, or clearly explain pilot limitation. | It was wired, but the visible label implied creation while the active inline handler only returned a pilot-unavailable message. | PARTIAL before fix; PASS after pilot-safe relabel/message |
| Add Workout | Active allowed public files | None found | None found | No active button found | No | No | N/A | No active public UI reference found. | PASS / not present |
| Custom Workout | Active allowed public files | None found as active button | None found as active button | No active button found | No | No | N/A | No active public button; related copy existed in the `New Exercise` fallback message. | PASS / not present |
| Change Exercise | Active allowed public files | None found | None found | No active button found | No | No | N/A | No active public UI reference found. | PASS / not present |
| Exercise Library | `public/index.html` and `public/exercise-library.html` | `#exerciseLibraryBtn`; library page header/title | `🖼️ Exercise Library`; `Exercise Library` | Yes. Main runtime checks and app runtime wire/enable this as a feature button; the library page owns per-exercise selection. | The page primarily fetches static `exercise-db/index.json` asset candidates; server also exposes read-only exercise DB routes. | Selection uses `ACTIVE_WORKOUT_SELECTION_V1` after choosing an exercise. | Open a library of exercises. | Wired and visible. | PASS |
| Use for workout | `public/exercise-library.js` | dynamic `.select-workout-btn` | `Use for workout` | Yes. `addEventListener("click", () => selectExerciseForWorkout(ex))`. | No write API call | Writes canonical workout selection to `localStorage` key `ACTIVE_WORKOUT_SELECTION_V1`; sets `window.__ACTIVE_WORKOUT_SELECTION`; dispatches `workout:selected`; redirects to `/index.html#today-workout`. | Select a static library exercise for a workout. | Works as local selection, but arbitrary library exercises previously risked squat fallback form scoring. | PARTIAL before fix; safer after unknown-exercise scoring fix |

## Click-handler details

- `Request New Exercise` / former `New Exercise`:
  - DOM element: `public/index.html`, `#defineExerciseBtn`.
  - Handler binding: `public/runtime-orchestrator.js` sets `refs.defineExerciseBtn.onclick = handlers.startDefineExercise`.
  - Active handler: inline `startDefineExercise()` in `public/index.html`.
  - Before Phase 28, the handler did not save or call a backend. It showed a pilot-unavailable message.
  - Phase 28 retained the no-save/no-backend behavior, changed the visible label to `Request New Exercise`, and clarified the message: “Custom exercise creation is coming soon. For this pilot, use Squat, Push-Up, Lunge, or Push-Up Challenge.”

- `Exercise Library`:
  - DOM element: `public/index.html`, `#exerciseLibraryBtn`.
  - Runtime status checks inspect `typeof exerciseLibraryBtn?.onclick === "function"`.
  - The app runtime enables this button for authenticated users.

- `Use for workout`:
  - Dynamic button in `public/exercise-library.js`.
  - Click handler calls `selectExerciseForWorkout(ex)`.
  - It builds a canonical workout selection, stores it locally, dispatches `workout:selected`, and redirects to the workout start page.

## Backend/API route audit

Current exercise-related backend routes are read-only:

- `GET /api/exercises/index`
- `GET /api/exercises/search`
- `GET /api/exercises/:slug`

No route currently exists for:

- `POST /api/exercises`
- `POST /api/exercise-requests`
- custom exercise creation/update
- pending exercise request storage

Phase 28 did **not** add backend routes because the safest pilot behavior can be handled with clear UI copy and no new data ownership/auth surface.

## Storage audit

Current storage paths found:

- `ACTIVE_WORKOUT_SELECTION_V1`
  - Used by `public/index.html`, `public/exercise-library.js`, and `public/workout-progression-runtime.js` to persist the active workout/exercise selection in browser localStorage.
- `DEFINED_EXERCISES_V1`
  - Present in `public/assessment-runtime.js` legacy/auxiliary custom-definition flow.
  - This flow can prompt for a custom exercise, collect squat-derived baseline samples, and store averages locally.
  - It is **not** the active inline `#defineExerciseBtn` path after current wiring, and it is not a safe teach-by-demo implementation.

No backend/file-backed storage exists for pending custom exercise requests.

## Exercise database integration audit

### How exercises are loaded

- Exercise Library loads a static index from `exercise-db/index.json`, using asset-host candidates from runtime backend origin, configured node base URL, current origin, and relative origin.
- Server can also serve the static exercise DB via read-only `/api/exercises/*` routes.
- Exercise cards are rendered only for library items with images.

### Can new exercises be added to the static exercise DB?

- Not from the active app UI.
- Adding to the static DB is a build/content operation, not a user-created runtime operation.
- No public client call or backend write route appends to `public/exercise-db/index.json`.

### Can the active app store user-created exercises?

- Not in the active `Request New Exercise` path.
- The auxiliary `assessment-runtime.js` has localStorage-only `DEFINED_EXERCISES_V1`, but it is not currently the active button path and is not sufficient for production/pilot custom exercise learning.

### Does exercise selection map to movement pattern rules?

- Static pilot workouts map directly by known IDs/names:
  - `bodyweight_squat` / Bodyweight Squat -> squat
  - `push_up` / Push-Up -> pushup
  - `lunge` / Lunge -> lunge
- Exercise Library selections do not add a reliable `movementPattern` field by default. They carry exercise identity/name/category/equipment/muscle metadata.

### Can custom exercises map to squat/pushup/lunge/other pattern?

- Only if the selected exercise object already has one of the known values in `movementPattern`, `pattern`, `exerciseId`, `id`, `name`, or `exerciseName`.
- Before Phase 28, unknown exercises silently fell back to squat analysis in `analyzeMovement`.
- After Phase 28, unknown exercises return `movementPattern: "unknown"`, `depthStatus: "tracking unavailable"`, and do not count reps.

## Form-rule integration audit

### Bodyweight Squat

- Phase 24 pilot form-rule engine maps `bodyweight squat`, `bodyweight_squat`, `bodyweight-squat`, and `squat` to `squat`.
- Squat analysis checks lower-body/torso keypoints and depth.

### Push-Up

- Maps `push-up`, `push up`, `push_up`, and `pushup` to `pushup`.
- Push-up analysis uses shoulder/elbow/wrist/hip points for top/bottom and form checks.

### Lunge

- Maps `lunge` to `lunge`.
- Lunge analysis uses hip/knee/ankle points for standing/split-stance and bottom position.

### Unknown exercise

- Before Phase 28: `analyzeMovement` used `mapExerciseToMovementPattern(exercise) || 'squat'`, so unknown exercise/library selections could silently be analyzed as squats.
- After Phase 28: unknown movement returns unsupported/tracking-unavailable analysis with no rep detection.

### Tracking unavailable vs silent mis-score

- Before Phase 28: unknown exercises could silently mis-score as squat.
- After Phase 28: unknown exercises explicitly report tracking unavailable and do not count reps.

## Pilot-safe decision

Recommended pilot behavior: **B) Rename it to Request New Exercise**, with the current no-backend pilot message.

Reasoning:

- It avoids a dead button.
- It avoids implying arbitrary custom exercise creation is already supported.
- It avoids introducing backend route/auth/storage risk in this phase.
- It gives trainers a clear pilot expectation while preserving room for a future request workflow.

Option D, a pending request form, is reasonable later, but not necessary for Phase 28 because no backend request lifecycle, admin review flow, or trainer-only request list is currently required and adding it would expand scope.

## Minimal fix made in Phase 28

1. Renamed the active button from `New Exercise` to `Request New Exercise`.
2. Kept the handler wired, but clarified the unavailable-pilot message.
3. Changed unknown exercise movement analysis so unknown/library/custom selections no longer silently fall back to squat scoring.
4. Added focused regression tests for:
   - Request New Exercise is visible and not disabled.
   - Request New Exercise has clear pilot-unavailable copy.
   - Unknown exercises do not fall back to squat scoring.
   - Squat/Push-Up/Lunge mappings remain intact.
   - Exercise Library “Use for workout” still persists canonical selection.

## Deferred v2 teach-by-demo note

Teach-by-demo custom exercise programming should be a future feature requiring:

- recording demonstration reps
- labeling start/top/bottom phases
- choosing keypoints
- saving thresholds
- testing against false positives
- admin review before activation

It should not be implemented as the current localStorage baseline sample path, and it should not activate live form judging without review and validation.

## Commands run for audit and validation

- `git status --short`
- `rg -n "New Exercise|Add Workout|Custom Workout|Change Exercise|Exercise Library|Use for workout|exercise-requests|custom exercise|Custom exercise|new exercise|add workout|change exercise|use for workout" public server.js src test reports package.json`
- `rg -n "defineExerciseBtn|exerciseLibraryBtn|workoutSelectEl|workoutPlanViewEl|currentWorkout|currentExercise|getCurrentExercise|movementPattern|map.*Exercise|exerciseId" public/index.html public/workout-runtime.js public/rep-analysis-runtime.js public/exercise-library.js public/runtime-state.js public/app-runtime.js`
- `rg -n "function startDefineExercise|startDefineExercise|startOhsa|defineExercise" public/index.html public/app-runtime.js public/workout-runtime.js test`
- `rg -n "Add Workout|Custom Workout|Change Exercise|New Exercise|Exercise Library|Use for workout|exercise-requests|DEFINED_EXERCISES|ACTIVE_WORKOUT_SELECTION_V1|/api/exercises|mapExerciseToMovementPattern|analyzeMovement|startDefineExercise|defineExerciseBtn|exerciseLibraryBtn" public/index.html public/workout-runtime.js public/rep-analysis-runtime.js public/exercise-library.js public/runtime-state.js public/app-runtime.js public/status-panels.js public/assessment-runtime.js server.js src/services test`
- `node --test test/phase28-new-exercise-capability-audit.test.js`

Required project checks to run before commit:

- `npm test`
- `npm run lint`
- `npm run pilot:nonsecurity-checks`

## Rollback notes

To roll back the Phase 28 pilot-safe fix:

1. Revert `public/index.html` button copy from `Request New Exercise` to `New Exercise` and restore the old fallback copy if desired.
2. Revert `public/workout-runtime.js` unknown-exercise handling to the previous squat fallback only if explicitly accepting silent squat scoring risk.
3. Remove `test/phase28-new-exercise-capability-audit.test.js`.
4. Remove or supersede this report.
