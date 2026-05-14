# Phase 11 — Browser Cohesion and Route Wiring Fix

## Scope
Phase 11 only addressed split-deployment backend-origin wiring and frontend activation blockers required for the controlled pilot flow.

## Changes
- Added the same static backend runtime config used by `public/index.html` to `public/dashboard.html` before runtime/dashboard scripts load.
- Loaded `runtime-state.js` and `auth-state-runtime.js` on the dashboard before `backend-read.js`, `dashboard-runtime.js`, and `dashboard.js`.
- Guarded the optional `calendarApplyBtn` reference on `public/index.html` by resolving it with `document.getElementById("calendarApplyBtn")`; missing calendar UI no longer throws a `ReferenceError`.
- Added focused regression tests for dashboard backend origin wiring, dashboard route construction, optional calendar button guards, and the existing camera click-to-`getUserMedia` path.

## Expected behavior after deploy
- Dashboard backend display and dashboard API base resolve through `RuntimeState.getBackendOrigin()` to `https://mufasa-fitness-node.onrender.com` in the split Render deployment.
- Dashboard calls `/__version`, `/__diagnostic-smoke`, `/api/me/history?limit=25`, and `/api/admin/diagnostics/report` against the backend origin, not the frontend origin.
- Missing `calendarApplyBtn` does not stop app activation.
- Camera activation wiring can complete past the calendar guard, exposing `window.connectCamera` and allowing the camera button handler to call `WorkoutRuntime.connectCamera()`, which calls `navigator.mediaDevices.getUserMedia({ video: true, audio: false })` when supported.

## Deferred
- Retention `NOT_READY` caused by incomplete real user onboarding/program/workout data remains product-flow state, not fake data.
- Coach/chat 422 remains deferred unless later evidence proves a frontend payload bug.
- Voice/mic permission/user-agent failures remain manual browser permission/platform issues.
- Avatar/3D remains disabled for pilot.
