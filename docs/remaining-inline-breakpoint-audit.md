# Remaining inline breakpoint audit

Scope: `public/index.html` inline script after the broad runtime extraction pause. This audit intentionally avoids extracting more modules and records the remaining runtime breakpoints that still need live-browser validation.

## Live expectation audit

| Live expectation | Current owner | Audit result | Remaining breakpoint |
| --- | --- | --- | --- |
| Boot completes | Inline shell + `RuntimeOrchestrator` + `AppHydrationRuntime` | Working by static contract: the shell logs boot start, configures orchestrator/hydration, and runs `initializeAuth()` on `window:load`. | Hydration still depends on inline ordering because `AppHydrationRuntime.configure()` needs page-local getters/setters after auth/profile/button runtimes are configured. |
| Auth state propagates | `auth-core.js`, `auth-state-runtime.js`, inline `onLogin`/`initializeAuth` shell | Working by tests and static contract: form ownership is extracted, while inline keeps shell mirrors (`USER_ID`, `USER_PROFILE`) and visibility. | Local `USER_ID` / `USER_PROFILE` mirrors remain the handoff point to profile, hydration, dashboard, and avatar runtimes. |
| Camera starts | `WorkoutRuntime.connectCamera()` with inline media callbacks | Working by static contract when browser camera permission succeeds: inline delegates to `WorkoutRuntime.connectCamera()` and `afterConnectCamera` lazy-loads detector/trackers. | First browser-only risk is `getUserMedia`/`video.play()` permission or autoplay failure, handled as camera errors rather than extraction breakage. |
| Detector starts | `PoseRuntime.initMoveNetDetector()` via inline `initDetector()` | Working by static contract: the inline bridge calls `window.__ensurePoseRuntime()` through `PoseRuntime` and stores `detector`. | CDN/model/network/backend selection failures remain live-environment risks; no broad extraction recommended. |
| Pose loop runs | `PoseRuntime.startPoseLoop()` via inline `runPoseLoop()` | Working by static contract once `running === true` and `detector` exists. | The loop has a hard dependency on `RepAnalysisRuntime.processPoseFrame`; if that runtime is absent or misconfigured, the first pose frame is the first app-runtime failure. |
| Reps count | `RepAnalysisRuntime` + `WorkoutProgressionRuntime` + `RepRuntime` | Working by static contract: `processPoseFrame()` updates rep state and calls progression/rep persistence hooks. | Form quality/full-body thresholds may block reps in real camera posture; not an extraction defect. |
| HUD updates | `HudRuntime.render()` through inline `renderWorkoutHud()` | Working by static contract: rep-analysis `onAnalysis` calls progression and HUD render. | `HudRuntime` is required; missing runtime would fail on the first pose analysis frame. |
| Coach speaks/responds | `CoachRuntime` with inline button and workout glue | Working by tests and static contract: voice controls call `CoachRuntime` directly and workout glue invokes intro/rep/completion speech. | Browser speech/audio permission remains live-only; inline should not re-own speech recognition. |
| Avatar mirrors pose | `AvatarRuntime` with inline Three/GLB canvas pipeline | Partially working / highest-risk remaining area: `AvatarRuntime` subscribes to pose packets, but Three runtime, GLB load, canvas visibility, calibration, and fallback mode all still cross inline state. | First avatar-specific failure is usually GLB/Three runtime unavailability or canvas visibility diagnostics, not camera/pose failure. |
| Workout completes | `WorkoutProgressionRuntime.completeWorkoutSession()` | Working by static contract after target reps/rest progression. | Completion write requires `SessionWrite.completeSession`; network/auth failures surface as completion errors. |
| Dashboard/progress update | `dashboard-runtime.js` | Working by static contract: `workout:completed` triggers `propagateCompletion()` and dashboard refreshes. | Completion event must include canonical workout/program context or dashboard tracking rejects the payload. |

## First real live failure points

| Milestone | First plausible failure point | Evidence / handling | Recommended action |
| --- | --- | --- | --- |
| After login | Post-auth hydration can degrade if backend profile/retention/dashboard reads fail. | Hydration is optional per step, but still inline-ordered. | Leave inline for now; add live diagnostics around degraded hydration before extraction. |
| Connect camera | Browser media permission, missing `mediaDevices.getUserMedia`, `video.play()`, or pose CDN/model load. | `WorkoutRuntime.connectCamera()` catches and displays camera errors; inline `afterConnectCamera` initializes detector/trackers. | Fix inline only if a live browser trace points to callback ordering or missing DOM refs. |
| Start workout | Session creation can fail if `SessionWrite.startSession` is unavailable or `/api/sessions` rejects auth. | `WorkoutRuntime.createSessionCallbackGlue()` throws visible start errors. | Delegate remains correct; investigate auth/session payload if seen live. |
| First pose frame | `RepAnalysisRuntime.processPoseFrame` is the first hard runtime dependency inside the frame callback. | `runPoseLoop()` throws if `RepAnalysisRuntime.processPoseFrame` is missing. | If live failure occurs here, delegate/fix runtime configuration before extracting more. |
| First rep | Full-body/depth thresholds may prevent phase transition; persistence can fail if `SessionWrite.enqueueRepUpdate` is missing. | `RepAnalysisRuntime` owns counting; `RepRuntime.persistRepUpdate()` owns persistence. | Leave counting runtime-owned; add live pose snapshots if reps do not increment. |
| Workout completion | `SessionWrite.completeSession`/network/auth completion write can fail before dashboard propagation. | `WorkoutProgressionRuntime.completeWorkoutSession()` throws visible completion errors. | Delegate to session/dashboard runtimes; fix only the payload/auth failure observed live. |

## Remaining inline function classification

| Inline area / representative functions | Classification | Decision |
| --- | --- | --- |
| `updateAppBootStatus`, `renderSystemBootStatus`, `isBootContractReady`, `refreshBuildStamp`, pilot event helpers | Working / should remain inline for now | Leave alone until boot diagnostics stabilize after live validation. |
| Auth/profile shell: `persistUser`, `defaultProfileForName`, `onLoginUI`, `sendProfileToNode`, `applyAuthenticatedShellVisibility`, `renderAuthShell`, `initializeAuth`, `onLogin`, `handleLogout` | Working / should remain inline | Fix inline only for live auth shell regressions; extract later after `AppHydrationRuntime` owns all profile mirrors. |
| Workout plan selection: canonical selection helpers and `renderWorkoutPlan` | Working / should be extracted later | Extract later into workout-library/selection runtime; avoid now. |
| Rep/form legacy math helpers: `getKeypoint`, `getAngleDegrees`, `computeKneeValgus`, `analyzeSquatForm` | Duplicate/delegator risk; mostly not called by main rep loop | Delegate to `RepAnalysisRuntime` later or delete after assessment dependencies are audited. |
| Workout progression delegates: `requireWorkoutProgressionRuntime`, `getActiveWorkoutState`, `hydrateActiveWorkoutPlan`, `renderWorkoutHud`, `sendRepToNode`, `syncRepAnalysisState`, `configureExtractedWorkoutRuntimes` | Working delegators | Leave as glue; extract only with an obvious contract for local mirrors. |
| Camera/pose delegates: `initDetector`, `initOptionalTrackers`, `connectCamera`, `runPoseLoop`, `startWorkout` | Working delegators / called | Delegate to existing runtimes; fix inline only if live callback ordering fails. |
| OHSA/define exercise: `startOhsa`, `startDefineExercise` | Working delegators / called by buttons | Delegate to `AssessmentRuntime`; leave inline button glue. |
| Coach: `requireCoachRuntime`, `askCoach`, voice button handlers | Working delegators | Leave alone; speech runtime already extracted. |
| Avatar controls/render pipeline: Three dependency bootstrap, render mode/facing/stage, canvas visibility, GLB probing/mounting, procedural fallback, trace harness | Called, high-risk, should remain inline until live avatar evidence is captured | Do not extract broadly; targeted fixes only for observed GLB/Three/canvas failure. |
| Dashboard/progress update | Delegated to `dashboard-runtime.js` | Leave alone; completion propagation belongs in dashboard runtime. |

## Decision table

| Decision | Items |
| --- | --- |
| Fix inline now | None without a live browser trace. Only small inline fixes are justified for missing DOM refs, callback ordering, or marker/diagnostic clarity. |
| Delegate to existing runtime | Auth submit, coach speech/mic, workout start/session, pose detector/loop, rep counting/persistence, HUD render, dashboard/progress, retention. |
| Extract later | Workout selection/rendering, legacy form math helpers after assessment parity is proven, remaining profile shell once hydration owns mirrors. |
| Leave alone | Boot diagnostics, hydration ordering, camera callbacks, OHSA button glue, avatar render pipeline during live breakpoint diagnosis. |

## Recommended next patch

Add a narrow browser/live diagnostic patch rather than another extraction pass:

1. Capture a timestamped milestone object on `window.__liveWorkoutBreakpoints` for login, camera connect, detector ready, workout start, first pose frame, first rep, workout completion, and dashboard propagation.
2. Surface the first failed milestone in the existing status panels.
3. Only after a live trace identifies a concrete failing milestone, choose one of: inline callback fix, runtime delegation fix, or later extraction.
