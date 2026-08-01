# Push-Up guided sequence production validation

**Validation date:** 2026-08-01  
**Decision:** CHANGES REQUIRED

This record deliberately separates automated evidence from physical-device evidence. The container has no camera, iPhone, Android handset, trainer, or browser performance profiler. Consequently, no hardware row is marked passed and this branch does not authorize migrating production counting from the legacy engine.

## Automated validation evidence

The Node test suite verifies the ordered `Top → Lowering → Bottom → Rising → Top Complete` contract, persistence, wrong-order and skipped-transition rejection, cached/display-only landmark rejection, safe recovery, normalization invariance, tracking dropout behavior, person locking, single-loop watchdog recovery, and detector reuse. A deterministic 100-repetition run additionally asserts exactly 100 completions, 300 position events, 200 transition events, ordered explanations, and no duplicate repetition index.

The guided preview now maps each of the five engine expectations explicitly. Its developer-only surface is enabled with `?poseDebug=1`; normal users neither see the telemetry panel nor receive new feedback claims. The panel reports the expected phase, average MoveNet inference duration, loop restarts, landmark confidence, sequence completion, recovery duration, average tracking confidence, phase/transition mismatch percentages, and legacy/sequence agreement.

## Real-device execution matrix

Run every row on a physical device and attach the exported observation sheet before release. “Pending” means **not tested**, not assumed pass.

| Check | Desktop Chrome | iPhone Safari | Android Chrome |
|---|---|---|---|
| Camera initialization | Pending | Pending | Pending |
| Front camera | Pending | Pending | Pending |
| Rear camera | Pending | Pending | Pending |
| Camera switching | Pending | Pending | Pending |
| Portrait | Pending | Pending | Pending |
| Landscape | Pending | Pending | Pending |
| Correct front/rear mirroring | Pending | Pending | Pending |
| Resize | Pending | Pending | Pending |
| Rotation during idle and session | Pending | Pending | Pending |
| 30-minute session | Pending | Pending | Pending |

Record device model, OS/browser version, camera selected, orientation, starting/ending memory, and screen recording reference. Confirm switching is blocked during an active session and that one video track and one inference loop remain afterward.

## Tracking protocol and observation sheet

For each scenario run: 30-second plank; 10 slow push-ups; 25 continuous; fast; very slow; pause halfway; leave/return; partial occlusion; poor and moderate lighting; and camera movement. Capture:

| Scenario | State transition timeline | Dropouts | Recoveries | False resets | False reps | Duplicate reps | Lost duration |
|---|---|---:|---:|---:|---:|---:|---:|
| Each device/orientation combination | Pending | — | — | — | — | — | — |

Expected tracking progression is `SEARCHING → STABILIZING → LOCKED`; loss is `LOCKED → DEGRADED → LOST`; recovery is `LOST/DEGRADED → RECOVERING → LOCKED`. During every non-`LOCKED` state, confirm both repetition engines and sequence progress pause. On return, confirm safe frames are re-established without a repetition.

## Legacy comparison and explainability

Keep legacy counting authoritative. For each observed emission, record `bothCounted`, `legacyOnly`, `sequenceOnly`, or `neitherCounted`, then reconcile totals against the debug telemetry. Review each sequence repetition's evidence array and phase/transition event timestamps. It must contain, in order, `top`, `lowering`, `bottom`, `rising`, `top_complete`; reject any session containing an unexplained completion.

The generated session summary must be reviewed alongside normalized frames, tracking loss, recovery count, confidence, version fingerprint, alignment findings, agreement counters, and repetition explanations. A qualified trainer must review the phase behavior and current `trainer_review_required` thresholds before approval.

## Performance and 100-repetition stress protocol

Use Chrome/Safari performance and memory tooling on physical devices. Record average/p95 inference time, render time, sequence evaluation time, effective FPS, dropped frames, watchdog restarts, detector creations, loop starts/restarts, and heap at 0/10/30 minutes. Then perform 100 consecutive push-ups while screen-recording and verify exactly one active inference loop, no freeze/restart, monotonically increasing unique repetition IDs, ordered phase evidence, and bounded memory after garbage collection.

Automated stress establishes deterministic state-machine behavior only; it cannot establish MoveNet accuracy, thermals, real-camera frame pacing, browser lifecycle behavior, or memory stability.

## Release gates

Release may change to **READY TO BECOME THE TEMPLATE FOR ALL EXERCISES** only when all device rows pass, all scenario sheets contain zero false/duplicate repetitions and false resets, 100 physical repetitions pass, performance has no unexplained regression or unbounded memory, legacy/sequence discrepancies are trainer-reviewed, and the trainer changes the proposal from `trainer_review_required`. Until then, production counting must remain on the legacy engine.
