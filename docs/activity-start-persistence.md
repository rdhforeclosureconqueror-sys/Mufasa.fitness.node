# Activity start persistence

`POST /api/me/greatness/activities/start-with-route` is the authoritative start boundary. It authenticates the member, validates the activity type, goal, and selected route, and persists a new `in_progress` activity before the browser opens Live Activity.

The browser supplies a fresh `clientSessionId` for each intentional start. That value is the existing idempotency key: retrying the same start operation returns the first activity, while a later intentional run receives a new client session ID and therefore a new activity ID, even when it uses the same member and route.

The persisted start record owns the selected route and is completed in place by `POST /api/me/greatness/activities`. Activity and route reads remain scoped to the authenticated owner. Safe browser failure diagnostics report only the stage, HTTP status/error classification, boolean identifier presence, and final status; they do not include tokens or coordinates.

## Confirmed follow-up (not part of this fix)

The **Change Starting Point** button currently does nothing useful. Treat that as a separate product bug; this activity-start correction intentionally does not change its handler or any map, route-generation, Google Places, or Google Maps key behavior.
