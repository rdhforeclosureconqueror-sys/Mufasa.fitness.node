# PocketPT → Godot Phase 2: load the member's saved avatar

## Goal and current status

A member signs into PocketPT, enters the existing push-up gym, and sees the avatar saved on that PocketPT account. The model is selected by PocketPT's canonical profile. Godot renders it inside the existing player controller.

This change implements the PocketPT half and tests its transport/ownership contract. It does not update the generated Godot export or claim a visible personal avatar in the gym yet.

- PocketPT repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`
- PocketPT audited main: `172b3ee04a81cd5040a6405727ee2e556c6b4760`
- Updated review base: `35bd3c11979e7651f428dd46ed97a84b4fc760e9` (incoming trial-routing changes preserved; no Phase 2 overlap)
- Implementation branch: `codex/godot-phase2-avatar-identity`
- Godot repository: `rdhforeclosureconqueror-sys/mufasa-world`
- Godot audited main: `a55b495b996999974f4543bed51b1d7462112a6d`
- Readiness board/card: `avatar` / `avatar-development-godot-phase2-avatar-identity`

The accessible Godot repository has only a cube demo. The working gym is currently available to this review as generated PocketPT Web export artifacts. The Godot Codex must first commit the actual working gym scenes, scripts, relevant source assets, and export configuration to its repository. Preserve the working project; do not replace it with the demo or edit generated `.pck` / `.wasm` files as source.

## Ownership

| Concern | Owner |
| --- | --- |
| Member account and selected avatar | Existing PocketPT auth/profile store |
| GLB bytes and asset ownership | Existing PocketPT avatar upload/storage boundary |
| Arena authorization | Existing one-time launch exchange and HttpOnly arena cookie |
| World-space player position/collision | Existing Godot player controller |
| Model import, materials, and visual mount | Godot avatar loader |
| Camera, gesture interpretation, rep validation, and results | Existing PocketPT systems; subsequent integration work |

The member uploads once in PocketPT. Do not add a second avatar upload/profile system or ask Godot for a PocketPT password/token.

## PocketPT implementation to review

1. `server.js` exposes a narrow internal avatar capability using its actual user store, upload directory, feature state, and existing owner check. Existing member asset routes still enforce canonical bearer authentication.
2. `world-bridge-server.js` injects that capability into the production world bridge.
3. `src/world/avatarBridge.js` resolves the current selection, produces a minimum descriptor, and validates the requested revision before serving it.
4. `src/world/worldBridge.js` extends bootstrap and implements `GET /api/game/avatar/asset` under the existing arena cookie path.
5. `config/world-route-authorization-contract.js` records the added protected route.

The exact protocol, fallback codes, and HTTP error meanings are in [the bridge specification](../POCKETPT_GODOT_WORLD_BRIDGE.md#phase-2--avatar-identity-bridge).

## Godot work to implement in the working project

Extend the existing `PocketPTGameClient` and player scene. Keep the successful Phase 1 bootstrap and parent `READY` handshake.

1. Read `data.avatar` and `data.avatarState` from the existing `/api/game/bootstrap` response.
2. If `avatar` is null, use the existing default character with a visible fallback explanation. Do not report a personal avatar as loaded.
3. For an available avatar, validate `format == "glb"`, the descriptor fields, and that `assetUrl` resolves to the current arena origin at `/api/game/avatar/asset`.
4. Request that exact versioned URL using the same browser arena session. A browser `fetch` invoked through the existing JavaScript bridge should use `credentials: "same-origin"` and `cache: "no-store"`. The HttpOnly cookie is sent by the browser; it is never read into JavaScript/GDScript. Do not add a canonical `Authorization` header or put a credential in a URL.
5. Confirm HTTP 200 and binary GLB data. Pass the downloaded bytes to Godot's runtime GLB importer (`GLTFDocument.append_from_buffer`, then `generate_scene`). This is runtime user content, not an editor `load("res://...")` resource.
6. Attach the imported visual model below the existing player visual mount. Preserve the controller/collision body, camera target, and mat triggers. Verify meshes, materials, skeleton, scale, facing, and floor placement. An avatar ID alone is not a mount result.
7. Dispose the prior imported visual only when the new model is ready to replace it. Cancel/discard late responses after exit, member change, or a newer load request. Never let an old download mount in a new member's session.
8. On 409, re-bootstrap and retry once using the new descriptor. On 401, stop loading and use the existing session-expired/relaunch flow. On 404, re-bootstrap once and show the fallback reason. On other failures, show a retryable avatar error. Avoid an automatic retry loop.
9. Cache only in memory, keyed by member ID + avatar ID + profileVersion. Clear it on session end/member change. `profileVersion` is opaque; do not interpret it as a sequence number or treat it as a credential.

Godot 4.5 documentation:

- [Runtime GLB import with GLTFDocument](https://docs.godotengine.org/en/4.5/classes/class_gltfdocument.html)
- [Runtime file loading](https://docs.godotengine.org/en/4.5/tutorials/io/runtime_file_loading_and_saving.html)

Runtime import does not establish animation compatibility or automatically apply the editor's skeleton retarget settings. Keep rig retargeting, walking, gesture controls, and exercise playback in their next workstream. This phase's first visual proof is the correct account's model mounted in the gym.

## Diagnostics for the Godot work

Record separate stages in the existing debug panel:

| Stage | Required evidence |
| --- | --- |
| Avatar descriptor | Member selection available, or explicit fallback reason |
| Avatar download | HTTP status, received byte count, revision |
| Avatar import | GLB parse result, mesh count, skeleton found |
| Avatar mount | Imported visual attached to the active player's visual mount |
| Avatar presentation | Visible model verified separately by browser/device and human review |

Keep `PocketPT connection READY` separate from avatar loading status. Do not use a successful handshake, HTTP response, or imported scene as a substitute for visual acceptance. Do not log cookies, launch tickets, canonical bearer tokens, full profiles, or personal avatar bytes.

## Validation and release gates

PocketPT automated coverage uses the real `createWorldBridgeApp` production entry, canonical login/upload/profile routes, an actual local HTTP server, and independently configured persistent data/avatar directories. The GLBs are synthetic transport fixtures; they are not visual/model-quality evidence.

Run:

```sh
node --test test/world-avatar-bridge.test.js test/world-bridge.test.js test/world-bridge-production-entry.test.js test/world-bridge-pocketpt-finish.test.js test/world-bridge-mobile-auth.test.js test/member-avatar-assets.test.js test/avatar-upload-transport.test.js
npm run readiness:validate
```

The Godot developer must add real Web runtime proof before Phase 2 is called complete:

1. Account A enters through PocketPT and sees A's saved avatar.
2. Account B enters and sees B's avatar; no stale A model appears.
3. A member without an avatar gets a clearly labelled default.
4. A replaced avatar loads the latest selection; a cleared avatar stops using the removed selection after re-bootstrap.
5. Failed/expired downloads produce a recoverable explanation instead of claiming avatar success.
6. The existing gym entry, identity, and parent handshake continue working with both null and populated avatar descriptors.
7. Verify actual appearance, floor placement, resize/orientation, memory use, and exit/re-entry on desktop and a physical iPhone.

Commit the Godot source change, regenerate the Web export, and provide its source commit/build identity. Have the second developer independently review the PocketPT PR and the matching Godot change. Deployment and visual acceptance are not established by this backend implementation or its tests.

## Later control/animation work

After the member's avatar is visible, connect commands to the existing Godot player controller and compatible animations: navigation gestures → walk/idle, mat arrival → get-ready, PocketPT-recognized exercise phases → push-up playback, completion → get-up. Disable navigation during exercise and pause on tracking loss. PocketPT's validation remains authoritative for accepted/rejected reps; Godot animation completion must not award a rep.
