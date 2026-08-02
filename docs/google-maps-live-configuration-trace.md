# Google Maps live configuration trace

Checked 2026-08-02. This is a configuration-chain diagnosis, not a claim that the live map is fixed.

## Repository evidence

1. `VITE_GOOGLE_MAPS_BROWSER_API_KEY` is documented only in `.env.example`; no committed Render blueprint, Vite configuration, build substitution, or production environment values exist in this repository. The real Render dashboard value and its owning service therefore **cannot be established from source control**.
2. The application in this repository is a Node/Express-served frontend: `server.js` serves `public/` with `express.static`. There is no frontend build script and no Vite dependency. The `VITE_` prefix does not make this value build-time configuration here.
3. The browser key is read at **server runtime** by `GET /api/browser-config`. Consequently the value must exist on every Node service expected to answer that route. A value configured only on a separate static-site build is not visible to this process.
4. `public/greatness.html` contains no injected runtime configuration. Source code recognizes `globalThis.__MAAT_RUNTIME_CONFIG__`, `globalThis.VITE_GOOGLE_MAPS_BROWSER_API_KEY`, and `globalThis.GOOGLE_MAPS_BROWSER_API_KEY`, but this repository does not assign any of them.
5. The browser first requests `/api/browser-config` on the frontend origin. If the frontend service does not run this Express app or does not route `/api/*` to it, that request can return a static-host 404 or HTML. Only then does the code request the fixed backend origin. The backend can return the browser key only when `VITE_GOOGLE_MAPS_BROWSER_API_KEY` is configured on the backend service; it never substitutes the backend-only `GOOGLE_MAPS_API_KEY`.

## Live checks and remaining deployment evidence

Direct checks of both Render origins were attempted from this task environment. The environment's outbound CONNECT proxy rejected both hosts with HTTP 403 before either Render service was reached. The browser tool also rejected the request before reaching Render. Thus source control does **not** establish live HTTP status, content type, redirect, CORS headers, cache headers, deployed schema, key presence, Safari's actual request path, loader count, or Google's provider response. Those facts must not be guessed.

The deployed browser now publishes a key-free snapshot as `globalThis.__MAAT_MAP_DIAGNOSTICS__` and logs it as `[map-configuration-diagnostic]`. Capture that object in live Safari after reproducing the failure. It distinguishes the frontend request from the backend fallback and records statuses, content types, schema validation, placeholder detection, loader/callback/global/library/container evidence, provider classification, and final state. It never includes the key or a loader URL.

## Explicit endpoint contract

`GET /api/browser-config` is public and returns the standard API envelope whose `data` has:

```json
{
  "schemaVersion": "1",
  "googleMapsBrowserKeyConfigured": true,
  "googleMapsBrowserKey": "<browser key or null>",
  "googleMapsBrowserApiKey": "<temporary compatibility alias or null>",
  "debugMapEnabled": false,
  "applicationCommit": "<commit or unknown>"
}
```

The response uses JSON, `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, and `Vary: Origin`. CORS is governed by `ALLOWED_ORIGINS`; the frontend origin must be present on the backend service when that allowlist is non-empty. No authentication is required.

## Decision table for the live capture

- Frontend status 404, or `text/html`: the frontend service does not own/proxy the runtime endpoint.
- Frontend schema invalid: stale frontend deployment or an HTML/legacy API response.
- Backend status absent: no fallback was needed, the frontend request is still pending, or execution stopped before fallback; use `finalMapStatus` with the request booleans.
- Backend network failure with a cross-origin browser error: verify `ALLOWED_ORIGINS` contains `https://mufasafitsite.onrender.com` and inspect the actual OPTIONS/GET response.
- Valid schema with `googleMapsBrowserKeyConfigured: false`: `VITE_GOOGLE_MAPS_BROWSER_API_KEY` is unavailable to the service answering that endpoint.
- Configured indicator true with empty/null key: endpoint contract violation.
- `browserKeyPlaceholderDetected: true`: a sample value was deployed instead of a usable key.
- `loaderScriptCount` greater than one: duplicate loader injection. A normal attempt is exactly one and requests `libraries=geometry`.
- Callback reached but geometry unavailable: loader/library response is incomplete or stale.
- Provider classification identifies referrer, API activation, billing, invalid-key, expired-key, or generic authentication rejection; correct the Google Cloud key/project restriction rather than changing map lifecycle code.
