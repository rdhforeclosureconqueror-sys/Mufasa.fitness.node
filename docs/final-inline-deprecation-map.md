# Final Inline Deprecation Map

_Last updated: 2026-05-07 — pose/avatar runtime frame and canvas side-effect extraction pass._

## Removed/delegated hydration ownership

The inline `public/index.html` shell no longer owns the remaining profile/retention/dashboard hydration orchestration:

- `onLogin(profile)` is now a thin delegator to `window.AppHydrationRuntime.handleLoginProfile(profile)`.
- `onLoginUI(profile)` is now a thin delegator to `window.AppHydrationRuntime.renderProfileShell(profile)`.
- `buildCalendarFromMeta()` is now a thin delegator to `window.AppHydrationRuntime.buildCalendarFromMeta()`.
- Login profile normalization, default profile fallback, first-login calendar metadata creation, profile shell rendering, backend profile hydration, profile write sync, retention loader refresh, dashboard refresh, and post-login calendar/sync updates are centralized in `public/app-hydration-runtime.js`.
- The app hydration runtime is configured with closure-safe getters/setters for `USER_ID`, `USER_PROFILE`, and `calendarMeta` so extracted code does not depend on implicit inline globals.

## Removed/delegated pose/avatar ownership

The inline shell no longer owns direct latest-pose storage or avatar canvas mutation:

- `latestPose` and `latestPosePacket` inline variables were removed. `public/pose-runtime.js` now owns the latest pose, latest pose packet, latest raw poses, and compatibility `window.__lastPoseFrame` update.
- Avatar frame consumption is event-led through `pose-runtime:frame`; `public/avatar-runtime.js` subscribes once and invokes the bound avatar frame renderer inside an isolated failure boundary so avatar errors do not block pose/workout/camera flows.
- Avatar canvas visibility and 3D canvas resize side effects were delegated to `public/avatar-runtime.js` through a canvas controller. Inline `setAvatar3dCanvasVisibility()` and `resizeAvatarThreeRuntime()` are now thin compatibility delegators.
- The inline pose loop callback now only forwards frames to rep analysis; pose-runtime owns pose frame state and event publication.

## Current inline size/count

Measured after this pass with a one-off script that counts lines inside literal `<script>...</script>` blocks in `public/index.html` and approximates inline function/arrow tokens:

- Inline script lines remaining: **3,502**.
- Approximate inline function/arrow token count remaining: **315**.
- Hydration compatibility delegators intentionally remaining inline: **6** (`ensureRetentionFlowLoaded`, `defaultProfileForName`, `onLoginUI`, `buildCalendarFromMeta`, `sendProfileToNode`, `onLogin`).
- Pose/avatar compatibility delegators intentionally remaining inline: **2** (`setAvatar3dCanvasVisibility`, `resizeAvatarThreeRuntime`).

## Remaining dangerous inline sections

Do not expand these sections while continuing the deprecation work; extract them in later targeted passes:

1. **Auth lifecycle/profile shell residuals**
   - `initializeAuth()`, auth shell visibility, logout wiring, and pilot bypass shell transitions remain inline.
   - Profile/retention/dashboard ownership is delegated, but auth restoration still decides when to call `onLogin()`.
2. **Avatar asset/render residuals**
   - Avatar asset load hooks, render-mode/facing calibration, model rig retargeting (`applyPoseToAvatarRig`), and the main 3D render body (`renderAvatar3d`) remain inline behind avatar-runtime frame/canvas delegates.
   - These paths are safer than before because pose state and canvas side effects are runtime-owned, but they should be the next avatar extraction target.
3. **Workout/rep/session glue**
   - Workout progression configuration, rep analysis bridge, session write callbacks, OHSA state bridges, and retention completion signal remain inline.
4. **Boot/status diagnostics**
   - Boot status mutation, blocking overlay checks, activation/status panels, DOM truth logging, and boot contract diagnostics remain inline.
5. **Calendar/session compatibility glue**
   - Calendar rendering ownership moved to app hydration runtime, but workout completion still calls the compatibility delegator after mutating inline `calendarMeta`.

## Next extraction candidates

1. Move `renderAvatar3d`, `applyPoseToAvatarRig`, avatar calibration math, and asset load hooks fully into avatar-runtime with closure-safe getters/setters.
2. Move `initializeAuth()` and authenticated shell visibility into an auth lifecycle runtime.
3. Extract session/write callback composition around workout progression without changing workout behavior.
4. Move boot/status diagnostics into status-panels/runtime-orchestrator ownership.
