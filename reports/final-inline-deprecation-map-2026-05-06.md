# Final Inline Deprecation Map — 2026-05-06

## Scope and measurement

This audit covers the synchronized landing page copies at `index.html` and `public/index.html`. This pass continues final inline deprecation by extracting the remaining workout/session callback glue into the workout runtimes while leaving avatar/pose rendering untouched.

### Current inline script size

| File | Inline script blocks | Total inline bytes | Total inline lines | Largest inline block |
|---|---:|---:|---:|---:|
| `index.html` | 4 | 163,939 | 3,510 | 163,350 bytes / 3,495 lines (`<script>` starting at line 942) |
| `public/index.html` | 4 | 163,939 | 3,510 | 163,350 bytes / 3,495 lines (`<script>` starting at line 942) |

Measured with a Python inline-script extraction command against both synchronized HTML files. The same measurement pass counts 143 remaining inline function declarations/arrow-function bindings in each copy, down from 144 before extracting workout/session callback bodies and deleting the unused `sendStartSessionToNode` helper.

## Final inline ownership map

| Area | Extracted/current external owner | Remaining inline owner | Duplicate-owner status | Risk |
|---|---|---|---|---|
| Auth | `auth-core.js`, `auth-state-runtime.js`, `backend-read.js`, `profile-write-runtime.js` | Thin inline submit/button/register delegators, `initializeAuth`, `onLogin`, `handleLogout`, shell visibility, pilot bypass, profile write fallback | **Submit duplicate removed.** `auth-core.js` is now the login/register form request owner; inline and `auth-ui.js` keep only temporary delegators and post-login/profile shell ownership. | High: remaining load-bearing auth/profile lifecycle. |
| Boot | `boot-core.js`, `runtime-events.js`, `runtime-state.js`, `status-panels.js`, `runtime-orchestrator.js` | `updateAppBootStatus`, build stamp refresh, boot contract/status diagnostics, final handler checks | **Duplicate owner remains.** External boot core fetches version while inline still refreshes build stamp and owns visible boot diagnostics. | Medium/high. |
| Profile | `profile-runtime.js`, `profile-write-runtime.js`, `backend-read.js`, `app-hydration-runtime.js` | `persistUser`, `defaultProfileForName`, `onLoginUI`, `sendProfileToNode`, sync status, avatar profile callbacks | **Duplicate owner remains.** Profile read/write/hydration split across modules and inline. | High. |
| Retention | `retention-loader-runtime.js`, `app-hydration-runtime.js`, dashboard/profile runtimes | `ensureRetentionFlowLoaded` alias and post-login/dashboard refresh coupling | **Mostly delegator duplicate.** Loader moved out; inline still controls when auth/profile invokes it. | Medium. |
| Workout | `workout-runtime.js`, `workout-progression-runtime.js`, `runtime-orchestrator.js` | workout selection persistence, `startWorkout`, `connectCamera`, workout plan rendering, thin context delegates for state/DOM access | **Callback duplicate reduced.** Session start/stop/error callback bodies now live in `workout-runtime.js`; progression completion/rep callback bridges now live in `workout-progression-runtime.js`. Inline still supplies local state accessors until pose/avatar extraction. | High. |
| Pose | `pose-runtime.js`, `rep-analysis-runtime.js` | detector init, camera loop, optional trackers, pose confidence, form analyzer helpers, avatar pose packet production | **Duplicate owner remains.** Runtime modules exist but inline still starts detector/loop and feeds downstream owners. | Highest. |
| Rep | `rep-runtime.js`, `rep-analysis-runtime.js`, `session-write.js` | `sendRepToNode`, `syncRepAnalysisState`, squat analysis, rep mirrors | **Callback duplicate reduced.** Rep-analysis callback bodies moved into `workout-progression-runtime.js`; inline still owns counter variables and the `sendRepToNode` persistence delegator until pose/rep state migrates. | High. |
| HUD | `hud-runtime.js`, `status-panels.js` | `renderWorkoutHud`, primary cue selection, progress/tracker status glue | **Duplicate owner remains.** HUD module is configured externally, but inline still computes and pushes display state. | Medium/high. |
| Coach | `coach-runtime.js` | `requireCoachRuntime`, `speak`, `unlockAudioOnce`, `stopAllSpeech`, `toggleListening` | **Thin duplicate/delegator.** Most voice operations delegate when runtime exists. | Lower; remove after auth/workout callbacks are migrated. |
| Avatar | `avatar-runtime.js`, `runtime-bridges.js` | Three runtime bootstrap, GLB load/mount, render-mode/stage controls, Avaturn modal, rig application, procedural drawing | **Duplicate owner remains.** Extracted runtime owns control registration, but inline still owns renderer/model/rig heavy implementation. | Highest. |
| Dashboard | `dashboard-runtime.js`, `dashboard.js`, `app-hydration-runtime.js`, `button-runtime.js` | auth-ready refresh callbacks, calendar/progress/dashboard status coupling | **Duplicate owner remains.** Inline still wires refresh timing and profile/retention prerequisites. | Medium/high. |
| Exercise library | `exercise-library.js`, `button-runtime.js`, `app-core.js` | navigation/final button-handler compatibility checks in main landing page | **Thin duplicate/delegator.** Standalone library owner exists; landing page still has nav compatibility. | Low. |


## Workout/session glue extraction completed in this pass

Removed or moved from both `index.html` and `public/index.html`:

1. Moved `WorkoutRuntime.configureWorkoutRuntime` session lifecycle callback bodies into `workout-runtime.js` via `WorkoutRuntime.createSessionCallbackGlue`. Inline now passes only refs/state accessors and keeps camera/avatar-specific callbacks in place for the later avatar/pose pass.
2. Moved `WorkoutProgressionRuntime.configure` completion, retention-signal, set/exercise, and rep-analysis callback bodies into `workout-progression-runtime.js` via `WorkoutProgressionRuntime.createSessionCallbackGlue`.
3. Removed the unused legacy `sendStartSessionToNode` helper after repository search showed no remaining call sites. No `sendEndSessionToNode` helper was present in the live landing page copies.
4. Kept `sendRepToNode` as a thin delegator because it is still the bridge into `RepRuntime.persistRepUpdate` and depends on inline rep/session state that will move with the pose/rep extraction.
5. Left avatar/pose rendering, detector startup, render loop, GLB/canvas handling, and OHSA glue unchanged except where existing stop/completion delegates are now invoked from runtime-owned callbacks.

## Phase 7A removals completed

Removed only these explicit no-op inline compatibility shims from both `index.html` and `public/index.html`:

1. `forceBuilderFullAccessAuthState`.
2. `enforceBuilderOverlayBypass`.
3. `installClickDiagnostics`.

Dependency verification: repository search found no runtime module importing, invoking, or depending on these exact inline implementations. The only remaining non-report reference is the legacy `test/auth-shell-guard.test.js` assertion that was already stale because the call site no longer existed. No similarly named real runtime bridge/helper was removed.

## Remaining dangerous/load-bearing sections

1. **Remaining inline auth lifecycle/profile shell flow**: `initializeAuth`, `onLogin`, `handleLogout`, pilot bypass, auth shell visibility, and profile push remain load-bearing because they control shell/profile/dashboard/retention follow-up. The login/register submit fetch owner has been extracted to `auth-core.js`; inline `submitAuthRequest`, `handleLoginSubmit`, `handleLoginButtonClick`, `handleCreateAccountToggle`, and `auth-ui.js` are now thin compatibility delegators only.
2. **Avatar and pose render ownership**: Three dependency bootstrap, GLB probing/mounting, render loop, rig mapping, procedural drawing, camera fullscreen state, detector init, and pose loop remain large active implementations.
3. **Workout/rep/session lifecycle glue**: selection persistence, workout plan rendering, rep analysis sync, session start/rep/OHSA writes, and runtime configuration callbacks are load-bearing and cross several extracted runtimes.
4. **Profile/retention/dashboard hydration chain**: profile defaults, persisted user state, sync status, retention loader timing, calendar/dashboard refresh timing, and app shell visibility are still tightly coupled.
5. **Boot/status diagnostics**: build stamp refresh, app boot status, status panel rescue hooks, and final handler checks remain useful but duplicate extracted boot/status-panel owners.

## All remaining inline functions and classification

| Line | Function | Classification | Removal note |
|---:|---|---|---|
| 995 | `updateAppBootStatus` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 1073 | `renderSystemBootStatus` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 1074 | `isBootContractReady` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 1126 | `appendPilotEventLocal` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 1135 | `trackPilotEvent` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 1159 | `emitPilotEvent` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 1163 | `getAvatarRuntimeStatusRef` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1216 | `updateAvatarOverlayDiagnostics` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1229 | `setAvatarRuntimeFailure` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1245 | `refreshBuildStamp` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 1347 | `requireWorkoutProgressionRuntime` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1352 | `getActiveWorkoutState` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1356 | `getActiveWorkoutPlan` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1360 | `hydrateActiveWorkoutPlan` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1364 | `updateActiveWorkoutState` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1370 | `getPrimaryCue` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1378 | `renderWorkoutHud` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1490 | `logTrackerCapabilities` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1494 | `updateTrackingMode` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1534 | `getThreeGlobal` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1539 | `getGltfLoaderCtor` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1544 | `updateAvatarRuntimeRenderModeStatus` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1573 | `logAvatarWebglAvailability` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1584 | `ensureAvatarThreeRuntimeDependencies` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1601 | `onReady` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1605 | `onFailed` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1614 | `cleanup` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1642 | `logAvatarCanvasState` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1660 | `ensureAvatarRenderLoop` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1665 | `loop` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1681 | `ensureAvatarThreeRuntime` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1797 | `setAvatar3dCanvasVisibility` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1803 | `resizeAvatarThreeRuntime` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1816 | `initializeAvatarRuntimeBootstrap` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1836 | `window.__retryAvatarRuntime/retryAvatarRuntime` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 1860 | `refreshCameraUiState` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1875 | `setCameraFullscreen` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1888 | `findFirstSkeleton` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1898 | `mapAvatarBones` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1901 | `findBone` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1924 | `sanitizeRenderMode` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1928 | `getRenderModeLabel` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1934 | `updateRenderModeStatus` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1940 | `sanitizeStageMode` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1944 | `resolveInitialStageMode` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1952 | `applyAvatarStageMode` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1976 | `applyRenderModeSelection` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2021 | `fallbackRenderModeToCamera` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2034 | `resolveInitialRenderMode` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2048 | `sanitizeAvatarFacingDeg` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2053 | `applyAvatarFacingCalibration` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2073 | `resolveInitialAvatarFacingDeg` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2081 | `getRenderMode` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2086 | `setPersonLayerSuppressed` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2091 | `isLikelyHttpUrl` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2101 | `resolveAvatarModelUrl` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2117 | `setAvatarRuntimeStatus` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2124 | `setAvatarAssetStatus` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2136 | `normalizeAvatarProfile` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2150 | `probeAvatarModelRuntime` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2192 | `mountAvatarGlbModel` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2321 | `toRotation` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2369 | `loadAvatarAssetForCurrentUser` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2476 | `openAvatarModal` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2489 | `closeAvatarModal` | active implementation | inline helper closed over local runtime state |
| 2497 | `addLog` | active implementation | inline helper closed over local runtime state |
| 2505 | `updateAuthDebug` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2529 | `markPerfMetric` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2534 | `ensureRetentionFlowLoaded` | active implementation | retention/profile/dashboard glue; keep until module owner takes context |
| 2538 | `persistUser` | active implementation | retention/profile/dashboard glue; keep until module owner takes context |
| 2556 | `defaultProfileForName` | active implementation | retention/profile/dashboard glue; keep until module owner takes context |
| 2592 | `onLoginUI` | active implementation | retention/profile/dashboard glue; keep until module owner takes context |
| 2599 | `buildCalendarFromMeta` | active implementation | retention/profile/dashboard glue; keep until module owner takes context |
| 2680 | `sendToNode` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2695 | `postAuthenticatedJSON` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2737 | `isAuthUnavailable` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2773 | `updateSyncStatus` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2795 | `sendProfileToNode` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2799 | `getAuthToken` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2803 | `applyAuthenticatedShellVisibility` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2821 | `renderAuthShell` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2828 | `removeBuilderModeUiGuards` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2839 | `getActiveBlockingOverlay` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2858 | `setPilotBypassAuthState` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2862 | `activatePilotBypassImmediate` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2871 | `initializeAuth` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2901 | `submitAuthRequest` | compatibility delegator | delegates login/register submit fetch ownership to `auth-core.js` |
| 2906 | `handleLoginSubmit` | compatibility delegator | prevents native submit and delegates to `auth-core.js` |
| 2913 | `window.handleLoginButtonClick/handleLoginButtonClick` | compatibility delegator | preserves onclick bridge and delegates to `auth-core.js` |
| 2920 | `window.handleCreateAccountToggle/handleCreateAccountToggle` | compatibility delegator | preserves create-account onclick bridge and delegates to `auth-core.js` |
| 2927 | `onLogin` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2976 | `handleLogout` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2991 | `requireCoachRuntime` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 3001 | `speak` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 3005 | `unlockAudioOnce` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 3009 | `stopAllSpeech` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 3018 | `toggleListening` | compatibility delegator | coach/voice compatibility delegates to CoachRuntime where present |
| 2963 | `buildCanonicalWorkoutSelection` | active implementation | workout selection persistence; still load-bearing |
| 2978 | `persistCanonicalWorkoutSelection` | active implementation | workout selection persistence; still load-bearing |
| 2987 | `clearCanonicalWorkoutSelection` | active implementation | workout selection persistence; still load-bearing |
| 2993 | `renderWorkoutPlan` | active implementation | workout plan DOM renderer; still load-bearing |
| 3009 | `getKeypoint` | active implementation | pose/form helper; still load-bearing until pose extraction |
| 3014 | `getAngleDegrees` | active implementation | pose/form helper; still load-bearing until pose extraction |
| 3029 | `computeKneeValgus` | active implementation | pose/form helper; still load-bearing until pose extraction |
| 3037 | `analyzeSquatForm` | active implementation | pose/form helper; still load-bearing until pose extraction |
| 3076 | `getCurrentExerciseMeta` | compatibility delegator | delegates current exercise lookup to `WorkoutProgressionRuntime` |
| 3080 | `getCurrentExerciseId` | compatibility delegator | delegates through current exercise metadata |
| 3085 | `sendRepToNode` | active delegator | thin bridge to `RepRuntime.persistRepUpdate`; remains until rep/session state leaves inline |
| 3103 | `syncRepAnalysisState` | active delegator | syncs inline rep mirrors with `RepRuntime`; remains until rep state leaves inline |
| 3112 | `configureExtractedWorkoutRuntimes` | context delegator | passes refs/accessors into runtime-owned workout/session callback factories |
| 3178 | `sendOhsaToNode` | active implementation | OHSA write/fallback glue; still load-bearing |
| 3213 | `initDetector` | active implementation | inline helper closed over local runtime state |
| 3441 | `initOptionalTrackers` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3490 | `connectCamera` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3497 | `ensureRuntimeCalibration` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3505 | `updateAvatarCalibration` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3536 | `setLowerBodyVisibility` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3548 | `computeAvatarAnchorTransform` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3663 | `applyPoseToAvatarRig` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3683 | `getRest` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3684 | `relaxToRest` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3689 | `applyTrackedAxis` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3723 | `score` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3737 | `angle` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3742 | `record` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3777 | `renderAvatar3d` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3931 | `drawProceduralAvatar` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3935 | `get` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3936 | `good` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3965 | `drawLimb` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4000 | `runPoseLoop` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4029 | `startWorkout` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4036 | `handleWorkoutSelectChange` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4065 | `getPoseConfidenceSnapshot` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4066 | `score` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4067 | `kp` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4082 | `runAvatarTrace` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4240 | `attachAvatarTraceHarness` | active implementation | inline helper closed over local runtime state |
| 4264 | `getPrimaryNavHandlerStatus` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 4275 | `updateAuthPropagationStatus` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 4277 | `updateActivationStatusPanel` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 4279 | `runPendingPanelWatchdogs` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 4281 | `window.__forceAuthPropagationRender` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 4282 | `window.__forceAppActivationRender` | compatibility delegator | delegates to extracted runtime/status-panel owner |

## Recommended final removal order

1. **Completed in Phase 7A — remove inline no-op diagnostics/builders shims**: deleted only `forceBuilderFullAccessAuthState`, `enforceBuilderOverlayBypass`, and `installClickDiagnostics`; repository search found no runtime module dependency on these exact inline implementations.
2. **Completed in this pass — extract auth submit compatibility into `auth-core.js`**: `submitAuthRequest`, `handleLoginSubmit`, `handleLoginButtonClick`, `handleCreateAccountToggle`, `bindAuthLoginForm`, `renderAuthMode`, and auth step/status helpers moved behind the external auth form owner. Temporary inline and `auth-ui.js` delegators remain for `window.handleLoginButtonClick`/onclick compatibility without owning fetches.
3. **Consolidate auth shell/profile after auth submit**: migrate `initializeAuth`, `onLogin`, `handleLogout`, `applyAuthenticatedShellVisibility`, `renderAuthShell`, `persistUser`, `defaultProfileForName`, `onLoginUI`, `sendProfileToNode`, and `updateSyncStatus` into auth/profile runtimes. Remove inline `APP_AUTH` mutation only after auth-core/auth-state-runtime are the single writer.
4. **Collapse retention/dashboard hydration delegates**: after auth/profile are single-owner, move `ensureRetentionFlowLoaded`, `buildCalendarFromMeta`, dashboard refresh timing, and status-panel refresh callbacks into `app-hydration-runtime.js`/`dashboard-runtime.js`.
5. **Completed in this pass — move workout/session callback bodies**: `WorkoutRuntime.createSessionCallbackGlue` and `WorkoutProgressionRuntime.createSessionCallbackGlue` now own the session start/stop/error, completion, retention signal, and rep-analysis callback bodies. The unused `sendStartSessionToNode` helper was removed. Remaining workout inline work is selection persistence, `renderWorkoutPlan`, `sendRepToNode`, `sendOhsaToNode`, `syncRepAnalysisState`, and thin local state/context accessors.
6. **Move pose loop ownership**: migrate `initDetector`, `initOptionalTrackers`, `connectCamera`, `runPoseLoop`, pose confidence helpers, and squat analysis helpers to `pose-runtime.js`/`rep-analysis-runtime.js`. Keep temporary global delegators for `connectCamera` and `startWorkout`.
7. **Move avatar heavy implementation last**: migrate Three bootstrap, render-mode/stage controls, GLB probe/mount, rig mapping, `applyPoseToAvatarRig`, `renderAvatar3d`, `drawProceduralAvatar`, modal controls, and Avaturn message/profile writeback into `avatar-runtime.js`. This should be last because it depends on stabilized pose/workout/profile context.
8. **Remove boot/status final delegates**: once all runtime owners expose their status directly, remove inline boot diagnostics, final handler checks, and status-panel rescue globals.

## Test result for latest workout/session glue extraction

The requested checks passed after extracting workout/session callback glue and updating this report:

- `npm run lint`
- `node --test test/pilot-login.test.js test/auth-login-form-submit.test.js test/session-api.test.js test/retention-api.test.js`
