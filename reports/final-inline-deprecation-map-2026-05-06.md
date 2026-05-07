# Final Inline Deprecation Map — 2026-05-06

## Scope and measurement

This audit covers the synchronized landing page copies at `index.html` and `public/index.html`. The only code change in this pass is this report; no inline runtime code was removed.

### Current inline script size

| File | Inline script blocks | Total inline bytes | Total inline lines | Largest inline block |
|---|---:|---:|---:|---:|
| `index.html` | 4 | 178,072 | 3,784 | 177,483 bytes / 3,769 lines (`<script>` starting at line 942) |
| `public/index.html` | 4 | 178,072 | 3,784 | 177,483 bytes / 3,769 lines (`<script>` starting at line 942) |

Measured with a Python inline-script extraction command against both synchronized HTML files.

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

## Safe removals already visible

These can be removed first after a one-canary verification because they are explicit no-op compatibility shims:

1. `forceBuilderFullAccessAuthState`.
2. `enforceBuilderOverlayBypass`.
3. `installClickDiagnostics`.

Do **not** remove the similarly named runtime bridge helpers yet; only the inline no-op aliases are safe candidates.

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
| 1006 | `forceBuilderFullAccessAuthState` | dead/legacy | safe to remove after one canary; no-op compatibility shim |
| 1008 | `enforceBuilderOverlayBypass` | dead/legacy | safe to remove after one canary; no-op compatibility shim |
| 1009 | `installClickDiagnostics` | dead/legacy | safe to remove after one canary; no-op compatibility shim |
| 1076 | `renderSystemBootStatus` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 1077 | `isBootContractReady` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 1129 | `appendPilotEventLocal` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 1138 | `trackPilotEvent` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 1162 | `emitPilotEvent` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 1166 | `getAvatarRuntimeStatusRef` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1219 | `updateAvatarOverlayDiagnostics` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1232 | `setAvatarRuntimeFailure` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1248 | `refreshBuildStamp` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 1350 | `requireWorkoutProgressionRuntime` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1355 | `getActiveWorkoutState` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1359 | `getActiveWorkoutPlan` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1363 | `hydrateActiveWorkoutPlan` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1367 | `updateActiveWorkoutState` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1373 | `getPrimaryCue` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1381 | `renderWorkoutHud` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1493 | `logTrackerCapabilities` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1497 | `updateTrackingMode` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1537 | `getThreeGlobal` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1542 | `getGltfLoaderCtor` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1547 | `updateAvatarRuntimeRenderModeStatus` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1576 | `logAvatarWebglAvailability` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1587 | `ensureAvatarThreeRuntimeDependencies` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1604 | `onReady` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1608 | `onFailed` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1617 | `cleanup` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1645 | `logAvatarCanvasState` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1663 | `ensureAvatarRenderLoop` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1668 | `loop` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1684 | `ensureAvatarThreeRuntime` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1800 | `setAvatar3dCanvasVisibility` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1806 | `resizeAvatarThreeRuntime` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1819 | `initializeAvatarRuntimeBootstrap` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1839 | `window.__retryAvatarRuntime/retryAvatarRuntime` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 1863 | `refreshCameraUiState` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1878 | `setCameraFullscreen` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1891 | `findFirstSkeleton` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1901 | `mapAvatarBones` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1904 | `findBone` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1927 | `sanitizeRenderMode` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1931 | `getRenderModeLabel` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1937 | `updateRenderModeStatus` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1943 | `sanitizeStageMode` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1947 | `resolveInitialStageMode` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1955 | `applyAvatarStageMode` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 1979 | `applyRenderModeSelection` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2024 | `fallbackRenderModeToCamera` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2037 | `resolveInitialRenderMode` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2051 | `sanitizeAvatarFacingDeg` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2056 | `applyAvatarFacingCalibration` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2076 | `resolveInitialAvatarFacingDeg` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2084 | `getRenderMode` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2089 | `setPersonLayerSuppressed` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2094 | `isLikelyHttpUrl` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2104 | `resolveAvatarModelUrl` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2120 | `setAvatarRuntimeStatus` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2127 | `setAvatarAssetStatus` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2139 | `normalizeAvatarProfile` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2153 | `probeAvatarModelRuntime` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2195 | `mountAvatarGlbModel` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2324 | `toRotation` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2372 | `loadAvatarAssetForCurrentUser` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2479 | `openAvatarModal` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 2492 | `closeAvatarModal` | active implementation | inline helper closed over local runtime state |
| 2500 | `addLog` | active implementation | inline helper closed over local runtime state |
| 2508 | `updateAuthDebug` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2532 | `markPerfMetric` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2537 | `ensureRetentionFlowLoaded` | active implementation | retention/profile/dashboard glue; keep until module owner takes context |
| 2541 | `persistUser` | active implementation | retention/profile/dashboard glue; keep until module owner takes context |
| 2559 | `defaultProfileForName` | active implementation | retention/profile/dashboard glue; keep until module owner takes context |
| 2595 | `onLoginUI` | active implementation | retention/profile/dashboard glue; keep until module owner takes context |
| 2602 | `buildCalendarFromMeta` | active implementation | retention/profile/dashboard glue; keep until module owner takes context |
| 2683 | `sendToNode` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2698 | `postAuthenticatedJSON` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2740 | `isAuthUnavailable` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2776 | `updateSyncStatus` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2798 | `sendProfileToNode` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2802 | `getAuthToken` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2806 | `applyAuthenticatedShellVisibility` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2824 | `renderAuthShell` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2831 | `removeBuilderModeUiGuards` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2842 | `getActiveBlockingOverlay` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2861 | `setPilotBypassAuthState` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2865 | `activatePilotBypassImmediate` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 2874 | `initializeAuth` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2904 | `updateAuthStepStatus` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2909 | `showAuthBindingError` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2915 | `renderAuthMode` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2925 | `submitAuthRequest` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2989 | `handleLoginSubmit` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 2996 | `window.handleLoginButtonClick/handleLoginButtonClick` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 3003 | `window.handleCreateAccountToggle/handleCreateAccountToggle` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 3012 | `bindAuthLoginForm` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 3056 | `onLogin` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 3105 | `handleLogout` | active implementation | still dangerous/load-bearing auth/profile write flow |
| 3120 | `requireCoachRuntime` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 3130 | `speak` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 3134 | `unlockAudioOnce` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 3138 | `stopAllSpeech` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 3147 | `toggleListening` | compatibility delegator | coach/voice compatibility delegates to CoachRuntime where present |
| 3242 | `buildCanonicalWorkoutSelection` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3257 | `persistCanonicalWorkoutSelection` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3266 | `clearCanonicalWorkoutSelection` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3272 | `renderWorkoutPlan` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3288 | `getKeypoint` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3293 | `getAngleDegrees` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3308 | `computeKneeValgus` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3316 | `analyzeSquatForm` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3355 | `getCurrentExerciseMeta` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3359 | `getCurrentExerciseId` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3363 | `sendStartSessionToNode` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3374 | `sendRepToNode` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3392 | `syncRepAnalysisState` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3401 | `configureExtractedWorkoutRuntimes` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3491 | `sendOhsaToNode` | active implementation | workout/session/rep/OHSA glue; still load-bearing |
| 3526 | `initDetector` | active implementation | inline helper closed over local runtime state |
| 3570 | `initOptionalTrackers` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3619 | `connectCamera` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3626 | `ensureRuntimeCalibration` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3634 | `updateAvatarCalibration` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3665 | `setLowerBodyVisibility` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3677 | `computeAvatarAnchorTransform` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3792 | `applyPoseToAvatarRig` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3812 | `getRest` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3813 | `relaxToRest` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3818 | `applyTrackedAxis` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3852 | `score` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3866 | `angle` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3871 | `record` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 3906 | `renderAvatar3d` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4060 | `drawProceduralAvatar` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4064 | `get` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4065 | `good` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4094 | `drawLimb` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4129 | `runPoseLoop` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4158 | `startWorkout` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4165 | `handleWorkoutSelectChange` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4194 | `getPoseConfidenceSnapshot` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4195 | `score` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4196 | `kp` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4211 | `runAvatarTrace` | active implementation | still dangerous/load-bearing avatar, pose, camera, or render-loop owner |
| 4369 | `attachAvatarTraceHarness` | active implementation | inline helper closed over local runtime state |
| 4393 | `getPrimaryNavHandlerStatus` | active implementation | load-bearing boot/auth diagnostics or persistence glue |
| 4404 | `updateAuthPropagationStatus` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 4406 | `updateActivationStatusPanel` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 4408 | `runPendingPanelWatchdogs` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 4410 | `window.__forceAuthPropagationRender` | compatibility delegator | delegates to extracted runtime/status-panel owner |
| 4411 | `window.__forceAppActivationRender` | compatibility delegator | delegates to extracted runtime/status-panel owner |

## Recommended final removal order

1. **Remove inline no-op diagnostics/builders shims**: delete only `forceBuilderFullAccessAuthState`, `enforceBuilderOverlayBypass`, and `installClickDiagnostics`; verify no tests or console checks depend on their presence.
2. **Extract auth submit compatibility into `auth-core.js` or a new auth-form runtime**: move `submitAuthRequest`, `handleLoginSubmit`, `handleLoginButtonClick`, `handleCreateAccountToggle`, `bindAuthLoginForm`, `renderAuthMode`, and auth step/status helpers behind one owner. Keep a temporary `window.handleLoginButtonClick` delegator for tests and inline onclick compatibility.
3. **Consolidate auth shell/profile after auth submit**: migrate `initializeAuth`, `onLogin`, `handleLogout`, `applyAuthenticatedShellVisibility`, `renderAuthShell`, `persistUser`, `defaultProfileForName`, `onLoginUI`, `sendProfileToNode`, and `updateSyncStatus` into auth/profile runtimes. Remove inline `APP_AUTH` mutation only after auth-core/auth-state-runtime are the single writer.
4. **Collapse retention/dashboard hydration delegates**: after auth/profile are single-owner, move `ensureRetentionFlowLoaded`, `buildCalendarFromMeta`, dashboard refresh timing, and status-panel refresh callbacks into `app-hydration-runtime.js`/`dashboard-runtime.js`.
5. **Move workout/session callback bodies**: migrate workout selection persistence, `renderWorkoutPlan`, `sendStartSessionToNode`, `sendRepToNode`, `sendOhsaToNode`, `syncRepAnalysisState`, and `configureExtractedWorkoutRuntimes` callback construction into `workout-runtime.js`/`session-write.js` with a context factory.
6. **Move pose loop ownership**: migrate `initDetector`, `initOptionalTrackers`, `connectCamera`, `runPoseLoop`, pose confidence helpers, and squat analysis helpers to `pose-runtime.js`/`rep-analysis-runtime.js`. Keep temporary global delegators for `connectCamera` and `startWorkout`.
7. **Move avatar heavy implementation last**: migrate Three bootstrap, render-mode/stage controls, GLB probe/mount, rig mapping, `applyPoseToAvatarRig`, `renderAvatar3d`, `drawProceduralAvatar`, modal controls, and Avaturn message/profile writeback into `avatar-runtime.js`. This should be last because it depends on stabilized pose/workout/profile context.
8. **Remove boot/status final delegates**: once all runtime owners expose their status directly, remove inline boot diagnostics, final handler checks, and status-panel rescue globals.

## Test result for this pass

The requested checks passed after creating this report:

- `npm run lint`
- `node --test test/pilot-login.test.js test/auth-login-form-submit.test.js test/session-api.test.js test/retention-api.test.js`
