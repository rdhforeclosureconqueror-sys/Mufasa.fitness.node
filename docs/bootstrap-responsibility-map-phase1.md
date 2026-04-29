# Bootstrap Refactor Phase 1 — Responsibility Map (No Behavior Change)

## Scope audited
Primary bootstrap ownership currently lives in the inline script inside `public/index.html` (the large section beginning near line 1042 and booting on `window.load`).

## Responsibility map

### 1) Auth boot
- Seeds `window.APP_AUTH` to signed-out defaults during script setup.
- `initializeAuth()` restores token from `localStorage`, validates via `/api/auth/me`, and gates overlay visibility.
- `handleLoginSubmit()` performs `/api/auth/login`, then `/api/auth/me`, persists token, and transitions into logged-in state.
- `onLogin()` hydrates profile-derived client state and kicks post-auth setup.
- `handleLogout()` clears token and reloads app.

### 2) Shell visibility
- `updateAppBootStatus()` drives boot status text and writes `window.__appBootStatus` timeline.
- Auth overlay (`#authOverlay`) visibility toggled directly by `initializeAuth()` and login submit flow.
- Legacy “builder bypass” helpers exist but are currently no-op due to early `return` (dead-path code kept in place).

### 3) Button binding
- Button handlers are attached imperatively across the bootstrap script (`onclick` assignment pattern).
- Core nav buttons (`dashboardBtn`, `exerciseLibraryBtn`) are enabled/bound inside `onLogin()`.
- Boot diagnostics validate bindings pre/post auth and write status checkpoints.

### 4) Dashboard init
- Dashboard navigation is initialized in `onLogin()` by enabling + assigning redirect handler.
- Additional dashboard diagnostics status is emitted through boot handler checks.

### 5) Camera init
- Camera control wiring is part of the main inline bootstrap and state system (`connectBtn`, `startBtn`, fullscreen toggles, ESC handling).
- Camera/render mode/UI refresh runs during load boot sequence before and after auth bootstrap.

### 6) Workout library init
- Workout library button route is assigned once pre-login, then explicitly enabled/rebound in `onLogin()`.
- Boot status includes explicit “workout library handler attached” checks.

### 7) Avatar init
- Avatar runtime has a two-layer bootstrap:
  - Early global lazy infrastructure in head script (`__ensureAvatarThreeModules`, runtime status object).
  - Main app bootstrap wiring for avatar state, modal flow, runtime bootstrap, render mode, stage/facing calibration, and upload/save actions.
- Avatar runtime load is lazy and event-driven (`avatar-three-ready` / `avatar-three-failed`).

### 8) Diagnostics init
- Diagnostics client scripts are preloaded as initial resources.
- Boot records module presence checks and active overlay detection into boot status.
- Landing/dashboard diagnostic hooks consume shared runtime diagnostics globals.

### 9) Retention init
- Retention is lazy-loaded via `ensureRetentionFlowLoaded()` and cached by `retentionFlowBootPromise` plus `window.__retentionFlowLoaded` flag.
- Triggered from logged-in flow/UI path (not eagerly executed at first paint).

### 10) Overlays/modals
- Bootstrap coordinates auth overlay plus avatar modal state.
- Utility checks inspect likely blocking overlays and report active blocker in boot status.
- Legacy overlay bypass helpers are preserved but intentionally disabled (early return).

### 11) Lazy-loading
- Shared lazy script loader (`window.__loadExternalScript`) memoizes external script fetches.
- Pose runtime lazy boot (`window.__ensurePoseRuntime`) loads TensorFlow + detectors on demand.
- Avatar Three/GLTF modules are lazy imported via dynamic `import()`.
- Retention flow script lazy loaded from bootstrap function.

### 12) Global state ownership
- Bootstrap owns many mutable globals including:
  - auth/session: `window.APP_AUTH`, `window.pilotSuperAdminActive`, `window.__MAAT_AUTH_DEBUG`
  - boot/perf: `window.__appBootStatus`, `window.__startupResourceAudit`, `window.__perfMetrics`
  - avatar/render: `window.__AVATAR_THREE`, `window.__avatarRuntimeStatus`
  - feature boot flags: `window.__retentionFlowLoaded`, cached promises on `window` helpers
- Also owns significant module-level mutable closures (`USER_PROFILE`, `USER_ID`, calendar/session/runtime caches, mode flags).

## Highest blast-radius sections
1. **Auth transition path** (`initializeAuth` → `onLogin`): controls access gating, token handling, profile hydration, and downstream initializers.
2. **Load boot orchestrator** (`window.load` handler): linear startup sequence touching render mode, camera UI, telemetry, module checks, auth boot, and overlay checks.
3. **Avatar runtime subsystem**: dense interop among lazy imports, canvas context ownership, render modes, diagnostics, and profile-coupled avatar assets.
4. **Shared globals + side effects**: many systems coordinate via `window.*` mutation/events, raising coupling and regression risk.

## Safest extraction order (Phase 1 planning)
1. **Pure status/logging helpers** (`updateAppBootStatus`, perf mark wrappers, overlay detector) into a bootstrap-observability module.
2. **Lazy-loader utilities** (`__loadExternalScript`, pose/avatar dependency ensure functions) into a runtime-loader module with same globals exported initially.
3. **Auth API adapter + token storage helpers** (`initializeAuth`, login submit network calls) behind thin interfaces while preserving `window.APP_AUTH` contract.
4. **Post-auth UI activation slice** (button enabling/binding + shell state updates) as a separate `onLoginUIBoot` unit.
5. **Retention boot adapter** (`ensureRetentionFlowLoaded`) isolated next (minimal dependencies).
6. **Avatar bootstrap extraction last** (largest coupling and highest rendering risk).

## Notes
- This document is descriptive only; no runtime behavior change intended.
