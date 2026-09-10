# Push-Up Arena debug + camera consolidation repair

Branch: `fix/arena-debug-camera-consolidation-20260910`
Base: `6140f06d`

## Acceptance target

- `/arena/push-up` exposes one consolidated debug authority with Copy All, close, and earliest-first failure reporting.
- Existing Arena diagnostic producers remain intact but do not create competing visible panels.
- Camera setup remains available when the Godot build negotiates only legacy READY.
- Camera permission, stream, MoveNet detector, and body visibility report their actual runtime state once camera setup is explicitly started.
- Godot reporter/control-channel gaps remain visible as separate boundaries and are not misreported as camera deletion.

## First failure found

Current Arena HTML still owns the legacy `bridgeDebugToggle` / `bridgeDebugBoard` UI directly, while the newer Mirror Debug Center only discovers mirror-motion diagnostic surfaces. The Arena therefore bypasses the single-authority consolidation contract.

## Safety boundary

Do not modify or restore `public/game/push-up-arena/index.html` or `index.pck` in this repair. The new Godot export remains protected separately until the PocketPT baseline is repaired and camera behavior is verified.
