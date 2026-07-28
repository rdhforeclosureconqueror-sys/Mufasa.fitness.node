# Stepping Into Greatness — Phase 1

## Repository integration

This phase extends the existing single-process Express/CommonJS application and JSON user aggregate. It does not introduce a second database or framework. Authenticated `/api/me/greatness/*` routes derive ownership only from the verified bearer identity. The plain browser ES module wraps `navigator.geolocation`; the domain GPS engine remains testable without a browser.

## Units, lifecycle, and trust

Distance is always stored in meters and duration in milliseconds. Browser sessions proceed through `idle`, `requesting_permission`, `ready`, `active`, `paused`, `finishing`, and a terminal state. GPS starts only after the deliberate `start()` call and permission result. Finish and cancel stop the watch. Pause resets the coordinate baseline, so resumed tracking never bridges the gap.

Samples with invalid coordinates, stale/duplicate timestamps, poor accuracy, impossible speed, or isolated jumps are rejected with a reason. Small segments are treated as drift. Thresholds are centralized in `src/stepping/domain.js`. Browser GPS does not create step counts. Manual/provider imports and step challenges are extension boundaries, not active integrations.

Completed uploads are idempotent when callers provide `clientSessionId`. Active state and sample batching should be kept in IndexedDB by a future application shell; this repository's current first slice provides the engine and API but not that UI orchestration. A browser cannot promise tracking while suspended or closed.

## Privacy and security

Raw routes are private by default and are never placed in feed summaries. Community events exist only for active, opted-in members and omit exact time and coordinates; hidden pace is omitted. Route reads are user-scoped. Invalid/questionable activity is excluded from verified personal records, badges, rankings, and challenges. Browser-submitted step counts are rejected. Server code alone creates records, awards, contributions, and events.

## API

* `POST /api/me/greatness/membership` — join The Greatness Movement.
* `DELETE /api/me/greatness/membership` — leave without deleting Your Greatness Journey.
* `POST /api/me/greatness/activities` — finalize a recorded GPS session.
* `GET /api/me/greatness/journey` — history, lifetime distance, personal records, and Greatness Marks.
* `GET /api/me/greatness/movement-feed` — privacy-safe community events.
* `GET /api/me/greatness/activities/:activityId/route` — owner-only route metadata.

No migration command is needed: `userStore` adds `steppingIntoGreatness` lazily to the existing user JSON aggregate. Start with `npm start`; run focused tests with `node --test test/stepping-into-greatness.test.js`.

## Deferred boundaries

`ProviderAdapterRegistry` accepts future Apple Health/native iOS, Health Connect/native Android, Fitbit/Google, Garmin, and Strava adapters. `ActivityDeduplicationService` prioritizes provider record IDs and flags fuzzy candidates for review rather than deleting them. Crews, route definitions, wearable steps, background native GPS, live location, messages, comments, and public route discovery remain unavailable. Future step badge definitions are explicitly disabled.
