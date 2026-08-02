# Google Maps iPhone regression history

This is a regression trace, not a new-configuration proposal. It was reconstructed with `git log --all --follow`, pickaxe searches for the browser key and `/api/browser-config`, and direct comparisons of the commits named below.

## Last known working contract

The last history-backed revision satisfying the reported production evidence is **`ab040cc2e514926de8bd84eaaa495a6e0a259462` (`Make iPhone map diagnostics reliably visible`)**. It retained the loader introduced in `15274cf`, while making the original Map Debug launcher visible on iPhone. At that point the contract was:

- Environment name: exactly `VITE_GOOGLE_MAPS_BROWSER_API_KEY`.
- Owner: the Render frontend web service serving the Greatness HTML (`mufasafitsite`), not the backend Places service (`mufasa-fitness-node`).
- Delivery: the serving process read its runtime `process.env` and returned the key from its same-origin `GET /api/browser-config`; there was no HTML injection and frontend JavaScript did not read `process.env` or a browser global.
- Response field: exactly `data.googleMapsBrowserApiKey` (the normal API response envelope supplied `data`).
- Lookup order: one source only—`/api/browser-config` response field `data.googleMapsBrowserApiKey`; no aliases, injected global, backend fallback, or Places-key fallback.
- Browser request: `fetch("/api/browser-config", { cache: "no-store" })`, resolving on production to `https://mufasafitsite.onrender.com/api/browser-config`.
- Loader input: `data.googleMapsBrowserApiKey`, URL-encoded into `https://maps.googleapis.com/maps/api/js?key=…&loading=async&callback=…`.

`options.env` is now accepted by the application factory solely to make that same runtime contract deterministic in tests; production still defaults to `process.env`. Supplying an environment object is authoritative and cannot accidentally consult unrelated global state.

## First contract-changing commit

**`988c7958c16b5f8b975fe83172bba1000290a402` (`Fix mobile map browser config routing`)** is the first later commit that changed the working path. It introduced `backendUrl()` and changed both the map loader and diagnostics config request from frontend same-origin to the fixed/configured backend origin, with `credentials: "omit"` and `redirect: "error"`. The response field and variable name did not change, but ownership effectively moved: the endpoint now ran on `mufasa-fitness-node`, where the frontend-owned browser key was not present. That explains HTTP 200 with `googleMapsBrowserApiKey: null`, `browserKeyPresent: No`, and `BROWSER_MAP_KEY_MISSING` without requiring any secret change.

Later commit `8d8070e` added speculative injected globals, aliases, same-origin probing, and backend fallback. Commit `f37e3f1` removed those aliases but restored the backend-only request rather than the original frontend path. Neither is the last-known-working contract.

## Side-by-side implementation

| Contract element | Last known working (`ab040cc`) | First broken (`988c795`) | Before this correction (`f6e6e42`) |
| --- | --- | --- | --- |
| Env name | `VITE_GOOGLE_MAPS_BROWSER_API_KEY` | unchanged | unchanged |
| Effective owning service | `mufasafitsite` frontend web service | `mufasa-fitness-node` backend | `mufasa-fitness-node` backend |
| Browser config URL | relative `/api/browser-config` (frontend origin) | `backendUrl("/api/browser-config")` | `backendUrl("/api/browser-config")` |
| Fetch options | `{ cache: "no-store" }` | cache + omitted credentials + redirect error | cache + omitted credentials + redirect error |
| Response lookup | `body.data.googleMapsBrowserApiKey` only | same | same |
| Loader input | response field directly | response field directly | trimmed response field |
| Places fallback | none | none | none |
| Browser/global env lookup | none | none | none |

## Minimal restoration

The loader and Map Debug bootstrap again request relative `/api/browser-config` with the historical fetch options. The endpoint still returns only `googleMapsBrowserApiKey`, debug enablement, and a non-secret commit marker. It reads exactly `VITE_GOOGLE_MAPS_BROWSER_API_KEY`; `GOOGLE_MAPS_API_KEY` remains backend-only and is never serialized. No variable was added or renamed, no alias or fallback was introduced, and no operator secret move is required.

All later map lifecycle, loader timeout/authentication handling, diagnostic redaction and visibility, route rendering, and backend Places separation remain intact.

After deploying the corrected code to the existing frontend service configuration, the live panel should change from `browserKeyPresent: No` / `browserKeyNull: Yes` to **Yes / No**, then `scriptLoaded`, `googleExists`, and final map status should become **true, true, and rendered** (assuming the already-working key restrictions remain unchanged). `providerError` should clear. This repository change cannot prove deployment; success must be confirmed on the deployed iPhone panel.
