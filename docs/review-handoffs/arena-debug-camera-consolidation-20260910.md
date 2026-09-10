# Push-Up Arena debug + camera consolidation repair

Branch: `fix/arena-debug-camera-consolidation-20260910`
Base: `6140f06d`

## Acceptance target
- `/arena/push-up` exposes one consolidated debug authority with Copy All, close, and earliest-first failure reporting.
- Existing Arena diagnostic producers remain intact but do not create competing visible panels.
- Camera setup remains available when the Godot build negotiates only legacy READY.
- Camera permission, stream, MoveNet detector, and body visibility report actual runtime state once camera setup is explicitly started.
- Godot reporter/control-channel gaps remain separate boundaries and are not misreported as camera deletion.

## First failure found
Current Arena HTML still owns the legacy `bridgeDebugToggle` / `bridgeDebugBoard` UI directly, while the newer Mirror Debug Center only discovers mirror-motion diagnostic surfaces. The Arena therefore bypasses the single-authority consolidation contract.

## Repair staged in this draft
- `arena-debug-consolidation.js` consumes the existing Arena diagnostic board as an evidence producer while suppressing its competing launcher/panel.
- One Arena Debug Center provides Copy All, close, live refresh, and earliest-first failure extraction.
- Explicit loader/entry files are present for page integration.
- Regression coverage protects the existing camera permission, stream, MoveNet detector, and body-visibility plumbing.

## FIRST FAILURE / merge gate
`ARENA_DEBUG_ENTRY_NOT_WIRED`: `public/arena-push-up.html` does not yet load `/arena-push-up-debug-entry.js`. The adapter is therefore not active in the browser yet. This PR is intentionally draft and MUST NOT be merged until that page wiring is added and browser-tested.

## Safety boundary
Do not modify or restore `public/game/push-up-arena/index.html` or `index.pck` in this repair. The new Godot export remains protected separately until the PocketPT baseline is repaired and camera behavior is verified.

## Browser acceptance after wiring
1. Open signed-in Push-Up Challenge and enter Arena.
2. Confirm only one debug launcher is visible.
3. Open it, verify Copy All + close + FIRST FAILURE.
4. In legacy READY mode choose Check my camera, then Enable camera.
5. Verify CAMERA_PERMISSION -> CAMERA_STREAM -> BODY_DETECTOR -> BODY_VISIBILITY advance from observed runtime evidence.

Status: DRAFT — adapter implemented; page wiring intentionally remains the first failing boundary.
