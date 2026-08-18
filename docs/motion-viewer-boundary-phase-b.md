# Phase B — fail-safe Motion Viewer boundary

## Integration seam and dependency direction

The optional boundary is attached only to exercise cards in the existing Exercise Library. This is the smallest canonical exercise rendering seam that already has a catalog ID, image, instructions, and a route into a workout. Those existing elements are rendered first and remain authoritative. Authentication, dashboard, program, coaching, and workout boot modules do not know about the boundary. The library statically loads only the small contract and boundary; the proof viewer is requested by the boundary only after the server flag is enabled **and** the user selects **View 3D Motion**.

The allowed direction is `exercise-library -> MotionViewerBoundary -> lazy viewer implementation`. `fake-motion-viewer.js` is a no-renderer contract proof and does not use the legacy avatar runtime, Three.js, WebGL, or model assets.

## Contract and failure ownership

The only descriptor field is the canonical `exerciseId`. States are `disabled`, `idle`, `loading`, `ready`, `unavailable`, `timed_out`, and `failed`. The boundary validates implementation/session shape and the ready result. Import rejection, initialization exceptions, malformed results, and reported runtime failures become a local **Motion viewer unavailable** state. The message and retry control are created by PocketPT's boundary, never by the optional bundle. Static images, instructions, workout selection, and navigation remain outside that region.

Each attempt gets a new `AbortController`, import URL attempt token, timeout, and viewer session. The default timeout is 8 seconds: long enough for an optional chunk on a slow mobile connection while remaining bounded and much shorter than a stalled interaction. Retry disposes and aborts the prior attempt and uses a fresh URL so a rejected script request is not reused. Unmount, route-driven re-render, retry, timeout, and runtime failure clear the timer, abort work, dispose the session, and invalidate late promise completion.

Diagnostics have only `stage`, `status`, `elapsedMs`, `exerciseId`, and `failureCode`; they contain no identity, credential, model, file, or camera data. Phase B defines an event callback but does not install an analytics system.

## Feature flag and rollback

`MOTION_3D_PRODUCTION` is enforced by `/api/browser-config`, defaults to false, and is true only for the exact case-insensitive value `true`. When false, the library never creates a boundary and never requests the fake/future implementation. The configuration response is fetched after normal exercise rendering and cannot block the catalog.

Rollback requires no database or schema change: set `MOTION_3D_PRODUCTION=false` (or remove it) and restart/redeploy the service. The no-store browser-config response makes the kill switch effective on refresh; static exercise content immediately remains as the only experience. No assets or code need removal.

## Dependency-edge protection

`test/motion-viewer-boundary.test.js` rejects implementation imports from server, auth, dashboard, workout, and application boot paths, and rejects an eager implementation script in the Exercise Library HTML. Focused tests inject success, rejection, initialization failure, never-resolution, runtime failure, malformed state, unmount, repeated lifecycle, and retry implementations without public failure controls.
