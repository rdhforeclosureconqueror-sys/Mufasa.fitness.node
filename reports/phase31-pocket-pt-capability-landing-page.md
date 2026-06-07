# Phase 31 — Pocket PT Capability-Led Landing Page and Product Story

## Scope

Phase 31 replaces the public landing-page message with a capability-led Pocket PT product story. The public landing page remains `/`, and the workout app remains `/workout.html`. This phase does not change backend auth, payment, avatar/3D feature flags, diagnostics gating, Push-Up Challenge, dashboard, exercise library, Request New Exercise, or the role-gated coach template builder.

## Capability verification matrix

| Capability | Frontend flow | Backend route or local runtime | Authentication requirement | Current status | Safe landing-page claim |
| --- | --- | --- | --- | --- | --- |
| Login/profile | Workout sign-in overlay and profile summary in `public/workout.html` | `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/me`, `/api/me/profile` | Required after public landing | ACTIVE | Members can sign in and keep profile/training information connected. |
| Goals and intake | Retention Journey in workout support pane | `/api/client-intake`, `/api/goals-baseline`, `/api/check-ins`, `/api/progress/dashboard` | Required | ACTIVE | Pocket PT supports intake, goals baseline, scheduled training, and check-ins after login. |
| Personalized workout/program support | Today’s Workout selector and retention/program flow | `/api/programs/current`, `/api/programs`, local workout selection runtime | Required for saved/current program; local templates public in app shell after login gate | PARTIAL | Pocket PT keeps goals, intake, current program data, check-ins, and history connected so training can become more personalized over time. Do not claim fully automatic advanced adaptation. |
| Default workouts | Workout selector: Bodyweight Squat, Push-Up, Lunge, NASM Total Body A, Yoga Back Release Flow | Static workout templates and local runtime in `public/workout.html` | App login gate applies | ACTIVE | Users can choose starter/template workouts in the workout app. |
| Camera movement tracking | Connect Camera button, video/canvas stage, challenge camera controls | Browser camera + pose/form/rep runtimes | App login gate applies; browser camera permission required | ACTIVE | Pocket PT watches supported movements when users connect the camera. |
| Form feedback | HUD/live guidance and form engine for known movement patterns | `public/form-engine.js`, `public/rep-runtime.js`, workout runtime | App login gate applies | ACTIVE | Pocket PT gives practical form cues for supported movements such as squats, push-ups, and lunges. |
| Rep counting | Workout HUD rep fields and challenge scoring | Local rep runtime and session routes for persistence | App login gate applies for workout; challenge endpoint public | ACTIVE | Pocket PT tracks reps in supported workout and challenge flows. |
| Workout history | Dashboard history list and runtime | `/api/me/history`, `/api/workouts/track`, `/api/sessions` | Required | ACTIVE | Signed-in members can save completions and review workout history. |
| Progress dashboard | `/dashboard.html` dashboard KPIs/history | `/api/progress/dashboard`, `/api/workouts/reward/latest`, `/api/me/history`, `/api/check-ins` | Required for data | ACTIVE | Members can review progress history, consistency, and active workout state on the dashboard. |
| Check-ins | Retention Journey check-in flow | `/api/check-ins` GET/POST | Required | ACTIVE | Weekly check-ins help keep training accountable over time. |
| Push-Up Challenge | Challenge panel in workout app and public deep link | `/api/challenges/pushup/results`, `/api/challenges/pushup/leaderboard`, local challenge runtime | Public challenge result/leaderboard endpoints; camera browser permission | ACTIVE | Visitors can try a Push-Up Challenge with scoring, save status, and leaderboard. |
| Leaderboard | Challenge leaderboard table and buttons | `GET /api/challenges/pushup/leaderboard` | Public route | ACTIVE | Challenge results can appear on a leaderboard after consent. |
| Exercise library | `/exercise-library.html` searchable cards and selection button | Static `exercise-db/index.json`, `/api/exercises/index`, `/api/exercises/search`, `/api/exercises/:slug` | Public read; app login gate for workout usage | ACTIVE | Users can browse a searchable exercise library and send selections toward workouts. |
| Pocket PT text conversation | Question input and Ask button in workout app | `public/coach-runtime.js` via `/command` and local context handling | App login gate applies for shell | ACTIVE | Users can ask practical workout, substitution, recovery, and mobility questions in text. |
| Voice conversation | Voice On button, speech recognition fallback, speak proxy | Browser speech APIs, `/api/speak` proxy | App login gate/provider/browser dependent | PARTIAL | Browser-dependent voice support exists, but do not advertise 24/7 voice guidance as active. |
| Diet or meal planning | No reachable public/user meal planning UI found | No verified diet-plan route found | N/A | COMING SOON | Meal tracking and nutrition planning are being developed. Do not claim diet-plan creation as active. |
| Calorie/meal logging | No reachable meal/calorie logging UI found | No verified calorie/meal logging route found | N/A | COMING SOON | Do not advertise active calorie calculation or meal logging. |
| Recovery or stretching guidance | Yoga Back Release Flow and typed coach questions | Static workout template + `/command`/coach runtime | App login gate applies | PARTIAL | Pocket PT can provide general fitness, mobility, and recovery suggestions; medical/injury concerns require professionals. |
| Trainer/client tracking | Program assignment and role-gated template/admin flows | `/api/programs`, exercise template routes, authorization middleware | Required; user-scoped or trainer/admin role | PARTIAL | Authorized roles have private trainer/admin tooling. Do not promote it as a public pathway. |
| Custom exercise template builder | Hidden Create Exercise Template Draft button and builder panel | `/api/exercise-templates*` with admin/trainer role gate | Required + trainer/admin/super_admin | ACTIVE for authorized roles | Role-gated trainer/admin template draft tooling exists and stays hidden from public visitors. |
| Billing/membership | Membership API tested; checkout route | `/api/me/membership`, `/api/billing/create-checkout-session`, `/api/billing/webhook` | Required except webhook | ACTIVE | Billing/membership exists, but Phase 31 does not change or publicly reposition payment. |

## Active claims used

- Pocket PT helps visitors choose or receive workouts.
- Pocket PT keeps goals, intake, current program data, check-ins, workout history, reps, and performance information together for signed-in members.
- Pocket PT uses camera-guided tracking for supported movements.
- Pocket PT gives form cues for supported squats, push-ups, and lunges.
- Pocket PT tracks reps in supported workout/challenge flows.
- Pocket PT saves authenticated workout completions and shows progress/history on the dashboard.
- Pocket PT includes check-ins, calendar/completion views, and dashboard consistency indicators.
- Pocket PT includes a Push-Up Challenge with leaderboard.
- Pocket PT includes a searchable exercise library.
- Pocket PT accepts practical typed fitness, workout, substitution, recovery, and mobility questions.
- Authorized trainer/admin users have hidden role-gated template tooling.

## Unsupported claims omitted or marked coming soon

- Diet-plan creation was omitted as active.
- Calorie calculation was omitted as active.
- Meal logging was omitted as active.
- Nutrition planning was labeled **Coming soon**.
- Injury diagnosis and pain diagnosis were explicitly excluded.
- Replacement for a doctor, physical therapist, or registered dietitian was explicitly excluded.
- 24/7 voice guidance was not advertised.
- Fully automatic advanced program adaptation was not claimed.

## Landing-page sections

1. Hero: “Training That Learns Your Routine, Tracks Your Progress, and Keeps You Moving.”
2. Product pathways for new users, returning users, event participants, and authenticated members.
3. Problem-focused section for consistency, workout choice, progress tracking, form confidence, personalization, and practical questions.
4. “What Pocket PT Can Do” capability cards.
5. “How You Use Pocket PT” daily-flow section.
6. “Questions You Can Bring to Pocket PT” examples.
7. Consistency and accountability section.
8. Personalization over time section.
9. Nutrition planning coming-soon section.
10. Recovery and mobility section.
11. Safety-first section.
12. Final CTA section.

## Visual design changes

- Retained and expanded the dark futuristic presentation.
- Added layered radial glows, subtle grid background, neon green active states, gold/amber highlights, and restrained gradients.
- Added a premium training-console hero card with animated scan ring/line.
- Added responsive product pathway, problem, capability, question, accountability, and flow grids.
- Added reduced-motion handling for animations.
- Preserved readable contrast, semantic headings, keyboard-accessible links, and mobile-first responsive breakpoints.

## CTA behavior

- `Start With Pocket PT` → `/workout.html`
- `Try the Push-Up Challenge` → `/workout.html#pushupChallengePanel`
- `Member Login` → `/workout.html`
- `Open My Dashboard` → `/dashboard.html`
- Navigation keeps `/dashboard.html` and `/exercise-library.html` visible.
- Trainer/admin builder is not promoted as a public CTA; it is only described as role-gated inside a capability card.

## Medical and nutrition wording decisions

- Nutrition is marked coming soon: “Meal tracking and nutrition planning are being developed to bring training and daily habits into one place.”
- Landing copy states Pocket PT does not currently advertise live diet-plan creation, calorie calculation, or meal logging.
- Recovery wording is limited to “general fitness, mobility, and recovery suggestions.”
- Required safety wording is included: “For pain, injury, medical conditions, or urgent concerns, consult a qualified healthcare professional.”
- Landing copy states Pocket PT does not diagnose injuries or replace a doctor, physical therapist, or registered dietitian.

## Tests changed

- Added `test/phase31-pocket-pt-capability-landing-page.test.js` to verify:
  - public landing uses Pocket PT identity,
  - public landing visible text avoids technology-first `AI` wording,
  - hero CTAs exist,
  - Push-Up Challenge CTA still targets `/workout.html#pushupChallengePanel`,
  - route split remains intact,
  - capability cards render,
  - unsupported nutrition claims are not presented as active,
  - medical replacement/diagnostic claims are absent and safety copy exists,
  - responsive/reduced-motion structure remains present,
  - diagnostics are absent from public landing,
  - workout page, dashboard, challenge, Request New Exercise, diagnostics gating, and trainer builder remain preserved.
- Updated `test/phase30-public-ux-presentation.test.js` expectations to match the new Phase 31 public landing copy while preserving Phase 30 route-split and hidden-diagnostics assertions.

## Remaining gaps

- Voice support is browser/provider dependent and should not be positioned as always-on guidance.
- Meal tracking, nutrition planning, calorie calculation, and diet-plan creation need real user flows before they can be advertised as active.
- Advanced automatic performance-based program adaptation needs a verified reachable end-to-end flow before stronger marketing claims are safe.
- Custom exercise request creation remains a pilot-safe message path, not a public custom exercise creation workflow.
- Exercise template builder remains private and role-gated; public discovery should stay limited.

## Rollback notes

- To rollback Phase 31 copy only, restore `public/index.html` from the previous commit and revert the Phase 31/updated Phase 30 test expectations.
- Do not rollback by moving the workout shell back to `/`; Phase 30’s route split should remain intact.
- If nutrition wording changes later, verify a live route and reachable UI before changing “Coming soon” to “Available now.”
