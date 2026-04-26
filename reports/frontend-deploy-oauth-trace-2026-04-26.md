# Frontend deploy + OAuth trace — 2026-04-26 (UTC)

## Phase 1 — Frontend deploy trace

### Live reachability from this environment
- `curl -sS -D - https://mufasafitsite.onrender.com`
- `curl -sS -D - https://mufasafitsite.onrender.com/__frontend-version.json`
- Result: outbound HTTPS to Render is blocked here with `CONNECT tunnel failed, response 403`.
- Consequence: Render dashboard/runtime settings cannot be directly read from this environment.

### Repository evidence of stale/wrong frontend path
- `public/index.html` **contains**:
  - `Run System Diagnostic` button (`id=runSystemDiagnosticBtn`)
  - `landing-diagnostics.js` script include
- Repository root `index.html` **does not** include `Run System Diagnostic` and does not include `landing-diagnostics.js`.
- If a static service publishes repository root instead of `public/`, users will not see the diagnostic UI.

### Required Render static service settings (frontend)
- Service type: Static Site
- Repo: this repo (`Mufasa.fitness.node`)
- Branch: `work` (or the intended production branch, but must include this commit)
- Root Directory: blank or `.` (repo root)
- Publish Directory: `public`
- Build Command: optional for static files (`echo "static"` is sufficient if Render requires a command)

### Visibility marker added
- Added an obvious marker near landing buttons:
  - `🚨 Frontend diagnostics build active`
- File: `public/index.html`
- Build marker version file updated: `public/__frontend-version.json`

## Phase 2 — OAuth origin mismatch

### Where Google login is initiated
- Google GIS is loaded in frontend HTML: `https://accounts.google.com/gsi/client`
- Login starts from frontend click handler (`googleBtn.onclick`) calling `google.accounts.id.initialize(...)` with a Google OAuth client ID.
- Therefore, JavaScript origin validation is based on the **origin serving the frontend page**, not only backend API origin.

### Google Cloud Console entries required
For the OAuth Web Client used by `google.accounts.id.initialize`:

#### Authorized JavaScript origins
- `https://mufasafitsite.onrender.com`
- `https://mufasa-fitness-node.onrender.com` (only needed if users can start Google login from backend-hosted pages)

#### Authorized redirect URIs
- GIS One Tap / credential callback in this app is JS callback-based, so redirect URI may not be required for current flow.
- If any redirect flow exists or is introduced, include exact callback URLs used by app routes, for example:
  - `https://mufasafitsite.onrender.com`
  - `https://mufasa-fitness-node.onrender.com`
  - plus any explicit callback path actually used (none found in current frontend code).

## Phase 3 — Routing decision
- Preferred flow: users authenticate from frontend origin `https://mufasafitsite.onrender.com`.
- Backend should remain API-only for login bridge verification (`/api/auth/bridge`).
- If backend-hosted UI login remains exposed, backend origin must stay authorized in Google Cloud OAuth origins.
