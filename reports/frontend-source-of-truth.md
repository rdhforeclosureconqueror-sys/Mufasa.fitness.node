# Frontend Source of Truth — Phase 2 Active Frontend Source Lock

Date: 2026-05-13

Scope: documentation/report only. This report identifies the active served frontend source and the root-level legacy/shadow duplicates that must not be treated as the live application source without explicit approval.

## Source-of-truth summary

- **Active backend entry point:** `server.js` is the Node/Express entry point declared by `package.json` (`main`, `start`, and `dev` scripts all route through `server.js`).
- **Active static frontend directory:** `public/` is the static asset root. `server.js` defines `PUBLIC_DIR` as `<repo>/public` and serves it through `express.static(PUBLIC_DIR)`.
- **Active frontend pages:**
  - `/` is served from `public/index.html` after the cache-bust redirect.
  - `/dashboard.html` is served from `public/dashboard.html`.
  - `/exercise-library.html` is served from `public/exercise-library.html`.
- **Active frontend scripts loaded from `public/`:** the live pages load scripts by absolute web paths such as `/backend-read.js`, `/session-write.js`, and `/runtime-orchestrator.js`; because the static root is `public/`, those paths resolve to files inside `public/`, not root-level duplicates.

## Required source-lock rules

1. **Future frontend fixes must target `public/` unless explicitly approved.** The app's active static server resolves frontend pages and assets from `public/`.
2. **Root-level frontend duplicates must not be edited, deleted, moved, renamed, or “fixed” without explicit approval.** They are legacy/shadow files relative to the currently served frontend path.
3. **Do not assume root-level duplicate edits affect the deployed app.** Since the active app is served from `public/`, changing a same-named root file may have no effect on the live/deployed frontend.
4. **Treat root-level duplicates as a coordination risk.** Their presence can confuse future agents, contractors, reviewers, or maintainers into patching the wrong source.

## Active frontend scripts observed from `public/` pages

### `public/index.html`

- `/form-engine.js`
- `/runtime-events.js?v=20260506`
- `/runtime-state.js?v=20260506`
- `/runtime-bridges.js?v=20260506`
- `/auth-state-runtime.js?v=20260506`
- `/boot-core.js?v=20260505a`
- `/auth-core.js`
- `/diagnostics-client.js?v=20260426b`
- `/backend-read.js?v=20260425`
- `/session-write.js?v=20260425`
- `/pose-runtime.js?v=20260506`
- `/assessment-runtime.js?v=20260507`
- `/rep-runtime.js?v=20260506`
- `/rep-analysis-runtime.js?v=20260506`
- `/hud-runtime.js?v=20260506`
- `/workout-progression-runtime.js?v=20260506`
- `/dashboard-runtime.js?v=20260506`
- `/coach-runtime.js?v=20260507`
- `/avatar-runtime.js?v=20260506a` when the avatar feature flag is enabled
- `/profile-write-runtime.js?v=20260507`
- `/landing-diagnostics.js?v=20260426`
- `/button-runtime.js?v=20260505`
- `/live-workout-breakpoints.js?v=20260507`
- `/status-panels.js?v=20260507`
- `/workout-runtime.js?v=20260507`
- `/runtime-orchestrator.js?v=20260506`
- `/retention-loader-runtime.js?v=20260507`
- `/app-hydration-runtime.js?v=20260507`
- `/app-core.js?v=20260429`
- `/profile-runtime.js?v=20260505`
- `/app-runtime.js?v=20260506`
- `/fitness.js?v=20260425`

### `public/dashboard.html`

- `/diagnostics-client.js?v=20260426`
- `/backend-read.js`
- `/dashboard-runtime.js?v=20260506`
- `/dashboard.js?v=20260506`

### `public/exercise-library.html`

- `/exercise-library.js`

## Source status table

| File/path | Status | Reason | Approval required before editing? |
| --- | --- | --- | --- |
| `server.js` | active | Backend entry point used by package scripts; defines `PUBLIC_DIR`, active page routes, and static serving. | Yes for Phase 2; forbidden by current phase instructions. |
| `public/` | active | Active static frontend directory served by Express. | Yes for Phase 2; forbidden by current phase instructions. |
| `public/index.html` | active | Canonical shell for `/`. | Yes for Phase 2; forbidden by current phase instructions. |
| `public/dashboard.html` | active | Explicit route for `/dashboard.html`. | Yes for Phase 2; forbidden by current phase instructions. |
| `public/exercise-library.html` | active | Explicit route for `/exercise-library.html`. | Yes for Phase 2; forbidden by current phase instructions. |
| `public/*.js` loaded by active pages | active | Script URLs resolve through `public/` because it is the static root. | Yes for Phase 2; forbidden by current phase instructions. |
| `index.html` | legacy/shadow | Root-level duplicate has a same-named active counterpart at `public/index.html`; not served as `/` by current backend routing. | Yes. |
| `dashboard.html` | legacy/shadow | Root-level duplicate has a same-named active counterpart at `public/dashboard.html`; active route sends the `public/` file. | Yes. |
| `dashboard.js` | legacy/shadow | Root-level duplicate has a same-named active counterpart at `public/dashboard.js`; active page script URL resolves through `public/`. | Yes. |
| `fitness.js` | legacy/shadow | Root-level duplicate has a same-named active counterpart at `public/fitness.js`; active page script URL resolves through `public/`. | Yes. |
| `backend-read.js` | legacy/shadow | Root-level duplicate has a same-named active counterpart at `public/backend-read.js`; active page script URL resolves through `public/`. | Yes. |
| `session-write.js` | legacy/shadow | Root-level duplicate has a same-named active counterpart at `public/session-write.js`; active page script URL resolves through `public/`. | Yes. |
| `runtime-orchestrator.js` | legacy/shadow | Root-level duplicate has a same-named active counterpart at `public/runtime-orchestrator.js`; active page script URL resolves through `public/`. | Yes. |
| `profile-write-runtime.js` | legacy/shadow | Root-level duplicate has a same-named active counterpart at `public/profile-write-runtime.js`; active page script URL resolves through `public/`. | Yes. |
| `auth-state-runtime.js` | legacy/shadow | Root-level duplicate has a same-named active counterpart at `public/auth-state-runtime.js`; active page script URL resolves through `public/`. | Yes. |
| `exercise-library.js` | legacy/shadow | Root-level duplicate has a same-named active counterpart at `public/exercise-library.js`; active page script URL resolves through `public/`. | Yes. |

## Known risks

- Editing root-level legacy/shadow duplicates may not affect the deployed app because the active frontend is served from `public/`.
- Root-level legacy/shadow duplicates may confuse future agents, contractors, reviewers, or maintainers and lead to changes in files that are not part of the served frontend.
- The duplicate filenames increase review burden because same-name files exist in both the repo root and `public/`.

## Rollback notes

This phase only adds this report. Rollback is limited to removing `reports/frontend-source-of-truth.md` if the source-lock report is not approved.
