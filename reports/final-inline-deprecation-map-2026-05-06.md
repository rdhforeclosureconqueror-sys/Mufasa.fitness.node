# Final Inline Deprecation Map — 2026-05-06

## Scope and measurement

This audit covers the synchronized landing page copies at `index.html` and `public/index.html`. Phase 7A removed only explicit no-op inline compatibility shims and left active runtime bridges/helpers untouched.

### Current inline script size

| File | Inline script blocks | Total inline bytes | Total inline lines | Largest inline block |
|---|---:|---:|---:|---:|
| `index.html` | 4 | 171,683 | 3,655 | 171,094 bytes / 3,640 lines (`<script>` starting at line 942) |
| `public/index.html` | 4 | 171,683 | 3,655 | 171,094 bytes / 3,640 lines (`<script>` starting at line 942) |

Measured with a Python inline-script extraction command against both synchronized HTML files. The same measurement pass counts 144 remaining inline function declarations/arrow-function bindings in each copy, down from 148 before extracting the auth submit/register/login request owner into `auth-core.js`.

## Final inline ownership map

| Area | Extracted/current external owner | Remaining inline owner | Duplicate-owner status | Risk |
|---|---|---|---|---|
| Auth | `auth-core.js`, `auth-state-runtime.js`, `backend-read.js`, `profile-write-runtime.js` | Thin inline submit/button/register delegators, `initializeAuth`, `onLogin`, `handleLogout`, shell visibility, pilot bypass, profile write fallback | **Submit duplicate removed.** `auth-core.js` is now the login/register form request owner; inline and `auth-ui.js` keep only temporary delegators and post-login/profile shell ownership. | High: remaining load-bearing auth/profile lifecycle. |
| Boot | `boot-core.js`, `runtime-events.js`, `runtime-state.js`, `status-panels.js`, `runtime-orchestrator.js` | `updateAppBootStatus`, build stamp refresh, boot contract/status diagnostics, final handler checks | **Duplicate owner remains.** External boot core fetches version while inline still refreshes build stamp and owns visible boot diagnostics. | Medium/high. |
| Profile | `profile-runtime.js`, `profile-write-runtime.js`, `backend-read.js`, `app-hydration-runtime.js` | `persistUser`, `defaultProfileForName`, `onLoginUI`, `sendProfileToNode`, sync status, avatar profile callbacks | **Duplicate owner remains.** Profile read/write/hydration split across modules and inline. | High. |
| Retention | `retention-loader-runtime.js`, `app-hydration-runtime.js`, dashboard/profile runtimes | `ensureRetentionFlowLoaded` alias and post-login/dashboard refresh coupling | **Mostly delegator duplicate.** Loader moved out; inline still controls when auth/profile invokes it. | Medium. |
| Workout | `workout-runtime.js`, `workout-progression-runtime.js`, `runtime-orchestrator.js` | workout selection persistence, `startWorkout`, `connectCamera`, workout plan rendering, session start/complete glue | **Duplicate owner remains.** Runtime owns core controls but inline owns callbacks and state. | Highest. |
| Pose | `pose-runtime.js`, `rep-analysis-runtime.js` | detector init, camera loop, optional trackers, pose confidence, form analyzer helpers, avatar pose packet production | **Duplicate owner remains.** Runtime modules exist but inline still starts detector/loop and feeds downstream owners. | Highest. |
| Rep | `rep-runtime.js`, `rep-analysis-runtime.js`, `session-write.js` | `sendRepToNode`, `syncRepAnalysisState`, squat analysis, rep mirrors | **Duplicate owner remains.** Extracted rep/session modules coexist with inline counters and callbacks. | High. |
| HUD | `hud-runtime.js`, `status-panels.js` | `renderWorkoutHud`, primary cue selection, progress/tracker status glue | **Duplicate owner remains.** HUD module is configured externally, but inline still computes and pushes display state. | Medium/high. |
| Coach | `coach-runtime.js` | `requireCoachRuntime`, `speak`, `unlockAudioOnce`, `stopAllSpeech`, `toggleListening` | **Thin duplicate/delegator.** Most voice operations delegate when runtime exists. | Lower; remove after auth/workout callbacks are migrated. |
| Avatar | `avatar-runtime.js`, `runtime-bridges.js` | Three runtime bootstrap, GLB load/mount, render-mode/stage controls, Avaturn modal, rig application, procedural drawing | **Duplicate owner remains.** Extracted runtime owns control registration, but inline still owns renderer/model/rig heavy implementation. | Highest. |
| Dashboard | `dashboard-runtime.js`, `dashboard.js`, `app-hydration-runtime.js`, `button-runtime.js` | auth-ready refresh callbacks, calendar/progress/dashboard status coupling | **Duplicate owner remains.** Inline still wires refresh timing and profile/retention prerequisites. | Medium/high. |
| Exercise library | `exercise-library.js`, `button-runtime.js`, `app-core.js` | navigation/final button-handler compatibility checks in main landing page | **Thin duplicate/delegator.** Standalone library owner exists; landing page still has nav compatibility. | Low. |

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
| 3113 | `buildCanonicalWorkoutSelection` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3128 | `persistCanonicalWorkoutSelection` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3137 | `clearCanonicalWorkoutSelection` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3143 | `renderWorkoutPlan` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3159 | `getKeypoint` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3164 | `getAngleDegrees` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3179 | `computeKneeValgus` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3187 | `analyzeSquatForm` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3226 | `getCurrentExerciseMeta` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3230 | `getCurrentExerciseId` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3234 | `sendStartSessionToNode` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3245 | `sendRepToNode` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3263 | `syncRepAnalysisState` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3272 | `configureExtractedWorkoutRuntimes` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3362 | `sendOhsaToNode` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3397 | `initDetector` | active implementation | inline helper closed over local runtime state |
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
5. **Move workout/session callback bodies**: migrate workout selection persistence, `renderWorkoutPlan`, `sendStartSessionToNode`, `sendRepToNode`, `sendOhsaToNode`, `syncRepAnalysisState`, and `configureExtractedWorkoutRuntimes` callback construction into `workout-runtime.js`/`session-write.js` with a context factory.
6. **Move pose loop ownership**: migrate `initDetector`, `initOptionalTrackers`, `connectCamera`, `runPoseLoop`, pose confidence helpers, and squat analysis helpers to `pose-runtime.js`/`rep-analysis-runtime.js`. Keep temporary global delegators for `connectCamera` and `startWorkout`.
7. **Move avatar heavy implementation last**: migrate Three bootstrap, render-mode/stage controls, GLB probe/mount, rig mapping, `applyPoseToAvatarRig`, `renderAvatar3d`, `drawProceduralAvatar`, modal controls, and Avaturn message/profile writeback into `avatar-runtime.js`. This should be last because it depends on stabilized pose/workout/profile context.
8. **Remove boot/status final delegates**: once all runtime owners expose their status directly, remove inline boot diagnostics, final handler checks, and status-panel rescue globals.

## Test result for latest auth submit extraction

The requested checks passed after extracting auth submit ownership and updating this report:

- `npm run lint`
- `node --test test/pilot-login.test.js test/auth-login-form-submit.test.js test/session-api.test.js test/retention-api.test.js`
