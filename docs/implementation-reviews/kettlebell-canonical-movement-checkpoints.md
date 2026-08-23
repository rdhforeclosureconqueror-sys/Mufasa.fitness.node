# Kettlebell Canonical Movement Checkpoints

## Summary
The existing Pocket PT pose stream now feeds a centralized, advisory checkpoint contract selected exclusively from the active server-projected canonical exercise. It does not qualify reps or mutate workout progress.

## Scope
This phase defines exercise stages, families, transitions, observation availability, confidence, orientation, side, sustained movement, and composite metadata. Rep qualification, tempo judgment, final form scoring, camera tutorials, and persistence are excluded.

## Existing Pose Architecture Audit
`pose-runtime.js` owns MoveNet initialization, local frame inference, normalized pose packets, visibility names, and the `pose-runtime:frame` event. `form-engine.js` owns MoveNet geometry, body visibility, family classification, phases, and the Bodyweight Squat/push-up/lunge/hinge pilot evaluation. `rep-runtime.js` owns existing rep state and write queuing; this phase does not call it. `rep-analysis-runtime.js` and `workout-form-runtime.js` perform analysis/form feedback, with the latter sampling the same pose event and explicitly reporting unavailable/unsupported/insufficient states. `workout-progression-runtime.js` and the session API retain progress authority. The existing workout camera controller and Connect/Stop controls remain the sole camera lifecycle. The existing status panel exposes tracking mode, stage mode, movement pattern/phase/depth, keypoint confidence, quality, and reps. This phase reuses that subordinate status panel.

## Checkpoint Architecture
`public/kettlebell-checkpoints.js` is a UMD-style data/contract module. Definitions contain schema version, canonical ID, family, cycle type, checkpoint metadata, valid edges, required keypoints, per-definition confidence, orientation, side-awareness, and evaluator capability. The hub adapter resolves only its active canonical activity.

## Canonical Exercise Inventory
The inventory contains exactly the 16 challenge exercises declared by the canonical program.

## Movement Families
`controlled_hinge`, `squat`, `horizontal_pull`, `carry`, `around_body`, `lunge`, `horizontal_press`, `ballistic_hinge`, `vertical_press`, `clean`, `high_pull`, `composite_clean_press`, and `snatch`.

## Exercise-to-Family Mapping
- Kettlebell Deadlift → `controlled_hinge`
- Goblet Squat → `squat`
- Bent-Over Row → `horizontal_pull`
- Suitcase Carry → `carry`
- Kettlebell Halo → `around_body`
- Reverse Lunge → `lunge`
- Kettlebell Floor Press → `horizontal_press`
- Two-Hand Kettlebell Swing → `ballistic_hinge`
- Overhead Press and Push Press → `vertical_press`
- Farmer Carry and Front-Rack Carry → `carry`
- Kettlebell Clean → `clean`
- High Pull → `high_pull`
- Clean to Press → `composite_clean_press`
- Kettlebell Snatch → `snatch`

## Exercise Checkpoint Definitions
- Deadlift: setup → hinge → bottom → extend → lockout
- Goblet Squat: setup → descent → bottom → ascent → stand
- Bent-Over Row: setup → hinge_hold → pull → contraction → lower
- Suitcase/Farmer Carry: setup → lift → carry → resist → finish
- Halo: setup → side_pass → behind_head → opposite_side_pass → return
- Reverse Lunge: stand → step → bottom → drive → stand_complete
- Floor Press: setup → bottom → press → lockout → return
- Swing: setup → load → explode → float → reset
- Overhead Press: rack → press → overhead → lower → rack_complete
- Clean: rack_or_setup → load → drive → catch → rack
- Push Press: rack → dip → drive → overhead → lower → rack_complete
- High Pull: load → drive → pull → peak → reset
- Front-Rack Carry: setup → rack → carry → resist → finish
- Clean to Press: load → clean → rack → press → overhead → return
- Snatch: load → drive → pull_through → overhead_catch → reset

## Transition Model
Declared sequential edges are physically valid; terminal-to-initial edges are resets. One omitted intermediate checkpoint is `skipped_observation`; larger/out-of-order jumps are `invalid`; absent or non-observed input is `uncertain`. These classifications are evidence only and never complete a rep.

## Observation Contract
Observations contain `schemaVersion`, `exerciseId`, `movementFamily`, nullable `checkpointId`, optional `submovement`/`stage`, numeric `confidence`, `timestamp`, `visibleKeypoints`, `trackingMode`, `side`, `orientation`, `status`, `transitionStatus`, and invariant `advisory: true`. Status is one of observed, uncertain, insufficient_keypoints, unsupported_orientation, camera_unavailable, or unsupported_exercise.

## Confidence Model
Each definition declares minimum keypoint confidence, minimum aggregate checkpoint confidence, and persistence frames. Required landmark visibility and aggregate confidence are checked before evaluation. Persistence is contract metadata for a future debouncer; it does not count reps.

## Orientation Handling
Definitions separately declare preferred and supported views. Unknown orientation remains evaluable rather than inventing a view; an explicitly known unsupported view reports `unsupported_orientation`. No reposition workflow is added.

## Unilateral Handling
Side-aware definitions support left, right, alternating, or unknown. Unknown is the safe default; workout prescription remains responsible for per-side work.

## Sustained Movement Handling
All three carries use `cycleType: sustained`; carry/resist may persist and are not rep cycles.

## Composite Movement Handling
Clean to Press uses `cycleType: composite`, with every checkpoint carrying both `submovement` and `stage`, allowing later nested qualification without a schema change.

## Pocket PT Integration
After owner-scoped runtime load/resume, `runtime.canonicalWorkout.activities[currentIndex].exerciseId` selects the definition. Pose frames cannot select an exercise. The existing status panel shows canonical exercise, family/type, expected/observed checkpoint, confidence, view support, side, status, and transition.

## Advisory Boundary
No call is made to RepRuntime, completion, XP, challenge progress, or progression. Unsupported camera/pose state only changes ephemeral review text.

## Privacy / Camera Data
MoveNet continues to run in the browser. This phase stores no frames, video, or frame history and adds no upload/API.

## Security / Ownership
No checkpoint endpoint exists. Existing authenticated owner-scoped runtime projection supplies identity and prescription. Query values cannot select a checkpoint definition, forge progress, or submit reps.

## Files Changed
`public/kettlebell-checkpoints.js`, `public/kettlebell-workout-runtime.js`, `public/workout.html`, `test/kettlebell-checkpoints.test.js`, `test/kettlebell-workout-hub-integration.test.js`, and this review.

## Tests Added
Definition integrity, unique IDs, transition references, sustained/composite structure, all transition outcomes, unavailable/unsupported/insufficient states, orientation, side, and authoritative active-exercise integration.

## Tests Run
Focused tests, lint, security/ownership route tests, full Node test suite, route diagnostics, and binary diff verification are recorded at delivery.

## Route Verification
`/workout.html` remains the execution route. No new route or API was introduced.

## Authenticated Verification
Existing owner/attacker challenge and session route tests verify owned resume and cross-user denial; no production data was mutated.

## Mobile Verification
The review is plain preformatted text with wrapping inside the existing responsive panel; no new width, overlay, or primary control exists. Static/CI coverage checks 320, 375, 390, and 430 px. Real-device review remains recommended.

## Rendered Browser Status
Rendered browser executed: NO. No screenshot or binary output was created.

## Binary Status
No binary added, removed, or modified.

## Known Limitations
MoveNet cannot observe a kettlebell itself. Only squat, controlled hinge, and lunge reuse current approved family-phase capability; other definitions honestly report `unsupported_exercise` after landmark availability checks. View and side are representable but not inferred. Persistence/debounce is declarative only.

## Regression Risks
The legacy inline form panel can also be updated by pilot code. Checkpoint review is scoped to challenge sessions, and the authoritative runtime is untouched if its ephemeral listener resets.

## Merge Readiness
Ready when focused/full tests, lint, security checks, and binary verification pass. Human camera review is still required before enabling qualification.

## Recommended Next Phase
**Qualified Rep State Machine + Tempo-Aware Guidance**, after human checkpoint reliability review. It should consume this advisory sequence without weakening canonical workout authority.
