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

## Repair in this PR
- Added `arena-debug-consolidation.js`, which consumes the existing Arena diagnostic board as an evidence producer while suppressing its competing launcher/panel.
- Added one Arena Debug Center with Copy All, close, live refresh, and earliest-first failure extraction.
- Added an explicit loader/entry chain for the Arena adapter.
- Added regression coverage that protects the existing camera permission, stream, MoveNet detector, body-visibility plumbing.

## Remaining integration gate before merge
The Arena HTML must load `/arena-push-up-debug-entry.js` after the legacy Arena diagnostics producer. Until that one-line page wiring is present and browser-tested, this PR is intentionally draft and must not be merged.

## Safety boundary
Do not modify or restore `public/game/push-up-arena/index.html` or `index.pck` in this repair. The new Godot export remains protected separately until the PocketPT baseline is repaired and camera behavior is verified.
