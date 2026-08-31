# PocketPT ↔ Godot Phase 1B — PocketPT Side Ready

Baseline main SHA: `446431f667b04bf66d65d5c30959153b481baa89`.

This phase closes the remaining PocketPT-side launch gap for the first Push-Up Arena bridge proof.

## PocketPT-side flow

1. Member signs into canonical PocketPT.
2. Member opens the canonical Push-Up Challenge page.
3. `public/world-bridge-launch.js` installs **Enter Unleash the Beast** without requiring camera activation or challenge start.
4. The helper waits for canonical `AuthStateRuntime` readiness and calls `POST /api/game/sessions` with the existing PocketPT bearer.
5. The server creates an experience-bound, one-time launch ticket for `PUSH_UP_ARENA` / `push_up`.
6. The browser navigates to backend `/arena/push-up#ticket=...`.
7. The arena obtains server-owned public config from `GET /api/game/config`, including the canonical PocketPT frontend return URL.
8. The arena exchanges the fragment ticket for an HttpOnly arena cookie.
9. The fragment is removed from browser history.
10. The arena obtains the minimal authenticated `PocketPTWorldProtocol v1` bootstrap.
11. The arena checks `GET /api/game/build`.
12. If the Godot export exists, the shell loads `/game/push-up-arena/index.html`.
13. Exit/failed-build return paths go to the canonical PocketPT frontend rather than the backend-hosted static copy.

## Security boundary

- No second login.
- No password sent to Godot.
- No canonical bearer in a URL.
- Launch ticket remains one-time and short-lived.
- Arena credential remains a separate HttpOnly session.
- No intake/health payload in bootstrap.
- Return URL is owned by backend configuration (`FRONTEND_PUBLIC_URL`), not a user-controlled query parameter.
- Godot generated artifacts remain public static code/assets and must contain no member data or secrets.

## PocketPT-owned endpoints available to Godot integration

- `GET /api/game/config` — protocol/experience metadata plus canonical PocketPT return URL; no member data.
- `GET /api/game/bootstrap` — authenticated member + experience bootstrap through arena cookie.
- `GET /api/game/build` — build readiness and expected Godot entry path.
- `DELETE /api/game/session` — explicit arena-session revocation.

## What remains outside PocketPT

The only required product dependency for the Phase 1 acceptance proof is now the Godot-side Web artifact/client:

1. Implement `PocketPTGameClient.initialize()` in Godot Web.
2. Call same-origin `GET /api/game/bootstrap`.
3. Prove the correct member identity, `PUSH_UP_ARENA`, and `push_up` in the Godot scene.
4. Export Godot Web into `public/game/push-up-arena/` with `index.html` as the entry file.
5. Perform browser E2E proof and physical iPhone proof.

Avatar delivery, arena challenge state, verified attempts, movement recording, champion ghost, and live multiplayer remain later phases by design.

## Server composition note

Production currently starts `world-bridge-server.js`, which creates the canonical app and mounts the bounded world bridge. This is sufficient for the first world connection and keeps the bridge isolated. Before the world bridge becomes a broader long-lived subsystem, move bridge construction into canonical `createApp()` so logout-driven arena revocation and future avatar/challenge services share one server assembly path. That cleanup is architectural debt, not a blocker for the Phase 1 Godot bootstrap proof.
