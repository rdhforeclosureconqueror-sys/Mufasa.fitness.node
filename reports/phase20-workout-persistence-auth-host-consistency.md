# Phase 20 — Workout Persistence Auth and Deployment Host Consistency

Date: 2026-06-03

## Scope

Phase 20 only: workout session persistence auth, safe persistence diagnostics, and deployment host/runtime consistency.

## Token-source audit

Session writes are centralized through `public/session-write.js` and are instantiated from `public/index.html`.

Canonical token order after Phase 20:

1. `AuthStateRuntime.getCanonicalAuthState().token`
2. `AuthStateRuntime.getAuthToken()`
3. `window.APP_AUTH.token`
4. `localStorage.maatAuthToken` fallback only

Profile/backend reads in `public/backend-read.js` now use the same order, so session create, rep persistence, complete, profile, and dashboard reads share the same canonical token preference.

## Bug found

The rep persistence path used the injected token getter, but the runtime did not expose a source-aware canonical getter to `SessionWrite`. This made it difficult to prove that the current APP_AUTH/AuthStateRuntime token was winning over stale localStorage. Phase 20 adds a source-aware token resolver and safe diagnostics without exposing token values.

## Invalid-token behavior

For `401` with `invalid_token` from `WWW-Authenticate` or response body:

- visible message: `Session expired. Please log in again.`
- dispatches `mufasa:session-auth-expired`
- marks persistence diagnostics as failed
- does not fall through to legacy `/command` fallback
- does not log or display token values

## Deployment host recommendation

Users should access the frontend at:

- `https://mufasafitsite.onrender.com`

The frontend should call the backend at:

- `https://mufasa-fitness-node.onrender.com`

Directly loading the backend host as a frontend shell is not the recommended user path. If the backend host serves stale static content, treat it as host/cache/deployment drift unless it reproduces from the current `public/index.html` on the frontend host.

## toSafeUserId audit

An active unguarded `toSafeUserId` reference existed in `public/index.html` during hydration configuration. Phase 20 replaces it with a narrow local `safeUserIdFrom` helper and passes it as `toSafeUserId: safeUserIdFrom`, eliminating the active ReferenceError source.

## Rollback notes

To roll back Phase 20, revert the commit that changes:

- `public/session-write.js`
- `public/index.html`
- `public/backend-read.js`
- `test/phase20-workout-persistence-auth.test.js`
- this report

No backend auth middleware, auth secret behavior, payment files, data files, avatar/3D files, or root legacy frontend files were changed.
