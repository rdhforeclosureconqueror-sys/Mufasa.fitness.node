# Phase 14 Live Workout Runtime Activation Audit

## Trace Summary

- **Start Workout button:** `#startBtn` in `public/index.html`; bound through `RuntimeOrchestrator.configureButtonRuntime()` to the inline `startWorkout()` delegator, which calls `WorkoutRuntime.startWorkout()`.
- **Session creation:** `WorkoutRuntime.startWorkout()` calls the configured `createSession()` dependency. The primary app wiring uses `SessionWrite.startSession()` and authenticated `POST /api/sessions`; `app-runtime` also preserves a backend-origin fallback session creator for late activation.
- **Backend origin:** Runtime config sets `https://mufasa-fitness-node.onrender.com` as `backendOrigin`; session-write clients use that `baseUrl`, not the frontend origin.
- **Bearer auth:** `session-write.js` attaches `authorization: Bearer <token>` for authenticated session writes.
- **Start stop point found:** the detector guard could return a stale/null detector instead of trying to initialize and then displaying a precise runtime failure. Phase 14 now initializes the detector on start and normalizes failures to `Pose detection unavailable. Check model/runtime load.`
- **No assigned program:** `workout-progression-runtime.js` already provides `Live Bodyweight Squat` via `createDefaultLiveWorkoutSelection()` and `hydrateActiveWorkoutPlan({ allowDefault: true })`; Phase 14 tests pin that fallback.
- **Expand Camera:** clicking without a camera stream now shows `Connect camera first.`; after camera connection it toggles the camera fullscreen class through the existing runtime.
- **Overhead Squat Assessment:** `#ohsaBtn` delegates to `AssessmentRuntime.startOhsa()`, which uses the same detector init path and now gets full-body guidance through the configured `analyzeSquatForm` wrapper.
- **TensorFlow / pose runtime:** required scripts remain lazy-loaded by `RuntimeState.__ensurePoseRuntime()` from jsDelivr for TensorFlow.js and `@tensorflow-models/pose-detection`; missing script/global failures are surfaced through the normalized pose-unavailable message.
- **Rep tracking:** Bodyweight squat rep tracking exists in `rep-analysis-runtime.js`: full-body keypoints, depth thresholds, and up/down phase transitions increment `repCount`, then call the workout progression and session-write rep update path.
- **Wake words:** Web Speech recognition is separate from TTS audio unlock. Recognition listens for `Mufasa` and `Coach`, including `Hey Coach`; unsupported browsers now get the iPhone/Safari Web Speech limitation message.
- **Coach chat:** The chat endpoint is external MufasaBrain `/ask`. The 422 root cause was likely payload shape: the browser sent object `context`, while the Node proxy shape uses stringified `context`, `session_id`, `telemetry`, and `mode`. Phase 14 now sends the canonical shape while keeping old aliases.

## Deferred

- No new TensorFlow/model assets were vendored; runtime still depends on existing lazy CDN script loading.
- Avatar/3D remains disabled unless the existing feature flag enables it.
- External MufasaBrain availability remains outside this frontend fix; validation errors are still logged and surfaced rather than hidden.
