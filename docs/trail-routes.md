# Trail maps and route verification

Google Places remains the discovery provider. Its place coordinate is shown as a destination only and is never converted into route geometry. `trail-routes.json` is a separate, persistent local store created under `POCKET_PT_DATA_DIR`; migration `001-create-trail-routes.json` documents its initial schema.

## Goal-route source and quality policy

Goal routes are selected in this order: admin-verified GPX/GeoJSON, attributable pedestrian-network geometry, a Google walking route validated against that network, a walking route validated against a reliable park boundary, and finally an honest place-only result. Distance error is considered only after source, trail adherence, and park containment. An unconstrained Google route remains labelled **Google walking route**, includes a warning that containment is unknown, and is never described as a trail route.

When `OVERPASS_API_URL` is configured, the server retrieves OpenStreetMap `path`, `footway`, `pedestrian`, and walkable `track` ways near the selected place. `access=private` and `foot=no` ways are discarded. Public graph responses are cached by a rounded area and identical requests are coalesced. The server constructs routes on graph edges; it never reads, traces, or scrapes Google basemap tiles.

Controls: `TRAIL_GRAPH_SEARCH_RADIUS_METERS` (1500), `TRAIL_CORRIDOR_WIDTH_METERS` (35), `TRAIL_ROUTE_MAX_OFF_TRAIL_PERCENT` (10), `PARK_ROUTE_MAX_OUTSIDE_PERCENT` (15), `TRAIL_ROUTE_MAX_CANDIDATES` (4), `TRAIL_GRAPH_CACHE_TTL_MS` (3600000), `TRAIL_ROUTE_TIMEOUT_MS` (8000), and `TRAIL_ROUTE_MAX_GRAPH_NODES` (5000). Set `OVERPASS_API_URL` to a deployment-approved Overpass endpoint whose availability and attribution obligations have been reviewed.

Route imports support GPX, GeoJSON LineString, manually supplied ordered coordinates, OpenStreetMap-derived geometry, and municipal GIS exports. Every saved route requires a source identifier. Import tooling runs only in the admin workflow, so normal page rendering never contacts Overpass or another geometry provider. The three initial verification targets—Northaven Trail, Vitruvian Trail, and Brookhaven College Jogging Trail—are suggestions in the admin UI, not seeded or claimed routes.

## Google Cloud browser key

Create a new key, separate from `GOOGLE_MAPS_API_KEY`. Under **Application restrictions**, choose **Websites** and add the exact production origins as HTTP referrers (for example `https://mufasafitsite.onrender.com/*`), plus explicitly approved preview and local origins such as `http://localhost:3000/*`. Do not use wildcards broader than the owned hostnames. Under **API restrictions**, choose **Restrict key** and select only **Maps JavaScript API**. Do not enable Places API, Routes API, Geocoding API, or server APIs on this key. Set `VITE_GOOGLE_MAPS_BROWSER_API_KEY` in the frontend/runtime environment. Keep `GOOGLE_MAPS_API_KEY` server-side with IP/service restrictions and Places API only.

Google Maps platform attribution is rendered by the Maps JavaScript API. Imported source attribution remains visible in trail details. Administrators must confirm source licensing and retention rights before import.
