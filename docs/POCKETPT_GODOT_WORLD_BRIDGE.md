# PocketPT ↔ Godot World Bridge

Status: Phase 1 architecture + PocketPT bridge implementation. Do not merge without human and architecture review.

## Audited baseline

The bridge was designed against `main` SHA `cdc1ea4549d08b1972986551a87a7ced4358601d`.

PocketPT remains authoritative for authentication, member identity, avatar identity/assets, fitness rules, MoveNet/body intelligence, verified challenge attempts, personal bests, leaderboards, history, rewards, and persisted movement recordings. Godot is a presentation/world runtime only.

## Reconnaissance findings

### Authentication

Canonical browser auth is owned by `public/auth-state-runtime.js` and `window.APP_AUTH`. The canonical bearer credential is restored/validated against `/api/auth/me`. Server requests are authenticated by the existing `authContext` middleware in `src/middleware/auth.js`, which verifies the bearer and populates `req.auth.userId` and related claims. The world bridge does not create a second user system and never asks Godot for a password.

### Push-Up Challenge

`public/push-up-challenge.html` and its existing challenge/pose runtimes own camera setup, MoveNet, tracking, normalized landmark collection, repetition semantics, and Practice-vs-Challenge UX. The page explicitly does not persist raw video. Server-side challenge persistence is already owned by the existing push-up challenge service and routes (`/api/me/challenges/pushup`, `/api/challenges/pushup/results`, `/api/challenges/pushup/leaderboard`). The bridge does not duplicate those rules.

### Avatar

The existing member profile owns avatar metadata. Uploaded GLBs live under the existing avatar upload boundary and owner-gated `/api/me/avatar/assets/:assetId` delivery. Phase 1 intentionally returns `avatar: null`. Phase 2 will add an arena-scoped asset delivery mechanism; Godot must not receive the member's canonical bearer solely to download a GLB.

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

The Godot project/build is not present in the PocketPT repository at the audited SHA, so actual Godot Web runtime proof is a separate artifact-delivery step.

## Godot export/deployment contract

Godot-side build automation should replace the contents of `public/game/push-up-arena/` with generated Web export artifacts and include a small version manifest (recommended `pocketpt-world-build.json`) containing protocol version, build ID, Godot version, commit/source ID, and generated timestamp.

Do not place member data, canonical auth tokens, environment secrets, or API secrets inside generated artifacts.

Measure generated `index.html`, JS, WASM, PCK/assets, total transfer size, cold load, and runtime memory on representative desktop and physical iPhone hardware before declaring mobile acceptance.

If the chosen Godot Web export requires cross-origin isolation/threaded WebAssembly, deployment headers must be evaluated before enabling it. Prefer the smallest viable first export and do not add isolation headers globally to PocketPT without a compatibility audit.

## Arena launch UI

`/arena/push-up` is a dedicated immersive shell, not a small dashboard rectangle. It does not request camera permission or begin a challenge automatically. It exchanges the launch ticket, proves bootstrap identity, checks Godot build availability, then loads `/game/push-up-arena/index.html` full-stage when present. If the build is missing it shows the authenticated bootstrap proof and a clear return path.

Exit returns to `/push-up-challenge.html`.

## Phase 2 — avatar identity bridge

Add only:

- canonical avatar ID/profile version,
- arena-authorized temporary asset URL or arena-scoped asset endpoint,
- fallback avatar contract,
- asset version/cache behavior,
- owner-isolation tests.

Do not implement retargeting in this phase.

Suggested protocol addition:

```json
"avatar": {
  "avatarId": "canonical-avatar-id",
  "assetUrl": "/api/game/avatar/asset",
  "profileVersion": 1
}
```

The arena endpoint resolves the authenticated arena session to the canonical member and serves/redirects only that member's authorized asset.

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

`node --test test/world-bridge.test.js`

Coverage includes one-time ticket use, member binding, expiration/fail-closed behavior, minimum bootstrap fields, exclusion of canonical credential metadata/sensitive fields, fixed experience/challenge scope, and independent user sessions.

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

## Phase 1 remaining integration task

The PocketPT-side bridge is ready for the Godot-side workstream to provide an actual Web export at `/game/push-up-arena/index.html` and implement `PocketPTGameClient.initialize()` against `/api/game/bootstrap`. The frontend Push-Up Challenge must then wire its `ENTER UNLEASH THE BEAST` action to `POST /api/game/sessions` using `AuthStateRuntime`/canonical API origin and navigate to the returned `launchUrl`.

Do not mark Godot Web load, browser end-to-end, or physical-iPhone proof complete until those are executed on the real deployed branch/build.
