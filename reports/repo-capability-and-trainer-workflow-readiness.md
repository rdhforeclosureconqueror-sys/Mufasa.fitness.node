# Phase 10 — Repo Capability and Trainer Workflow Readiness Report

Date: 2026-05-14  
Scope: report-only repo capability inventory and controlled pilot readiness assessment.  
Runtime code changed: no.  
Frontend code changed: no.  
Backend behavior changed: no.

## 1. Executive summary

**Current pilot status: PARTIAL GO pending manual browser smoke test.**

The repo is **good enough for a controlled pilot with a small number of clients** if the operator first completes the documented hardened environment preflight and a real browser smoke pass for login, profile save, retention flow, workout/session tracking, dashboard refresh, check-in, billing checkout handoff, and diagnostics.

### Why PARTIAL GO

Strengths:

- The backend has explicit authenticated routes for login, profile, intake, goals, program assignment, sessions, rep updates, workout completion, check-ins, progress dashboard, membership, billing checkout, Stripe webhook handling, exercise library, diagnostics, and ops control-plane observability.
- The active static frontend under `public/` has a landing/workout shell, dashboard page, exercise library page, auth runtime, profile writer, session writer, retention flow, dashboard runtime, and diagnostics client.
- Tests and nonsecurity pilot checks pass.
- The avatar upload route is feature-gated and the runtime loader treats avatar as disabled unless explicitly enabled.
- The documented hardened Phase 3 preflight command passes when pilot/production environment variables are supplied.

Remaining launch risks:

- The default local `npm run ops:preflight` fails because pilot hardening environment variables are absent. This is expected locally, but production must use the hardened environment posture.
- Browser behavior remains the biggest unverified risk: the report did not manually operate a real browser, camera permission flow, Stripe checkout redirect, or diagnostics posting from a user device.
- The active app still contains large inline/runtime orchestration surfaces in `public/index.html`; this increases manual smoke risk even though tests pass.
- Billing has membership status and Stripe checkout/webhook plumbing, but no full trainer-facing billing dashboard.

Biggest product/workflow gaps for trainers:

- No trainer-first client list or multi-client dashboard.
- Program creation/assignment exists as an API/client retention flow, but there is no efficient trainer UI for creating templates, duplicating programs, editing assigned plans, or reviewing a roster.
- Progress tracking is single-user oriented; trainer overview, adherence alerts, missed check-in alerts, and client prioritization are missing.
- Communication features are absent: no coach/client messaging, workout comments, reminders, or notification system.
- Payment status exists per authenticated user, but there is no admin billing panel, active/inactive client workflow, onboarding funnel, or retention metrics.

## 2. Current application architecture summary

| Area | Current state |
| --- | --- |
| Backend entry point | `server.js` is the Node/Express entry point declared as `main` in `package.json`. It constructs middleware, auth, user data, session, membership, diagnostics, ops, exercise, TTS, avatar, and legacy command routes. |
| Static frontend source of truth | `public/` is the active static frontend served by Express. `/`, `/dashboard.html`, and `/exercise-library.html` are explicitly routed to files in `public/`. |
| Active frontend pages | `public/index.html`, `public/dashboard.html`, and `public/exercise-library.html`. Supporting active JS clients include `auth-core.js`, `auth-ui.js`, `backend-read.js`, `profile-write-runtime.js`, `session-write.js`, `retention-flow.js`, `dashboard-runtime.js`, `dashboard.js`, `exercise-library.js`, and `diagnostics-client.js`. |
| Main backend systems | Auth/token issuance, provider bridge, permissions/authorization, profile/user data, sessions and reps, intake/goals/program/workout/check-ins/progress, exercise library index/search/detail, membership/billing, diagnostics/reporting, ops enforcement/audit/preflight, TTS proxy, feature-gated avatar upload, legacy command adapter. |
| Storage model | File-backed JSON user records through `userStore`, plus NDJSON/json operational stores for diagnostics, audit, token revocation, enforcement state, and pilot events. User records contain events, sessions, OHSA, profile, intake, goals baseline, program, workout tracking, check-ins, visual scans, and membership data as applicable. |
| External dependencies | Express, CORS, Helmet, Morgan, ws, Three.js package; Stripe API through server-side fetch in membership service; OpenAI Responses API for optional diagnostic summarization; browser-side speech/TTS path via `/api/speak`; external/static exercise assets and browser camera/Web APIs. |
| Disabled systems | Avatar/3D is disabled by default unless `ENABLE_AVATAR_FEATURE=true`; visual progress scans are gated by `ENABLE_VISUAL_PROGRESS_SCANS=true`; unauthenticated TTS must be disabled for pilot hardening with `ENABLE_TTS_NO_AUTH=false`; low-trust auth bridge modes must be disabled for hardened pilot/production. |
| Legacy/shadow systems | Root-level duplicate frontend files such as `index.html`, `dashboard.html`, `exercise-library.html`, and several root JS clients exist outside `public/` and should be treated as legacy/shadow inventory, not active source of truth. `/command` remains as a deprecated legacy compatibility adapter/fallback path. |

## 3. Route capability inventory

Pilot status legend: **PASS** = sufficient for controlled pilot after env/browser smoke, **PARTIAL** = useful but incomplete/manual risk, **FAIL** = not ready for pilot use, **DEFERRED** = intentionally outside current pilot scope.

| Method | Route | Capability | Auth required? | Role/permission required? | Pilot status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/` | Active landing/workout app shell | No | None | PASS | Serves `public/index.html` with cache-bust redirect behavior. |
| GET | `/dashboard.html` | Active dashboard page | No page auth; APIs require auth | None for page | PASS | Page loads static shell; backend data calls require bearer token. |
| GET | `/exercise-library.html` | Active exercise library page | No | None | PASS | Static exercise browsing page. |
| GET | `/avatar-runtime.js` | Avatar runtime asset gate | No | None | PASS | Returns disabled JavaScript stub unless avatar feature is enabled. |
| GET | `/__version` | Version/build metadata | No | None | PASS | Diagnostic/version route. |
| GET | `/__diagnostic-smoke` | Smoke diagnostic metadata | No | None | PASS | Lightweight diagnostic smoke endpoint. |
| GET | `/health` | Health, preflight, startup warnings | No | None | PASS | Includes startup warnings and control-plane preflight summary. |
| POST | `/api/auth/login` | Pilot email/password login/token issuance | No | None | PASS | Requires `PILOT_LOGIN_PASSWORD` for non-test success. |
| POST | `/api/auth/register` | Register/auth token path | No | None | PARTIAL | Useful but pilot appears centered on deterministic pilot login. |
| GET | `/api/auth/me` | Resolve authenticated principal | Yes | Authenticated user | PASS | Used to validate token and identity. |
| POST | `/api/auth/logout` | Logout/token revocation surface | No/Token-aware | None | PASS | Clears/revokes where token metadata is available. |
| POST | `/api/auth/bridge` | Provider/manual bridge token issuance | No | Trust policy controls | PARTIAL | Hardened pilot should allow verified provider path only and disable low-trust modes. |
| GET | `/api/me` | Current user/profile authorization context | Yes | Authenticated user | PASS | Returns identity, role, bootstrap super-admin status, provider verification fields. |
| GET | `/api/me/membership` | Current user membership status | Yes | Authenticated user | PASS | Returns inactive/free default or persisted membership. |
| POST | `/api/billing/create-checkout-session` | Create server-side Stripe checkout session | Yes | Authenticated user | PARTIAL | Requires Stripe env and browser redirect validation. No trainer billing dashboard. |
| POST | `/api/billing/webhook` | Stripe webhook membership updates | No bearer; Stripe signature required | Valid Stripe webhook signature | PASS | Tests cover signed active/inactive updates. |
| POST | `/api/pilot/events` | Append pilot event telemetry | No | None | PASS | Operational telemetry path; storage is append-only file log. |
| GET | `/api/exercises/index` | Exercise index JSON | No | None | PASS | Exercise library backend index. |
| GET | `/api/exercises/search` | Exercise search | No | None | PASS | Query-driven exercise search. |
| GET | `/api/exercises/:slug` | Exercise detail by slug | No | None | PASS | Detail lookup for exercise library. |
| POST | `/api/sessions` | Start authenticated workout session | Yes | Authenticated user | PASS | Explicit replacement for legacy start session command. |
| POST | `/api/sessions/:id/reps` | Append/debounce rep update | Yes | Authenticated user scoped to session | PASS | Tracks reps for current user session. |
| POST | `/api/sessions/:id/complete` | Complete session and summary | Yes | Authenticated user scoped to session | PASS | Completes authenticated session lifecycle. |
| GET | `/api/me/profile` | Read current profile | Yes | Authenticated user | PASS | Used by backend-read and hydration. |
| PUT | `/api/me/profile` | Save/update profile | Yes | Authenticated user | PASS | Saves age, height, weight, goals, injuries, notes, avatar metadata when enabled. |
| POST | `/api/ohsa` | Submit OHSA/movement assessment | Yes | Authenticated user | PASS | Assessment support exists. |
| GET | `/api/me/ohsa` | Read OHSA history | Yes | Authenticated user | PASS | Returns recent assessment history. |
| GET | `/api/me/history` | Read completed session/activity history | Yes | Authenticated user | PASS | Dashboard history source. |
| GET | `/api/client-intake` | Read client intake | Yes | Authenticated user | PASS | Single-user client intake status. |
| POST | `/api/client-intake` | Save client intake | Yes | Authenticated user | PASS | Captures goals, limitations, equipment, schedule, consent, notes. |
| GET | `/api/goals-baseline` | Read goals/baseline | Yes | Authenticated user | PASS | Baseline for progress dashboard. |
| POST | `/api/goals-baseline` | Save goals/baseline | Yes | Authenticated user | PASS | Stores goal category, tests, measurements, visual progress reference. |
| GET | `/api/programs/current` | Read current program | Yes | Authenticated user | PASS | Current single-user assigned program. |
| POST | `/api/programs` | Assign program | Yes | Authenticated user | PARTIAL | API supports assignment with `clientId`, but no trainer roster/template UI or cross-client permission workflow. |
| POST | `/api/workouts/track` | Track canonical workout completion | Yes | Authenticated user | PASS | Logs workout completion, reps, sets, form score, duration, notes, status. |
| GET | `/api/workouts/reward/latest` | Latest reward/retention summary | Yes | Authenticated user | PASS | Powers habit-loop/reward feedback. |
| GET | `/api/check-ins` | List check-ins | Yes | Authenticated user | PASS | Recent check-ins for current user. |
| POST | `/api/check-ins` | Save weekly check-in | Yes | Authenticated user | PASS | Energy, soreness, sleep, motivation, adherence, pain flag, measurements/notes. |
| GET | `/api/progress/dashboard` | Progress dashboard data | Yes | Authenticated user | PASS | Aggregates workouts, form trend, check-ins, streak, reward, narrative, habit prompts. |
| GET | `/api/visual-progress-scans` | Visual scan list/comparison | Yes | Authenticated user | DEFERRED | Feature disabled unless explicitly enabled. |
| POST | `/api/visual-progress-scans` | Save visual scan metadata | Yes | Authenticated user | DEFERRED | Feature disabled unless explicitly enabled; no image storage implementation implied. |
| POST | `/api/avatar/upload` | Upload avatar GLB/VRM asset | Yes | Authenticated user | DEFERRED | Feature-gated; returns disabled message when avatar disabled. Correct for pilot. |
| POST | `/api/speak` | TTS proxy | Conditional by env | None or auth depending env | PARTIAL | Useful for coach voice; hardened pilot must keep unauthenticated access disabled. |
| POST | `/api/admin/diagnostics/report` | Upload browser diagnostic report | Yes | `ops.read_observability` / admin allowlist | PASS | Supports optional OpenAI summarization when configured. |
| GET | `/api/admin/diagnostics/recent` | Read recent diagnostic reports | Yes | `ops.read_observability` / admin allowlist | PASS | Admin/operator diagnostic review. |
| GET | `/api/ops/write-observability` | Control-plane/write observability | Yes | `ops.read_observability` | PASS | Shows fallback/enforcement/auth readiness state. |
| GET | `/api/ops/enforcement-config` | Read legacy fallback enforcement config | Yes | `ops.read_authz` | PASS | Ops authz surface. |
| PUT | `/api/ops/enforcement-config` | Update enforcement config | Yes | `ops.manage_enforcement` | PASS | Audited control-plane change. |
| POST | `/api/ops/auth/token-revocations` | Revoke token/JTI | Yes | Ops auth permission | PASS | Token revocation control-plane surface. |
| PUT | `/api/ops/enforcement-config/break-glass` | Break-glass enforcement change | Yes | Super-admin/break-glass posture | PARTIAL | Operationally useful; must be tightly controlled in pilot. |
| GET | `/api/ops/admin-audit` | Read admin audit page | Yes | `ops.read_authz` | PASS | Audit chain visibility. |
| GET | `/api/ops/admin-audit/verify` | Verify admin audit hash chain | Yes | `ops.read_authz` | PASS | Tamper-evidence verification. |
| POST | `/command` | Legacy command adapter/fallback | Conditional auth context; legacy payload includes userId | None beyond fallback policy; user scoped if auth present | PARTIAL | Deprecated. Explicit APIs should be primary; fallback can be disabled/enforced by action. |

## 4. Frontend page and flow inventory

| Page/file | User-facing purpose | Main APIs called | Pilot status | Notes |
| --- | --- | --- | --- | --- |
| `public/index.html` | Active landing, auth shell, profile/workout/camera/form/coaching/retention shell | Loads runtime clients; uses auth/profile/session/retention/dashboard/diagnostics clients indirectly | PARTIAL | Active source of truth but still a large inline orchestration surface; requires manual browser smoke. |
| `public/dashboard.html` | Dashboard/history/diagnostic page shell | `dashboard.js`, `dashboard-runtime.js`, `backend-read.js`, diagnostics APIs | PASS | Static page plus authenticated data clients. |
| `public/exercise-library.html` | Exercise library UI | Local exercise DB index and/or exercise APIs | PASS | Useful for pilot browsing/substitution reference. |
| `public/auth-core.js` | Login/register/token validation client | `/api/auth/login`, `/api/auth/register`, `/api/auth/me` | PASS | Core login path. |
| `public/auth-ui.js` | Login/register UI state wiring | Delegates to auth core | PASS | UI shell support. |
| `public/backend-read.js` | Authenticated profile/history client | `/api/me/profile`, `/api/me/history` | PASS | Shared backend read source. |
| `public/profile-write-runtime.js` | Profile/avatar metadata save client | `/api/me/profile`, `/api/avatar/upload` when enabled | PASS | Avatar path is disabled by default; profile write is active. |
| `public/session-write.js` | Explicit session lifecycle and legacy fallback client | `/api/sessions`, `/api/sessions/:id/reps`, `/api/sessions/:id/complete`, `/command` fallback | PASS | Explicit APIs preferred; fallback observable and enforceable. |
| `public/workout-runtime.js` | Workout start/stop lifecycle integration | SessionWrite client, coach runtime | PASS | Requires browser/camera smoke for full confidence. |
| `public/retention-flow.js` | Intake, goals, program assignment, workout tracking, check-ins, progress flow | `/api/client-intake`, `/api/goals-baseline`, `/api/programs`, `/api/workouts/track`, `/api/check-ins`, `/api/progress/dashboard` | PASS | Single-user pilot retention flow; not trainer roster UI. |
| `public/dashboard-runtime.js` | Authenticated dashboard refresh and retention status | `/api/me/history`, `/api/progress/dashboard`, `/api/workouts/reward/latest`, `/api/check-ins`, `/api/programs/current`, `/api/workouts/track` | PASS | Good controlled-pilot dashboard plumbing. |
| `public/dashboard.js` | Dashboard diagnostics/static version checks/history render | `/__frontend-version.json`, `/__version`, `/__diagnostic-smoke`, `/api/admin/diagnostics/report`; backend read client for history | PASS | Admin diagnostic report requires auth/admin. |
| `public/exercise-library.js` | Exercise list/search/detail rendering | `exercise-db/index.json` and static exercise JSON assets; complements `/api/exercises/*` | PASS | Static-first library. |
| `public/diagnostics-client.js` | Browser diagnostic collection/posting | `/api/admin/diagnostics/report` | PASS | Protected admin diagnostics client. |
| Root-level `index.html`, `dashboard.html`, `exercise-library.html`, and root JS duplicates | Legacy/shadow frontend duplicates | Not active source of truth | DEFERRED | Do not edit for Phase 10; treat as non-active inventory unless future cleanup explicitly targets them. |

## 5. Current user flow map

| Flow step | Existing support? | Route/page/API involved | Status | Gaps | Notes |
| --- | --- | --- | --- | --- | --- |
| Landing | Yes | `GET /` -> `public/index.html` | PASS | Browser smoke needed for full page boot | Active static source of truth. |
| Login | Yes | `public/auth-core.js`; `POST /api/auth/login`; `GET /api/auth/me` | PASS | Requires pilot env password/secret; browser token propagation must be smoke tested | Tests pass. |
| Profile | Yes | `GET/PUT /api/me/profile`; `backend-read.js`; `profile-write-runtime.js` | PASS | Trainer notes are basic profile notes, not coach-only notes | Supports goals, injuries, notes, avatar metadata disabled by default. |
| Intake/goals | Yes | `GET/POST /api/client-intake`; `GET/POST /api/goals-baseline`; `retention-flow.js` | PASS | Single-client/self-serve UX; not trainer roster intake review | Captures limitations, schedule, equipment, measurements/visual reference. |
| Program/current workout | Yes | `GET /api/programs/current`; `POST /api/programs`; retention flow program library | PARTIAL | No trainer program builder/template editor; client assignment is not exposed as efficient roster workflow | Good enough for controlled single-client/self-serve pilot. |
| Exercise library | Yes | `public/exercise-library.html`; `exercise-library.js`; `/api/exercises/*`; static exercise DB | PASS | Substitution workflow not tied to assigned program editing | Strong library/reference capability. |
| Start session | Yes | `POST /api/sessions`; `session-write.js`; `workout-runtime.js` | PASS | Manual browser/camera validation needed | Explicit API is primary. |
| Track reps | Yes | `POST /api/sessions/:id/reps`; `session-write.js` | PASS | RPE, weight, rest, form notes are not first-class in session rep route | Reps supported; richer lift metrics are partial/missing. |
| Complete session | Yes | `POST /api/sessions/:id/complete`; `/api/workouts/track` | PASS | Need browser validation that completion triggers all dashboard updates | Completion and canonical tracking both exist. |
| Dashboard/history | Yes | `public/dashboard.html`; `/api/me/history`; `dashboard-runtime.js` | PASS | Trainer multi-client history absent | Single-user history works. |
| Check-in | Yes | `GET/POST /api/check-ins`; `retention-flow.js` | PASS | Alerts for missed check-ins absent | Good single-client check-in support. |
| Progress dashboard | Yes | `GET /api/progress/dashboard`; `dashboard-runtime.js`; `retention-flow.js` | PASS | Trainer aggregate trends, PRs, and deeper charts limited/missing | Provides streaks, trends, reward, narrative, habit prompts. |
| Membership/payment | Yes | `GET /api/me/membership`; `POST /api/billing/create-checkout-session`; `POST /api/billing/webhook` | PARTIAL | Needs real Stripe/browser checkout smoke; no trainer billing admin UI | Good plumbing, limited operations UI. |
| Diagnostics/admin | Yes | `/api/admin/diagnostics/*`; `/api/ops/*`; `diagnostics-client.js` | PASS | Requires hardened env and admin allowlists | Strong operator visibility. |

## 6. Fitness trainer workflow needs

### Client management

| Need | Current support | Notes |
| --- | --- | --- |
| Client list | NO | User store can list users internally, but no trainer route/UI exposes a roster. |
| Client profile | PARTIAL | Current authenticated user profile exists; trainer cannot efficiently open/manage multiple client profiles. |
| Goals | YES for current user; PARTIAL for trainer | Goals baseline exists, but trainer roster review/edit flow is absent. |
| Injuries/limitations | PARTIAL | Profile injuries and intake limitations exist; no coach-only flags or alerting. |
| Notes | PARTIAL | Profile/intake/check-in notes exist; no threaded coach notes or per-workout comments. |
| Progress history | PARTIAL | Single-user history/progress exists; trainer multi-client history view absent. |

### Programming

| Need | Current support | Notes |
| --- | --- | --- |
| Create workout programs | PARTIAL | Program assignment route accepts program structure; frontend retention flow has a basic library. |
| Assign programs to clients | PARTIAL | API payload includes `clientId`, but route writes to authenticated user scope; no trainer-client permission/roster UI. |
| Edit programs | NO | No explicit update/edit route or trainer UI. |
| Duplicate templates | NO | No template system. |
| Progression rules | PARTIAL | Program payload accepts progression rules, but rules are not an automated progression engine. |
| Exercise substitutions | PARTIAL | Exercise library exists, but substitution workflow is not integrated with assigned programs. |

### Workout execution

| Need | Current support | Notes |
| --- | --- | --- |
| Session tracking | YES | Start/reps/complete explicit APIs exist. |
| Reps/sets/weight/RPE/rest | PARTIAL | Reps and workout-level sets exist. Weight, RPE, and rest are not first-class throughout. |
| Form notes | PARTIAL | Workout notes/form score exist; per-set form notes are not first-class. |
| Completion tracking | YES | Session complete and workout tracking exist. |
| Missed workout tracking | PARTIAL | Progress dashboard computes missed workouts against weekly target, but no trainer alerts/escalations. |

### Progress tracking

| Need | Current support | Notes |
| --- | --- | --- |
| Dashboard | YES | Single-user dashboard/progress runtime exists. |
| History | YES | Completed session/activity history exists. |
| Check-ins | YES | Weekly check-ins exist. |
| Measurements | PARTIAL | Goals baseline/check-ins can store measurements as arrays/strings. |
| Photos/scans | DEFERRED/PARTIAL | Visual progress scan metadata is feature-gated; no full photo storage/review flow. |
| Charts/trends | PARTIAL | Data trends are returned; richer charting and trainer comparison views are limited. |
| PRs/milestones | PARTIAL | Narrative/milestone prompts exist; formal PR tracking is absent. |

### Trainer operations

| Need | Current support | Notes |
| --- | --- | --- |
| Admin/trainer roles | PARTIAL | Admin/ops authorization exists; trainer domain role/permissions are not modeled. |
| Multi-client dashboard | NO | Missing. |
| Alerts for missed check-ins | NO | Missing. |
| Client adherence summary | PARTIAL | Single-user adherence/progress data exists; no roster rollup. |
| Payment/membership status | PARTIAL | Per-user membership exists; no trainer/admin billing roster. |
| Diagnostics/admin tooling | YES | Strong diagnostics and ops routes exist. |

### Communication

| Need | Current support | Notes |
| --- | --- | --- |
| Coach/client messaging | NO | Missing. |
| Comments on workouts | PARTIAL | Workout/check-in notes exist but no comment thread. |
| Notifications/reminders | NO | Missing. |
| AI coach/program generation if external service is used | PARTIAL | TTS and diagnostic OpenAI summarization exist; no full AI program generator workflow. |

### Business

| Need | Current support | Notes |
| --- | --- | --- |
| Membership/payment | PARTIAL | Stripe checkout/webhook and membership status exist. |
| Active/inactive client status | PARTIAL | Membership active/inactive exists; no CRM-like client lifecycle. |
| Billing status | PARTIAL | Per-user membership API exists; no admin billing dashboard. |
| Onboarding funnel | PARTIAL | Landing/login/intake/goals/program flow exists; no funnel analytics dashboard. |
| Retention metrics | PARTIAL | Pilot events and progress/adherence data exist; no trainer/business retention report. |

## 7. What we have vs what is missing

| Capability | Current support | Evidence: route/page/file | Pilot need? | Recommendation |
| --- | --- | --- | --- | --- |
| Login/auth token | YES | `/api/auth/login`, `/api/auth/me`, `public/auth-core.js` | Must have | Keep for pilot. |
| Auth hardening/preflight | PARTIAL | `npm run ops:preflight`, `docs/pilot-auth-environment.md` | Must have | Fix env before pilot; keep hardened command as release gate. |
| Profile | YES | `/api/me/profile`, `public/profile-write-runtime.js`, `public/backend-read.js` | Must have | Keep for pilot. |
| Intake/goals | YES | `/api/client-intake`, `/api/goals-baseline`, `public/retention-flow.js` | Must have | Keep for pilot. |
| Program assignment | PARTIAL | `/api/programs`, `/api/programs/current`, `public/retention-flow.js` | Must have basic | Keep for pilot with limited scope; v1.5 add trainer template/editor. |
| Workout session tracking | YES | `/api/sessions`, `/api/sessions/:id/reps`, `/api/sessions/:id/complete`, `public/session-write.js` | Must have | Keep for pilot. |
| Canonical workout completion | YES | `/api/workouts/track`, `dashboard-runtime.js`, `retention-flow.js` | Must have | Keep for pilot. |
| Exercise library | YES | `/api/exercises/*`, `public/exercise-library.html`, static exercise DB | Must have | Keep for pilot. |
| Check-ins | YES | `/api/check-ins`, `public/retention-flow.js` | Must have | Keep for pilot. |
| Progress dashboard | YES | `/api/progress/dashboard`, `public/dashboard-runtime.js` | Must have | Keep for pilot. |
| Dashboard/history | YES | `/api/me/history`, `public/dashboard.html`, `public/dashboard.js` | Must have | Keep for pilot. |
| Payment/membership | PARTIAL | `/api/me/membership`, `/api/billing/create-checkout-session`, `/api/billing/webhook` | Must have if charging | Fix/verify Stripe env + browser checkout before paid pilot; otherwise run free pilot. |
| Admin diagnostics | YES | `/api/admin/diagnostics/*`, `/api/ops/*`, `public/diagnostics-client.js` | Must have | Keep for pilot. |
| Avatar disabled | YES | `ENABLE_AVATAR_FEATURE` gate, `/api/avatar/upload`, `/avatar-runtime.js` | Must have | Keep disabled for pilot. |
| Visual progress scans | PARTIAL/DEFERRED | `/api/visual-progress-scans` gated by env | Nice/future | Defer unless pilot explicitly tests it. |
| TTS/coach voice | PARTIAL | `/api/speak`, coach runtime | Nice | Keep optional; harden unauthenticated access. |
| Trainer client list | NO | No active route/page | Important v1.5 | Add after pilot. |
| Trainer multi-client dashboard | NO | No active route/page | Important v1.5 | Add after pilot. |
| Program templates/duplication | NO | No template route/page | Important v1.5 | Add after pilot. |
| Adherence/missed check-in alerts | NO | No alert route/page | Important v1.5 | Add after pilot. |
| Messaging/notifications | NO | No messaging subsystem | v2 | Defer. |
| Full billing/admin billing | NO/PARTIAL | Billing APIs only | v2 unless paid pilot | Defer or build before paid expansion. |
| CRM/tenant system | NO | No tenant/client domain model | v2 | Defer. |
| Legacy `/command` fallback | PARTIAL | `/command`, `public/session-write.js` fallback | Risk reducer only | Keep observable but enforce explicit APIs in pilot. |

## 8. Pilot readiness check

### Must have for controlled pilot

| Checklist item | Status | Evidence | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| Login | PASS | `/api/auth/login`, `public/auth-core.js`; tests pass | Env missing locally causes 503 outside tests | Configure pilot env and smoke login. |
| Profile | PASS | `/api/me/profile`, profile write/read clients | Browser token propagation risk | Smoke save/read in browser. |
| Intake/goals | PASS | `/api/client-intake`, `/api/goals-baseline`, retention flow | UX/manual risk | Smoke full onboarding. |
| Session tracking | PASS | `/api/sessions`, reps, complete routes | Camera/browser lifecycle risk | Smoke start/reps/complete on pilot device. |
| Dashboard/history | PASS | `/api/me/history`, dashboard page/runtime | Data refresh integration risk | Smoke after completed workout. |
| Exercise library | PASS | Exercise APIs/static library | Static index freshness risk | Smoke search/detail. |
| Check-ins | PASS | `/api/check-ins`, retention flow | Single-user only | Keep in pilot; no trainer alerts yet. |
| Progress dashboard | PASS | `/api/progress/dashboard` | Chart/UI completeness limited | Keep for pilot. |
| Payment/membership | PARTIAL | `/api/me/membership`, billing checkout/webhook | Real Stripe/env/redirect not manually verified | If paid pilot, smoke Stripe end-to-end; otherwise free controlled pilot. |
| Admin diagnostics | PASS | `/api/admin/diagnostics/*`, `/api/ops/*` | Requires admin allowlist/env | Configure admin allowlist and smoke report/recent. |
| Avatar disabled | PASS | Avatar route/runtime gates | Accidentally enabling avatar increases risk | Keep `ENABLE_AVATAR_FEATURE` unset/false for pilot. |
| Env hardening | PARTIAL | `npm run ops:preflight` fails locally; hardened command passes | Production misconfiguration blocks/weakens pilot | Make hardened preflight required before approval. |
| Manual browser pass | NOT RUN | Not performed in Phase 10 | Biggest remaining blocker | Required before GO. |

### Nice to have

| Checklist item | Status | Evidence | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| Trainer client list | NO | No active route/page | Trainer must track clients manually | v1.5. |
| Program templates | NO | Basic program library only in client flow | Manual program setup | v1.5. |
| Multi-client dashboard | NO | No trainer dashboard | Scaling blocked | v1.5. |
| Adherence alerts | NO | Single-user streak only | Trainer misses at-risk clients | v1.5. |
| Messaging | NO | No subsystem | External comms required | v2. |
| Advanced analytics | PARTIAL | Progress dashboard data exists | Limited charts/business insight | v1.5/v2. |
| Automated browser tests | PARTIAL/NO | Node tests exist; no full E2E browser pass required here | Manual regression risk | v1.5. |

### Future

| Checklist item | Status | Evidence | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| Avatar/3D | DEFERRED | Feature-gated avatar route/runtime | High browser/asset complexity | v2 after core pilot. |
| CRM/tenant system | NO | No tenant model | Needed for scale | v2. |
| Community/chat | NO | No chat/community code path | Not core pilot | v2. |
| Full billing/admin billing | PARTIAL | Stripe plumbing only | Paid scaling ops gap | v2 or pre-paid expansion. |
| Book/audiobook tools | NO | Not present in active pilot flow | Off-domain for fitness pilot | Future only. |
| Richer AI program generation | NO/PARTIAL | TTS/diagnostic OpenAI only | Could overcomplicate pilot | v2. |

## 9. Recommended release scope

### Pilot v1 — launch now if manual smoke passes

Include only the current controlled, single-user/client-centered capabilities:

- Pilot login with hardened env.
- Profile save/read.
- Intake and goals baseline.
- Basic current program assignment from existing retention flow.
- Exercise library browsing/search/detail.
- Start workout session, track reps, complete session.
- Canonical workout tracking and reward summary.
- Dashboard/history and progress dashboard.
- Weekly check-ins.
- Membership status and either free pilot or fully smoke-tested Stripe checkout.
- Admin diagnostics and ops preflight/observability.
- Avatar disabled.
- Legacy `/command` fallback observable but not primary.

### Pilot v1.5 — next upgrade after first testers

High-impact trainer workflow improvements:

- Trainer client list/roster.
- Trainer client detail page combining profile, goals, limitations, notes, history, check-ins, progress, and membership status.
- Program templates with duplicate/edit/assign workflow.
- Simple multi-client adherence dashboard.
- Missed workout/check-in alerts.
- Trainer-facing progress review and client prioritization.
- Basic workout comments/coach notes.
- Automated browser smoke tests for the pilot critical path.

### v2 — larger platform features

- Tenant/CRM architecture with trainer/client organizations.
- Full billing/admin billing and lifecycle management.
- Messaging, notifications, reminders, and community/chat.
- Rich analytics, PR/milestone tracking, trend charts, retention metrics.
- Visual progress scan/photo system.
- Avatar/3D and advanced camera experiences.
- AI-assisted program generation/revision with guardrails.
- Book/audiobook or non-fitness tools only if product scope expands.

## 10. Trainer efficiency assessment

### Can a trainer use this now with a small number of clients?

**Yes, but only as a controlled pilot with manual operations.** A trainer can onboard a few clients, have clients log in, complete profile/intake/goals, follow a basic program, execute and complete workouts, submit check-ins, and review individual progress outputs. The trainer/operator can use diagnostics and exported/manual review to support the pilot.

### What will feel efficient?

- Client self-serve login, profile, intake, goals, check-in, and progress capture.
- Workout execution and rep/session tracking for an individual user.
- Exercise library lookup.
- Single-user dashboard/history/progress dashboard.
- Operator diagnostics and control-plane visibility.

### What will feel manual/clunky?

- Managing more than one client because there is no trainer roster.
- Assigning/editing programs because there is no trainer program template UI.
- Reviewing all clients for missed workouts/check-ins because there is no multi-client adherence dashboard.
- Handling notes/comments because they are scattered across profile, intake, workout, and check-in fields rather than unified trainer notes.
- Payment operations because membership is per-user and checkout/webhook plumbing lacks admin billing UX.

### What will prevent scaling to many clients?

- No client list or trainer/client relationship model.
- No multi-client dashboard, filters, alerts, or adherence rollups.
- No program template duplication/editing workflow.
- No messaging/reminder system.
- No billing/admin lifecycle UI.
- File-backed storage may be acceptable for controlled pilot, but a multi-trainer/multi-client platform will need a stronger persistence/tenant model.

### Highest ROI improvement after launch

Build a **trainer roster + client detail + adherence summary** layer. It should show every client, last workout, last check-in, current program, adherence percentage, pain flag, membership status, and next action. This single feature would convert the current self-serve app into a trainer-operable pilot platform.

## 11. Final recommendation

**PARTIAL GO pending manual browser smoke test.**

The repo has enough core backend and frontend capability for a controlled pilot with a small number of clients, provided:

1. The hardened pilot/production preflight command passes in the actual deployment environment.
2. Avatar remains disabled.
3. Low-trust auth bridge and unauthenticated TTS are disabled for pilot/production.
4. The operator completes a manual browser smoke pass covering login, profile, intake/goals, program/current workout, exercise library, session start/reps/complete, dashboard/history, check-in, progress dashboard, membership/payment path if charging, and diagnostics/admin.
5. Trainer expectations are scoped honestly: v1 is a controlled individual-client pilot, not yet a scalable multi-client trainer CRM.

## Required command results

| Command | Result | Notes |
| --- | --- | --- |
| `git status --short` | PASS | Clean before editing. |
| `npm test` | PASS | 151 tests passed. NPM emitted `Unknown env config "http-proxy"` warning only. |
| `npm run lint` | PASS | `selfcheck ok`. NPM emitted `Unknown env config "http-proxy"` warning only. |
| `npm run pilot:nonsecurity-checks` | PASS | Static pilot checks, lint, and tests passed. NPM emitted `Unknown env config "http-proxy"` warning only. |
| `npm run ops:preflight` | EXPECTED LOCAL FAIL | Failed because local environment lacks required pilot/production hardening variables: auth token secret, pilot login password, login seed email, bootstrap super-admin allowlist, hardened TTS and auth bridge settings. |
| Documented hardened Phase 3 `ops:preflight` command | PASS | Passed with documented placeholder pilot/production environment variables from `docs/pilot-auth-environment.md`. |

## Blocking issues before full GO

- Manual browser smoke test has not been run in Phase 10.
- Actual deployment environment must pass hardened `ops:preflight` with real secrets/origins/admin allowlist.
- If charging during pilot, Stripe checkout redirect and webhook processing must be tested end-to-end in the target environment.

## Non-blocking risks

- Root-level legacy/shadow frontend duplicates could confuse future edits; keep active work in `public/` unless cleanup is explicitly scoped.
- Legacy `/command` fallback remains useful for resilience but should continue being observed and progressively disabled for explicit write actions.
- Single-user progress and retention flows are stronger than trainer/multi-client operations.
- File-backed storage is acceptable for controlled pilot but not a long-term multi-tenant trainer platform foundation.
