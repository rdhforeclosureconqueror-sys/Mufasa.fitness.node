# Repo Route/API Audit Report

Generated: 2026-07-19T21:51:34.800Z

## Backend Route Inventory

| Method | Path | Auth required | Permission | Expected body/query | Purpose | Response type |
|---|---|---|---|---|---|---|
| GET | /avatar-runtime.js | no | none | none/optional | application route | JSON/file |
| GET | /__version | no | none | none/optional | backend build/version probe | JSON/file |
| GET | /__diagnostic-smoke | no | none | none/optional | diagnostic smoke endpoint | JSON/file |
| GET | /health | no | none | none/optional | service health summary | JSON/file |
| POST | /api/admin/diagnostics/report | yes | OPS_READ_OBSERVABILITY | none/optional | store/read browser diagnostics reports | JSON/file |
| GET | /api/admin/diagnostics/recent | yes | OPS_READ_OBSERVABILITY | none/optional | store/read browser diagnostics reports | JSON/file |
| POST | /api/speak | no | none | none/optional | application route | JSON/file |
| POST | /api/auth/login | no | none | none/optional | application route | JSON/file |
| POST | /api/auth/register | no | none | none/optional | application route | JSON/file |
| GET | /api/auth/me | yes | none | none/optional | application route | JSON/file |
| POST | /api/auth/logout | no | none | none/optional | application route | JSON/file |
| POST | /api/auth/bridge | no | none | provider, trustMode, and identity claim (googleIdToken/googleEmail/googleSub/userId) | issue app auth token from provider/manual identity claims | JSON/file |
| GET | /api/me | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/membership | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/onboarding-status | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/retention/intake | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| PATCH | /api/me/retention/intake | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/me/retention/intake/submit | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/retention/intake/progress | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/journey-profile | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/personalization | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/member-home | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/trainer/workspace | no | TRAINER_WORKSPACE_READ | none/optional | application route | JSON/file |
| GET | /api/trainer/clients | no | TRAINER_CLIENTS_READ | none/optional | application route | JSON/file |
| GET | /api/trainer/clients/:clientUserId | no | TRAINER_CLIENTS_READ | none/optional | application route | JSON/file |
| GET | /api/trainer/clients/:clientUserId/program | no | TRAINER_CLIENTS_READ | none/optional | application route | JSON/file |
| PUT | /api/trainer/clients/:clientUserId/program | no | TRAINER_CLIENT_PROGRAMS_WRITE | none/optional | application route | JSON/file |
| GET | /api/trainer/clients/:clientUserId/notes | no | TRAINER_CLIENT_NOTES_READ | none/optional | application route | JSON/file |
| POST | /api/trainer/clients/:clientUserId/notes | no | TRAINER_CLIENT_NOTES_WRITE | none/optional | application route | JSON/file |
| GET | /api/admin/trainer-assignments | yes | ADMIN_TRAINER_ASSIGNMENTS_MANAGE | none/optional | application route | JSON/file |
| GET | /api/admin/trainer-directory | yes | ADMIN_TRAINER_ASSIGNMENTS_MANAGE | none/optional | application route | JSON/file |
| POST | /api/admin/trainer-assignments | yes | ADMIN_TRAINER_ASSIGNMENTS_MANAGE | none/optional | application route | JSON/file |
| DELETE | /api/admin/trainer-assignments/:assignmentId | yes | ADMIN_TRAINER_ASSIGNMENTS_MANAGE | none/optional | application route | JSON/file |
| GET | /api/billing/plan | no | none | none/optional | Stripe embedded checkout, billing portal, and webhook handling | JSON/file |
| POST | /api/billing/checkout-session | yes | none | none/optional | Stripe embedded checkout, billing portal, and webhook handling | JSON/file |
| POST | /api/billing/create-checkout-session | yes | none | none/optional | Stripe embedded checkout, billing portal, and webhook handling | JSON/file |
| POST | /api/billing/portal-session | yes | none | none/optional | Stripe embedded checkout, billing portal, and webhook handling | JSON/file |
| POST | /api/billing/webhook | no | none | none/optional | Stripe embedded checkout, billing portal, and webhook handling | JSON/file |
| POST | /api/challenges/pushup/results | no | none | none/optional | application route | JSON/file |
| GET | /api/challenges/pushup/leaderboard | no | none | none/optional | application route | JSON/file |
| POST | /api/pilot/events | no | none | none/optional | application route | JSON/file |
| POST | /api/exercise-templates | yes | none | none/optional | application route | JSON/file |
| GET | /api/exercise-templates | yes | none | none/optional | application route | JSON/file |
| GET | /api/exercise-templates/active/scoring | yes | none | none/optional | application route | JSON/file |
| GET | /api/exercise-templates/:id | yes | none | none/optional | application route | JSON/file |
| PUT | /api/exercise-templates/:id | yes | none | none/optional | application route | JSON/file |
| POST | /api/exercise-templates/:id/demo-captures | yes | none | none/optional | application route | JSON/file |
| POST | /api/exercise-templates/:id/test-runs | yes | none | none/optional | application route | JSON/file |
| POST | /api/exercise-templates/:id/approve | yes | none | none/optional | application route | JSON/file |
| GET | /api/exercises/index | no | none | none/optional | exercise catalog reads | JSON/file |
| GET | /api/exercises/search | no | none | query/path parameters | exercise catalog reads | JSON/file |
| GET | /api/exercises/:slug | no | none | query/path parameters | exercise catalog reads | JSON/file |
| POST | /api/sessions | yes | none | JSON payload validated server-side | session lifecycle writes | JSON/file |
| POST | /api/sessions/:id/reps | yes | none | JSON payload validated server-side | session lifecycle writes | JSON/file |
| POST | /api/sessions/:id/complete | yes | none | JSON payload validated server-side | session lifecycle writes | JSON/file |
| GET | /api/nutrition/barcodes/:barcode | yes | none | none/optional | application route | JSON/file |
| GET | /api/nutrition/foods/search | yes | none | query/path parameters | application route | JSON/file |
| GET | /api/nutrition/foods/:fdcId | yes | none | none/optional | application route | JSON/file |
| POST | /api/nutrition/drafts/natural-language | yes | none | none/optional | application route | JSON/file |
| GET | /api/me/nutrition/entries | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/me/nutrition/entries | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| PUT | /api/me/nutrition/entries/:entryId | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| DELETE | /api/me/nutrition/entries/:entryId | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/nutrition/summary | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/nutrition/recent | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/me/nutrition/meals | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/nutrition/meals | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/me/nutrition/meals/:mealId/log | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/nutrition/grocery-options | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/nutrition/weekly-plan/current | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/me/nutrition/weekly-plans | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| PATCH | /api/me/nutrition/weekly-plans/:planId | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/me/nutrition/weekly-plans/:planId/grocery-items | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| PATCH | /api/me/nutrition/weekly-plans/:planId/grocery-items/:itemId | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/me/nutrition/weekly-plans/:planId/generate-missions | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/nutrition/weekly-plans/:planId/missions | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| PATCH | /api/me/nutrition/missions/:missionId | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/me/nutrition/missions/:missionId/manual-progress | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/nutrition/weekly-plans/:planId/review | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/me/nutrition/weekly-plans/ai-draft/validate | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/nutrition/education | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/profile | yes | none | JSON payload validated server-side | authenticated user profile/history reads | JSON/file |
| PUT | /api/me/profile | yes | none | JSON payload validated server-side | authenticated user profile/history reads | JSON/file |
| POST | /api/ohsa | yes | none | JSON payload validated server-side | application route | JSON/file |
| GET | /api/me/ohsa | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/history | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/client-intake | yes | none | none/optional | application route | JSON/file |
| POST | /api/client-intake | yes | none | none/optional | application route | JSON/file |
| GET | /api/goals-baseline | yes | none | none/optional | application route | JSON/file |
| POST | /api/goals-baseline | yes | none | none/optional | application route | JSON/file |
| GET | /api/programs/current | yes | none | none/optional | application route | JSON/file |
| GET | /api/me/generated-workout-plan | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/generated-workout-progression | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/training-adaptation | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/me/generated-workout-progression/evaluate | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/me/generated-workout-progression/accept | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/me/generated-workout-executions | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| PATCH | /api/me/generated-workout-executions/:executionId | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/me/generated-workout-executions/:executionId/complete | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/programs | yes | none | none/optional | application route | JSON/file |
| POST | /api/workouts/track | yes | none | none/optional | application route | JSON/file |
| GET | /api/workouts/reward/latest | yes | none | none/optional | application route | JSON/file |
| GET | /api/check-ins | yes | none | none/optional | application route | JSON/file |
| POST | /api/check-ins | yes | none | none/optional | application route | JSON/file |
| GET | /api/progress/dashboard | yes | none | none/optional | application route | JSON/file |
| GET | /api/visual-progress-scans | yes | none | none/optional | application route | JSON/file |
| POST | /api/visual-progress-scans | yes | none | none/optional | application route | JSON/file |
| POST | /api/avatar/upload | yes | none | multipart/form-data with field name=avatar and .glb payload | upload GLB avatar and return hosted URL | JSON/file |
| POST | /command | no | none | none/optional | application route | JSON/file |

## Frontend API Caller Inventory

| File + line | Method | URL/path | Backend base used | Auth token included | Diagnostic capture |
|---|---|---|---|---|---|
| index.html:1152 | POST | dynamic | external/unknown | no/unknown | no |
| index.html:1255 | GET | https://mufasa-fitness-node.onrender.com/__version | external/unknown | no/unknown | no |
| index.html:2149 | GET | dynamic | external/unknown | no/unknown | no |
| index.html:2973 | GET | /health | relative origin | no/unknown | no |
| dashboard.js:214 | GET | dynamic | external/unknown | no/unknown | no |
| dashboard.js:233 | GET | /__version | backend base var | no/unknown | yes |
| dashboard.js:245 | GET | /__diagnostic-smoke | backend base var | no/unknown | yes |
| dashboard.js:301 | POST | /api/admin/diagnostics/report | backend base var | yes/conditional | yes |
| backend-read.js:89 | GET | dynamic | backend base var | yes/conditional | no |
| session-write.js:147 | POST | dynamic | external/unknown | yes/conditional | no |
| session-write.js:182 | POST | dynamic | external/unknown | yes/conditional | no |
| fitness.js:121 | GET | dynamic | external/unknown | no/unknown | no |
| exercise-library.js:219 | GET | dynamic | external/unknown | no/unknown | no |
| public/dashboard.js:218 | GET | dynamic | external/unknown | no/unknown | no |
| public/dashboard.js:237 | GET | /__version | backend base var | no/unknown | yes |
| public/dashboard.js:249 | GET | /__diagnostic-smoke | backend base var | no/unknown | yes |
| public/dashboard.js:310 | POST | /api/admin/diagnostics/report | backend base var | yes/conditional | yes |
| public/backend-read.js:93 | GET | dynamic | backend base var | yes/conditional | no |
| public/session-write.js:280 | POST | dynamic | external/unknown | no/unknown | no |
| public/session-write.js:331 | POST | dynamic | external/unknown | yes/conditional | no |
| public/session-write.js:659 | GET | ${baseUrl}/api/challenges/pushup/leaderboard | backend base var | no/unknown | no |
| public/fitness.js:143 | GET | dynamic | external/unknown | no/unknown | no |
| public/exercise-library.js:219 | GET | dynamic | external/unknown | no/unknown | no |
| public/diagnostics-client.js:191 | POST | ${backendOrigin}/api/admin/diagnostics/report | external/unknown | yes/conditional | yes |
| public/landing-diagnostics.js:54 | GET | dynamic | external/unknown | no/unknown | yes |
| public/landing-diagnostics.js:67 | GET | dynamic | external/unknown | no/unknown | yes |
| public/landing-diagnostics.js:167 | POST | dynamic | external/unknown | yes/conditional | yes |
| public/membership.js:65 | GET | dynamic | external/unknown | yes/conditional | no |

## Static Asset/Runtime Inventory

- Critical files verified: 17.
- Vendor three paths verified:
  - /vendor/three/build/three.module.js (1237216 bytes)
  - /vendor/three/examples/jsm/loaders/GLTFLoader.js (106576 bytes)
- GLTFLoader relative dependency files:
  - public/vendor/three/examples/jsm/utils/BufferGeometryUtils.js
- Frontend route probes (https://mufasafitsite.onrender.com):
  - /vendor/three/examples/jsm/loaders/GLTFLoader.js: HEAD=n/a GET=n/a WARN (HEAD fetch failed)
  - /vendor/three/examples/jsm/utils/BufferGeometryUtils.js: HEAD=n/a GET=n/a WARN (HEAD fetch failed)
- Root/public duplication check: synchronized for index/dashboard/backend-read/session-write/fitness assets.

## Frontend/Backend Origin Map

- Frontend origin: https://mufasafitsite.onrender.com
- Backend origin: https://mufasa-fitness-node.onrender.com
- Primary backend base variable in frontend: NODE_BASE_URL / maatNodeBaseUrl.

## Detected Mismatches

- Route order: static middleware previously mounted before API routes (fixed).
- Root/public entrypoints were drifting in duplicated files (synchronized to public copy).

## Fixes Applied

- Moved static middleware mounting to after API route declarations in server.js to prevent ordering hazards.
- Synchronized duplicated root files to match public runtime entrypoints.
- Added automated static route/API audit script and npm task (repo:route-audit).

## Remaining Risks

- Dynamic fetch expressions that are fully computed at runtime cannot be perfectly statically mapped; current audit validates literal and partially templated calls.
- Route inventory is extracted from server.js (single backend entrypoint) and should be rerun after route refactors.
