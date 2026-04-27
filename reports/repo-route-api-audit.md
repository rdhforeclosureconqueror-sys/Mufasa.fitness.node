# Repo Route/API Audit Report

Generated: 2026-04-27T00:23:37.768Z

## Backend Route Inventory

| Method | Path | Auth required | Permission | Expected body/query | Purpose | Response type |
|---|---|---|---|---|---|---|
| GET | /__version | no | none | none/optional | backend build/version probe | JSON/file |
| GET | /__diagnostic-smoke | no | none | none/optional | diagnostic smoke endpoint | JSON/file |
| GET | /health | no | none | none/optional | service health summary | JSON/file |
| POST | /api/admin/diagnostics/report | yes | OPS_READ_OBSERVABILITY | none/optional | store/read browser diagnostics reports | JSON/file |
| GET | /api/admin/diagnostics/recent | yes | OPS_READ_OBSERVABILITY | none/optional | store/read browser diagnostics reports | JSON/file |
| POST | /api/speak | no | none | none/optional | application route | JSON/file |
| POST | /api/auth/bridge | no | none | provider, trustMode, and identity claim (googleIdToken/googleEmail/googleSub/userId) | issue app auth token from provider/manual identity claims | JSON/file |
| GET | /api/me | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/pilot/events | no | none | none/optional | application route | JSON/file |
| GET | /api/exercises/index | no | none | none/optional | exercise catalog reads | JSON/file |
| GET | /api/exercises/search | no | none | query/path parameters | exercise catalog reads | JSON/file |
| GET | /api/exercises/:slug | no | none | query/path parameters | exercise catalog reads | JSON/file |
| POST | /api/sessions | yes | none | JSON payload validated server-side | session lifecycle writes | JSON/file |
| POST | /api/sessions/:id/reps | yes | none | JSON payload validated server-side | session lifecycle writes | JSON/file |
| POST | /api/sessions/:id/complete | yes | none | JSON payload validated server-side | session lifecycle writes | JSON/file |
| GET | /api/me/profile | yes | none | JSON payload validated server-side | authenticated user profile/history reads | JSON/file |
| PUT | /api/me/profile | yes | none | JSON payload validated server-side | authenticated user profile/history reads | JSON/file |
| POST | /api/ohsa | yes | none | JSON payload validated server-side | application route | JSON/file |
| GET | /api/me/ohsa | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| GET | /api/me/history | yes | none | none/optional | authenticated user profile/history reads | JSON/file |
| POST | /api/avatar/upload | yes | none | multipart/form-data with field name=avatar and .glb payload | upload GLB avatar and return hosted URL | JSON/file |
| POST | /command | no | none | none/optional | application route | JSON/file |

## Frontend API Caller Inventory

| File + line | Method | URL/path | Backend base used | Auth token included | Diagnostic capture |
|---|---|---|---|---|---|
| index.html:144 | GET | dynamic | external/unknown | no/unknown | no |
| index.html:1271 | POST | dynamic | external/unknown | no/unknown | no |
| index.html:2224 | GET | dynamic | external/unknown | no/unknown | no |
| index.html:2751 | POST | dynamic | external/unknown | yes/conditional | no |
| index.html:2773 | GET | dynamic | external/unknown | yes/conditional | no |
| index.html:3386 | POST | dynamic | external/unknown | yes/conditional | no |
| index.html:3680 | GET | /health | relative origin | no/unknown | no |
| index.html:3823 | POST | dynamic | external/unknown | no/unknown | no |
| index.html:3877 | POST | dynamic | external/unknown | no/unknown | no |
| index.html:5153 | POST | dynamic | external/unknown | yes/conditional | no |
| dashboard.js:214 | GET | dynamic | external/unknown | no/unknown | no |
| dashboard.js:233 | GET | /__version | backend base var | no/unknown | yes |
| dashboard.js:245 | GET | /__diagnostic-smoke | backend base var | no/unknown | yes |
| dashboard.js:301 | POST | /api/admin/diagnostics/report | backend base var | yes/conditional | yes |
| backend-read.js:89 | GET | dynamic | backend base var | yes/conditional | no |
| session-write.js:147 | POST | dynamic | external/unknown | yes/conditional | no |
| session-write.js:182 | POST | dynamic | external/unknown | yes/conditional | no |
| fitness.js:121 | GET | dynamic | external/unknown | no/unknown | no |
| exercise-library.js:148 | GET | dynamic | external/unknown | no/unknown | no |
| public/index.html:144 | GET | dynamic | external/unknown | no/unknown | no |
| public/index.html:1271 | POST | dynamic | external/unknown | no/unknown | no |
| public/index.html:2224 | GET | dynamic | external/unknown | no/unknown | no |
| public/index.html:2751 | POST | dynamic | external/unknown | yes/conditional | no |
| public/index.html:2773 | GET | dynamic | external/unknown | yes/conditional | no |
| public/index.html:3386 | POST | dynamic | external/unknown | yes/conditional | no |
| public/index.html:3680 | GET | /health | relative origin | no/unknown | no |
| public/index.html:3823 | POST | dynamic | external/unknown | no/unknown | no |
| public/index.html:3877 | POST | dynamic | external/unknown | no/unknown | no |
| public/index.html:5153 | POST | dynamic | external/unknown | yes/conditional | no |
| public/dashboard.js:214 | GET | dynamic | external/unknown | no/unknown | no |
| public/dashboard.js:233 | GET | /__version | backend base var | no/unknown | yes |
| public/dashboard.js:245 | GET | /__diagnostic-smoke | backend base var | no/unknown | yes |
| public/dashboard.js:301 | POST | /api/admin/diagnostics/report | backend base var | yes/conditional | yes |
| public/backend-read.js:89 | GET | dynamic | backend base var | yes/conditional | no |
| public/session-write.js:147 | POST | dynamic | external/unknown | yes/conditional | no |
| public/session-write.js:182 | POST | dynamic | external/unknown | yes/conditional | no |
| public/fitness.js:121 | GET | dynamic | external/unknown | no/unknown | no |
| public/exercise-library.js:148 | GET | dynamic | external/unknown | no/unknown | no |
| public/diagnostics-client.js:121 | POST | /api/admin/diagnostics/report | relative origin | no/unknown | yes |
| public/landing-diagnostics.js:31 | GET | dynamic | external/unknown | no/unknown | yes |
| public/landing-diagnostics.js:44 | GET | dynamic | external/unknown | no/unknown | yes |
| public/landing-diagnostics.js:139 | POST | dynamic | external/unknown | yes/conditional | yes |

## Static Asset/Runtime Inventory

- Critical files verified: 16.
- Vendor three paths verified:
  - /vendor/three/build/three.module.js (1237216 bytes)
  - /vendor/three/examples/jsm/loaders/GLTFLoader.js (106576 bytes)
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
