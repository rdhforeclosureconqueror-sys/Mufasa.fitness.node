# Pilot Phase 0 Protection Baseline

Generated: 2026-05-13
Branch: `work`

## Phase 0 Scope

Phase 0 is protection and baseline verification only. It does not attempt to make the whole repo pilot-ready and does not begin avatar/3D stabilization work.

## Baseline Git State

- Required initial check: `git status --short`
- Initial result: clean working tree before this report was created.

## Active Backend Entry Point

- Active backend entry point: `server.js`
- Package entry point: `package.json` declares `"main": "server.js"`.
- Runtime start command: `npm start` runs `node server.js`.
- Direct server execution in `server.js` starts the Express app when `require.main === module`.

## Active Frontend Directory

- Active frontend source of truth: `public/`
- Evidence: `server.js` defines `PUBLIC_DIR` as `path.join(rootDir, "public")` and serves static assets with `express.static(PUBLIC_DIR)`.
- Do not treat root-level frontend duplicates as active without explicit approval.

## Active Frontend Pages

The active frontend pages served by `server.js` are:

- `/` -> `public/index.html`
- `/dashboard.html` -> `public/dashboard.html`
- `/exercise-library.html` -> `public/exercise-library.html`

## Legacy / Shadow Root-Level Frontend Duplicates

The following root-level files appear to be legacy/shadow duplicates because the active static frontend is served from `public/`:

- `index.html`
- `dashboard.html`
- `dashboard.js`
- `fitness.js`
- `backend-read.js`
- `session-write.js`
- `runtime-orchestrator.js`
- `exercise-library.html`
- `exercise-library.js`
- `auth-state-runtime.js`
- `profile-write-runtime.js`

Phase 0 does not edit, delete, move, or rewire these files.

## Files / Directories That Must Not Be Touched Without Approval

- `server.js`
- `public/`
- `src/`
- `data/`
- `package-lock.json`
- Root-level duplicate frontend files, including but not limited to:
  - `index.html`
  - `dashboard.html`
  - `dashboard.js`
  - `fitness.js`
  - `backend-read.js`
  - `session-write.js`
  - `runtime-orchestrator.js`
  - `exercise-library.html`
  - `exercise-library.js`
  - `auth-state-runtime.js`
  - `profile-write-runtime.js`

## Known High-Risk Areas

- `server.js`: central Express route wiring, static hosting, auth setup, CORS, TTS, avatar upload, diagnostics, session APIs, and legacy `/command` compatibility.
- `public/`: active frontend source of truth; broad changes here directly affect the served app.
- Avatar/3D runtime: recently destabilized area; do not disable or alter until Phase 1 approval.
- Auth/session stack: shared login, bearer-token, auth bridge, authorization, and session-write behavior.
- Legacy `/command`: still connected for compatibility; do not remove or disable without explicit phase approval.
- `data/`: runtime state and audit/user storage; do not edit manually.
- `package-lock.json`: must remain unchanged unless a later approved phase explicitly requires dependency changes.
- Root-level duplicate frontend files: likely shadows; editing them can create false confidence because the app serves `public/`.

## Required Phase-by-Phase Approval Rule

Work must proceed one phase at a time. Each phase must stop with a report and wait for human approval before the next phase begins.

Phase 0 does not authorize Phase 1. Phase 1 avatar/3D stabilization must not begin until explicitly approved.

## Baseline Checks Required for Phase 0

Required commands:

- `git status --short`
- `npm test`
- `npm run lint`

Results are reported in the assistant Phase 0 completion message.
