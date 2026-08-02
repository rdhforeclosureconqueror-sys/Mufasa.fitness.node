# Trail maps and route verification

Google Places remains the discovery provider. Its place coordinate is shown as a destination only and is never converted into route geometry. `trail-routes.json` is a separate, persistent local store created under `POCKET_PT_DATA_DIR`; migration `001-create-trail-routes.json` documents its initial schema.

## Goal-route source and quality policy

Goal routes are selected in this order: `verified_geometry` (admin-verified GPX/GeoJSON), `trail_network` (OpenStreetMap pedestrian-graph out-and-back), `park_constrained_walking_route` (a Google walking route validated against both the trail corridor and a usable park boundary), `google_walking_route` (unconstrained), and `place_only`. Distance error is considered only after source, trail adherence, and park containment. An unconstrained Google route retains its walking-route warning and is never described as verified or as a trail-network route. A place-only result has an empty polyline rather than invented geometry.

When `OVERPASS_API_URL` is configured, the server retrieves OpenStreetMap `path`, `footway`, `pedestrian`, and walkable `track` ways near the selected place. `access=private` and `foot=no` ways are discarded. Public graph responses are cached by a rounded area and identical requests are coalesced. The server constructs routes on connected graph edges; it never reads, traces, or scrapes Google basemap tiles. If Overpass, graph, corridor, or boundary validation is unavailable, the result falls back honestly instead of claiming constraint validation.

## Server configuration

All distances are metres, percentages are from 0 to 100, and durations are milliseconds. Invalid, fractional, non-finite, or out-of-range integer settings use these conservative defaults:

| Variable | Default |
|---|---:|
| `OVERPASS_API_URL` | unset (trail acquisition disabled) |
| `TRAIL_GRAPH_SEARCH_RADIUS_METERS` | 1500 |
| `TRAIL_CORRIDOR_WIDTH_METERS` | 35 |
| `TRAIL_ROUTE_MAX_OFF_TRAIL_PERCENT` | 10 |
| `PARK_ROUTE_MAX_OUTSIDE_PERCENT` | 15 |
| `TRAIL_ROUTE_MAX_CANDIDATES` | 4 |
| `TRAIL_GRAPH_CACHE_TTL_MS` | 3600000 |
| `TRAIL_ROUTE_TIMEOUT_MS` | 8000 |
| `TRAIL_ROUTE_MAX_GRAPH_NODES` | 5000 |
| `ROUTE_DISTANCE_TOLERANCE_PERCENT` | 5 |
| `GOOGLE_WALKING_ROUTE_MAX_ATTEMPTS` | 4 |
| `GOOGLE_WALKING_ROUTE_TIMEOUT_MS` | 8000 |
| `GOOGLE_WALKING_ROUTE_MAX_WAYPOINT_RADIUS_METERS` | 10000 |
| `GOOGLE_WALKING_ROUTE_CACHE_TTL_MS` | 900000 |
| `GOOGLE_WALKING_ROUTE_RATE_LIMIT_PER_MINUTE` | 6 |

Set `OVERPASS_API_URL` only to a deployment-approved Overpass interpreter endpoint whose availability, usage policy, and attribution obligations have been reviewed. Overpass is an optional dependency for live trail graphs. Google Routes API is an optional server-side dependency for walking fallbacks and requires `GOOGLE_MAPS_API_KEY`; its absence produces a place-only fallback.

Route imports support GPX, GeoJSON LineString, manually supplied ordered coordinates, OpenStreetMap-derived geometry, and municipal GIS exports. Every saved route requires a source identifier. The three initial verification targets—Northaven Trail, Vitruvian Trail, and Brookhaven College Jogging Trail—are suggestions in the admin UI, not seeded or claimed routes. In particular, no verified Vitruvian geometry is included unless an administrator actually imports and verifies it.

## Known limitations

Graph planning searches the usable pedestrian network for vertex-simple, edge-connected cycles. It rejects inaccessible, missing, non-finite, and zero-length geometry before planning. A loop goal is assembled only along a detected cycle as complete circuits followed, when needed, by an interpolated partial circuit; it never adds a straight-line closure. Candidates prefer verified geometry, trail adherence, park containment, target accuracy, fewer detectable road crossings, less edge repetition, and simpler directions, in that order. When no reliable cycle contains the snapped start, planning retains the connected out-and-back fallback. Generated routes are planning aids, not turn-by-turn navigation. Users must follow closures, posted signs, property boundaries, and local conditions.

## Google Cloud browser key

Create a browser key separate from `GOOGLE_MAPS_API_KEY`. Restrict it to owned website referrers and only the Maps JavaScript API. The server key used for discovery and walking routes must remain server-side and be restricted to the required Places API and Routes API services. Do not expose that backend key through browser configuration.

`VITE_GOOGLE_MAPS_BROWSER_API_KEY` keeps its established frontend-service runtime contract. The Greatness browser requests its own-origin `/api/browser-config`, which returns only `data.googleMapsBrowserApiKey`; there are no browser-global aliases or backend-service fallbacks. Keep this variable on the Render frontend web service that serves Greatness (`mufasafitsite`). The backend `GOOGLE_MAPS_API_KEY` remains separate for Places and routes and is never exposed. No operator environment move or rename is required.

The map loader waits for a visible, non-zero container before constructing the map, uses one encoded asynchronous loader callback with a timeout and authentication hook, imports maps/marker libraries, validates every coordinate, fits route bounds, and repeats resize/bounds fitting after reveal and viewport/orientation changes. Route carousel changes redraw the selected authoritative server geometry. A failure never disables route cards, selection, directions, or goal saving.

Safe browser classifications are `BROWSER_MAP_KEY_MISSING`, `BROWSER_CONFIG_UNAVAILABLE`, `MAPS_SCRIPT_BLOCKED`, `MAPS_AUTHENTICATION_FAILED`, `MAPS_REFERRER_NOT_ALLOWED`, `MAPS_API_NOT_ACTIVATED`, `MAP_CONTAINER_ZERO_SIZE`, `MAP_CONTAINER_NOT_VISIBLE`, `MAP_INITIALIZATION_FAILED`, `ROUTE_COORDINATES_INVALID`, `MAPS_LIBRARY_UNAVAILABLE`, and `UNKNOWN_MAP_RENDER_FAILURE`. The member sees friendly fallback copy; authenticated diagnostics receive only the classification and coarse browser/device metadata. To verify production, load a generated route on real iPhone Safari and desktop, rotate/resize, change carousel routes, and confirm the relevant Launch Health client evidence changes from `UNKNOWN_UNTIL_CLIENT_EVIDENCE` to `READY`. Roll back by reverting the application revision; do not swap or expose keys.

Google Maps platform attribution is rendered by the Maps JavaScript API. Imported source attribution remains visible in trail details. Administrators must confirm source licensing and retention rights before import.
