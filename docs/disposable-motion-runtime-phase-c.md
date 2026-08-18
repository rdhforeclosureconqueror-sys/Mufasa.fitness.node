# Phase C — disposable 3D runtime session

## Architecture and local dependencies

The only approved chain is `exercise-library -> MotionViewerBoundary -> lazy motion-viewer.js -> shared3d-loader -> DisposableMotionSession -> Three.js/WebGL`. Core renders the exercise image, instructions, and navigation first. The boundary requests the viewer only after the server-controlled flag and user action; no auth, dashboard, workout, application boot, or root route imports the viewer or Three.js.

`shared3d-loader.js` imports the project-vendored `/vendor/three/build/three.module.js` (Three.js r158, matching pinned npm package 0.158.0). GLTFLoader and decoders are deliberately not acquired because Phase C loads no assets. Runtime availability therefore requires no CDN or other remote network service. A loader call keeps no rejected promise: retries make a new import attempt. Browsers may cache the module record after successful evaluation (and engines control failed module-specifier caching), while the boundary's fresh script URL and lack of an application-level rejected promise keep failure local.

## Lifecycle and ownership contract

`createMotionSession(options)` returns a session in `created`. `start(container)` probes WebGL and required APIs, advances through `initializing` to `running`, creates one renderer/canvas, scene, perspective camera, cube geometry/material, and exactly one RAF chain. Invalid starts return a normalized failure rather than revive a disposed session. Failure advances through `failed`; `dispose()` advances through `disposing` to `disposed`. Abort during dependency loading invalidates late completion. Disposal before, during, or after start is idempotent.

The session owns its `AbortController`, renderer, renderer canvas, RAF ID, scene, camera, mesh/GPU resources, and named resize, visibility, pagehide, context-loss, and context-restored handlers. It tracks and clears its timer set (currently empty) and removes every owned listener. Disposal cancels RAF, aborts async work, traverses and disposes geometry/material/texture values, disposes render lists and renderer, requests context release, detaches the canvas, and releases references. Nothing is placed on `window` except immutable module exports required by the existing classic-script lazy loading convention; there is no mutable Three, renderer, scene, or session global.

Normalized codes are `unsupported`, `required_api_unavailable`, `dependency_load_failed`, `renderer_init_failed`, `context_lost`, `session_aborted`, and `runtime_failed`. The boundary continues to own its existing `LOAD_TIMEOUT`/timed-out result. Exceptions are reduced to these local codes before the boundary is notified.

## Browser lifecycle and conservative defaults

Canvas CSS dimensions are bounded to 1280 by 720 and renderer DPR is capped at 1.5. Resize updates renderer size, camera aspect, and projection. Rendering pauses while the document is hidden and resumes with one RAF when visible. `pagehide` disposes the session. Context loss is terminal for the Phase C session: default browser handling is prevented, RAF and resources are stopped/disposed, and the boundary shows fallback; a retry creates an independent context. The restored listener exists only to make ownership explicit and does not revive the disposed session. There is no FPS cap: the single RAF uses display cadence, with low scene complexity, disabled antialiasing, bounded resolution, and hidden-page suspension.

## Legacy review

The safe ideas retained from `public/avatar-runtime.js` are the project-controlled r158 module path, lazy import timing, and local GLTFLoader path knowledge for a future phase. Only the Three module path is used now. It is isolated in `shared3d-loader.js`, loaded per session without a cached promise, and never publishes Three itself. The legacy global bridges (`__AVATAR_THREE`, runtime status globals), permanent module promise, event broadcasts, avatar/model boot, GLB probing, pose subscriptions, and legacy render lifecycle were intentionally not reused or reconnected.

The deterministic lifecycle suite injects dependency, capability, renderer, runtime, context-loss, and initialization-unmount failures and runs 40 complete cycles. Its final expected counters are zero active sessions, RAF owners, listeners, timers, and canvases.
