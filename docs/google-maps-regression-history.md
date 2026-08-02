# Google Maps iPhone regression history

This is a regression trace, not a new-configuration proposal. It was reconstructed with `git log --all --follow`, pickaxe searches for the browser key and `/api/browser-config`, and direct comparisons of the commits named below.

## Scope of the proof

Git proves the committed request path, response schema, environment-variable name, and the first commit that changed that path. The reported iPhone observation is the evidence that the map actually rendered at `ab040cc`; repository history by itself cannot prove a browser-side production outcome or the Render service settings at that moment. Accordingly, **`ab040cc2e514926de8bd84eaaa495a6e0a259462` is the last-known-working commit**, and **`988c7958c16b5f8b975fe83172bba1000290a402` is the first descendant that changed the proven working configuration path**. This conclusion does not claim that an unobserved intermediate commit independently rendered a map.

## Last known working contract

The last history-backed revision satisfying the reported production evidence is **`ab040cc2e514926de8bd84eaaa495a6e0a259462` (`Make iPhone map diagnostics reliably visible`)**. It retained the loader introduced in `15274cf`, while making the original Map Debug launcher visible on iPhone. At that point the contract was:

- Environment name: exactly `VITE_GOOGLE_MAPS_BROWSER_API_KEY`.
- Intended owner in the source contract: the process serving the Greatness HTML. Git does not prove that Render deployed such a process at `mufasafitsite`; the checked-in deployment record instead describes that origin as a Static Site.
- Delivery required by the source contract: a serving process had to read its runtime `process.env` and return the key from same-origin `GET /api/browser-config`; there was no HTML injection and frontend JavaScript did not read `process.env` or a browser global.
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
| Requested origin / process required by code | `mufasafitsite`; Express required at that origin but not proven deployed | `mufasa-fitness-node` backend | `mufasa-fitness-node` backend |
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

The current production `404 text/plain` is direct evidence that the deployed frontend origin is not serving the committed Express route. The deployment investigation identifies a Static Site/Express artifact mismatch and corrects the earlier unsupported assumption that `mufasafitsite` executed `server.js`; see [Production `/api/browser-config` 404 investigation](deployment/browser-config-404-investigation.md). The restoration intentionally does not compensate by contacting the backend service: doing so would repeat the routing change in `988c795`.

## Reproducible history commands

The investigation ran the following commands from the repository root. The path logs establish which commits touched each participating file; the pickaxe searches establish when each contract token entered or left history; blame attributes the current preserved behavior. Direct `git show`/`git diff` comparisons were then used for the conclusions above.

```bash
git log --all --oneline --decorate --graph -- public/greatness.html
git log --all --oneline --decorate --graph -- public/greatness.js
git log --all --oneline --decorate --graph -- public/trail-map.js
git log --all --oneline --decorate --graph -- public/map-diagnostics.js
git log --all --oneline --decorate --graph -- server.js
git log --all -S "/api/browser-config" --oneline --all
git log --all -S "VITE_GOOGLE_MAPS_BROWSER_API_KEY" --oneline --all
git log --all -S "googleMapsBrowserApiKey" --oneline --all
git log --all -S "Map Debug" --oneline --all
git log --all -S "BROWSER_CONFIG_HTTP_ERROR" --oneline --all
git log --all -S 'backendUrl("/api/browser-config")' --oneline --all
git blame public/trail-map.js
git blame public/map-diagnostics.js
git blame server.js
git log --ancestry-path --reverse --oneline ab040cc..988c795
git diff ab040cc..988c795 -- public/trail-map.js public/map-diagnostics.js public/greatness.js server.js
git show ab040cc:public/trail-map.js
git show ab040cc:server.js
git show 988c795:public/trail-map.js
```

The ancestry walk contains intervening diagnostics and Nearby Trails work, then ends at `988c795`; inspection of those intermediate patches found no earlier change to the map configuration URL. At `ab040cc`, both the map loader and diagnostic bootstrap use relative `/api/browser-config`, while `server.js` returns `process.env.VITE_GOOGLE_MAPS_BROWSER_API_KEY` as `data.googleMapsBrowserApiKey`. At `988c795`, the loader imports `backendUrl` and replaces the relative fetch with `backendUrl("/api/browser-config")`, `credentials: "omit"`, and `redirect: "error"`. No change to Google Places behavior is part of this restoration.
