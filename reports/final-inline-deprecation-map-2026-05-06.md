# Final Inline Deprecation Map — 2026-05-06

## Scope and measurement

This audit covers the synchronized landing page copies at `index.html` and `public/index.html` after the assessment/OHSA extraction pass. The remaining inline script is now primarily compatibility glue plus the still-load-bearing auth/profile shell, boot diagnostics, pose/camera loop, rep/HUD glue, and avatar renderer/model implementation.

### Current inline script size

| File | Inline script blocks | Total inline bytes | Total inline lines | Largest inline block | Remaining function/arrow count |
|---|---:|---:|---:|---:|---:|
| `index.html` | 4 | 134,858 | 3,028 | 134,269 bytes / 3,013 lines (`<script>` starting at line 943) | 137 |
| `public/index.html` | 4 | 134,858 | 3,028 | 134,269 bytes / 3,013 lines (`<script>` starting at line 943) | 137 |

Measured with a Python `HTMLParser` inline-script extraction command against both synchronized HTML files. The function/arrow count includes named inline `function` declarations, `const`/`let`/`var` arrow-function bindings, and global `window.*` function/arrow aliases; it intentionally excludes anonymous object-literal callback arrows passed into extracted runtime configuration objects. The classification table below combines same-line global aliases with their local function bindings, so it has 134 rows for the 137 counted bindings.

## Remaining inline ownership

| Area | Extracted/current external owner | Remaining inline owner | Status | Risk |
|---|---|---|---|---|
| Auth/auth state | `auth-core.js`, `auth-state-runtime.js`, `auth-ui.js`, `backend-read.js`, `profile-write-runtime.js` | `initializeAuth`, `onLogin`, `handleLogout`, pilot bypass, shell visibility, `APP_AUTH`/profile bridging, plus temporary submit/button globals | Fetch ownership is external; shell/profile lifecycle remains inline. | High |
| Boot/status panels | `boot-core.js`, `runtime-events.js`, `runtime-state.js`, `status-panels.js`, `runtime-orchestrator.js` | `updateAppBootStatus`, build stamp refresh, boot contract checks, pilot event diagnostics, final handler checks | External boot/status owners exist, but inline still renders and gates visible diagnostics. | Medium/high |
| Profile display/write | `profile-runtime.js`, `profile-write-runtime.js`, `backend-read.js`, `app-hydration-runtime.js` | `persistUser`, `defaultProfileForName`, `onLoginUI`, `sendProfileToNode`, sync status, avatar profile callbacks | Write runtime owns the extracted save path; inline still owns shared profile state and fallbacks. | High |
| Retention/hydration/dashboard | `retention-loader-runtime.js`, `app-hydration-runtime.js`, `dashboard-runtime.js`, `dashboard.js` | `ensureRetentionFlowLoaded` alias, calendar meta builder, auth-ready refresh timing/status coupling | Mostly delegator/ordering glue, but coupled to auth/profile state. | Medium/high |
| Workout lifecycle/OHSA | `workout-runtime.js`, `workout-progression-runtime.js`, `runtime-orchestrator.js`, `assessment-runtime.js` | selection persistence, plan rendering, `startWorkout`, `startOhsa`, `startDefineExercise`, local state/context accessors | Lifecycle callbacks and OHSA assessment writes are extracted; camera/start orchestration remains inline. | High |
| Pose/rep analysis/persistence | `pose-runtime.js`, `rep-analysis-runtime.js`, `rep-runtime.js`, `session-write.js` | detector init, optional trackers, camera loop, squat analysis helpers, `sendRepToNode`, rep state mirrors | Runtimes exist, but inline still starts and feeds the loop/persistence bridge. | Highest |
| HUD/progression | `hud-runtime.js`, `workout-progression-runtime.js`, `status-panels.js` | `getPrimaryCue`, `renderWorkoutHud`, progress/tracker status glue | Runtime modules are configured externally; inline still computes pushed HUD state. | Medium/high |
| Coach/voice | `coach-runtime.js` | `requireCoachRuntime`, `speak`, `unlockAudioOnce`, `stopAllSpeech`, `toggleListening` | Thin delegators to extracted coach runtime. | Low/medium |
| Avatar | `avatar-runtime.js`, `runtime-bridges.js`, `profile-write-runtime.js` | Three bootstrap, GLB probe/mount, render-mode/stage/facing controls, rig helpers, procedural renderer, modal/profile writeback callbacks | Runtime owns control registration; inline still owns heavy renderer/model implementation. | Highest |

## Remaining inline active implementations

- **Boot/status/pilot diagnostics:** `updateAppBootStatus`, `isBootContractReady`, `appendPilotEventLocal`, `trackPilotEvent`, `emitPilotEvent`, `refreshBuildStamp`, `logMobileControlTruth`, `getPrimaryNavHandlerStatus`.
- **Auth/profile/hydration:** `persistUser`, `defaultProfileForName`, `onLoginUI`, `sendToNode`, `postAuthenticatedJSON`, `isAuthUnavailable`, `updateSyncStatus`, `sendProfileToNode`, `getAuthToken`, `applyAuthenticatedShellVisibility`, `renderAuthShell`, `removeBuilderModeUiGuards`, `getActiveBlockingOverlay`, `setPilotBypassAuthState`, `activatePilotBypassImmediate`, `initializeAuth`, `onLogin`, `handleLogout`, `markPerfMetric`, `buildCalendarFromMeta`, `ensureRetentionFlowLoaded`.
- **Workout/OHSA/rep/HUD:** `requireWorkoutProgressionRuntime`, active workout state/plan accessors, `getPrimaryCue`, `renderWorkoutHud`, canonical workout selection persistence, `renderWorkoutPlan`, squat-analysis helpers, `sendRepToNode`, `syncRepAnalysisState`, `configureExtractedWorkoutRuntimes`, `startOhsa`, `startDefineExercise`, `startWorkout`, `handleWorkoutSelectChange`.
- **Pose/camera:** `initDetector`, `initOptionalTrackers`, `connectCamera`, `runPoseLoop`, pose-confidence helpers, avatar trace harness.
- **Avatar/rendering:** avatar runtime status/diagnostics, Three/GLTF dependency resolution, render-loop bootstrap, camera fullscreen UI, skeleton/bone mapping, render-mode/stage/facing controls, asset probing/mounting, modal helpers, procedural avatar drawing.

## Remaining compatibility delegators

- `renderSystemBootStatus` delegates boot/status rendering to `StatusPanels`.
- `window.__retryAvatarRuntime`/`retryAvatarRuntime` is a global retry shim around the avatar runtime bootstrap.
- `submitAuthRequest`, `handleLoginSubmit`, `window.handleLoginButtonClick`/`handleLoginButtonClick`, and `window.handleCreateAccountToggle`/`handleCreateAccountToggle` delegate auth submit/create-account behavior to `auth-core.js`/`auth-ui.js` compatibility paths.
- `speak`, `unlockAudioOnce`, `stopAllSpeech`, and `toggleListening` delegate to `coach-runtime.js` when available.
- `updateAuthPropagationStatus`, `updateActivationStatusPanel`, `runPendingPanelWatchdogs`, `window.__forceAuthPropagationRender`, and `window.__forceAppActivationRender` delegate to extracted status-panel/runtime owners.

## Safe removals

- **No remaining active inline implementation is safe to delete immediately.** The remaining non-delegator bodies close over inline state or DOM refs and still participate in auth/profile boot, hydration, workout, pose/camera, rep persistence, HUD, or avatar rendering.
- **Safe after call-site rewiring:** the auth button globals (`window.handleLoginButtonClick`, `window.handleCreateAccountToggle`) can be removed after inline `onclick`/external tests use the extracted auth form owner directly.
- **Safe after status panels become single-owner:** `renderSystemBootStatus`, `updateAuthPropagationStatus`, `updateActivationStatusPanel`, `runPendingPanelWatchdogs`, `window.__forceAuthPropagationRender`, and `window.__forceAppActivationRender`.
- **Safe after avatar bootstrap owns retry/status directly:** `window.__retryAvatarRuntime`/`retryAvatarRuntime`.
- **Already removed in prior passes:** no-op builder/diagnostic shims (`forceBuilderFullAccessAuthState`, `enforceBuilderOverlayBypass`, `installClickDiagnostics`), unused session-start helper, extracted workout/session callback bodies, and extracted OHSA assessment persistence/callback bodies.

## Remaining dangerous/load-bearing sections

1. **Auth/profile shell lifecycle:** `initializeAuth`, `onLogin`, `handleLogout`, pilot bypass, authenticated shell visibility, profile fallback writes, and `APP_AUTH`/`USER_PROFILE`/`USER_ID` mutation remain load-bearing.
2. **Boot/status diagnostics:** inline build stamp, boot contract checks, propagation panels, and handler checks still determine visible readiness/failure state.
3. **Hydration/retention/dashboard ordering:** retention loader, calendar meta, dashboard refresh, and profile hydration remain coupled to inline auth/profile timing.
4. **Workout/OHSA/rep loop:** workout selection, start/connect flow, rep analysis sync, `sendRepToNode`, OHSA/define-exercise entrypoints, and runtime context accessors still depend on inline state.
5. **Pose/camera loop:** detector initialization, optional trackers, `connectCamera`, `runPoseLoop`, confidence scoring, and camera error handling are still the highest-risk active inline runtime.
6. **Avatar renderer/model pipeline:** Three bootstrap, GLB probe/mount, render-loop, render-mode/stage/facing controls, skeleton mapping, procedural fallback drawing, and avatar modal/profile callbacks remain heavy and load-bearing.

## All remaining inline functions and classification

| Line | Function | Classification | Removal note |
|---:|---|---|---|
| 996 | `updateAppBootStatus` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 1074 | `renderSystemBootStatus` | compatibility delegator | remove only after external runtime/call sites no longer need the global shim |
| 1075 | `isBootContractReady` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 1127 | `appendPilotEventLocal` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 1136 | `trackPilotEvent` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 1160 | `emitPilotEvent` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 1164 | `getAvatarRuntimeStatusRef` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1217 | `updateAvatarOverlayDiagnostics` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1230 | `setAvatarRuntimeFailure` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1246 | `refreshBuildStamp` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 1274 | `logMobileControlTruth` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 1331 | `requireWorkoutProgressionRuntime` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1336 | `getActiveWorkoutState` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1340 | `getActiveWorkoutPlan` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1344 | `hydrateActiveWorkoutPlan` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1348 | `updateActiveWorkoutState` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1354 | `getPrimaryCue` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1362 | `renderWorkoutHud` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1474 | `logTrackerCapabilities` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1478 | `updateTrackingMode` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1518 | `getThreeGlobal` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1523 | `getGltfLoaderCtor` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1528 | `updateAvatarRuntimeRenderModeStatus` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1557 | `logAvatarWebglAvailability` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1568 | `ensureAvatarThreeRuntimeDependencies` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1585 | `onReady` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1589 | `onFailed` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1598 | `cleanup` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1626 | `logAvatarCanvasState` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1644 | `ensureAvatarRenderLoop` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1649 | `loop` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1665 | `ensureAvatarThreeRuntime` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1789 | `setAvatar3dCanvasVisibility` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1793 | `resizeAvatarThreeRuntime` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1797 | `initializeAvatarRuntimeBootstrap` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1817 | `window.__retryAvatarRuntime/retryAvatarRuntime` | compatibility delegator | remove only after external runtime/call sites no longer need the global shim |
| 1841 | `refreshCameraUiState` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1856 | `setCameraFullscreen` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1869 | `findFirstSkeleton` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1879 | `mapAvatarBones` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1882 | `findBone` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1905 | `sanitizeRenderMode` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1909 | `getRenderModeLabel` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1915 | `updateRenderModeStatus` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1921 | `sanitizeStageMode` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1925 | `resolveInitialStageMode` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1933 | `applyAvatarStageMode` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1957 | `applyRenderModeSelection` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2002 | `fallbackRenderModeToCamera` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2015 | `resolveInitialRenderMode` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2029 | `sanitizeAvatarFacingDeg` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2034 | `applyAvatarFacingCalibration` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2054 | `resolveInitialAvatarFacingDeg` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2062 | `getRenderMode` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2067 | `setPersonLayerSuppressed` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2072 | `isLikelyHttpUrl` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2082 | `resolveAvatarModelUrl` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2098 | `setAvatarRuntimeStatus` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2105 | `setAvatarAssetStatus` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2117 | `normalizeAvatarProfile` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2131 | `probeAvatarModelRuntime` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2173 | `mountAvatarGlbModel` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2302 | `toRotation` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2350 | `loadAvatarAssetForCurrentUser` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2394 | `openAvatarModal` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2407 | `closeAvatarModal` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2415 | `addLog` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2423 | `updateAuthDebug` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2447 | `markPerfMetric` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2452 | `ensureRetentionFlowLoaded` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2456 | `persistUser` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2474 | `defaultProfileForName` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2485 | `onLoginUI` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2489 | `buildCalendarFromMeta` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2493 | `sendToNode` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2508 | `postAuthenticatedJSON` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2550 | `isAuthUnavailable` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2586 | `updateSyncStatus` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2608 | `sendProfileToNode` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2612 | `getAuthToken` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2616 | `applyAuthenticatedShellVisibility` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2634 | `renderAuthShell` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2641 | `removeBuilderModeUiGuards` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2652 | `getActiveBlockingOverlay` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2671 | `setPilotBypassAuthState` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2675 | `activatePilotBypassImmediate` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2684 | `initializeAuth` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2714 | `submitAuthRequest` | compatibility delegator | remove only after external runtime/call sites no longer need the global shim |
| 2719 | `handleLoginSubmit` | compatibility delegator | remove only after external runtime/call sites no longer need the global shim |
| 2726 | `window.handleLoginButtonClick/handleLoginButtonClick` | compatibility delegator | remove only after external runtime/call sites no longer need the global shim |
| 2733 | `window.handleCreateAccountToggle/handleCreateAccountToggle` | compatibility delegator | remove only after external runtime/call sites no longer need the global shim |
| 2740 | `onLogin` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2744 | `handleLogout` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 2759 | `requireCoachRuntime` | active implementation | inline closure/callback helper; audit with surrounding runtime configure block before removal |
| 2769 | `speak` | compatibility delegator | remove only after external runtime/call sites no longer need the global shim |
| 2773 | `unlockAudioOnce` | compatibility delegator | remove only after external runtime/call sites no longer need the global shim |
| 2777 | `stopAllSpeech` | compatibility delegator | remove only after external runtime/call sites no longer need the global shim |
| 2786 | `toggleListening` | compatibility delegator | remove only after external runtime/call sites no longer need the global shim |
| 2881 | `buildCanonicalWorkoutSelection` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 2896 | `persistCanonicalWorkoutSelection` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 2905 | `clearCanonicalWorkoutSelection` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 2911 | `renderWorkoutPlan` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 2927 | `getKeypoint` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 2932 | `getAngleDegrees` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 2947 | `computeKneeValgus` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 2955 | `analyzeSquatForm` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 2994 | `getCurrentExerciseMeta` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 2998 | `getCurrentExerciseId` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 3003 | `sendRepToNode` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 3021 | `syncRepAnalysisState` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 3030 | `configureExtractedWorkoutRuntimes` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 3109 | `initDetector` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 3153 | `initOptionalTrackers` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 3202 | `connectCamera` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 3252 | `drawProceduralAvatar` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 3256 | `get` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 3257 | `good` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 3286 | `drawLimb` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 3322 | `startOhsa` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 3329 | `startDefineExercise` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 3335 | `runPoseLoop` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 3361 | `startWorkout` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 3368 | `handleWorkoutSelectChange` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 3397 | `getPoseConfidenceSnapshot` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 3398 | `score` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 3399 | `kp` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 3414 | `runAvatarTrace` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 3572 | `attachAvatarTraceHarness` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 3596 | `getPrimaryNavHandlerStatus` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 3607 | `updateAuthPropagationStatus` | compatibility delegator | remove only after external runtime/call sites no longer need the global shim |
| 3609 | `updateActivationStatusPanel` | compatibility delegator | remove only after external runtime/call sites no longer need the global shim |
| 3611 | `runPendingPanelWatchdogs` | compatibility delegator | remove only after external runtime/call sites no longer need the global shim |
| 3613 | `window.__forceAuthPropagationRender` | compatibility delegator | remove only after external runtime/call sites no longer need the global shim |
| 3614 | `window.__forceAppActivationRender` | compatibility delegator | remove only after external runtime/call sites no longer need the global shim |

## Recommended final cleanup sequence

1. **Freeze compatibility contracts and tests:** keep the current synchronized HTML copies stable while tests assert the extracted auth, retention, session, performance lazy-load, and OHSA paths.
2. **Remove auth submit globals first:** replace inline/global auth button call sites with direct `auth-core.js`/`auth-ui.js` ownership, then delete `submitAuthRequest`, `handleLoginSubmit`, `handleLoginButtonClick`, and `handleCreateAccountToggle` delegators.
3. **Consolidate auth shell/profile state:** migrate `initializeAuth`, `onLogin`, `handleLogout`, shell visibility, `persistUser`, `defaultProfileForName`, `onLoginUI`, `sendProfileToNode`, and `updateSyncStatus` into auth/profile runtimes; only then remove inline `APP_AUTH`, `USER_ID`, and `USER_PROFILE` writers.
4. **Move hydration/retention/dashboard ordering:** transfer `ensureRetentionFlowLoaded`, `buildCalendarFromMeta`, dashboard refresh timing, and status refresh callbacks into `app-hydration-runtime.js`, `retention-loader-runtime.js`, and `dashboard-runtime.js`.
5. **Move workout/OHSA/rep context accessors:** migrate selection persistence, `renderWorkoutPlan`, `startOhsa`, `startDefineExercise`, `sendRepToNode`, `syncRepAnalysisState`, and local workout state accessors into workout/assessment/rep runtimes.
6. **Move pose/camera ownership:** migrate `initDetector`, `initOptionalTrackers`, `connectCamera`, `runPoseLoop`, pose confidence, and squat analyzer helpers to pose/rep-analysis runtimes with temporary global start/connect delegators.
7. **Move avatar heavy implementation last:** migrate Three bootstrap, GLB loading/probing/mounting, render loop, rig/skeleton mapping, render-mode/stage/facing controls, procedural renderer, trace harness, and avatar modal/profile callbacks to `avatar-runtime.js`.
8. **Delete final status/boot shims:** once the major runtime owners are single-owner, remove boot/status compatibility delegators and final handler rescue globals.

## Test result for final inline deprecation audit

The requested checks passed for this audit:

- `npm run lint`
- `node --test test/pilot-login.test.js test/auth-login-form-submit.test.js test/session-api.test.js test/retention-api.test.js test/performance-lazyload.test.js`
