# Phase 12 — Primary Button Wiring and Frontend Boot Error Fix

## Scope
Fixed the smallest frontend boot and primary-control blockers found in the active public shell/runtime path. No backend auth, payment, data, avatar/3D reactivation, or trainer v1.5 work was changed.

## Files changed
- `public/index.html` — added a local `toSafeUserId` fallback helper before `AppHydrationRuntime.configure(...)` passes it as a dependency.
- `public/app-runtime.js` — added focused authenticated primary-button gating, camera-support detection, disabled-state explanations, and feature-panel reason lines.
- `test/runtime-url-cleanup.test.js` — added focused regressions for the `toSafeUserId` boot guard, primary button state explanations, and dashboard/library destinations.
- `reports/phase-12-primary-button-wiring.md` — this summary.

## Missing-variable errors found/fixed
- `toSafeUserId` was referenced as an object-shorthand dependency in the inline app hydration config without being defined in the active shell. This could stop the inline boot script before start/fullscreen/OHSA/voice bindings completed. Fixed by defining and exposing a minimal local helper.
- `calendarApplyBtn` was already guarded through `getCalendarApplyButton()` and remains optional. Existing tests cover this guard.

## Primary button behavior before/after
- Connect Camera: before, boot errors could prevent reliable activation. After, authenticated users keep the camera button enabled when `navigator.mediaDevices.getUserMedia` exists; otherwise the button is disabled with a clear browser-support reason.
- Start Workout: before, disabled without a visible reason during pilot activation. After, it remains disabled before camera connect with the title/panel reason: connect camera first and choose a workout/library path if no program is ready. WorkoutRuntime still enables it after camera activation.
- Expand Camera: before, the binding could be skipped by the boot error and the disabled state had no clear reason. After, the button gets its normal runtime binding and remains disabled until camera connect with a visible reason.
- Overhead Squat Assessment: before, the binding could be skipped by the boot error and the disabled state had no clear reason. After, the button gets its normal runtime binding and remains disabled until camera connect with a visible reason.
- My Dashboard: remains enabled for authenticated users and routes to `/dashboard.html`.
- Exercise Library: remains enabled for authenticated users and routes to `/exercise-library.html`.

## Camera behavior before/after
- Before: the `toSafeUserId` ReferenceError could stop the inline boot sequence before all handlers finished, making camera/workout activation unreliable even though the lower WorkoutRuntime path requested `getUserMedia` correctly.
- After: the boot sequence can pass through hydration config, camera support is checked from `navigator.mediaDevices.getUserMedia`, and the existing Connect Camera click path delegates to `WorkoutRuntime.connectCamera()`, which calls `getUserMedia({ video: true, audio: false })`, attaches the stream to `#video`, and surfaces permission/support errors through visible status text.

## Intentionally disabled buttons
- Start Workout: disabled until camera is connected; workout/session start still validates detector readiness and workout hydration instead of faking onboarding/program data.
- Expand Camera: disabled until camera is connected.
- Overhead Squat Assessment: disabled until camera is connected because it is camera-based.

## Deferred
- Voice/TTS: only inspected; `/api/speak` origin is still configured from `RuntimeState`/Node backend. Backend/browser/upstream failures remain deferred.
- Chat 422: only inspected; coach runtime logs the exact `/ask` payload and validation response. No safe trivial frontend payload fix was proven, so this remains deferred.
- Real onboarding/retention/program data: not faked; incomplete real data remains a product/data flow item.
- Avatar/3D: not re-enabled or modified.

## Risks
- Primary-button state is now more explicit in `app-runtime.js`. If another runtime force-enables camera-dependent buttons before camera activation, `app-runtime` may re-apply the safer disabled state on auth/load events.
- The `toSafeUserId` helper normalizes IDs for fallback/local use only; backend IDs from authenticated profile data continue to take precedence.

## Rollback notes
- Revert the changes in `public/index.html`, `public/app-runtime.js`, and `test/runtime-url-cleanup.test.js` to return to the prior Phase 11 behavior.

## Approval readiness
Phase 12 is ready for human approval after the required test/check commands pass.
