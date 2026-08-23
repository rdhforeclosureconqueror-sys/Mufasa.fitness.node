# Kettlebell Qualified Rep Candidate + Tempo Guidance Review

## Summary
This phase adds a local-only qualified-rep candidate state machine between normalized checkpoint observations and the existing server-authoritative workout runtime. It qualifies no workout progress and persists no pose or candidate evidence.

## Scope
Ordered, confidence-gated advisory candidates, conservative single-observation skip handling, persistence debounce, bounded uncertainty, timeouts, duplicate prevention, tempo comparison, compact diagnostics, and rate-limited Guided Coach cues.

## Existing Rep Architecture Audit
`rep-runtime.js` owns legacy authoritative rep enqueueing and was deliberately not called. `rep-analysis-runtime.js` contains the Bodyweight Squat depth hysteresis (`0.55` down/`0.35` up), minimum rep interval, and form-engine handoff. `form-engine.js` supplies confidence-aware SQUAT, HINGE, and LUNGE geometry and phase vocabulary; Push-Up and the squat pilot use it, while the lunge mapping is present. `workout-form-runtime.js` already bounds sampling and discards landmark histories. `workout-progression-runtime.js` remains the sole canonical progression path. The new layer reuses the centralized kettlebell checkpoint definitions, evaluator declarations, confidence thresholds, persistence-frame metadata, pose events, canonical activity selector, and `WorkoutCoachRuntime`; it does not create another persistence/authoritative rep engine.

## Qualified Rep Candidate Architecture
`qualified-rep-runtime.js` is a small UMD module consuming only a server-projected exercise plus normalized observations. The canonical activity configures the machine; a camera event cannot provide or switch the selected exercise.

## Supported Exercises
Goblet Squat (`squat`), Kettlebell Deadlift (`controlled_hinge`), and Reverse Lunge (`lunge`) are enabled because their registry definitions explicitly name evaluators backed by current form-engine geometry.

## Unsupported Exercises
Bent-Over Row, Suitcase Carry, Halo, Floor Press, Two-Hand Swing, Overhead Press, Farmer Carry, Clean, Push Press, High Pull, Front-Rack Carry, Clean to Press, and Snatch remain non-qualifying. Unknown exercises are also unsupported. This is intentionally narrower than checkpoint coverage.

## Rep State Machine
States include `awaiting_start`, `progressing`, `uncertain_hold`, `camera_unavailable`, `qualified`, `rejected`, and `unsupported_exercise`. Only a stable observed checkpoint can advance it.

## Qualification Rules
A candidate needs the canonical definition's first checkpoint, ordered transitions to its terminal checkpoint, observation status `observed`, checkpoint persistence, no more than one legal skip, and a weakest-checkpoint confidence at or above the definition threshold.

## Valid Cycle Rules
Cycles come directly from the centralized registry. No checkpoint arrays are duplicated in runtime code. A first-to-terminal jump is invalid.

## Missed Observation Handling
Only a jump over exactly one intermediate registry checkpoint is accepted, only once per candidate, using the registry's `skipped_observation` transition. Further or larger jumps reject safely.

## Debounce / Hysteresis
Advancement requires each definition's `confidence.persistenceFrames` consecutive observations (currently two for supported exercises). Repeated stable frames at the same checkpoint are ignored. This reuses checkpoint metadata rather than adding a global frame constant; the legacy squat engine's geometric hysteresis remains upstream.

## Uncertainty Handling
`uncertain`, `insufficient_keypoints`, and `unsupported_orientation` hold progress briefly and never advance it. The default bounded hold is 1.5 seconds; expiration rejects/reset the partial candidate.

## Timeout / Reset
The default candidate stall ceiling is 12 seconds. Invalid order, excessive skipping, prolonged uncertainty/camera loss, exercise change, page hiding, and explicit reset clear ephemeral history and expose a human-readable reason. Canonical progress is untouched.

## Duplicate Prevention
After terminal qualification the terminal is latched. Holding it cannot create another candidate. A stable first checkpoint and a new complete cycle are required.

## Confidence Model
Upstream observations enforce required keypoints, per-keypoint thresholds, and aggregate checkpoint confidence. Candidate confidence is the minimum accepted checkpoint confidence, deliberately not a simple average that could hide one weak phase.

## Candidate Output Contract
Schema v1 includes exercise/family/candidate identity, advisory state/status, start/completion times, compact checkpoint/timestamp/confidence records, skipped count, candidate/checkpoint confidence, tempo target/metrics/status, side/orientation, rejection reason, local count, and `advisory: true`. It contains no frame, video, pose packet, or landmark history.

## Tempo Contract
The program uses numeric four-part values (for example `3–1–1–1`), numeric three-part values, `controlled`, `controlled carry`, `controlled assessment`, and named ballistic sequences. This phase interprets only numeric four-part values. Other nonempty formats return `insufficient_tempo_data`; absent tempo is `not_applicable`. Prescription objects are never mutated.

## Phase Timing
Elapsed time from stable first to stable terminal checkpoint is a coarse observed-rep duration. Expected duration is the sum of four numeric target phases. Individual phase claims are not made because current checkpoint sampling does not warrant that precision.

## Tempo Guidance
Observed/expected ratios from 0.8 through 1.2 are `on_tempo`; below is `faster_than_target`, above is `slower_than_target`. Missing/unparseable data yields `insufficient_timing_data` or `not_applicable`. Tempo is never a qualification rejection criterion.

## Guided Coach Integration
The existing `WorkoutCoachRuntime` gains `advisoryCue`. It requires both Workout Voice and Guided Coach, uses the existing speech queue, and rate-limits advisory cues to one per five seconds. Candidate completion can cue “Slow it down.”, “Drive up.”, or “Good tempo.” No additional speech engine exists.

## Sustained Movement Handling
Carries remain `sustained` and always return non-qualifying support status. No candidate count increments.

## Composite Movement Handling
Clean to Press remains the registry's composite clean/press structure and is unsupported; it is never flattened into a generic cycle.

## Unilateral Handling
Observed `left`, `right`, `alternating`, or `unknown` side is advisory metadata only and cannot satisfy per-side prescription.

## Pocket PT Integration
The hub instantiates one ephemeral machine from the current canonical activity, consumes existing pose events, and expands the subordinate `formRuleStatus` panel. Candidate count is explicitly labeled advisory and does not replace workout rep controls.

## Advisory vs Authoritative Boundary
There is no call to `RepRuntime`, `persistRepUpdate`, workout completion, commitment completion, XP, streak, score, or comeback logic. No new endpoint was introduced.

## Camera Disconnect / Reconnect
Camera-unavailable observations pause briefly then reject a stale partial candidate. Reconnect can begin a fresh cycle. Existing manual and canonical runtime remain available.

## Refresh / Resume
Candidate history intentionally resets on page hide, refresh, and reconstruction. Owner-scoped canonical runtime resume remains unchanged.

## Privacy
Processing stays browser-local. No raw video, frame, full pose history, checkpoint history, or candidate evidence is uploaded or persisted.

## Security / Ownership
No route or storage surface was added. Existing owner/session-scoped runtime read/progress routes remain authoritative and candidate data cannot mutate them.

## Files Changed
`public/qualified-rep-runtime.js`, `public/kettlebell-workout-runtime.js`, `public/workout-coach-runtime.js`, `public/workout.html`, candidate/integration/coach tests, and this review.

## Tests Added
State-machine coverage includes valid cycles for all three supported exercises, incomplete/invalid cycles, one skip/excessive skip, persistence, uncertainty/keypoint/orientation/camera handling, timeout, confidence, duplicate/new-cycle behavior, unsupported families, tempo parsing/status, immutability, and payload privacy. Coach coverage tests preferences and rate limiting.

## Tests Run
Focused qualified-rep/checkpoint/hub/form suites, lint, route authorization validation, full `npm test`, diff whitespace validation, and binary-diff inspection. Exact final totals are recorded in the delivery response after the final run.

## Route Verification
`npm run security:validate-routes` validates the unchanged authorization inventory. No candidate endpoint exists.

## Authenticated Verification
Existing owner-scoped session and cross-user denial tests run in the full suite. This phase adds no authentication boundary.

## Mobile Verification
The diagnostic output is plain wrapping text inside the existing subordinate panel, with no fixed overlay or width. Existing 320/375/390/430 mobile contracts remain applicable.

## Rendered Browser Status
Rendered browser executed: NO

## Binary Status
No binary files were added or modified.

## Known Limitations
Only three geometry-backed families qualify. Timing is whole-cycle/coarse. Unparseable tempo formats remain advisory-insufficient. Ephemeral candidates reset on navigation/reconnect. Human iPhone validation of actual camera phase classification remains required.

## Regression Risks
The primary risk is checkpoint phase flicker or upstream form-engine ambiguity in real camera conditions. Persistence, strict ordering, confidence gating, timeout, and unsupported fallbacks limit false positives. Nothing can alter authoritative progress.

## Merge Readiness
Ready for human camera validation after all automated regression/security checks pass. Do not treat camera candidates as canonical reps.

## Recommended Next Phase
**Secure Qualified-Rep Evidence Bridge + Canonical Set Progress** should decide whether and under what server validation rules local advisory evidence may influence owner-scoped canonical set progress.
