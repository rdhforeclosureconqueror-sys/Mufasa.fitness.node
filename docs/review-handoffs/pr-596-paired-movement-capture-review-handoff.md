# INDEPENDENT REVIEW HANDOFF — PAIRED MOVEMENT CAPTURE FOLLOW-UP

## ROLE
You are an independent technical reviewer. Do not assume the implementing bot is correct. Do not merge anything.

Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`
Base: current `main`
Head: `movement-lego-recorder-v1`
This follow-up begins after merged PR #595 and contains only the additional paired-view/custom-movement/pose-checkpoint/debugging work added after that merge.

## GOAL
Upgrade the trainer Movement Lego Recorder so foundational and custom movements can be collected as paired FRONT + SIDE MoveNet evidence, annotated with timestamped 2D skeleton pose checkpoints, and diagnosed through a first-failure debug trace.

## REQUIRED BEHAVIOR
- Every Foundation roadmap task requires `front` and `side`.
- The UI shows Front □ / Side □ independently.
- Loading a task selects the first missing view.
- Saving FRONT prompts the trainer to rotate and capture SIDE.
- Paired completion requires both views.
- Trainer can create local custom movement definitions such as One-Arm Push-Up Left/Right.
- Custom movements default to FRONT + SIDE and remain evidence only; they must not become active public scoring automatically.
- Saved evidence is annotated with capture view, movement identity, and suggested pose checkpoints.
- Pose checkpoints include frame index, timestampMs, and a generated SVG skeleton from normalized MoveNet landmarks.
- Milestone heuristics are suggestions only, not validated form truth.
- No raw video is stored.
- No second camera, MoveNet detector, or pose loop may be created.
- A Movement Capture Debug panel must identify the earliest expected failed boundary instead of forcing reviewers to infer failures from downstream symptoms.

## FIRST-FAILURE DEBUG CONTRACT
Inspect `public/motion/movement-capture-debug.js` and `docs/movement-capture-debug-v1.md`.

Expected diagnostic order:
1. trainer host
2. recorder module
3. recorder UI
4. roadmap module
5. roadmap UI
6. capture studio module
7. capture studio UI
8. canonical PoseRuntime
9. canonical pose frame after Record is attempted
10. recording started/completed
11. frames captured
12. local evidence saved
13. FRONT/SIDE captureView tagged
14. pose checkpoints generated

Verify:
- idle capture/save stages show waiting rather than false failures;
- after Record, a missing pose frame becomes the first relevant failure;
- after Save, a missing `captureView` is surfaced before missing checkpoints;
- the debug panel exposes a copyable JSON snapshot;
- `window.__movementCaptureDebugSnapshot` and `window.__runMovementCaptureDebug()` are available;
- the movement diagnostic snapshot is added to the existing `__collectDiagnosticReport()` when the canonical diagnostics client is present;
- script-load failures use the existing `__diagnosticAutoReport` hook when available;
- diagnostics contain no raw camera image/video payload;
- the diagnostic runtime does not create camera/detector/inference ownership.

## FILES TO INSPECT
- `public/motion/movement-capture-studio.js`
- `public/motion/movement-recording-roadmap.js`
- `public/motion/registry/movement-recording-roadmap.v1.json`
- `public/motion/movement-capture-debug.js`
- `public/boot-core.js`
- `test/movement-capture-studio-v1.test.js`
- `test/movement-recording-roadmap-v2.test.js`
- `test/movement-capture-debug-v1.test.js`
- `docs/movement-capture-studio-v1.md`
- `docs/movement-capture-debug-v1.md`

Also compare against the merged PR #595 implementation on `main` to ensure the follow-up does not duplicate or regress it.

## HIGH-RISK ITEMS
1. Verify the UMD/module wrappers execute correctly in browser and Node contexts.
2. Verify the boot chain is deterministic: recorder -> roadmap -> capture studio -> capture debug.
3. Verify saved local evidence is annotated with the intended newest recording, not an unrelated older recording.
4. Verify paired coverage reads `meta.captureView` and does not count legacy untagged recordings as front or side.
5. Verify front and side captures of the same primitive remain distinct evidence records.
6. Verify custom movement IDs cannot overwrite canonical registry IDs.
7. Verify SVG labels/markup are escaped and no raw user HTML is injected.
8. Verify generated skeleton checkpoints are SVGs derived from landmarks only, not raw camera images.
9. Verify no new `getUserMedia`, detector creation, or inference loop exists.
10. Verify existing Coach Demo Exercise Template Builder, camera, avatar, and workout code are not removed or bypassed.
11. Verify the debug panel reports the earliest failed stage and does not mark unattempted capture/save work as failed.
12. Verify diagnostic collector wrapping does not break the existing diagnostics report shape.

## TESTS
If the environment permits, run:
- `node --test test/movement-lego-recorder-v1.test.js`
- `node --test test/movement-recording-roadmap-v1.test.js`
- `node --test test/movement-recording-roadmap-v2.test.js`
- `node --test test/movement-capture-studio-v1.test.js`
- `node --test test/movement-capture-debug-v1.test.js`

Then run relevant existing pose/workout/diagnostics tests if practical. Do not claim a test passed unless actually executed.

## LIVE ACCEPTANCE
1. Open trainer/admin Coach Demo Exercise Template Builder.
2. Confirm Recorder + Roadmap + Paired View Studio + Movement Capture Debug appear.
3. Run Motion Debug Check before recording. Boot/UI stages should pass; capture/save stages should be waiting.
4. Load Slow Bodyweight Squat.
5. Confirm FRONT is requested first when no evidence exists.
6. Record/save front and verify Front ✓ / Side □ plus explicit SIDE prompt.
7. Re-run debug and confirm no earlier false failure exists; post-save captureView/checkpoint stages should pass.
8. Record/save side and verify Front ✓ / Side ✓ / paired complete.
9. Verify skeleton checkpoint cards render with timestamp and frame index.
10. Create `One-Arm Push-Up Left` custom movement.
11. Verify it enters the recorder and requires front then side.
12. Export JSON and verify no raw video/image payload is included. Generated skeleton SVG strings are acceptable.
13. Use Copy Debug Snapshot and inspect firstFailure/checks/poseFrameCount/evidence fields.
14. Confirm the ordinary global diagnostics report contains a `movementCapture` section if the canonical diagnostics client is active.
15. Verify existing template demo capture and normal camera/avatar/workout behavior still work.

## RESPONSE FORMAT
Return:
- Current main SHA
- Head SHA
- Files changed vs main
- Tests actually executed and exact results
- Findings ordered by severity
- Live checks performed / not performed
- Debug panel verdict, including first-failure behavior
- Architecture verdict
- Final recommendation: GO / GO WITH CONDITIONS / NO-GO

Do not merge.
