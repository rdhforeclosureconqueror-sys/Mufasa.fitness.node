# PocketPT ↔ Godot World Bridge

Status: Phase 1 bridge plus the PocketPT-side Phase 2 avatar identity implementation. The Godot avatar loader, regenerated export, and device acceptance are still pending. Do not merge without independent architecture review.

## Audited baseline

The bridge was designed against `main` SHA `cdc1ea4549d08b1972986551a87a7ced4358601d`.

Phase 2 was audited against PocketPT `main` SHA `172b3ee04a81cd5040a6405727ee2e556c6b4760` and Godot `main` SHA `a55b495b996999974f4543bed51b1d7462112a6d`.

Before review, the implementation branch was updated to PocketPT main `35bd3c11979e7651f428dd46ed97a84b4fc760e9`. The incoming changes only touched trial routing and its test; there were no overlapping Phase 2 changes.

PocketPT remains authoritative for authentication, member identity, avatar identity/assets, fitness rules, MoveNet/body intelligence, verified challenge attempts, personal bests, leaderboards, history, rewards, and persisted movement recordings. Godot is a presentation/world runtime only.

## Reconnaissance findings

### Authentication

Canonical browser auth is owned by `public/auth-state-runtime.js` and `window.APP_AUTH`. The canonical bearer credential is restored/validated against `/api/auth/me`. Server requests are authenticated by the existing `authContext` middleware in `src/middleware/auth.js`, which verifies the bearer and populates `req.auth.userId` and related claims. The world bridge does not create a second user system and never asks Godot for a password.

### Push-Up Challenge

`public/push-up-challenge.html` and its existing challenge/pose runtimes own camera setup, MoveNet, tracking, normalized landmark collection, repetition semantics, and Practice-vs-Challenge UX. The page explicitly does not persist raw video. Server-side challenge persistence is already owned by the existing push-up challenge service and routes (`/api/me/challenges/pushup`, `/api/challenges/pushup/results`, `/api/challenges/pushup/leaderboard`). The bridge does not duplicate those rules.

### Avatar

The existing member profile owns avatar metadata. Uploaded GLBs live under the existing avatar upload boundary and owner-gated `/api/me/avatar/assets/:assetId` delivery. Phase 2 now reads that same selection and ownership check through `app.locals.pocketPTAvatarAssets`, supplies a minimum avatar descriptor in bootstrap, and serves its GLB through `/api/game/avatar/asset`. Godot uses the existing arena cookie; it does not receive the canonical PocketPT bearer.

### Deployment/static hosting

Render currently deploys two services: a static frontend (`mufasafitsite`) and a Node backend (`mufasa-fitness-node`). The backend already serves `public/` with Express static hosting. Therefore generated Godot Web output is assigned the isolated backend path:

`public/game/push-up-arena/`

Expected generated entry file:

`public/game/push-up-arena/index.html`

The bridge deliberately does not hand-edit generated Godot export files. `GET /api/game/build` reports whether the expected entry exists. Missing artifacts fail with a visible arena fallback rather than a blank frame.

## PocketPTWorldProtocol v1

Protocol version: `1`.

Domains and owners:

- IDENTITY: PocketPT.
- AVATAR: PocketPT canonical profile/assets; protocol exposes minimum game-safe identity.
- EXPERIENCE: PocketPT allowlist + protocol contract; Godot presents it.
- CHALLENGE: PocketPT.
- ATTEMPT: PocketPT.
- MOVEMENT: PocketPT canonical normalized representation; target-specific Godot adapter later.
- LEADERBOARD: PocketPT.
- PRESENCE: future protocol domain; no Phase 1 implementation.

Phase 1 bootstrap shape:

```json
{
  "protocolVersion": 1,
  "session": {
    "id": "non-secret-session-id",
    "expiresAt": "ISO-8601"
  },
  "member": {
    "id": "canonical-pocketpt-member-id",
    "displayName": "minimum-display-name"
  },
  "avatar": null,
  "experience": {
    "type": "PUSH_UP_ARENA",
    "challengeId": "push_up"
  },
  "api": {
    "baseUrl": "/api/game"
  }
}
```

No health/intake payload belongs in this bootstrap.

## Auth/session lifecycle

Because production frontend and backend are separate Render services, Phase 1 avoids relying on a third-party cookie being set during the frontend API request.

1. Authenticated PocketPT frontend waits for canonical auth readiness.
2. Frontend calls `POST /api/game/sessions` on the Node backend with the existing canonical bearer.
3. Server validates the authenticated member and the fixed Phase 1 experience (`PUSH_UP_ARENA`, `push_up`).
4. Server creates a random, short-lived, experience-bound one-time launch ticket and a non-secret session ID.
5. Response returns an arena launch URL whose ticket is in the URL **fragment**, not the query string. Fragments are not included in HTTP requests and therefore avoid normal server/access-log leakage.
6. Browser navigates to backend `/arena/push-up#ticket=...`.
7. Arena shell posts the ticket to same-origin `POST /api/game/session-exchange`.
8. Server consumes the ticket exactly once and rotates it into a different random `HttpOnly`, `SameSite=Lax`, production-`Secure` arena cookie scoped to `/api/game`.
9. Arena clears the fragment using `history.replaceState`.
10. Godot calls `GET /api/game/bootstrap`; only the arena cookie is used.
11. `DELETE /api/game/session` revokes the arena session. Sessions also expire fail-closed.

Default Phase 1 TTL: 10 minutes, configurable by `POCKET_PT_ARENA_SESSION_TTL_MS`.

The canonical PocketPT bearer is never placed in a URL and is not returned by bootstrap.

## Routes

- `POST /api/game/sessions` — canonical authenticated launch-session creation.
- `POST /api/game/session-exchange` — one-time ticket → HttpOnly arena cookie.
- `GET /api/game/bootstrap` — minimum `PocketPTWorldProtocol v1` bootstrap.
- `GET /api/game/avatar/asset?version=<profileVersion>` — current member's canonical GLB, authorized by the arena session.
- `DELETE /api/game/session` — explicit arena-session revocation.
- `GET /api/game/build` — generated Godot entry availability.
- `GET /arena/push-up` — immersive arena shell.
- `/game/push-up-arena/*` — generated Godot Web artifacts through existing Express static hosting.

Authorization details are recorded in `config/world-route-authorization-contract.js`. This is an additive bounded contract; the existing canonical route contract must remain authoritative for pre-existing systems.

## Godot-side contract

The Godot project should implement a small `PocketPTGameClient` with Phase 1 methods:

- `initialize()` → GET `/api/game/bootstrap` using browser ambient arena cookie.
- `get_current_player()` → returns `bootstrap.member`.
- `get_experience()` → returns `bootstrap.experience`.

Phase 1 diagnostic success is:

`Connected to PocketPT`

`Member: <correct member>`

`Experience: PUSH_UP_ARENA`

`Challenge: push_up`

The Phase 1 Web export is present in PocketPT at the Phase 2 audited SHA. The accessible `mufasa-world` main branch still contains a cube demo, not the working gym scenes and scripts. The working Godot source must be committed before its player loader can be integrated and a new export reviewed. See [the Phase 2 Godot handoff](review-handoffs/godot-phase2-avatar-identity-handoff.md).

## Godot export/deployment contract

Godot-side build automation should replace the contents of `public/game/push-up-arena/` with generated Web export artifacts and include a small version manifest (recommended `pocketpt-world-build.json`) containing protocol version, build ID, Godot version, commit/source ID, and generated timestamp.

Do not place member data, canonical auth tokens, environment secrets, or API secrets inside generated artifacts.

Measure generated `index.html`, JS, WASM, PCK/assets, total transfer size, cold load, and runtime memory on representative desktop and physical iPhone hardware before declaring mobile acceptance.

If the chosen Godot Web export requires cross-origin isolation/threaded WebAssembly, deployment headers must be evaluated before enabling it. Prefer the smallest viable first export and do not add isolation headers globally to PocketPT without a compatibility audit.

## Arena launch UI

`/arena/push-up` is a dedicated immersive shell, not a small dashboard rectangle. It does not request camera permission or begin a challenge automatically. It exchanges the launch ticket, proves bootstrap identity, checks Godot build availability, then loads `/game/push-up-arena/index.html` full-stage when present. If the build is missing it shows the authenticated bootstrap proof and a clear return path.

Exit returns to `/push-up-challenge.html`.

## Phase 2 — avatar identity bridge

The PocketPT implementation provides:

- canonical avatar ID/profile version,
- an arena-scoped asset endpoint,
- fallback avatar contract,
- asset version/cache behavior,
- owner-isolation tests.

Retargeting, walking, gesture controls, and push-up counting are separate work. Phase 2 does not claim that an uploaded model is already animation-compatible with the gym's player rig.

Protocol v1 keeps its existing identity/session/experience fields and populates the reserved `avatar` field. `avatarState` is an additive availability/fallback field. A Phase 2 client must handle both a descriptor and `null`:

```json
{
  "avatar": {
    "avatarId": "11111111-1111-4111-8111-111111111111",
    "assetUrl": "/api/game/avatar/asset?version=0123456789abcdef0123456789abcdef",
    "profileVersion": "0123456789abcdef0123456789abcdef",
    "format": "glb"
  },
  "avatarState": {
    "status": "AVAILABLE",
    "reason": null,
    "fallback": "DEFAULT_AVATAR"
  }
}
```

`profileVersion` is an opaque 32-character revision of the selected avatar ID, avatar update timestamp, and stored file metadata. It is not a counter, a credential, or a checksum of the GLB contents. Cache any imported scene by member ID, avatar ID, and this revision. Bootstrap and asset responses are `private, no-store`; clear any in-memory avatar cache when the arena session ends or the member changes.

The endpoint re-reads the canonical profile and rechecks existing asset ownership on every request. It does not accept a caller-selected member, asset ID, or external download URL. Relative canonical upload URLs and absolute URLs at configured PocketPT backend/frontend origins are supported; arbitrary external avatar sources are reported as unsupported and are never fetched.

| Result | Contract |
| --- | --- |
| Current uploaded avatar available | `avatarState.status: AVAILABLE`, versioned descriptor in `avatar` |
| No selected avatar | `avatar: null`, `FALLBACK`, `AVATAR_NOT_CONFIGURED` |
| Missing GLB or failed ownership check | `avatar: null`, `FALLBACK`, `AVATAR_ASSET_UNAVAILABLE` |
| External/unsupported model URL | `avatar: null`, `FALLBACK`, `AVATAR_SOURCE_UNSUPPORTED` |
| Avatar capability disabled/unavailable | `avatar: null`, `FALLBACK`, `AVATAR_FEATURE_DISABLED` / `AVATAR_BRIDGE_UNAVAILABLE` |
| No valid arena session | Asset request returns HTTP 401 `ARENA_SESSION_INVALID` |
| Avatar removed/unavailable at download | HTTP 404 `ARENA_AVATAR_UNAVAILABLE` |
| Missing/malformed revision | HTTP 400 `ARENA_AVATAR_VERSION_REQUIRED` |
| Selection changed after bootstrap | HTTP 409 `ARENA_AVATAR_VERSION_CHANGED`; re-bootstrap |
| Unexpected profile/file read failure | HTTP 503 `ARENA_AVATAR_READ_FAILED`, without internal error details |

The Godot client must label a default avatar as a fallback, not silently present it as the member's avatar. Availability in bootstrap proves only that the server can resolve an owned asset; it is not proof of a successful download, Godot import, scene attachment, or visual acceptance.

## Phase 3 — challenge data

Expose minimum server-owned arena state: challenge ID, rules version, duration, exercise ID, member personal best, current champion, and leaderboard. Do not copy browser-internal challenge JSON into the protocol.

## Phase 4 — verified attempt contract

Future `ChallengeAttempt` should be server-owned and include stable IDs/versions plus verified rep count and validation outcome. Client-reported rep count alone must never promote a champion.

## Phase 5 — movement recording contract

Persist bounded normalized pose/movement data rather than raw camera video by default. A future `MovementRecording` can contain canonical pose version, keyframes, rep/tracking events, source model/version, exercise/rules versions, and duration. Godot consumes this through a target-specific Skeleton3D adapter. This is the path to the asynchronous Champion Ghost.

## Future multiplayer boundary

Presence, matchmaking, rooms, live pose replication, spectators, lobby/social systems, chat, VR, and AR are explicitly outside Phase 1. Do not add them to the current session mechanism.

## Security requirements

- Canonical authentication remains the only account login authority.
- Launch ticket is high entropy, short-lived, experience-bound, and one-time use.
- Arena cookie is a distinct high-entropy credential, HttpOnly, production Secure, and API-path scoped.
- Bootstrap is `Cache-Control: private, no-store`.
- No canonical bearer, password, intake, health, or raw camera data in bootstrap.
- No token values should be logged.
- Expired/invalid ticket/session fails closed.
- Server remains authoritative for challenge results/leaderboards/champion promotion.
- Phase 1 session storage is process memory. Before horizontal scaling, move ephemeral sessions to a shared TTL store or guarantee sticky/single-instance routing. This is deliberately deferred rather than introducing speculative infrastructure now.
- Existing logout does not currently reach back into the additive bridge session map because bridge routes are mounted after the canonical app is constructed. The arena has explicit revocation and a short TTL. Canonical-logout-driven arena revocation should be wired when the bridge is integrated directly into the main server route assembly; do not solve it with duplicated authentication.

## Mobile considerations

Physical iPhone acceptance is required before claiming mobile readiness. Validate Safari WebAssembly/WebGL behavior, orientation and resize, safe areas, touch input, memory pressure, background/resume, full-stage presentation, build download size, and any future camera permission flow. Phase 1 does not auto-request camera access.

## Tests

`node --test test/world-bridge.test.js test/world-avatar-bridge.test.js test/member-avatar-assets.test.js test/avatar-upload-transport.test.js`

Coverage includes one-time ticket use, member binding, expiration/fail-closed behavior, minimum bootstrap fields, exclusion of canonical credential metadata/sensitive fields, fixed experience/challenge scope, independent user sessions, the production startup path, upload-to-arena byte parity, foreign-profile URL rejection, avatar replacement/removal, fallback cases, legacy ownership migration, and version/cache behavior. These are server tests, not Godot browser or physical-device acceptance.

Full repository test suite remains:

`npm test`

## Protected systems — do not modify for this workstream

- canonical auth/token format and account stores,
- existing push-up MoveNet/tracking/rep engine,
- existing challenge persistence semantics,
- canonical member profile/avatar store,
- workout generation/execution,
- nutrition,
- yoga,
- gamification/rewards,
- Motion Lab and retargeting research,
- global navigation unrelated to adding the eventual arena entry action,
- multiplayer/social systems.

## Remaining integration task

The Phase 1 launcher, bootstrap handshake, and generated Web export are already present. The next integration task is to commit the working Godot gym source, extend its existing `PocketPTGameClient` to load the Phase 2 avatar descriptor, replace the player's placeholder visual with the imported model, and regenerate the export. Follow the Phase 2 handoff and obtain independent review plus browser/device evidence before treating avatar transfer as complete.

Do not mark Godot Web load, browser end-to-end, or physical-iPhone proof complete until those are executed on the real deployed branch/build.
