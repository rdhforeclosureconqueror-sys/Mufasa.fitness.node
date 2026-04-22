# LIVE VERIFICATION REPORT — 2026-04-22

## Scope
Post-fix verification attempt for Exercise Library host resolution in deployed flow.

## Attempted live checks
1. `curl -I https://mufasa-fitness-node.onrender.com/exercise-library.html`
   - Result: `CONNECT tunnel failed, response 403`.
2. Node fetch to deployed page URL
   - Result: `fetch failed` (network/connectivity failure from execution environment).

## Runtime selection logic inspected
From `public/exercise-library.js`:
- Candidate hosts are resolved in this order: `localStorage.maatNodeBaseUrl`, `https://mufasa-fitness-node.onrender.com`, `window.location.origin`, then relative `""`.
- Chosen values are exported to:
  - `window.__EXERCISE_LIBRARY_ASSET_HOST`
  - `window.__EXERCISE_LIBRARY_INDEX_URL`

## Expected chosen URLs in deployed browser (inference)
- Chosen index URL (expected): `https://mufasa-fitness-node.onrender.com/exercise-db/index.json`
- Chosen asset host (expected): `https://mufasa-fitness-node.onrender.com`

## Status
- Live browser verification in this environment: **BLOCKED** by outbound connectivity restrictions to the deployed host.
- No code changes were required or made for application logic during this verification attempt.
