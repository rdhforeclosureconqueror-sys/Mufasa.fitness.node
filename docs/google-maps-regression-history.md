# Google Maps iPhone regression history

This trace was produced from the complete repository history for the Greatness page and its map runtime. It identifies a code regression and does not infer a missing environment variable.

## Timeline

| Commit | Finding |
| --- | --- |
| `15274cf18affc0550f07971b4eb6c8b119b6d29f` | Added exact loader-stage events and `/api/browser-config` response evidence. |
| `0d12a0bf5bd134c4b55cf655b66867cf89308140` | First added the dedicated **Map Diagnostics** panel, its CSS, retry/cache controls, and admin/debug authorization. |
| `ab040cc2e514926de8bd84eaaa495a6e0a259462` | Made the diagnostics launcher and panel reliably visible on iPhone using safe-area offsets, maximum z-indexes, an independent module load, and a cache revision. |
| `988c7958c16b5f8b975fe83172bba1000290a402` | Fixed mobile browser-configuration routing. This is the proven working implementation: the browser requested `backendUrl("/api/browser-config")` directly with `credentials: "omit"` and `redirect: "error"`, parsed `data.googleMapsBrowserApiKey`, and loaded Google Maps once. |
| `752ef7b8...`, `3f1f590f...`, `d30cd0034aceb95411b6fe5f57964eb54b7acfe9` | Added visibility waits, carousel redraws, resize/orientation handling, callback timeout, provider classification, coordinate validation, and client health evidence while retaining the direct backend configuration request. These improvements are not the configuration regression. |
| `8d8070edaea774a30c3a3d95c548e298425f31d6` | Replaced the proven single backend request with an unproven frontend-global / frontend-same-origin / backend-fallback discovery chain. It also changed the asset revision to `frontend-map-key-restore-20260802`. This is the first commit that bypassed the implementation known to work on iPhone. |
| `ade149cf...` | Added another diagnostic/schema layer after the regression. It did not restore the proven request path and is reverted by this correction. |

## Exact corrective change

The loader again makes exactly one browser-configuration request to `backendUrl("/api/browser-config")`, with the original cross-origin options (`cache: "no-store"`, `credentials: "omit"`, and `redirect: "error"`). It accepts only `data.googleMapsBrowserApiKey`, then passes that value to the existing encoded Google loader URL.

The correction deliberately preserves the later, valid behavior: one shared loader promise, geometry library request, callback timeout, `gm_authFailure`, container visibility wait, resize/orientation refresh, route-carousel redraw, coordinate validation, sanitized capability evidence, and the iPhone-visible Map Diagnostics panel.

## Commands used

The investigation used the requested `git log --all --follow` commands for `public/greatness.html`, `public/greatness.js`, and `public/trail-map.js`; pickaxe searches for `__MAAT_MAP_DIAGNOSTICS__`, `Map Diagnostics`, `iPhone`, `Safari`, `VITE_GOOGLE_MAPS_BROWSER_API_KEY`, `/api/browser-config`, and the user-facing missing-map message; and `git blame` on all three current frontend files. Commit contents and transitions were then compared with `git show` for `15274cf`, `0d12a0b`, `ab040cc`, `988c795`, `d30cd00`, and `8d8070e`.
