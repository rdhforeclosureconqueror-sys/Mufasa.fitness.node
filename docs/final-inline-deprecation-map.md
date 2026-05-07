# Final Inline Deprecation Map

_Last updated: 2026-05-07 — profile/retention/dashboard hydration extraction pass._

## Removed/delegated hydration ownership

The inline `public/index.html` shell no longer owns the remaining profile/retention/dashboard hydration orchestration:

- `onLogin(profile)` is now a thin delegator to `window.AppHydrationRuntime.handleLoginProfile(profile)`.
- `onLoginUI(profile)` is now a thin delegator to `window.AppHydrationRuntime.renderProfileShell(profile)`.
- `buildCalendarFromMeta()` is now a thin delegator to `window.AppHydrationRuntime.buildCalendarFromMeta()`.
- Login profile normalization, default profile fallback, first-login calendar metadata creation, profile shell rendering, backend profile hydration, profile write sync, retention loader refresh, dashboard refresh, and post-login calendar/sync updates are centralized in `public/app-hydration-runtime.js`.
- The app hydration runtime is configured with closure-safe getters/setters for `USER_ID`, `USER_PROFILE`, and `calendarMeta` so extracted code does not depend on implicit inline globals.

## Current inline size/count

Measured after this pass with a one-off script that counts lines inside literal `<script>...</script>` blocks in `public/index.html`:

- Inline script lines remaining: **3,517**.
- Approximate inline function/arrow count remaining: **208**.
- Hydration compatibility delegators intentionally remaining inline: **6** (`ensureRetentionFlowLoaded`, `defaultProfileForName`, `onLoginUI`, `buildCalendarFromMeta`, `sendProfileToNode`, `onLogin`).

## Remaining dangerous inline sections

Do not expand these sections while continuing the deprecation work; extract them in later targeted passes:

1. **Auth lifecycle/profile shell residuals**
   - `initializeAuth()`, auth shell visibility, logout wiring, and pilot bypass shell transitions remain inline.
   - Profile/retention/dashboard ownership is delegated, but auth restoration still decides when to call `onLogin()`.
2. **Avatar/pose remnants**
   - Avatar modal wiring, render-mode/facing calibration, asset load hooks, and pose/canvas state remain inline.
3. **Workout/rep/session glue**
   - Workout progression configuration, rep analysis bridge, session write callbacks, and retention completion signal remain inline.
4. **Boot/status diagnostics**
   - Boot status mutation, blocking overlay checks, activation/status panels, DOM truth logging, and boot contract diagnostics remain inline.
5. **Calendar/session compatibility glue**
   - Calendar rendering ownership moved to app hydration runtime, but workout completion still calls the compatibility delegator after mutating inline `calendarMeta`.

## Next extraction candidates

1. Move `initializeAuth()` and authenticated shell visibility into an auth lifecycle runtime.
2. Extract avatar modal/render-mode/facing calibration without touching pose internals.
3. Extract session/write callback composition around workout progression without changing workout behavior.
4. Move boot/status diagnostics into status-panels/runtime-orchestrator ownership.
