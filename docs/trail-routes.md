# Trail maps and route verification

Google Places remains the discovery provider. Its place coordinate is shown as a destination only and is never converted into route geometry. `trail-routes.json` is a separate, persistent local store created under `POCKET_PT_DATA_DIR`; migration `001-create-trail-routes.json` documents its initial schema.

Route imports support GPX, GeoJSON LineString, manually supplied ordered coordinates, OpenStreetMap-derived geometry, and municipal GIS exports. Every saved route requires a source identifier. Import tooling runs only in the admin workflow, so normal page rendering never contacts Overpass or another geometry provider. The three initial verification targets—Northaven Trail, Vitruvian Trail, and Brookhaven College Jogging Trail—are suggestions in the admin UI, not seeded or claimed routes.

## Google Cloud browser key

Create a new key, separate from `GOOGLE_MAPS_API_KEY`. Under **Application restrictions**, choose **Websites** and add the exact production origins as HTTP referrers (for example `https://mufasafitsite.onrender.com/*`), plus explicitly approved preview and local origins such as `http://localhost:3000/*`. Do not use wildcards broader than the owned hostnames. Under **API restrictions**, choose **Restrict key** and select only **Maps JavaScript API**. Do not enable Places API, Routes API, Geocoding API, or server APIs on this key. Set `VITE_GOOGLE_MAPS_BROWSER_API_KEY` in the frontend/runtime environment. Keep `GOOGLE_MAPS_API_KEY` server-side with IP/service restrictions and Places API only.

Google Maps platform attribution is rendered by the Maps JavaScript API. Imported source attribution remains visible in trail details. Administrators must confirm source licensing and retention rights before import.
