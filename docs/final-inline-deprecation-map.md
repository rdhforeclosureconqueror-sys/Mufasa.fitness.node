# Final Inline Deprecation Map

_Last updated: 2026-05-07 — avatar render/asset residual extraction pass._

## Removed/delegated hydration ownership

The inline `public/index.html` shell no longer owns the remaining profile/retention/dashboard hydration orchestration:

- `onLogin(profile)` is now a thin delegator to `window.AppHydrationRuntime.handleLoginProfile(profile)`.
- `onLoginUI(profile)` is now a thin delegator to `window.AppHydrationRuntime.renderProfileShell(profile)`.
- `buildCalendarFromMeta()` is now a thin delegator to `window.AppHydrationRuntime.buildCalendarFromMeta()`.
- Login profile normalization, default profile fallback, first-login calendar metadata creation, profile shell rendering, backend profile hydration, profile write sync, retention loader refresh, dashboard refresh, and post-login calendar/sync updates are centralized in `public/app-hydration-runtime.js`.
- The app hydration runtime is configured with closure-safe getters/setters for `USER_ID`, `USER_PROFILE`, and `calendarMeta` so extracted code does not depend on implicit inline globals.

## Removed/delegated pose/avatar ownership

The inline shell no longer owns direct latest-pose storage, avatar canvas mutation, or avatar render/asset orchestration:

- `latestPose` and `latestPosePacket` inline variables were removed. `public/pose-runtime.js` now owns the latest pose, latest pose packet, latest raw poses, and compatibility `window.__lastPoseFrame` update.
- Avatar frame consumption is event-led through `pose-runtime:frame`; `public/avatar-runtime.js` subscribes once and invokes its extracted avatar frame renderer inside an isolated failure boundary so avatar errors do not block pose/workout/camera flows.
- Avatar canvas visibility and 3D canvas resize side effects were delegated to `public/avatar-runtime.js` through a canvas controller. Inline `setAvatar3dCanvasVisibility()` and `resizeAvatarThreeRuntime()` are now thin compatibility delegators.
- Avatar 3D render ownership moved to `public/avatar-runtime.js`: calibration sampling, anchor computation, lower-body visibility gating, model rig retargeting (`applyPoseToAvatarRig`), and the main `renderAvatar3d` body now run inside AvatarRuntime with closure-safe bindings.
- Avatar profile asset loading is runtime-owned through `AvatarRuntime.configureAssetPipeline()`. Inline `loadAvatarAssetForCurrentUser()` is now a thin delegator while GLB probe/mount primitives remain lazy and are invoked only by the runtime asset pipeline.
- The inline pose loop callback now only forwards frames to rep analysis; pose-runtime owns pose frame state and event publication.

## Current inline size/count

Measured after this pass with a one-off script that counts lines inside literal `<script>...</script>` blocks in `public/index.html` and approximates inline function/arrow tokens:

- Inline script lines remaining: **3,058**.
- Approximate inline function/arrow token count remaining: **316**.
- Hydration compatibility delegators intentionally remaining inline: **6** (`ensureRetentionFlowLoaded`, `defaultProfileForName`, `onLoginUI`, `buildCalendarFromMeta`, `sendProfileToNode`, `onLogin`).
- Pose/avatar compatibility delegators intentionally remaining inline: **3** (`setAvatar3dCanvasVisibility`, `resizeAvatarThreeRuntime`, `loadAvatarAssetForCurrentUser`).

## Remaining dangerous inline sections

Do not expand these sections while continuing the deprecation work; extract them in later targeted passes:

1. **Auth lifecycle/profile shell residuals**
   - `initializeAuth()`, auth shell visibility, logout wiring, and pilot bypass shell transitions remain inline.
   - Profile/retention/dashboard ownership is delegated, but auth restoration still decides when to call `onLogin()`.
2. **Avatar lower-level GLB/runtime primitives**
   - Avatar render ownership and profile asset-load orchestration are removed/delegated to AvatarRuntime.
   - Lower-level GLB probe/mount primitives (`probeAvatarModelRuntime`, `mountAvatarGlbModel`, skeleton bone mapping, scene setup, render-loop creation, render-mode/facing control handlers) remain inline as runtime-callable primitives. Keep them lazy-only and do not reintroduce inline pose packet ownership.
   - Procedural fallback drawing still remains inline for the camera canvas path; AvatarRuntime now owns 3D failure isolation and asset fallback decisions.
3. **Workout/rep/session glue**
   - Workout progression configuration, rep analysis bridge, session write callbacks, OHSA state bridges, and retention completion signal remain inline.
4. **Boot/status diagnostics**
   - Boot status mutation, blocking overlay checks, activation/status panels, DOM truth logging, and boot contract diagnostics remain inline.
5. **Calendar/session compatibility glue**
   - Calendar rendering ownership moved to app hydration runtime, but workout completion still calls the compatibility delegator after mutating inline `calendarMeta`.

## Next extraction candidates

1. Move lower-level GLB probe/mount primitives and avatar render-loop setup into avatar-runtime once their DOM/Three closure dependencies have stable accessors.
2. Move procedural fallback drawing out of the inline camera canvas path.
3. Move `initializeAuth()` and authenticated shell visibility into an auth lifecycle runtime.
4. Extract session/write callback composition around workout progression without changing workout behavior.
5. Move boot/status diagnostics into status-panels/runtime-orchestrator ownership.
