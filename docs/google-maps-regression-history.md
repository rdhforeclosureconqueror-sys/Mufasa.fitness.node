# Google Maps browser-key regression: history-first result

## What Git proves (and what it does not)

The repository does **not** contain a historical Vite or other static-build delivery mechanism for the Maps browser key. `7f390f1` introduced the map, `VITE_GOOGLE_MAPS_BROWSER_API_KEY`, `fetch("/api/browser-config")`, and the Express handler together. At `ab040cc` the consuming line was still `body.data.googleMapsBrowserApiKey`, obtained from the same-origin Express response. The checked-in frontend deployment record predates the map and identifies `mufasafitsite` as a Render Static Site publishing `public`, with no meaningful build command. Consequently, Git cannot substantiate the claim that `ab040cc` successfully consumed the key from the frontend Static Site environment: that topology never executes `server.js` and has no static `/api/browser-config` artifact.

`988c795` was the first source change to the acquisition URL: it changed the relative request to `backendUrl("/api/browser-config")`. That explains the later backend `200`/null evidence, but changing it back explains the frontend Static Site `404`; neither route can consume a variable owned only by the frontend Static Site.

## Three states

| Contract | Last reported working (`ab040cc`) | First routing regression (`988c795`) | Current restoration |
| --- | --- | --- | --- |
| Deployment evidence | Render Static Site | Render Static Site | Render Static Site |
| Build command | none; `echo "static"` optionally documented | unchanged | `npm run build:frontend` |
| Publish directory | `public` | `public` | `dist` |
| Variable / owner | `VITE_GOOGLE_MAPS_BROWSER_API_KEY` / frontend service | same name, but request was sent to backend service | same name / frontend build environment |
| Acquisition | same-origin Express JSON in source; incompatible with recorded static deployment | backend Express JSON | build-time substitution into `trail-map.js` |
| Request URL | `/api/browser-config` | backend `…/api/browser-config` | none |
| Response field | `data.googleMapsBrowserApiKey` | same | none |
| Script creation | encoded field in Maps JS URL | encoded field in Maps JS URL | encoded build-supplied constant in Maps JS URL |
| Diagnostics | request/status/key-presence stages | backend request showed 200/null | `browser_config_parsed` then `browser_key_present`, with source `frontend_build`; key value never emitted |
| Initialization | callback, libraries, map and markers | stops at missing key | preserved callback, geometry/libraries, visibility, map and marker lifecycle |

## Production contract

The production build copies `public` to `dist` and replaces one sentinel in the copied `trail-map.js` with exactly `VITE_GOOGLE_MAPS_BROWSER_API_KEY`. It fails closed if that variable is absent. It never reads or substitutes `GOOGLE_MAPS_API_KEY`, and it logs only key presence. Render must use build command `npm run build:frontend` and publish directory `dist`; neither environment variable is renamed or moved.

This is necessarily a static-build repair, not a claimed historical restoration: exhaustive history shows no working static key-delivery implementation to restore. The previous `/api/browser-config` attempts failed because the relative URL targets a Static Site without Express, while the absolute backend URL targets the service that deliberately does not own the frontend key.

Expected post-deploy trace is `browser_config_parsed` (`source: frontend_build`), `browser_key_present`, `maps_script_appended`, `maps_loader_callback`, `maps_namespace_ready`, `maps_libraries_ready`, `map_created`, `markers_created`, and `map_render_complete`. This is an expected trace, not a claim of live-device verification.
