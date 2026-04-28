# Auth/Login Route Audit & Root-Cause Report (2026-04-28)

## Scope
- Mission: full audit of backend auth routes, frontend login/auth flows, Google GIS path, auth bridge path, token storage, route reachability, and policy/CORS blockers.
- Constraint honored: no feature additions, no avatar/workout/retention/form-engine behavior changes.

## PHASE 1 — Backend auth route inventory

### Global middleware and policy that affect auth routes
- CORS is globally enabled before routes using `app.use(cors(corsOptions))` and `app.options("*", cors(corsOptions))`; allowed headers include `Content-Type` and `Authorization` and methods include `OPTIONS`, `POST`, `GET`, etc. `ALLOWED_ORIGINS` is parsed from comma-separated env and if empty allows all origins. `credentials` is `false`. `express.json` is installed immediately after CORS. Route handlers therefore receive JSON if `Content-Type: application/json` is sent. 
- Auth context middleware is global (`app.use(authContext(...))`) and parses Bearer token into `req.auth`; auth-required endpoints use `requireAuth`, which returns 401 when missing token.
- Static middleware (`app.use(express.static(PUBLIC_DIR))`) is mounted after API routes, so `/api/auth/bridge` cannot be shadowed by static file serving.

### Auth/login-related backend endpoints

| Method | Path | File/line | Auth required | Expected body | Response | CORS impact | Current caller(s) |
|---|---|---|---|---|---|---|---|
| POST | `/api/auth/bridge` | `server.js` L974 | No | JSON object validated by `validateAuthBridge`: requires `trustMode` and one identity claim among `googleIdToken` / `googleSub` / `googleEmail` / `userId`; `google_verified` mode requires `googleIdToken` | `201` + `{ ok:true, data:{ auth:{token...}, diagnostics, identity }}` on success; 4xx on validation/policy/verification failures | Cross-origin POST + JSON triggers preflight; origin must pass CORS policy to succeed in browser | `public/index.html` direct fetch (`NODE_AUTH_BRIDGE_URL`), and `public/backend-read.js` via `ensureAuthToken()` |
| GET | `/api/me` | `server.js` L1151 | Yes (`requireAuth`) | none | `200` + auth claims summary (`userId`, provider, role, token metadata) | Requires `Authorization` header cross-origin; preflight handled by global CORS settings | No direct frontend caller found in current app flow |
| GET | `/api/me/profile` | `server.js` L1273 | Yes | none | `200` profile payload | Same as above | `public/backend-read.js::fetchProfile()` used by app/session bootstrap |
| PUT | `/api/me/profile` | `server.js` L1278 | Yes | JSON profile (validated by `validateProfileUpsert`) | `200` updated profile | Same as above | `public/index.html` `saveProfileWritePath()` (authenticated path) |
| GET | `/api/me/history` | `server.js` L1324 | Yes | query `limit` optional | `200` history payload | Same as above | `public/backend-read.js::fetchHistory()`, `public/dashboard.js` |
| GET | `/api/me/ohsa` | `server.js` L1319 | Yes | none | `200` OHSA history | Same as above | indirectly in app via client helpers |
| POST | `/api/ohsa` | `server.js` L1309 | Yes | validated OHSA summary object | `201` | Same as above | `public/index.html` via session/write paths |
| POST | `/api/sessions` | `server.js` L1242 | Optional bearer but user scope enforcement applied if present | validated create payload | `201` | Cross-origin JSON preflight applies | `public/session-write.js` explicit API path |
| POST | `/api/sessions/:id/reps` | `server.js` L1252 | Optional bearer + scoped checks | validated rep payload | `200` | Cross-origin JSON preflight applies | `public/session-write.js` explicit API path |
| POST | `/api/sessions/:id/complete` | `server.js` L1262 | Optional bearer + scoped checks | validated completion payload | `200` | Cross-origin JSON preflight applies | `public/session-write.js` explicit API path |
| POST | `/command` (legacy auth-adjacent fallback) | `server.js` L1498 | Optional bearer (used for user match enforcement if present) | legacy `{domain,command,userId,payload}` | 200/4xx; used as compatibility fallback | Cross-origin JSON preflight applies | `public/session-write.js` legacy fallback calls |
| POST | `/api/ops/auth/token-revocations` | `server.js` L799 | Yes + permission guard | `{jti, expiresAt, reason}` | `201` revoke result | Requires Authorization + CORS | Operator/admin tools only |
| Admin/ops authz routes | `/api/ops/*`, `/api/admin/*` | `server.js` L561+ | Yes + permission guard | route-specific | route-specific | Requires Authorization + CORS | Admin diagnostics/operator flows |

### Google callback routes / session cookie routes
- No server-side Google OAuth callback route (e.g., `/auth/google/callback`) exists in backend route definitions.
- No cookie-backed session login route exists; auth model is token issuance from `/api/auth/bridge` and bearer token use afterwards.

## PHASE 2 — Frontend login/auth inventory

### Primary login flow (landing app)
- GIS script loaded from `https://accounts.google.com/gsi/client`.
- Google identity initialized via `window.google.accounts.id.initialize(...)` and renders official button into `#googleSignInMount`.
- Callback receives `response.credential` (Google ID token), calls `directGoogleBridgeFetch(googleCredential)` (absolute backend URL), then continues `onLogin(...)`.

### Auth/network call inventory

| File | Function/block | URL called | Absolute vs relative | Payload fields | When it runs | Notes/conflicts |
|---|---|---|---|---|---|---|
| `public/index.html` | constants block | `NODE_BASE_URL = https://mufasa-fitness-node.onrender.com`; `NODE_AUTH_BRIDGE_URL = .../api/auth/bridge` | Absolute | n/a | script init | Sets canonical backend origin |
| `public/index.html` | `directGoogleBridgeFetch()` | `fetch(NODE_AUTH_BRIDGE_URL)` | **Absolute backend URL** | `{provider:"google", trustMode:"google_verified", credential, googleIdToken}` | Only in GIS callback after credential received | This is the direct bridge path user asked about |
| `public/index.html` | `initializeGoogleIdentity` callback | no direct URL itself; triggers above | n/a | uses `response.credential` | when Google callback fires | If callback never fires, bridge fetch never runs |
| `public/index.html` | `ensureBackendSession()` | uses backend-read client `ensureAuthToken()` and `fetchProfile()` | relative paths resolved against backend base | claims-based body from profile (`googleIdToken/googleSub/googleEmail/manualUserId`) | auto-login or post-login bootstrap | Secondary bridge path |
| `public/backend-read.js` | `ensureAuthToken()` | `fetchJSON('/api/auth/bridge')` | Relative to `apiBase` (passed as backend absolute origin by caller) | dynamic trustMode/provider/claims body | when token missing/refresh needed | not frontend-origin if `baseUrl` provided |
| `public/backend-read.js` | `fetchProfile()` | `/api/me/profile` | relative to backend base | none (auth header only) | authenticated profile reads | token required |
| `public/backend-read.js` | `fetchHistory()` | `/api/me/history?limit=...` | relative to backend base | none | dashboard/history sync | token required |
| `public/session-write.js` | explicit API writes | `${baseUrl}/api/sessions*` | baseUrl injected as backend absolute URL | session payloads | workout actions | falls back to `/command` on failures |
| `public/session-write.js` | fallback | `commandUrl` (`/command` full backend URL from caller) | absolute | legacy command payload | explicit API failure | legacy compatibility path |
| `public/dashboard.js` | client init + history fetch | backend-read client against `maatNodeBaseUrl` or fallback backend origin | absolute base + relative paths | none / auth header | dashboard load | fallback backend origin hardcoded to node service |
| `public/retention-flow.js` | `authedRequest()` | `${getNodeBaseUrl()}${path}` | absolute if `maatNodeBaseUrl` is set | generic JSON + bearer | retention actions | relies on same stored backend base URL |
| `public/landing-diagnostics.js` | operator report/probe calls | absolute backend URLs | absolute | diagnostic payload + optional bearer | diagnostics button click | separate from login |

### Token storage/auth state inventory
- Backend bearer token key: `maatAuthToken` via backend-read `storagePrefix="maat"` + suffix `AuthToken`.
- User profile/token persistence also stores `maatUserProfile` and `maatGoogleIdToken` (Google ID token is separately persisted in app login flow).
- Sign-out removes `maatUserId`, `maatUserProfile`, `maatGoogleIdToken`, and clears backend-read auth token.

## PHASE 3 — Duplicate/old login systems

### Duplicates found
1. **Prompt-era/manual fallback path**
   - Manual login button still exists (`manualLoginBtn`) and creates local profile.
2. **New GIS renderButton path (official)**
   - `google.accounts.id.renderButton(googleSignInMountEl, ...)` + callback.
3. **Fallback Google button path**
   - `#googleBtn` remains as a bootstrap/fallback trigger that scrolls/highlights GIS mount and retries init.
4. **Direct bridge fetch path**
   - `directGoogleBridgeFetch()` sends absolute POST to backend bridge immediately on credential callback.
5. **Backend-read helper bridge path**
   - `BACKEND_READ_CLIENT.ensureAuthToken()` can also call `/api/auth/bridge` later during session bootstrap.
6. **Token storage methods**
   - Same main token key path (`maatAuthToken`) via backend-read, plus additional persisted Google token (`maatGoogleIdToken`) in profile state.
7. **Duplicate root/public frontend files**
   - `index.html` and `public/index.html` are currently byte-identical; `backend-read.js` and `public/backend-read.js` are also identical.

### Recommendation on conflicting paths
- Keep **GIS renderButton callback + direct bridge fetch** as primary Google auth path.
- Keep **backend-read ensureAuthToken** only as bootstrap/recovery path (not primary signal path).
- Keep **googleBtn fallback UI** only as init fallback trigger, not alternative auth mechanism.
- Keep **/command** only as legacy write fallback (already explicit/degraded semantics), not login/auth path.

## PHASE 4 — Route reachability proof from code/config

### Expected origins
- Frontend origin: `https://mufasafitsite.onrender.com`
- Backend origin: `https://mufasa-fitness-node.onrender.com`
- Expected bridge URL: `https://mufasa-fitness-node.onrender.com/api/auth/bridge`

### Proof from code
- `NODE_BASE_URL` in frontend is hardcoded to `https://mufasa-fitness-node.onrender.com`.
- `NODE_AUTH_BRIDGE_URL` is `${NODE_BASE_URL}/api/auth/bridge`.
- `directGoogleBridgeFetch()` posts to `NODE_AUTH_BRIDGE_URL` (absolute backend URL).
- Backend-read helper uses relative route `/api/auth/bridge`, but it is always prefixed with `apiBase` from `createClient({ baseUrl: NODE_BASE_URL })` in this app, resulting in backend absolute URL.

Conclusion: current frontend source code points auth bridge to backend origin, not frontend origin.

## PHASE 5 — Backend CORS and policy audit

### CORS
- `ALLOWED_ORIGINS` env parsed as comma-separated list.
- If list is empty, any origin is allowed.
- If list is non-empty, only exact matches are allowed.
- Preflight enabled globally with `app.options("*", cors(corsOptions))`.
- `Content-Type` and `Authorization` explicitly allowed headers.

### Route order / shadowing
- `/api/auth/bridge` route is declared before static middleware and before error handler.
- Static middleware cannot shadow `/api/auth/bridge` in current order.

### Trust-mode policy
- Valid bridge trust modes accepted by normalizer: `google_verified`, `provider_unverified`, `manual_unverified`.
- `google_verified` requires `googleIdToken` by validator.
- If identity is not provider-verified, mode must be enabled by `AUTH_BRIDGE_ALLOWED_TRUST_MODES`; otherwise 403.

### Exact env values expected for healthy production path
- `ALLOWED_ORIGINS` should include at least:
  - `https://mufasafitsite.onrender.com`
  - `https://mufasa-fitness-node.onrender.com` (recommended when backend-hosted pages/tools may call APIs)
- `GOOGLE_OAUTH_CLIENT_ID` should equal the same client ID used by frontend GIS init (`1053883905933-n4a6ll6m7l3lqd60mq3g2rnb6iktdgp2.apps.googleusercontent.com`) when enforcing audience checks.
- `ADMIN_EMAILS` optional for operator/admin grants; should contain lowercase comma-separated admin emails if used.
- `AUTH_BRIDGE_ALLOWED_TRUST_MODES`:
  - For strict verified-only bridge behavior in production: set to empty/none of low-trust modes.
  - If allowing fallback low-trust: explicitly include `provider_unverified` and/or `manual_unverified` as intended.

## PHASE 6 — Why direct bridge may not hit backend (ranked)

### Ranked causes (most plausible first given symptom: no `/api/auth/bridge` backend logs)
1. **CORS preflight blocked due `ALLOWED_ORIGINS` mismatch**
   - Browser sends OPTIONS; if origin not allowed, POST never proceeds, and backend bridge route logs would not appear.
2. **Google callback never fires (credential never received)**
   - Direct fetch only runs inside GIS callback after `response.credential` exists.
3. **Frontend stale shell/deploy drift**
   - Users may be served an old/stale frontend bundle not containing direct bridge path even if repo has it.
4. **Wrong page/button path used by user**
   - If fallback button used while GIS API unavailable, no credential means no bridge POST.
5. **Client-side runtime error before callback chain**
   - Any error before `directGoogleBridgeFetch()` invocation breaks auth path.
6. **Backend URL variable undefined/mutated**
   - Not indicated in current source, but possible in stale runtime bundle.
7. **User manually hitting `/api/auth/bridge` with GET in browser**
   - Endpoint is POST-only; direct navigation won’t exercise route as intended.
8. **Service worker/cache interference**
   - No service worker registration found in repo; lower likelihood.

## PHASE 7 — Root cause + exact recommendation

### Most likely root-cause cluster
- Deployment/environment mismatch rather than route code mismatch:
  - CORS origin allowlist not including frontend origin.
  - and/or stale frontend deployment not actually serving this current login code.

### Exact remediation sequence
1. On backend Render service env, set `ALLOWED_ORIGINS` exactly to include:
   - `https://mufasafitsite.onrender.com,https://mufasa-fitness-node.onrender.com`
2. Confirm backend env `GOOGLE_OAUTH_CLIENT_ID` matches frontend GIS client ID.
3. Redeploy backend.
4. Verify frontend deployment is publishing `public/` from this branch/commit (current file includes direct bridge fetch + GIS renderButton path).
5. In browser devtools network, confirm OPTIONS then POST to `https://mufasa-fitness-node.onrender.com/api/auth/bridge` on Google callback.

## PHASE 8 — Fix applied?
- No code fix applied in this pass because route/source mismatch is not proven in repository code; likely issue is deployment/env/runtime state.
- Added this audit report only.
