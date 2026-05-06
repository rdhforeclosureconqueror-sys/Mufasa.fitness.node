# Inline Runtime Phase 7 Ownership Map — 2026-05-06

## Phase 7 intent
Reduce the landing-page inline runtime from ownership-heavy script toward boot wiring, runtime registration, and thin delegators only. This pass extracts low-risk state/event/bridge ownership while preserving existing runtime behavior and visible failure paths.

## Extracted low-risk ownership (A: safe to extract now)

| Area | Previous inline ownership | New owner | Notes |
|---|---|---|---|
| Boot/global error listeners | `error` / `unhandledrejection` listeners and app error mirrors lived inline | `public/runtime-events.js` | Keeps `[BOOT_ERROR]`, `[BOOT_PROMISE_ERROR]`, `[APP_RUNTIME_ERROR]`, and `[APP_RUNTIME_PROMISE_ERROR]` visible in console and status panels. |
| Load performance mark | `load` listener wrote `appLoadMs` inline | `public/runtime-events.js` + `public/runtime-state.js` | Runtime state owns perf metric initialization; runtime events owns load listener wiring. |
| Startup resource audit | Inline initialized `__startupResourceAudit`, `__perfMetrics`, `__markPerfMetric`, and lazy script cache | `public/runtime-state.js` | Keeps existing globals and adds `[RUNTIME_STATE]` instrumentation. |
| Pose dependency loader | Inline owned `__loadExternalScript` and `__ensurePoseRuntime` | `public/runtime-state.js` | Same script list and promise cache semantics; errors remain rejected promises instead of silent failure. |
| Endpoint/runtime constants bridge | Inline still exposes literal aliases required by existing code/tests, but endpoint construction now has a state owner | `public/runtime-state.js` | Literal `NODE_BASE_URL` remains inline for existing tests and compatibility. |
| Auth debug bridge | Inline owned debug panel state and `__authLoginButtonClicked` / `__authCreateAccountClicked` handlers | `public/runtime-bridges.js` | Preserves button onclick bridge behavior and adds `[RUNTIME_BRIDGE]` instrumentation. |
| Avatar retry bridge | Inline owned `__retryAvatarRuntime` stub | `public/runtime-bridges.js` | Still delegates to `__ensureAvatarThreeModules()` and exposes the same return shape. |
| Canvas context routing bridge | Inline owned canvas route WeakMaps and context conflict checks | `public/runtime-bridges.js` | Preserves skeleton/avatar3d conflict logging while leaving local aliases for existing inline consumers. |
| Dormant diagnostics helpers | Inline described click targets and no-op diagnostic install hooks | `public/runtime-bridges.js` + no-op inline aliases | The active behavior remains unchanged because the diagnostic installer returned immediately before this pass. |

## Bridge/delegator-only inline sections (B: keep thin for now)

| Inline section | Current role | Why not fully extracted in this pass |
|---|---|---|
| Script tag registration | Loads runtime modules before the giant bootstrap script | Needs to remain in HTML ordering for non-module script compatibility. |
| Runtime endpoint aliases | Declares constants (`NODE_BASE_URL`, `ASK_URL`, session/profile URLs) used by many inline functions | Existing tests and inline closure references require local constants. Future pass can inject these via a boot context object. |
| DOM refs | Reads hundreds of element references at bootstrap | Many legacy inline functions close over these refs; extracting without dependency injection would be high risk. |
| Auth submit/listener wiring | Still binds login form and propagates `APP_AUTH` changes | Auth core exists, but inline still owns compatibility listeners and UI fallback details. |
| Runtime registration | Configures `WorkoutRuntime`, `AvatarRuntime`, `ButtonRuntime`, coach/profile/dashboard integrations | This is the desired final inline shape, but the current block still includes side effects embedded in registration callbacks. |
| Window exports | Exposes `connectCamera`, `startWorkout`, `onLogin`, `onLoginUI`, retention loader, and status-panel helpers | These are compatibility exports; should stay until all callers consume runtime namespaces directly. |
| Retention glue | Loads retention flow and updates status panels | Coupled to auth/profile/dashboard state and local status elements. |
| Diagnostics glue | Module checks, overlay checks, final handler checks, app boot status | Useful as boot orchestration, but still mixed with inline local variables. |
| Camera/workout control buttons | Fullscreen and mobile controls delegate to `WorkoutRuntime` where possible | Button binding and camera fullscreen state still close over inline variables. |
| Avatar controls and Avaturn message listener | Delegates core rendering to `AvatarRuntime` | Modal/input state and profile writeback still live inline. |
| Dashboard/library navigation buttons | Mostly delegated through `ButtonRuntime` / `app-core` | Legacy fallback assignment remains inline for compatibility. |

## Dangerous/high-blast-radius inline sections (C: defer)

1. **Auth lifecycle and `APP_AUTH` propagation** — tightly coupled to localStorage, overlay visibility, profile rendering, retention boot, and button activation.
2. **Workout lifecycle callback registration** — `WorkoutRuntime.configureWorkoutRuntime()` callbacks mutate rep mirrors, pose state, progression state, HUD, coach voice, and camera status globals.
3. **Pose/render loop ownership remnants** — detector/running/animation/local pose packet variables still feed rep analysis, avatar overlay, coach cues, and HUD rendering.
4. **Rep/session persistence glue** — session id, rep mirrors, Node event writes, and local fallback behavior span several runtimes.
5. **Avatar modal/profile coupling** — Avaturn popup messages, uploaded GLB URLs, profile persistence, and runtime status are interdependent.
6. **Retention/dashboard/profile hydration chain** — calendar/progress/profile/dashboard reads share auth and backend truth state.
7. **Boot readiness gates** — `bootStatus`, handler checks, overlay checks, and feature activation enable buttons; regressions could lock the app.

## Remaining inline ownership inventory

- **Global state:** user/profile/calendar/backend truth, pose/workout/session mirrors, exercise-definition buffers, OHSA buffers, AI program selection, boot status, and app host/tracking/avatar-stage flags.
- **Window exports:** auth helpers, camera/workout helpers, retention loader, status panel rescue helpers, avatar/profile helpers, and diagnostic/report state.
- **Auth listeners:** `auth:changed`, `auth:ready`, `load`, and `DOMContentLoaded` listeners remain inline because they sequence overlay and feature gating.
- **Event listeners:** workout selection, fullscreen camera, avatar controls, Avaturn `message`, keyboard shortcuts, voice input, and final load bootstrap remain inline.
- **Retention glue:** retention flow lazy loading and status-panel updates remain inline/adjacent to dashboard/profile state.
- **Diagnostics glue:** app boot module checks, handler checks, overlay checks, diagnostic collection, and click/activation panels remain inline or delegated to status panel runtime.
- **Runtime registration:** `WorkoutRuntime`, `ButtonRuntime`, `AvatarRuntime`, `CoachRuntime`, `HudRuntime`, `RepRuntime`, `RepAnalysisRuntime`, and `WorkoutProgressionRuntime` are registered/connected inline.
- **Camera/workout helpers:** local aliases remain for `connectCamera`, `startWorkout`, fullscreen state, and mobile controls while core behavior delegates to `WorkoutRuntime`.
- **Session helpers:** session creation and pilot-event writes remain tied to inline auth/backend constants.
- **Avatar helpers:** modal controls, upload/profile fields, and Avaturn bridge remain inline while Three/render ownership is extracted.
- **Dashboard helpers:** dashboard/library nav and progress status glue remain inline or delegated through `ButtonRuntime`/dashboard runtime.

## Estimated reduction and remaining work

- `index.html` / `public/index.html` are synchronized at 4,952 lines after extraction.
- The largest inline bootstrap script is now approximately 4,004 lines.
- This pass moved roughly 300 lines of event/state/bridge implementation into dedicated runtime modules and reduced duplicated inline HTML by roughly 206 lines overall.
- Estimated remaining inline reduction opportunity: **2,400–3,000 lines**, mostly by extracting auth lifecycle compatibility, DOM ref/context construction, retention/dashboard hydration glue, and the remaining pose/workout/session callback bodies into runtime-owned modules.

## No-regression notes

- No silent failures were introduced: new modules keep console-visible boot/runtime errors and rejected loader promises.
- `[RUNTIME_EVENTS]`, `[RUNTIME_STATE]`, and `[RUNTIME_BRIDGE]` markers identify the extracted ownership at runtime.
- Root/public sync was preserved by copying the updated root `index.html` to `public/index.html` after edits.
