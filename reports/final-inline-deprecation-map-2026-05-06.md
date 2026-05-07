# Final Inline Deprecation Map — 2026-05-06

## Scope and measurement

This audit covers the synchronized landing page copies at `index.html` and `public/index.html`. Phase 7A removed only explicit no-op inline compatibility shims and left active runtime bridges/helpers untouched.

### Current inline script size

| File | Inline script blocks | Total inline bytes | Total inline lines | Largest inline block |
|---|---:|---:|---:|---:|
| `index.html` | 4 | 177,922 | 3,781 | 177,333 bytes / 3,766 lines (`<script>` starting at line 942) |
| `public/index.html` | 4 | 177,922 | 3,781 | 177,333 bytes / 3,766 lines (`<script>` starting at line 942) |

Measured with a Python inline-script extraction command against both synchronized HTML files. The same measurement pass counts 148 remaining inline function declarations/arrow-function bindings in each copy, down from 151 before removing the three no-op shims.

## Final inline ownership map

| Area | Extracted/current external owner | Remaining inline owner | Duplicate-owner status | Risk |
|---|---|---|---|---|
| Auth | `auth-core.js`, `auth-state-runtime.js`, `backend-read.js`, `profile-write-runtime.js` | Login form submit/register flow, `initializeAuth`, `onLogin`, `handleLogout`, shell visibility, pilot bypass, profile write fallback | **Duplicate owner remains.** Auth core and inline both bind/submit auth login compatibility paths. | Highest: dangerous/load-bearing. |
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

1. **Inline auth submit/login compatibility flow**: `submitAuthRequest`, `handleLoginSubmit`, `bindAuthLoginForm`, `onLogin`, `handleLogout`, pilot bypass, auth shell visibility, and profile push are still the most dangerous section because they mutate `APP_AUTH`, localStorage, overlay visibility, and profile/dashboard/retention follow-up.
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
| 2901 | `updateAuthStepStatus` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2906 | `showAuthBindingError` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2912 | `renderAuthMode` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2922 | `submitAuthRequest` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2986 | `handleLoginSubmit` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2993 | `window.handleLoginButtonClick/handleLoginButtonClick` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 3000 | `window.handleCreateAccountToggle/handleCreateAccountToggle` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 3009 | `bindAuthLoginForm` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 3053 | `onLogin` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 3102 | `handleLogout` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 3117 | `requireCoachRuntime` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 3127 | `speak` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 3131 | `unlockAudioOnce` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 3135 | `stopAllSpeech` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 3144 | `toggleListening` | compatibility delegator | coach/voice compatibility delegates to CoachRuntime where present |
| 3239 | `buildCanonicalWorkoutSelection` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3254 | `persistCanonicalWorkoutSelection` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3263 | `clearCanonicalWorkoutSelection` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3269 | `renderWorkoutPlan` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3285 | `getKeypoint` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3290 | `getAngleDegrees` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3305 | `computeKneeValgus` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3313 | `analyzeSquatForm` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3352 | `getCurrentExerciseMeta` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3356 | `getCurrentExerciseId` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3360 | `sendStartSessionToNode` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3371 | `sendRepToNode` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3389 | `syncRepAnalysisState` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3398 | `configureExtractedWorkoutRuntimes` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3488 | `sendOhsaToNode` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3523 | `initDetector` | active implementation | inline helper closed over local runtime state |
| 3567 | `initOptionalTrackers` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3616 | `connectCamera` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3623 | `ensureRuntimeCalibration` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3631 | `updateAvatarCalibration` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3662 | `setLowerBodyVisibility` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3674 | `computeAvatarAnchorTransform` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3789 | `applyPoseToAvatarRig` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3809 | `getRest` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3810 | `relaxToRest` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3815 | `applyTrackedAxis` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3849 | `score` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3863 | `angle` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3868 | `record` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3903 | `renderAvatar3d` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4057 | `drawProceduralAvatar` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4061 | `get` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4062 | `good` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4091 | `drawLimb` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4126 | `runPoseLoop` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4155 | `startWorkout` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4162 | `handleWorkoutSelectChange` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4191 | `getPoseConfidenceSnapshot` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4192 | `score` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4193 | `kp` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4208 | `runAvatarTrace` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4366 | `attachAvatarTraceHarness` | active implementation | inline helper closed over local runtime state |
| 4390 | `getPrimaryNavHandlerStatus` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 4401 | `updateAuthPropagationStatus` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 4403 | `updateActivationStatusPanel` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 4405 | `runPendingPanelWatchdogs` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 4407 | `window.__forceAuthPropagationRender` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 4408 | `window.__forceAppActivationRender` | compatibility delegator | delegates to extracted runtime/status-panel owner |

## Recommended final removal order

1. **Completed in Phase 7A — remove inline no-op diagnostics/builders shims**: deleted only `forceBuilderFullAccessAuthState`, `enforceBuilderOverlayBypass`, and `installClickDiagnostics`; repository search found no runtime module dependency on these exact inline implementations.
2. **Next recommended target — extract auth submit compatibility into `auth-core.js` or a new auth-form runtime**: move `submitAuthRequest`, `handleLoginSubmit`, `handleLoginButtonClick`, `handleCreateAccountToggle`, `bindAuthLoginForm`, `renderAuthMode`, and auth step/status helpers behind one owner. Keep a temporary `window.handleLoginButtonClick` delegator for tests and inline onclick compatibility.
3. **Consolidate auth shell/profile after auth submit**: migrate `initializeAuth`, `onLogin`, `handleLogout`, `applyAuthenticatedShellVisibility`, `renderAuthShell`, `persistUser`, `defaultProfileForName`, `onLoginUI`, `sendProfileToNode`, and `updateSyncStatus` into auth/profile runtimes. Remove inline `APP_AUTH` mutation only after auth-core/auth-state-runtime are the single writer.
4. **Collapse retention/dashboard hydration delegates**: after auth/profile are single-owner, move `ensureRetentionFlowLoaded`, `buildCalendarFromMeta`, dashboard refresh timing, and status-panel refresh callbacks into `app-hydration-runtime.js`/`dashboard-runtime.js`.
5. **Move workout/session callback bodies**: migrate workout selection persistence, `renderWorkoutPlan`, `sendStartSessionToNode`, `sendRepToNode`, `sendOhsaToNode`, `syncRepAnalysisState`, and `configureExtractedWorkoutRuntimes` callback construction into `workout-runtime.js`/`session-write.js` with a context factory.
6. **Move pose loop ownership**: migrate `initDetector`, `initOptionalTrackers`, `connectCamera`, `runPoseLoop`, pose confidence helpers, and squat analysis helpers to `pose-runtime.js`/`rep-analysis-runtime.js`. Keep temporary global delegators for `connectCamera` and `startWorkout`.
7. **Move avatar heavy implementation last**: migrate Three bootstrap, render-mode/stage controls, GLB probe/mount, rig mapping, `applyPoseToAvatarRig`, `renderAvatar3d`, `drawProceduralAvatar`, modal controls, and Avaturn message/profile writeback into `avatar-runtime.js`. This should be last because it depends on stabilized pose/workout/profile context.
8. **Remove boot/status final delegates**: once all runtime owners expose their status directly, remove inline boot diagnostics, final handler checks, and status-panel rescue globals.

## Test result for Phase 7A

The requested checks passed after removing the three no-op shims and updating this report:

- `npm run lint`
- `node --test test/pilot-login.test.js test/auth-login-form-submit.test.js test/session-api.test.js test/retention-api.test.js`
