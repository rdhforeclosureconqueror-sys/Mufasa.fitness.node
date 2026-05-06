# Phase 2 Workout Runtime + Session Lifecycle Map — 2026-05-06

## A. Canonical workout lifecycle map

Phase 2 establishes `public/workout-runtime.js` as the canonical lifecycle owner. The current intended runtime sequence is:

1. **Auth ready / app active**
   - Auth remains owned by `public/auth-core.js` and status rendering remains in `public/status-panels.js`.
   - Workout lifecycle does not start until the post-login buttons are enabled and the user clicks Connect Camera.
2. **Camera Ready**
   - Canonical owner: `WorkoutRuntime.connectCamera()`.
   - Inline script still supplies camera side effects through `afterConnectCamera` because canvas/avatar DOM sizing and detector boot are still inline-adjacent.
   - Runtime instrumentation: `[WORKOUT_LIFECYCLE] connectCamera enter`, `[WORKOUT_LIFECYCLE] camera ready`.
3. **Detector Ready**
   - New extraction owner: `public/pose-runtime.js` via `PoseRuntime.initMoveNetDetector()`.
   - Inline `initDetector()` is now a bridge that delegates detector creation to `PoseRuntime` and stores the returned detector in the existing `detector` variable to preserve behavior.
   - Runtime instrumentation: `[POSE_RUNTIME] detector init requested`, `[POSE_RUNTIME] MoveNet detector ready`.
4. **Session Start**
   - Canonical owner: `WorkoutRuntime.startWorkout()`.
   - Explicit write owner remains `public/session-write.js` through `window.SessionWrite.startSession()`.
   - Inline `createSession` dependency calls `SessionWrite.startSession`; the previous extra `sendStartSessionToNode()` call is no longer invoked in the normal start path to avoid duplicate session starts.
   - Runtime instrumentation: `[WORKOUT_LIFECYCLE] creating session`, `[WORKOUT_LIFECYCLE] session created`, `[WORKOUT_LIFECYCLE] session started`.
5. **Pose Loop**
   - New extraction owner: `public/pose-runtime.js` via `PoseRuntime.startPoseLoop()`.
   - Inline `runPoseLoop()` is now a load-bearing bridge that starts the extracted pose loop and updates `latestPose`, `latestPosePacket`, and `window.__lastPoseFrame`.
   - Runtime errors are shown in `#poseStatus`, `#brainStatus`, and `#featureActivationStatus` instead of being silent.
6. **Rep Counting / Rep Persistence**
   - Existing count state remains inline for this step: `repCount`, `totalReps`, `repPhase`, and `ACTIVE_WORKOUT_STATE.repCount`.
   - New extraction owner for persistence: `public/rep-runtime.js` via `RepRuntime.persistRepUpdate()`.
   - Inline `sendRepToNode()` now delegates to `RepRuntime`, which delegates to `SessionWrite.enqueueRepUpdate()` and preserves the explicit `/api/sessions/:id/reps` behavior.
   - Runtime instrumentation: `[REP_RUNTIME] reset`, `[REP_RUNTIME] rep update enqueued`.
7. **Coaching Loop**
   - Still inline and load-bearing: `speak()`, cue cooldown variables, `advanceWorkoutProgress()`, rest prompts, completion prompt.
   - Next extraction target after Phase 2 lifecycle is stable.
8. **HUD Updates**
   - Still inline and load-bearing: `renderWorkoutHud()`, `updateActiveWorkoutState()`, rest timer rendering.
   - Added `[HUD_RUNTIME] render` instrumentation and `window.__HUD_RUNTIME_STATE` without changing HUD ownership yet.
9. **Dashboard / Retention Updates**
   - Completion still dispatches `workout:completed` inline.
   - `public/retention-flow.js` listens for `workout:completed` and writes `/api/workouts/track`, then reads `/api/workouts/reward/latest`.
   - Dashboard still reads `/api/me/history` through `public/backend-read.js` and is not fully unified with retention progress yet.
10. **Session Complete**
    - Explicit write owner remains `SessionWrite.completeSession()` called by inline `sendEndSessionToNode()`.
    - `WorkoutRuntime` owns the stop/toggle path; inline completion still owns full workout-complete dispatch and session completion call.

## B. Duplicate / conflicting ownership map

| Area | Canonical or target owner | Remaining duplicate/conflicting owner | Current conflict |
|---|---|---|---|
| Workout lifecycle | `public/workout-runtime.js` | Giant inline script callbacks | Runtime is canonical, but inline callbacks still perform state mutation, voice, pose loop, HUD, and completion side effects. |
| Session start | `WorkoutRuntime.startWorkout()` + `SessionWrite.startSession()` | Inline `sendStartSessionToNode()` | Duplicate session-start helper still exists but is no longer invoked in normal start path. Remove after confirming no legacy caller. |
| Session complete | `SessionWrite.completeSession()` | Inline `sendEndSessionToNode()` and `completeWorkoutSession()` | Complete write is explicit, but orchestration/dispatch still inline. |
| Rep persistence | `public/rep-runtime.js` + `SessionWrite.enqueueRepUpdate()` | Inline `sendRepToNode()`, inline rep state | Persistence is extracted; counting and rep-event detection remain inline. |
| Detector init | `public/pose-runtime.js` | Inline `initDetector()` bridge | Detector creation extracted; bridge still load-bearing because existing globals expect `detector`. |
| Pose loop | `public/pose-runtime.js` | Inline `runPoseLoop()` bridge | Loop runner extracted; frame processing/HUD/avatar/form integration still inline or pending. |
| HUD | Target future `hud-runtime.js` | Inline `renderWorkoutHud()` | Instrumented only; still inline. |
| Coaching cues | Target future voice/coach runtime | Inline `speak()` and cue cooldowns | Still inline and tied to rep/HUD state. |
| Avatar/Three | Future avatar runtime | Giant inline script | Still outside Phase 2 except pose packet dependency. |
| Dashboard/progress | Future unified dashboard/progress adapter | Retention flow and dashboard read different APIs | Completion event writes retention tracking, dashboard reads session history. |
| Legacy `/command` fallback | `SessionWrite` fallback only under configured fallback rules | Inline helper names and legacy mental model | Normal session start now avoids duplicate helper call; fallback remains inside `SessionWrite`. |

## C. Exact inline functions still load-bearing

These inline functions remain load-bearing after this Phase 2 extraction step:

- `hydrateActiveWorkoutPlan()` — loads active workout selection/default plan.
- `updateActiveWorkoutState()` — mutates `ACTIVE_WORKOUT_STATE`, current exercise metadata, rep count, and HUD render trigger.
- `renderWorkoutHud()` — renders HUD and now emits `[HUD_RUNTIME]` instrumentation.
- `stopRestTimer()`, `startRestTimer()`, `advanceWorkoutProgress()` — set/rest/exercise progression.
- `completeWorkoutSession()` — completion payload, local completion cache, `workout:completed` dispatch, session complete call.
- `getPrimaryCue()` — HUD coach cue source.
- `speak()` — Ma’at voice / browser TTS / `/api/speak` orchestration.
- `sendEndSessionToNode()` — explicit complete write and calendar completion side effects.
- `sendRepToNode()` — bridge to `RepRuntime.persistRepUpdate()`.
- `initDetector()` — bridge to `PoseRuntime.initMoveNetDetector()`.
- `initOptionalTrackers()` — bridge to `PoseRuntime.initOptionalTrackers()`.
- `runPoseLoop()` — bridge to `PoseRuntime.startPoseLoop()`.
- `analyzeSquatForm()` and form metric helpers — rep/form analysis input.
- Avatar pose consumers: `renderAvatar3d()`, `applyPoseToAvatarRig()`, procedural avatar drawing and related alignment helpers.
- Workout runtime callback registration passed to `WorkoutRuntime.configureWorkoutRuntime()`.

## D. Recommended extraction order for the rest of Phase 2

1. **Rep event detection**
   - Move rep phase/depth detection out of inline into `RepRuntime` while keeping `SessionWrite.enqueueRepUpdate()` as the only write path.
2. **HUD lifecycle**
   - Create `public/hud-runtime.js` and move `renderWorkoutHud()`, `updateActiveWorkoutState()`, rest timer display, and HUD state snapshots.
3. **Completion orchestrator**
   - Move `completeWorkoutSession()`, `workout:completed` dispatch, and `sendEndSessionToNode()` into `WorkoutRuntime` or a dedicated lifecycle adapter.
4. **Pose frame adapter**
   - Move inline pose-frame processing into `PoseRuntime` callbacks: form engine evaluation, rep event emission, HUD update, avatar pose packet publication.
5. **Coaching cue adapter**
   - Move workout-start, set-start, rep, rest, and completion cue scheduling into a voice/coach runtime after lifecycle events are stable.
6. **Delete unused legacy helpers**
   - Remove `sendStartSessionToNode()` after verifying no caller remains; keep legacy fallback contained inside `SessionWrite` only.

## Extracted modules created in this step

- `public/pose-runtime.js`
  - Owns MoveNet detector initialization.
  - Owns optional face/hand tracker initialization wrapper.
  - Owns a visible-error pose loop runner that updates pose runtime state.
  - Exposes `window.PoseRuntime` and `window.__POSE_RUNTIME_STATE`.
- `public/rep-runtime.js`
  - Owns rep persistence instrumentation and throttled delegation to `SessionWrite.enqueueRepUpdate()`.
  - Exposes `window.RepRuntime` and `window.__REP_RUNTIME_STATE`.

## Remaining blockers

1. Rep counting itself still lives inline; only persistence is extracted.
2. Pose loop frame processing is not yet the full historical form/rep/avatar loop; it currently establishes the extracted loop owner and visible failure path.
3. HUD ownership is still inline despite `[HUD_RUNTIME]` instrumentation.
4. Completion orchestration is still inline and dashboard/progress stores are still split.
5. Coaching cue orchestration remains inline and can still leave Ma’at status stale if voice startup fails.
6. Avatar/Three pose consumers remain inline and depend on global `latestPosePacket`.
7. `sendStartSessionToNode()` remains in the inline script as dead/legacy helper and should be deleted after verification.
8. Tests still do not cover camera, TensorFlow, pose loop, rep persistence from live pose events, HUD lifecycle, voice, or dashboard/retention integration.

## Next extraction target

**Next target: rep event detection + HUD lifecycle.** Move `repCount`, `totalReps`, `repPhase`, depth/form thresholds, `updateActiveWorkoutState()`, and `renderWorkoutHud()` into dedicated runtimes so `WorkoutRuntime` can coordinate lifecycle events without inline state mutation.
