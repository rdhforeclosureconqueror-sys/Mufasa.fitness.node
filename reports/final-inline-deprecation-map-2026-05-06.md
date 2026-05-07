# Final Inline Deprecation Map — 2026-05-06

## Scope and measurement

This final cleanup audit re-scans the synchronized landing page copies at `index.html` and `public/index.html` after the auth, hydration, workout lifecycle, dashboard, avatar-control, assessment, and voice/STT extraction passes. The remaining inline script is no longer mainly feature code that can be mechanically lifted. It is a mixed boundary layer: compatibility delegators, ordering glue, runtime configuration, and several still-dangerous implementation islands that own browser APIs, animation loops, shared globals, and boot diagnostics.

### Current inline script size

| File | Inline script blocks | Total inline bytes | Total inline lines | Largest inline block | Notes |
|---|---:|---:|---:|---:|---|
| `index.html` | 4 | 132,250 | 2,941 | 131,661 bytes / 2,926 lines (`<script>` starting at line 943) | Canonical root copy. |
| `public/index.html` | 4 | 132,250 | 2,941 | 131,661 bytes / 2,926 lines (`<script>` starting at line 943) | Synchronized public copy. |

Measured with a Python `HTMLParser` inline-script extraction scan against both HTML files. Both copies remain byte/line-count synchronized for inline script payloads.

## Remaining ownership map by danger category

| Category | Remaining inline owners | External/runtime owners already present | Extraction posture | Risk |
|---|---|---|---|---|
| Safe delegators | `renderSystemBootStatus`, `updateAuthPropagationStatus`, `updateActivationStatusPanel`, `runPendingPanelWatchdogs`, `window.__forceAuthPropagationRender`, `window.__forceAppActivationRender`, `window.__retryAvatarRuntime`, `onLogin`, `connectCamera`, `startWorkout`, `buildCalendarFromMeta`, `defaultProfileForName`, `onLoginUI` | `StatusPanels`, `AppHydrationRuntime`, `WorkoutRuntime`, `AvatarRuntime`, `RuntimeOrchestrator` | Can be deleted only after all global consumers and tests stop expecting the legacy names. Keep as shims until no caller uses them. | Low when left alone; medium if removed early. |
| Moderate-risk glue | DOM ref collection, runtime endpoint constants, `APP_BUILD_VERSION`, `addLog`, `markPerfMetric`, `requireCoachRuntime`, `requireWorkoutProgressionRuntime`, runtime `configure*` calls, post-login activation wiring, dashboard refresh wiring, button runtime wiring, avatar control binding, ask/listen button handlers | `RuntimeState`, `RuntimeEvents`, `RuntimeOrchestrator`, `CoachRuntime`, `DashboardRuntime`, `ButtonRuntime`, `AvatarRuntime` | Move only in small batches after preserving script-order and DOM-ready assumptions. | Medium. |
| Dangerous/load-bearing lifecycle | `initializeAuth`, `handleLogout`, `applyAuthenticatedShellVisibility`, `renderAuthShell`, `setPilotBypassAuthState`, `activatePilotBypassImmediate`, `persistUser`, `sendToNode`, `postAuthenticatedJSON`, `sendProfileToNode`, canonical workout selection, `renderWorkoutPlan`, `sendRepToNode`, `syncRepAnalysisState`, `configureExtractedWorkoutRuntimes`, `startOhsa`, `startDefineExercise` | `AuthStateRuntime`, `AuthCore`, `ProfileWriteRuntime`, `AppHydrationRuntime`, `WorkoutRuntime`, `WorkoutProgressionRuntime`, `AssessmentRuntime`, `RepAnalysisRuntime`, `SessionWriteRuntime` | Do not extract as a mass move. These own shared state, authenticated writes, selection state, and runtime callback payloads. | High. |
| Render-loop ownership | `ensureAvatarRenderLoop`, `ensureAvatarThreeRuntime`, `mountAvatarGlbModel`, `drawProceduralAvatar`, `runPoseLoop`, `runAvatarTrace`, `attachAvatarTraceHarness`, tracker-mode smoothing, avatar pose packet updates | `AvatarRuntime`, `PoseRuntime`, `RepAnalysisRuntime` | Highest-risk remaining area. Extract only after a single runtime owns frame scheduling and canvas writes. | Highest. |
| Browser API ownership | `navigator.mediaDevices.getUserMedia` is now invoked by `WorkoutRuntime.connectCamera`, while inline still wraps connect diagnostics; inline still owns Three/GLTF runtime construction, `requestAnimationFrame`, canvas contexts, `fetch` to model/profile/session endpoints, `localStorage`, popup `window.open`, `postMessage`, `CustomEvent`, `speechSynthesis`/`SpeechRecognition` access only through `CoachRuntime` | `WorkoutRuntime`, `AvatarRuntime`, `CoachRuntime`, `RuntimeEvents` | Browser APIs that are already runtime-owned should stay out of inline. Remaining inline Browser API users are tied to boot/render/model/profile ordering. | Medium to highest depending on API. |
| Ordering-sensitive boot logic | top-of-script runtime/error bridges; DOM refs before functions; boot/status events; `RuntimeOrchestrator.configure*` ordering; `AppHydrationRuntime.configure`; `configureBootLifecycle`; `configureAuthLifecycle`; window-load boot gates and no-pending policy | `RuntimeEvents`, `RuntimeState`, `BootCore`, `RuntimeOrchestrator`, `AppHydrationRuntime`, `StatusPanels` | Leave inline until boot contract tests cover every configured runtime and load event edge. | High. |

## Specific dependency maps

### Pose/camera loop ownership

| Inline owner | What it still owns | Runtime dependency | Why dangerous |
|---|---|---|---|
| `detector`, `camera`, `cameraStream`, `isRunning`, `poseLoopStarted`, diagnostic globals | Process-wide camera/pose flags and global diagnostics | `PoseRuntime`, `WorkoutRuntime` | Any extraction can desynchronize button state, camera stream state, and pose loop start state. |
| `initDetector` | TensorFlow/MoveNet detector guard, pose runtime status, detector diagnostics, button enablement | `PoseRuntime` and TensorFlow globals | Must execute before workouts can depend on estimated poses. |
| `initOptionalTrackers` and `updateTrackingMode` | Face/hand tracker discovery and tracking-mode state machine | MediaPipe/TensorFlow globals, pose confidence state | Optional trackers are non-fatal but influence avatar rigging and HUD confidence. |
| `connectCamera` | Inline diagnostic wrapper around runtime-owned `WorkoutRuntime.connectCamera` | `WorkoutRuntime.connectCamera` | Safe as a delegator, but still exports `window.connectCamera` for existing callers. |
| `runPoseLoop` | Frame scheduling, pose estimation, form engine evaluation, HUD render, rep analysis, avatar rendering, status updates | `PoseRuntime`, `RepAnalysisRuntime`, `HudRuntime`, `AvatarRuntime`, `WorkoutProgressionRuntime` | This is the central render/workout loop. It should not be split until one runtime owns the whole frame pipeline. |
| `getPoseConfidenceSnapshot`, `runAvatarTrace`, `attachAvatarTraceHarness` | Debug/trace snapshots for camera, pose, and avatar frame integrity | `AvatarRuntime` diagnostics | Diagnostic consumers likely depend on globals. Keep until diagnostics are externalized. |

### Avatar render/model pipeline ownership

| Inline owner | What it still owns | Runtime dependency | Why dangerous |
|---|---|---|---|
| `ensureAvatarThreeRuntimeDependencies` | Lazy Three and GLTF dependency readiness, timeout/failure status mirroring | `AvatarRuntime.ensureThreeModules`, `__AVATAR_THREE` bridge | Race-prone because dependency status feeds boot diagnostics and render-mode fallback. |
| `ensureAvatarThreeRuntime` | Scene/camera/renderer/light/model runtime creation | Three/GLTF bridge and canvas router | Owns renderer canvas type, scene objects, and status globals. |
| `ensureAvatarRenderLoop` | `requestAnimationFrame` loop and renderer draw ownership | Three renderer | Permanent extraction candidate only if `AvatarRuntime` becomes sole frame scheduler. |
| `mountAvatarGlbModel` | GLB probe/load, skeleton discovery, bone map, fallback status | `AvatarRuntime` control state and profile metadata | Load-bearing for avatar-only/overlay mode. Broken ordering causes blank avatar or camera fallback. |
| `applyRenderModeSelection`, `applyAvatarStageMode`, `applyAvatarFacingCalibration`, `fallbackRenderModeToCamera` | Mode/stage/facing persistence and UI status | `localStorage`, avatar UI controls | Moderate but ordering-sensitive; safe to move after the renderer pipeline moves. |
| `drawProceduralAvatar` | 2D fallback/body overlay draw implementation | Pose packets and canvas context router | Render-loop implementation; do not extract separately from pose packet ownership. |
| Avatar modal callbacks and popup/message handling | Avaturn popup, model URL/thumb capture, profile writeback wiring | `AvatarRuntime`, `ProfileWriteRuntime` | Control binding is extracted, but inline still owns popup/message ordering. |

### Hydration ordering dependencies

| Inline owner | Dependency chain | Current posture |
|---|---|---|
| `defaultProfileForName`, `onLoginUI`, `buildCalendarFromMeta`, `onLogin` | Inline compatibility aliases delegate into `AppHydrationRuntime`, but are still referenced by global callers/tests. | Safe delegators; remove only after callers use runtime directly. |
| `initializeAuth` | `AuthStateRuntime` session restore → profile defaults → `APP_AUTH`/`USER_ID`/`USER_PROFILE` globals → shell visibility → primary button binding. | Dangerous auth/hydration lifecycle. Do not extract until globals are owned externally. |
| `AppHydrationRuntime.configure` | Supplies references and callbacks for profile shell, calendar, retention, runtime buttons, sync status, and state setters. | Ordering-sensitive boot glue. Move only if a bootstrap module owns all DOM refs first. |
| `ensureRetentionFlowLoaded` alias and retention/dashboard refresh timing | Auth-ready profile state → retention loader → dashboard refresh → status panels. | Moderate-risk glue; can move after auth/profile state is single-owner. |
| Window-load boot gates | `AppHydrationRuntime.runBootGates("window:load")`, `applyNoPendingForeverPolicy`, final diagnostics. | Keep inline for now; it is the last boot-contract safety net. |

### Boot diagnostics dependencies

| Inline owner | Diagnostic dependency | Keep/extract guidance |
|---|---|---|
| `updateAppBootStatus` and `appBootSteps` | Visible boot panel, runtime error bridge, `window.__appBootStatus` | Keep until `StatusPanels` owns the canonical visible boot stream. |
| `isBootContractReady`, `appendPilotEventLocal`, `trackPilotEvent`, `emitPilotEvent` | Pilot readiness events and backend pilot event writes | Moderate/high; extract only after retry/offline semantics are tested. |
| `refreshBuildStamp`, `logMobileControlTruth`, `getPrimaryNavHandlerStatus` | Build stamp, DOM truth logging, final handler rescue diagnostics | Keep until all button/runtime ownership is stable. |
| `configureBootLifecycle`, `configureAuthLifecycle`, `configurePostLoginActivation` | Runtime boot/status bridges and auth propagation panels | Ordering-sensitive; should remain inline with current DOM ref bootstrap for now. |
| Final `window.load` handler | Boot gates, no-pending policy, final status refreshes, camera preflight diagnostics | Ordering-sensitive; leave inline permanently unless a single bootstrap module takes ownership. |

### Workout/rep/OHSA orchestration dependencies

| Inline owner | What it coordinates | Runtime dependency | Guidance |
|---|---|---|---|
| Static workout templates and selection persistence | Workout plan IDs, local selection mirror, canonical selected workout | `WorkoutRuntime`, `WorkoutProgressionRuntime` | Can move safely if selection storage contract is copied exactly. |
| `renderWorkoutPlan` | DOM rendering for the current plan | `WorkoutProgressionRuntime` state | Moderate; move with workout selection state. |
| `getPrimaryCue`, `renderWorkoutHud` | HUD cue selection and runtime HUD state | `HudRuntime`, `WorkoutProgressionRuntime` | Can move once HUD runtime receives all state directly. |
| `analyzeSquatForm`, `getKeypoint`, `getAngleDegrees`, `computeKneeValgus` | Inline squat fallback analysis and form result enrichment | `RepAnalysisRuntime`, form engine | Dangerous because loop uses it per frame. Move with `runPoseLoop`, not before. |
| `sendRepToNode` | Authenticated rep/session persistence payloads | `SessionWriteRuntime`, auth token globals | Dangerous write path; move after auth/profile/session state are runtime-owned. |
| `syncRepAnalysisState` and `configureExtractedWorkoutRuntimes` | State mirror from rep runtime to inline globals and HUD | `RepAnalysisRuntime`, `WorkoutProgressionRuntime` | Dangerous bridge; remove only after inline globals are no longer needed. |
| `startOhsa`, `startDefineExercise`, `startWorkout` | Detector readiness, camera loop start, active workout/assessment start | `AssessmentRuntime`, `WorkoutRuntime`, `PoseRuntime` | Load-bearing lifecycle; keep inline wrappers until loop ownership moves. |

### askCoach/chat ownership

| Surface | Current owner | Audit finding | Guidance |
|---|---|---|---|
| Voice command dispatch | `CoachRuntime` owns SpeechRecognition lifecycle and calls the configured dispatcher. | Inline dispatcher only forwards to `window.askCoach` if present, otherwise logs unavailable chat. | Safe glue; leave until chat owner is explicit. |
| Ask button / Enter key | Inline binds `askBtn.onclick` and `questionInput` keydown directly to global `askCoach(...)`. | No inline `askCoach` implementation remains in this scan. The historical `program_calendar.js` wrapper expects `window.askCoach` to pre-exist, so this is an unresolved global dependency rather than extractable ownership. | Do **not** touch in this cleanup pass except to create a dedicated chat runtime with tests. |
| Chat backend endpoint constants | Inline still defines `ASK_URL` and `PROGRAM_URL`. | They are currently not evidence of inline chat implementation by themselves. | Move only when a chat runtime owns `askCoach` and imports endpoint config from `RuntimeState`. |

## Sections that should NOT be extracted in the next pass

1. `runPoseLoop` and its per-frame dependencies (`initDetector`, optional tracker state, squat analyzer, HUD push, rep sync, avatar packet/render calls).
2. Avatar renderer/model pipeline (`ensureAvatarThreeRuntimeDependencies`, `ensureAvatarThreeRuntime`, `ensureAvatarRenderLoop`, `mountAvatarGlbModel`, `drawProceduralAvatar`, trace harness).
3. Auth/profile global writers and shell state (`initializeAuth`, `APP_AUTH`, `USER_ID`, `USER_PROFILE`, shell visibility, pilot bypass state).
4. Boot diagnostics and final window-load gates (`updateAppBootStatus`, boot contract checks, status-panel rescue shims, module gate checks).
5. Authenticated write bridges (`sendProfileToNode`, `sendRepToNode`, `postAuthenticatedJSON`) until auth/session state has a single external owner.
6. `askCoach` button/key bindings until a real chat runtime owns the global command and tests cover the typed-chat path.

## Recommended permanent-inline sections

These should stay inline permanently unless the app receives a dedicated bootstrap entry module that owns initial DOM refs and script order:

- Initial runtime/error bridge installation and build/version marker.
- One-time DOM ref acquisition for the static HTML shell.
- Runtime configuration calls that wire existing DOM refs into extracted runtimes.
- Final window-load boot gate and visible diagnostic rescue calls.
- Tiny compatibility shims required by legacy tests or by external scripts loaded after the main inline block.

## Recommended remaining safe extractions

| Priority | Candidate | Preconditions | Expected risk |
|---:|---|---|---|
| 1 | Pure compatibility delegator deletion (`defaultProfileForName`, `buildCalendarFromMeta`, `onLogin`, status-panel force shims) | Prove no HTML attributes, external scripts, tests, or global callers reference the names. | Low. |
| 2 | Workout plan templates and canonical selection storage | Add tests for selected workout persistence and plan rendering before/after auth restore. | Medium. |
| 3 | HUD cue calculation (`getPrimaryCue`, `renderWorkoutHud`) | Ensure `HudRuntime` receives active state/form result directly. | Medium. |
| 4 | Avatar mode/stage/facing UI persistence | Keep renderer/model creation inline until after this moves; test localStorage and camera fallback. | Medium/high. |
| 5 | Pilot event diagnostics | Add tests for event payload, auth token behavior, offline failure, and visible diagnostic updates. | Medium/high. |
| 6 | Chat/askCoach runtime | First create an owner for `window.askCoach`; then rewire ask button, Enter key, and coach voice dispatcher. | Medium/high. |

## Dangerous sections map

| Danger level | Inline section/range | Why it is dangerous | Recommended action |
|---|---|---|---|
| Highest | Avatar model/render loop island, roughly inline script lines 1518–2409 and 3165–3490 in `index.html`/`public/index.html` | Owns Three/GLTF readiness, canvas, model loading, frame rendering, pose packet rendering, and trace diagnostics. | Freeze until an avatar runtime owns the entire frame/model pipeline. |
| Highest | Pose loop and rep/form frame island, roughly lines 3022–3320 | Owns detector readiness, camera loop start, pose frames, form analysis, HUD updates, rep sync, and avatar packet delivery. | Freeze until pose runtime owns frame scheduling. |
| High | Auth/profile/hydration shell, roughly lines 2446–2728 and 3641–3705 | Owns session restore, profile globals, shell visibility, runtime state setters, and hydration callback wiring. | Extract only as one auth/profile bootstrap migration. |
| High | Workout/OHSA orchestration, roughly lines 2759–3018 and 3235–3285 | Coordinates selected plans, assessment start, runtime callback glue, rep/session writes, and camera loop entry. | Move selection/HUD first; keep lifecycle wrappers until pose loop moves. |
| High | Boot diagnostics and final boot gate, roughly lines 996–1288, 3509–3578, and 3842–3868 | Owns visible rescue diagnostics and final readiness checks. | Keep inline until a boot module owns the static shell. |
| Medium/high | Avatar modal/profile writeback and popup/message bridge, roughly lines 2394–2409 and 3760–3790 | Uses popup, message events, profile writeback, and renderer init. | Move with avatar controls only after profile writeback tests exist. |
| Medium/high | Chat ask button/Enter handlers, roughly lines 3792 and 3832–3833 | Calls a global `askCoach` that is not defined by the remaining inline scan. | Do not delete; create chat runtime and tests. |

## Final recommendation

The remaining inline code should be treated as a bootstrap boundary plus three dangerous implementation islands: auth/profile hydration, pose/workout frame orchestration, and avatar render/model ownership. The next cleanup should avoid touching the pose/camera loop, avatar renderer/model pipeline, final boot diagnostics, and chat button global until dedicated runtime owners and focused tests exist. The only safe near-term movements are small delegator removals, workout selection/HUD state movement, and explicit chat-runtime creation with tests.
