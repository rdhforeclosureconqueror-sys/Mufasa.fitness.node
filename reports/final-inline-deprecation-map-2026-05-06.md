# Final Inline Deprecation Map — 2026-05-06

## Scope and measurement

This audit covers the synchronized landing page copies at `index.html` and `public/index.html` after the auth endpoint-helper extraction pass. The remaining inline script is now primarily compatibility glue plus the still-load-bearing auth/profile shell, boot diagnostics, pose/camera loop, rep/HUD glue, and avatar renderer/model implementation.

### Current inline script size

| File | Inline script blocks | Total inline bytes | Total inline lines | Largest inline block | Remaining function/arrow count |
|---|---:|---:|---:|---:|---:|
| `index.html` | 4 | 131,139 | 2,884 | 130,550 bytes / 2,869 lines (`<script>` starting at line 943) | 121 |
| `public/index.html` | 4 | 131,139 | 2,884 | 130,550 bytes / 2,869 lines (`<script>` starting at line 943) | 121 |

Measured with a Python `HTMLParser` inline-script extraction command against both synchronized HTML files. The function/arrow count includes named inline `function` declarations, `const`/`let`/`var` arrow-function bindings, and global `window.*` function/arrow aliases; it intentionally excludes anonymous object-literal callback arrows passed into extracted runtime configuration objects. The classification table below combines same-line global aliases with their local function bindings, so it now has 121 rows for the 121 counted bindings.

## Remaining inline ownership

| Area | Extracted/current external owner | Remaining inline owner | Status | Risk |
|---|---|---|---|---|
| Auth/auth state | `auth-core.js`, `auth-state-runtime.js`, `auth-ui.js`, `backend-read.js`, `profile-write-runtime.js` | `initializeAuth`, `onLogin`, `handleLogout`, pilot bypass, shell visibility, and `APP_AUTH`/profile bridging | Auth submit/create-account and endpoint-helper ownership are external; shell/profile lifecycle remains inline. | High |
| Boot/status panels | `boot-core.js`, `runtime-events.js`, `runtime-state.js`, `status-panels.js`, `runtime-orchestrator.js` | `updateAppBootStatus`, build stamp refresh, boot contract checks, pilot event diagnostics, final handler checks | External boot/status owners exist, but inline still renders and gates visible diagnostics. | Medium/high |
| Profile display/write | `profile-runtime.js`, `profile-write-runtime.js`, `backend-read.js`, `app-hydration-runtime.js` | `persistUser`, `defaultProfileForName`, `onLoginUI`, `sendProfileToNode`, sync status, avatar profile callbacks | Write runtime owns the extracted save path; inline still owns shared profile state and fallbacks. | High |
| Retention/hydration/dashboard | `retention-loader-runtime.js`, `app-hydration-runtime.js`, `dashboard-runtime.js`, `dashboard.js` | `ensureRetentionFlowLoaded` alias, calendar meta builder, auth-ready refresh timing/status coupling | Mostly delegator/ordering glue, but coupled to auth/profile state. | Medium/high |
| Workout lifecycle/OHSA | `workout-runtime.js`, `workout-progression-runtime.js`, `runtime-orchestrator.js`, `assessment-runtime.js` | selection persistence, plan rendering, `startWorkout`, `startOhsa`, `startDefineExercise`, local state/context accessors | Lifecycle callbacks and OHSA assessment writes are extracted; camera/start orchestration remains inline. | High |
| Pose/rep analysis/persistence | `pose-runtime.js`, `rep-analysis-runtime.js`, `rep-runtime.js`, `session-write.js` | detector init, optional trackers, camera loop, squat analysis helpers, `sendRepToNode`, rep state mirrors | Runtimes exist, but inline still starts and feeds the loop/persistence bridge. | Highest |
| HUD/progression | `hud-runtime.js`, `workout-progression-runtime.js`, `status-panels.js` | `getPrimaryCue`, `renderWorkoutHud`, progress/tracker status glue | Runtime modules are configured externally; inline still computes pushed HUD state. | Medium/high |
| Coach/voice | `coach-runtime.js` | `requireCoachRuntime` and inline `toggleListening` STT wiring | Voice speech/unlock/stop ownership is external; mic-command wiring remains inline. | Low/medium |
| Avatar | `avatar-runtime.js`, `runtime-bridges.js`, `profile-write-runtime.js` | Three bootstrap, GLB probe/mount, render-mode/stage/facing controls, rig helpers, procedural renderer, modal/profile writeback callbacks | Runtime owns control registration; inline still owns heavy renderer/model implementation. | Highest |

## Remaining inline active implementations

- **Boot/status/pilot diagnostics:** `updateAppBootStatus`, `isBootContractReady`, `appendPilotEventLocal`, `trackPilotEvent`, `emitPilotEvent`, `refreshBuildStamp`, `logMobileControlTruth`, `getPrimaryNavHandlerStatus`.
- **Auth/profile/hydration:** `persistUser`, `defaultProfileForName`, `onLoginUI`, `updateSyncStatus`, `sendProfileToNode`, `applyAuthenticatedShellVisibility`, `renderAuthShell`, `removeBuilderModeUiGuards`, `getActiveBlockingOverlay`, `setPilotBypassAuthState`, `activatePilotBypassImmediate`, `initializeAuth`, `onLogin`, `handleLogout`, `markPerfMetric`, `buildCalendarFromMeta`, `ensureRetentionFlowLoaded`.
- **Workout/OHSA/rep/HUD:** `requireWorkoutProgressionRuntime`, active workout state/plan accessors, `getPrimaryCue`, `renderWorkoutHud`, canonical workout selection persistence, `renderWorkoutPlan`, squat-analysis helpers, `sendRepToNode`, `syncRepAnalysisState`, `configureExtractedWorkoutRuntimes`, `startOhsa`, `startDefineExercise`, `startWorkout`, `handleWorkoutSelectChange`.
- **Pose/camera:** `initDetector`, `initOptionalTrackers`, `connectCamera`, `runPoseLoop`, pose-confidence helpers, avatar trace harness.
- **Coach/voice:** `requireCoachRuntime` helper and `toggleListening` SpeechRecognition command wiring.
- **Avatar/rendering:** avatar runtime status/diagnostics, Three/GLTF dependency resolution, render-loop bootstrap, camera fullscreen UI, skeleton/bone mapping, render-mode/stage/facing controls, asset probing/mounting, modal helpers, procedural avatar drawing.

## Remaining compatibility delegators

- `renderSystemBootStatus` delegates boot/status rendering to `StatusPanels`.
- `window.__retryAvatarRuntime`/`retryAvatarRuntime` is a global retry shim around the avatar runtime bootstrap.
- `updateAuthPropagationStatus`, `updateActivationStatusPanel`, `runPendingPanelWatchdogs`, `window.__forceAuthPropagationRender`, and `window.__forceAppActivationRender` delegate to extracted status-panel/runtime owners.

## Safe removals

- **Removed in the auth-submit pass:** inline `submitAuthRequest`, `handleLoginSubmit`, `window.handleLoginButtonClick`/`handleLoginButtonClick`, and `window.handleCreateAccountToggle`/`handleCreateAccountToggle` delegators were deleted after the login form buttons were rewired to rely on `auth-core.js` event listeners.
- **Removed in the coach voice pass:** inline `speak`, `unlockAudioOnce`, and `stopAllSpeech` coach voice compatibility delegators were deleted after the remaining call sites were rewired to call `coach-runtime.js` through `requireCoachRuntime()` directly.
- **Moved in this pass:** auth endpoint/helper glue (`getAuthToken`, `postAuthenticatedJSON`, `isAuthUnavailable`, and `sendToNode`) moved to `auth-state-runtime.js`; inline call sites now reference the extracted runtime methods.
- **No remaining active inline implementation is safe to delete immediately.** The remaining non-delegator bodies close over inline state or DOM refs and still participate in auth/profile boot, hydration, workout, pose/camera, rep persistence, HUD, or avatar rendering.
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
| 53 | `updateAppBootStatus` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 132 | `renderSystemBootStatus` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 133 | `isBootContractReady` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 184 | `appendPilotEventLocal` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 193 | `trackPilotEvent` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 217 | `emitPilotEvent` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 221 | `getAvatarRuntimeStatusRef` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 274 | `updateAvatarOverlayDiagnostics` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 287 | `setAvatarRuntimeFailure` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 303 | `refreshBuildStamp` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 388 | `requireWorkoutProgressionRuntime` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 393 | `getActiveWorkoutState` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 397 | `getActiveWorkoutPlan` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 401 | `hydrateActiveWorkoutPlan` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 405 | `updateActiveWorkoutState` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 411 | `getPrimaryCue` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 419 | `renderWorkoutHud` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 531 | `logTrackerCapabilities` | active implementation | tracking status glue near pose ownership; defer with pose/camera extraction |
| 535 | `updateTrackingMode` | active implementation | tracking status glue near pose ownership; defer with pose/camera extraction |
| 575 | `getThreeGlobal` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 580 | `getGltfLoaderCtor` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 585 | `updateAvatarRuntimeRenderModeStatus` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 615 | `logAvatarWebglAvailability` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 625 | `ensureAvatarThreeRuntimeDependencies` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 643 | `onReady` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 647 | `onFailed` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 656 | `cleanup` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 683 | `logAvatarCanvasState` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 701 | `ensureAvatarRenderLoop` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 707 | `loop` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 722 | `ensureAvatarThreeRuntime` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 846 | `setAvatar3dCanvasVisibility` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 850 | `resizeAvatarThreeRuntime` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 854 | `initializeAvatarRuntimeBootstrap` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 898 | `refreshCameraUiState` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 913 | `setCameraFullscreen` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 926 | `findFirstSkeleton` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 936 | `mapAvatarBones` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 940 | `findBone` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 962 | `sanitizeRenderMode` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 966 | `getRenderModeLabel` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 972 | `updateRenderModeStatus` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 978 | `sanitizeStageMode` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 982 | `resolveInitialStageMode` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 990 | `applyAvatarStageMode` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1014 | `applyRenderModeSelection` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1059 | `fallbackRenderModeToCamera` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1072 | `resolveInitialRenderMode` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1086 | `sanitizeAvatarFacingDeg` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1091 | `applyAvatarFacingCalibration` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1111 | `resolveInitialAvatarFacingDeg` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1119 | `getRenderMode` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1124 | `setPersonLayerSuppressed` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1129 | `isLikelyHttpUrl` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1139 | `resolveAvatarModelUrl` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1155 | `setAvatarRuntimeStatus` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1162 | `setAvatarAssetStatus` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1174 | `normalizeAvatarProfile` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1188 | `probeAvatarModelRuntime` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1230 | `mountAvatarGlbModel` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1360 | `toRotation` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1407 | `loadAvatarAssetForCurrentUser` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1451 | `openAvatarModal` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1464 | `closeAvatarModal` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 1472 | `addLog` | active implementation | small DOM/debug helper still used by multiple inline runtimes |
| 1480 | `updateAuthDebug` | active implementation | small DOM/debug helper still used by multiple inline runtimes |
| 1503 | `markPerfMetric` | compatibility delegator | remove after extracted runtime/call sites no longer need this inline/global shim |
| 1509 | `ensureRetentionFlowLoaded` | compatibility delegator | remove after extracted runtime/call sites no longer need this inline/global shim |
| 1513 | `persistUser` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 1531 | `defaultProfileForName` | compatibility delegator | remove after extracted runtime/call sites no longer need this inline/global shim |
| 1542 | `onLoginUI` | compatibility delegator | remove after extracted runtime/call sites no longer need this inline/global shim |
| 1546 | `buildCalendarFromMeta` | compatibility delegator | remove after extracted runtime/call sites no longer need this inline/global shim |
| 1583 | `updateSyncStatus` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 1605 | `sendProfileToNode` | compatibility delegator | remove after extracted runtime/call sites no longer need this inline/global shim |
| 1609 | `applyAuthenticatedShellVisibility` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 1628 | `renderAuthShell` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 1635 | `removeBuilderModeUiGuards` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 1646 | `getActiveBlockingOverlay` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 1665 | `setPilotBypassAuthState` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 1669 | `activatePilotBypassImmediate` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 1678 | `initializeAuth` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 1708 | `onLogin` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 1713 | `handleLogout` | active implementation | load-bearing auth/profile/hydration/persistence implementation |
| 1728 | `requireCoachRuntime` | compatibility helper | coach runtime glue; avoid pose/camera/render ownership |
| 1746 | `askCoach` | active implementation | coach runtime glue; avoid pose/camera/render ownership |
| 1793 | `buildCanonicalWorkoutSelection` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1808 | `persistCanonicalWorkoutSelection` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1817 | `clearCanonicalWorkoutSelection` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1823 | `renderWorkoutPlan` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1839 | `getKeypoint` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1844 | `getAngleDegrees` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1859 | `computeKneeValgus` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1867 | `analyzeSquatForm` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1906 | `getCurrentExerciseMeta` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1910 | `getCurrentExerciseId` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1914 | `sendRepToNode` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1933 | `syncRepAnalysisState` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 1942 | `configureExtractedWorkoutRuntimes` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 2021 | `initDetector` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2065 | `initOptionalTrackers` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2114 | `connectCamera` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2167 | `drawProceduralAvatar` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2172 | `get` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2173 | `good` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2201 | `drawLimb` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2236 | `startOhsa` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 2244 | `startDefineExercise` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 2250 | `runPoseLoop` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2276 | `startWorkout` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 2282 | `handleWorkoutSelectChange` | active implementation | load-bearing workout/OHSA/rep/HUD implementation |
| 2312 | `getPoseConfidenceSnapshot` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2314 | `score` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2315 | `kp` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2329 | `runAvatarTrace` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2487 | `attachAvatarTraceHarness` | active implementation | dangerous avatar/pose/camera/render-loop implementation |
| 2511 | `getPrimaryNavHandlerStatus` | active implementation | load-bearing boot/status/pilot diagnostic implementation |
| 2522 | `updateAuthPropagationStatus` | compatibility delegator | remove after extracted runtime/call sites no longer need this inline/global shim |
| 2524 | `updateActivationStatusPanel` | compatibility delegator | remove after extracted runtime/call sites no longer need this inline/global shim |
| 2526 | `runPendingPanelWatchdogs` | compatibility delegator | remove after extracted runtime/call sites no longer need this inline/global shim |
| 2528 | `__forceAuthPropagationRender` | compatibility delegator | remove after extracted runtime/call sites no longer need this inline/global shim |
| 2530 | `__forceAppActivationRender` | compatibility delegator | remove after extracted runtime/call sites no longer need this inline/global shim |

## Recommended final cleanup sequence

1. **Freeze compatibility contracts and tests:** keep the current synchronized HTML copies stable while tests assert the extracted auth, retention, session, performance lazy-load, and OHSA paths.
2. **Completed — remove auth submit globals first:** inline/global auth button call sites now rely on direct `auth-core.js` event-listener ownership, and `submitAuthRequest`, `handleLoginSubmit`, `handleLoginButtonClick`, and `handleCreateAccountToggle` inline delegators were deleted.
3. **Completed — remove coach voice speech delegators:** listen/STT call sites now invoke `coach-runtime.js` directly through `requireCoachRuntime()`, and `speak`, `unlockAudioOnce`, and `stopAllSpeech` inline delegators were deleted.
4. **Completed in this pass — extract auth endpoint helpers:** `getAuthToken`, `postAuthenticatedJSON`, `isAuthUnavailable`, and `sendToNode` now live in `auth-state-runtime.js`; inline runtime configuration passes compatibility callbacks to those external helpers.
5. **Consolidate auth shell/profile state:** migrate `initializeAuth`, `onLogin`, `handleLogout`, shell visibility, `persistUser`, `defaultProfileForName`, `onLoginUI`, `sendProfileToNode`, and `updateSyncStatus` into auth/profile runtimes; only then remove inline `APP_AUTH`, `USER_ID`, and `USER_PROFILE` writers.
6. **Move hydration/retention/dashboard ordering:** transfer `ensureRetentionFlowLoaded`, `buildCalendarFromMeta`, dashboard refresh timing, and status refresh callbacks into `app-hydration-runtime.js`, `retention-loader-runtime.js`, and `dashboard-runtime.js`.
7. **Move workout/OHSA/rep context accessors:** migrate selection persistence, `renderWorkoutPlan`, `startOhsa`, `startDefineExercise`, `sendRepToNode`, `syncRepAnalysisState`, and local workout state accessors into workout/assessment/rep runtimes.
8. **Move pose/camera ownership:** migrate `initDetector`, `initOptionalTrackers`, `connectCamera`, `runPoseLoop`, pose confidence, and squat analyzer helpers to pose/rep-analysis runtimes with temporary global start/connect delegators.
9. **Move avatar heavy implementation last:** migrate Three bootstrap, GLB loading/probing/mounting, render loop, rig/skeleton mapping, render-mode/stage/facing controls, procedural renderer, trace harness, and avatar modal/profile callbacks to `avatar-runtime.js`.
10. **Delete final status/boot shims:** once the major runtime owners are single-owner, remove boot/status compatibility delegators and final handler rescue globals.

## Test result for final inline deprecation audit

The requested checks passed for this audit:

- `npm run lint`
- `node --test test/pilot-login.test.js test/auth-login-form-submit.test.js test/session-api.test.js test/retention-api.test.js test/performance-lazyload.test.js`
