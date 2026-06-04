# Phase 30 — Public UX Cleanup, Landing Page, and Pilot Presentation Pass

## Pages and routes touched

- `/` / `public/index.html` is now a polished static public landing page.
- `/workout.html` / `public/workout.html` is the active workout app shell copied from the previous public shell and cleaned for pilot presentation.
- `/dashboard.html` remains unchanged and accessible from landing/workout navigation.
- `/exercise-library.html` remains unchanged and accessible from landing/workout navigation.
- The Push-Up Challenge remains embedded in the workout shell and is directly reachable from the landing CTA via `/workout.html#pushupChallengePanel`.
- Diagnostics remain present in the workout shell and dashboard/admin flows, but the workout-shell diagnostics are hidden from normal users by default.

## Visual changes

- Added a futuristic public landing page with a neon/dark hero, product headline, public CTAs, capability preview card, “How it works” section, and pilot safety copy.
- Updated the workout shell styling with a cleaner dark presentation, softer panels, fewer harsh borders, neon green active states, gold challenge accents, and better spacing.
- Added a workout navigation strip for Home, Dashboard, and Exercise Library.
- Added a clean readiness strip for normal users: Coach ready, Camera guided, Progress can be saved.
- Preserved accessibility basics: readable text contrast, visible CTAs/buttons, semantic sections, and mobile-responsive grid behavior.

## Empty-panel fix

- The raw two-column developer shell no longer appears at `/`.
- The workout shell moved to `/workout.html` and was rebalanced from the old left/right “debug shell” feel into a stage/support layout.
- The workout stage now uses `.workout-stage-pane`; supporting profile/calendar/chat content is `.workout-support-pane`.
- Workout Focus Mode collapses the support pane and nonessential cards when a workout or challenge is active.

## Landing page behavior

- Public visitors see the landing page at `/` instead of the raw workout app.
- Landing CTAs:
  - Try Push-Up Challenge → `/workout.html#pushupChallengePanel`
  - Start Workout → `/workout.html`
  - Member Login / Open App → `/workout.html`
  - View Dashboard → `/dashboard.html`
- The landing page includes required safety copy:
  - “Stop if you feel pain or dizziness.”
  - “This is not medical advice.”

## Workout Focus Mode behavior

- `WorkoutRuntime` now exposes and uses `setWorkoutFocusMode`.
- Starting a workout enables `body.workout-focus`.
- Stopping a workout disables `body.workout-focus`.
- Push-Up Challenge preflight/running enables focus mode.
- Challenge stop, timeout, or calibration failure disables focus mode.
- Focus mode keeps camera/HUD primary and preserves essential controls:
  - Stop Workout / Start button state
  - Expand/Exit Camera controls
  - Voice On
  - Mute
  - Challenge Stop
  - Diagnostics toggle only when allowed
- HUD now includes challenge score and form status fields for cleaner active workout/challenge feedback.

## Diagnostics visibility behavior

- Normal workout users no longer see:
  - Auth Propagation Status
  - App Activation Status
  - Feature Activation Panel
  - System Boot Status
  - pose diagnostics
  - challenge diagnostics
  - landing/system diagnostic results
  - auth debug status
  - frontend shell marker
  - boot status banner
- Diagnostics were not deleted. They are tagged with `data-diagnostic-panel` and revealed by `body.developer-diagnostics`.
- Diagnostic controls are tagged with `data-diagnostic-control` and hidden unless developer diagnostics are enabled or the authenticated user has an admin/operator/developer-style role.
- Developer diagnostics can be enabled with `?dev=1`, `?diagnostics=1`, localStorage `maatDeveloperDiagnostics=enabled`, or the role-aware toggle when available.

## Push-Up Challenge presentation

- The challenge remains available from the landing CTA and the workout shell button.
- Display name, team/contact fields, consent, camera connection, calibration/start/stop buttons, timer, score, save status, rejected-rep reason, and leaderboard remain present.
- During challenge active/preflight states, focus mode reduces clutter and keeps challenge score/form feedback in the HUD.

## Coach/admin template builder presentation

- The Phase 29 template draft button and builder panel remain present in the workout shell.
- Both remain hidden by default for normal users.
- Backend role gating was not changed.

## Tests updated or removed

- No tests were removed.
- Existing shell-oriented tests were updated to target `public/workout.html` now that `public/index.html` is the landing page.
- Added `test/phase30-public-ux-presentation.test.js` to prove:
  - landing page renders,
  - required CTAs exist,
  - workout app remains accessible,
  - empty left developer-panel assumptions are gone,
  - diagnostics are hidden by default and toggle/role accessible,
  - focus mode collapses nonessential panels,
  - Push-Up Challenge remains accessible,
  - Request New Exercise remains accessible,
  - coach/admin builder remains hidden from normal users.

## Risks

- `public/workout.html` is currently a copied static shell from the previous `public/index.html`; future changes to the workout shell should target `public/workout.html` to avoid root landing regressions.
- The `/workout.html#pushupChallengePanel` deep link relies on browser anchor scrolling after the auth/app shell loads.
- CSS uses modern selectors for hiding a specific boot status line; older browsers that lack `:has()` still hide the diagnostic marker itself via direct selectors, but that single parent line may degrade gracefully.
- Diagnostics role visibility depends on frontend role state for presentation only; backend diagnostic APIs remain protected server-side.

## Rollback notes

- To rollback the route split, restore the previous `public/index.html` workout shell and remove `public/workout.html` plus the Phase 30 tests.
- To keep the landing page while rolling back focus mode, revert the `public/workout-runtime.js` `setWorkoutFocusMode` additions and remove the `body.workout-focus` CSS from `public/workout.html`.
- To expose diagnostics again, remove the `data-diagnostic-panel`/`data-diagnostic-control` CSS gate and toggle script in `public/workout.html`.

## Remaining pilot-readiness gaps

- A full browser/device QA pass is still needed for camera permissions, mobile Safari layout, and anchor entry into the challenge panel.
- The landing page is static and does not yet personalize CTA states based on an existing authenticated session.
- Dashboard admin diagnostics are still visually dense and may need a separate admin UX pass.
- Workout shell HTML remains large; future phases should extract reusable layout and modal structure only after pilot stability is confirmed.
