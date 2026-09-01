# Movement Capture First-Failure Diagnostics v1

## Purpose

The Movement Lego Recorder, paired FRONT/SIDE roadmap, custom movement studio, and pose-checkpoint flow must be debuggable as a pipeline rather than as a black box.

The diagnostic rule is: **show the earliest expected failed stage, not the loudest downstream symptom.**

## Canonical pipeline

`trainer host -> recorder module/UI -> roadmap module/UI -> capture studio module/UI -> canonical PoseRuntime -> pose-runtime:frame -> recording -> frames -> local evidence -> captureView -> pose checkpoints`

The debug runtime does not own a camera, detector, pose loop, exercise classifier, or persistence service.

## Runtime surface

`public/motion/movement-capture-debug.js` installs a `Movement Capture Debug · First-Failure Trace` panel in the private trainer capture surface and exposes:

- `window.__movementCaptureDebugState`
- `window.__movementCaptureDebugSnapshot`
- `window.__runMovementCaptureDebug()`
- `window.PocketPTMovementCaptureDebug`

The panel reports each stage as pass/fail/waiting and highlights `FIRST FAILURE` when an expected stage breaks.

Capture-dependent stages remain `waiting` before the trainer presses Record. Save-dependent stages remain `waiting` before Save Local Evidence. This prevents an idle system from being falsely reported as broken.

## Existing diagnostics integration

When the canonical `diagnostics-client.js` collector is present, the motion debug runtime wraps `window.__collectDiagnosticReport()` and adds a `movementCapture` section. Script-load failures also call the existing throttled `__diagnosticAutoReport` hook when available.

No raw camera image/video is added to diagnostic reports.

## Failure order

1. trainer host
2. recorder module
3. recorder UI
4. roadmap module
5. roadmap UI
6. capture studio module
7. capture studio UI
8. canonical PoseRuntime
9. canonical pose frame after recording is attempted
10. recorder entered recording / has a completed recording
11. frames captured
12. local evidence saved
13. FRONT/SIDE `captureView` attached
14. skeleton pose checkpoints generated

The first broken expected stage is the place to investigate before debugging later stages.

## Manual debugging workflow

1. Enable/open trainer diagnostics and the Movement Capture Debug panel.
2. Press `Run Motion Debug Check` before recording; boot/UI stages should pass while capture/save stages remain waiting.
3. Press Record. If no frames arrive, inspect the first failed stage instead of the checkpoint code.
4. Save evidence. If tagging or checkpoints fail, the trace should identify the earliest post-save boundary.
5. Use `Copy Debug Snapshot` to capture a JSON report for a reviewer.

## Boundary

This panel diagnoses movement capture infrastructure. It does not claim biomechanical correctness, validate milestone heuristics, or prove that paired 2D views are true 3D reconstruction.
