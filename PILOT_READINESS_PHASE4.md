# Phase 4: Pilot Readiness Lock

Date: 2026-04-21  
Status: FAIL

## 1) Exact files changed

- `index.html`
- `README.md`
- `PILOT_READINESS_PHASE4.md` (this report)

## 2) Pilot journeys traced

## Journey A — Sign in and load pilot shell

1. Open `/` (root app shell).
2. Login overlay appears.
3. User signs in with manual username or Google.
4. UI loads profile summary + workout/calendar surfaces.
5. Backend session/token bootstrap occurs; sync indicator updates.

## Journey B — Camera + OHSA + program seed + persistence

1. Click **Connect Camera**.
2. Camera + pose detector initialize.
3. Click **Overhead Squat Assessment**.
4. Complete front then side capture flow.
5. OHSA summary displays and POST to backend is attempted.
6. Program/calendar state updates and persists locally.

## Journey C — Workout session write path

1. Click **Start Workout**.
2. Session start is written to backend API.
3. Rep updates stream during active workout.
4. Session complete writes on finish/stop.
5. Completed date is reflected in calendar state.

## Journey D — Dashboard history read path

1. Click **My Dashboard**.
2. Navigate to `/public/dashboard.html`.
3. Dashboard loads KPI + active workout + history.
4. Reads `/api/me/history` when authorized; otherwise local fallback messaging is shown.
5. User can reset local-only cached dashboard data.

## 3) Visible routes/pages included in pilot

- `/` (main app shell and pilot workflows)
- `/public/dashboard.html` (pilot read/visibility dashboard)
- `/health` (ops/runtime health visibility)
- `/api/auth/bridge` (auth bridge)
- `/api/me`, `/api/me/profile`, `/api/me/history`, `/api/me/ohsa`
- `/api/sessions`, `/api/sessions/:id/reps`, `/api/sessions/:id/complete`
- `/api/ohsa`
- `/api/ops/write-observability` and existing control-plane ops endpoints (admin-facing)

## 4) Routes/pages intentionally excluded from pilot

Excluded by pilot lock (visible but disabled/labeled):
- New Exercise authoring flow (UI button disabled + labeled deferred)
- Mufasa Chat ask flow (text input + Ask button disabled/labeled deferred)
- Voice-trigger controls for chat (Voice On disabled/labeled deferred)

Excluded by scope (no new route work performed in this phase):
- Avatar render modes (`avatar_overlay`, `avatar_only`) remain non-pilot placeholders.
- Any net-new frontend pages or product surfaces.

## 5) Remaining blockers, if any

Blocker:
- Backend startup parse failure in `server.js` (unexpected identifier near `minSecretLength`) currently causes:
  - `npm run test` failure
  - `npm run ops:pilot-checks` preflight failure

Risk notes (non-blocking beyond the blocker above):
- Brain/chat external dependency can be offline; now explicitly de-scoped in pilot UI.
- Voice trigger controls are intentionally disabled for pilot safety.

## 6) Smoke verification steps

1. Load `/`; confirm pilot lock banner is visible.
2. Confirm deferred controls are disabled:
   - New Exercise
   - Mufasa Chat input + Ask
   - Voice On
3. Perform sign-in, then connect camera.
4. Run OHSA and confirm summary panel updates.
5. Start/stop workout and confirm no UI regressions.
6. Open dashboard via **My Dashboard** and confirm history/kpi render.
7. Run backend checks:
   - `npm run test`
   - `npm run ops:pilot-checks`

## 7) Final GO / NO-GO recommendation for pilot

NO-GO until the backend parse failure is fixed and pilot checks are green.

## 8) PASS / FAIL

FAIL

## Final pilot readiness matrix

| Surface | State |
|---|---|
| Login + profile hydration + backend sync status | **working and in-scope** |
| Camera + OHSA + OHSA summary | **working and in-scope** |
| Session start/rep/complete write flow | **working and in-scope** |
| Dashboard history + KPI page | **working and in-scope** |
| New Exercise authoring UI | **hidden/disabled** |
| Mufasa Chat ask UI | **hidden/disabled** |
| Voice trigger UI | **hidden/disabled** |
| Avatar-only render variants | **visible but intentionally deferred** (non-pilot placeholders) |
| Unresolved blockers | **server startup parse failure in `server.js` blocks test + preflight gates** |
