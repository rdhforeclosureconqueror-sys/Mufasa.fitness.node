# Code inventory

## Runtime entry points and major folders

| Component | Responsibility |
|---|---|
| `server.js` | Production composition root, Express routes/middleware order, dependency wiring, static serving, WebSocket/server startup. |
| `package.json` scripts | `start`/`dev`, exercise-index prestart, tests, lint/selfcheck, diagnostics and operations checks. |
| `public/` | Browser-delivered pages, CSS, JavaScript runtimes, exercise database, optional uploads. |
| `src/` | Server domain, middleware, validation, services, repositories, libraries, workout builders. |
| `config/` | Machine-readable route authorization contract and approved HTML sink inventory. |
| `data/` | Runtime JSON/NDJSON and exercise source data; see [storage](storage.md). |
| `scripts/` | Build, diagnostic, readiness, security/audit, route, and performance checks. |
| `test/` | Node test-runner integration, contract, security, browser-module, and workflow tests. |
| `docs/`, `reports/` | Engineering documentation and phase/audit evidence. |

## Server services and engines

| File/component | Responsibility |
|---|---|
| `journeyIntakeService`, `journeyIntakeValidators` | Versioned draft/submit/progress and Journey Profile derivation. |
| `journeyRecommendationEngine`, `personalizationService` | Deterministic recommendations and consumable personalization view. |
| `generatedWorkoutService`, `programGenerationEngine`, `src/workouts/*` | Plan construction, catalog/templates, execution lifecycle. |
| `generatedWorkoutProgressionService`, `src/config/generatedWorkoutProgression.js` | Evidence evaluation, proposals, and acceptance. |
| `trainingAdaptationService` | Training adaptation state/read model. |
| `memberHomeService` | Aggregated member landing-page read model. |
| `nutritionService` | Providers, entries, meals, weekly plans, grocery items, missions, reviews, education. |
| `trainerWorkspaceService` | Assigned-client directory/detail, program assignment, notes, admin assignment operations. |
| `sessionService`, `userDataService` | Legacy/current session writes and profile/retention data use cases. |
| `membershipService` | Membership/trial entitlement and Stripe-facing state. |
| `challengeService`, `exerciseTemplateService` | Push-up challenge and template-builder workflows. |

## Repositories, middleware, and libraries

| Component | Responsibility |
|---|---|
| `src/repositories/userStore.js` | Safe-path, normalized whole-user aggregate load/list/save/update. |
| `src/repositories/trainerWorkspaceStore.js` | Atomic assignment/note store and access lookups. |
| `requestContext` | Request ID, async handler, error lifecycle. |
| `auth` | Optional auth context, required authentication, user scope, permission enforcement. |
| `rateLimit` | Per-process fixed-window route limiting. |
| `authToken`, `tokenDenylistStore`, `providerIdentity`, `trustPolicy` | Token creation/verification/revocation and bridge trust boundary. |
| `authorization`, `route-authorization-contract` | Role resolution, permission map, auditable route/output inventory. |
| `adminAuditLog`, `writeObservability`, `controlPlane*`, `enforcementStateStore` | Operations control, integrity audit, alerts, write counters, persisted overrides. |
| `diagnosticStore`, `diagnosticRouteChecker`, `diagnosticSummarizer`, `pilotReadinessEvaluator` | Diagnostic collection, route checks, optional summarization, readiness verdict. |
| `src/validation/*` | Request allowlists, types, bounds, and billing safety checks. |

## Browser modules

| Group | Representative modules | Responsibility |
|---|---|---|
| Bootstrap/state | `app-core`, `boot-core`, `app-runtime`, `runtime-state`, `runtime-events`, `runtime-orchestrator`, `app-hydration-runtime` | Deterministic browser startup and shared state/events. |
| Auth/API | `auth-core`, `auth-ui`, `auth-state-runtime`, `backend-read`, `session-write`, `profile-write-runtime`, `diagnostics-client` | Credentials, authenticated fetches, persistence calls, diagnostics. |
| Member/Journey | `retention-journey-wizard`, `assessment-runtime`, `profile-runtime`, `personalization` consumers, `member-home-runtime` | Onboarding and member experience. |
| Workout | `generated-workout-runtime`, `workout-runtime`, `workout-progression-runtime`, `rep-*`, `pose-runtime`, `form-engine`, `live-workout-breakpoints` | Workout delivery, tracking, form feedback, progression. |
| Nutrition | `nutrition-runtime`, `nutrition.html` | Journal, plans, missions, provider search. |
| Trainer/admin | `trainer.js`, `trainer-navigation.js`, `admin-trainer-assignments.js`, `trainer.css` | Scoped trainer workspace and assignment administration. |
| Rendering/status | `safe-rendering`, `status-panels`, `button-runtime`, `hud-runtime`, `avatar-runtime` | Safe DOM output, state feedback, controls, optional avatar. |

Root-level browser files are compatibility copies/legacy entry points; `public/` is the server-delivered source for current deployment. Before changing one, use tests and the existing source-of-truth reports to determine whether a compatibility copy must remain aligned.
