# ROUTE TRACE REPORT — Real GLB Avatar Upload Flow (2026-04-23)

## 1) End-to-end flow map

### Real upload flow (pilot-relevant)
`#uploadAvatarBtn` click (public/index.html)  
→ reads selected file from `#avatarFileInput`  
→ `uploadAvatarFile()` builds `FormData` with field `avatar`  
→ `POST /api/avatar/upload` with bearer auth  
→ backend `parseAvatarMultipartUpload()` validates multipart + `.glb` + max bytes  
→ backend saves file to `public/uploads/avatars/<uuid>.glb` and returns `{ avatarModelUrl: "/uploads/avatars/<uuid>.glb" }`  
→ frontend writes `USER_PROFILE.avatar` and runs `sendProfileToNode()` (`PUT /api/me/profile`)  
→ backend validates/stores avatar profile metadata  
→ profile reload via `GET /api/me/profile` restores avatar fields  
→ runtime `loadAvatarAssetForCurrentUser()` probes URL (`fetch` + GLB signature check), then loads with `THREE.GLTFLoader`  
→ UI status updates + render mode gating/fallback.

### Test shortcut flow (not pilot trust path)
In **legacy root `index.html` only**, `#useTestAvatarBtn` sets model URL to `/test-assets/avaturn-upload.glb` without upload API call, then requires Save Avatar.

## 2) Exact frontend handlers

- Real upload control: `#uploadAvatarBtn` with label **Upload Avatar (.glb)** in `public/index.html`, tied to `uploadAvatarBtn.onclick = uploadAvatarFile`.  
- File input control: `#avatarFileInput` (`type=file`, `accept=.glb,model/gltf-binary`).  
- The active server shell is `public/index.html` (server `GET /` points to `PUBLIC_DIR/index.html`), so this is the runtime truth.

## 3) Frontend request truth

`uploadAvatarFile()` performs:
- Method: `POST`
- URL: `${NODE_BASE_URL}/api/avatar/upload`
- Body: `FormData`
- Field name: `avatar`
- Headers: `authorization: Bearer <token>`

Cancel/wrong-file behavior:
- If picker canceled / no file selected: status text becomes `Choose a .glb file first.` and no request is sent.
- If wrong extension by filename: status text becomes `Only .glb files are supported.` and no request is sent.

## 4) Backend route truth (`/api/avatar/upload`)

- Registered as `app.post("/api/avatar/upload", requireAuth, ...)` only (POST only).
- Requires authenticated user via `requireAuth`.
- Multipart parsing is custom (`parseAvatarMultipartUpload`) and enforces:
  - `Content-Type` must be `multipart/form-data` with boundary
  - must include field `name="avatar"`
  - filename extension must be `.glb`
  - request size enforced by `AVATAR_UPLOAD_MAX_BYTES` (default `15 * 1024 * 1024`)
- Storage naming:
  - filename generated as `<uuid>.glb` (or timestamp-random fallback)
  - write path: `path.join(AVATAR_UPLOAD_DIR, fileName)`

## 5) Storage / serving truth

- `AVATAR_UPLOAD_DIR = public/uploads/avatars`.
- Returned URL pattern: `/uploads/avatars/<generated>.glb`.
- Static serving: `app.use(express.static(PUBLIC_DIR))` makes `/uploads/avatars/...` reachable from `public/uploads/avatars/...`.

## 6) Profile save/load roundtrip truth

After upload success, frontend sets:
- `avatarProvider`
- `avatarModelUrl`
- `avatarThumbnailUrl`
- `avatarUpdatedAt`

Then it sends profile via `sendProfileToNode()` → `PUT /api/me/profile` (`profile.avatar` payload).

Backend validation path (`validateProfileUpsert` → `normalizeAvatar`) enforces:
- avatar object shape
- `avatarModelUrl` required when avatar is provided
- normalizes provider default `custom`, thumbnail nullable, updatedAt default now

Persistence path:
- `userDataService.upsertProfile()` normalizes and stores `user.profile.avatar`.

Reload path:
- `GET /api/me/profile` returns stored profile.
- `public/backend-read.js normalizeProfile()` maps returned avatar fields into client `USER_PROFILE.avatar`.
- `hydrateProfileFromBackend()` calls `loadAvatarAssetForCurrentUser("backend_profile")`.

## 7) Runtime load truth

`loadAvatarAssetForCurrentUser()` behavior:
- No avatar metadata: sets UI status `No avatar saved.` / `No avatar metadata loaded.` and disables runtime asset.
- Probe step (`probeAvatarModelRuntime`):
  - fetches `avatarModelUrl`
  - marks missing on 404
  - checks binary signature first 4 bytes for `glTF` (GLB)
  - otherwise allows `.gltf`/`.vrm` by URL extension in probe logic
- Mount step (`mountAvatarGlbModel`): hard-requires `.glb` URL and loads with `THREE.GLTFLoader`.
- Success UI: `Avatar asset found (...)` and `Model loaded + visible...`.
- Failure UI: `Avatar asset missing.` or `Avatar asset probe failed.` plus runtime status `GLB runtime load failed. Camera/procedural fallback active.` then enforced `fallbackRenderModeToCamera(...)`.

## 8) Render gating truth

Render mode gating exists:
- `applyRenderModeSelection()` blocks `avatar_overlay`/`avatar_only` if no `activeAvatarAsset`; forces `camera` fallback.
- Render loop guards runtime failures and calls `fallbackRenderModeToCamera(...)` when avatar render fails.

Result: camera fallback is enforced if uploaded asset fails runtime probe/load.

## 9) Real upload vs test upload comparison

| Aspect | Real path (pilot) | Test shortcut path |
|---|---|---|
| UI control | `#uploadAvatarBtn` in `public/index.html` | `#useTestAvatarBtn` in legacy root `index.html` |
| File picker | Yes (`#avatarFileInput`) | No |
| Upload API used | Yes: `POST /api/avatar/upload` | No |
| Storage path created | Yes: `public/uploads/avatars/<uuid>.glb` | No new storage; fixed `/test-assets/avaturn-upload.glb` |
| Profile write | Yes | Yes (after manual Save Avatar) |
| Runtime probe/load | Yes | Yes |
| Pilot trust level | **Trusted** | **Do not trust for pilot** (shortcut bypasses upload contract) |

Recommendation: hide/gate test shortcut from any pilot-facing shell. It currently appears only in legacy root `index.html`, while active shell (`public/index.html`) already uses real upload.

## 10) Mismatches found

1. **Documentation mismatch**: `public/test-assets/README.md` claims “Use Uploaded GLB (Test)” as app action, but active shell (`public/index.html`) does not expose that button.
2. **Shell divergence risk**: repository contains two shells (`index.html` and `public/index.html`) with different avatar wiring; server serves `public/index.html` at `/`.
3. **Contract nuance**: probe allows `.gltf/.vrm` by extension, but mount path hard-requires `.glb`. In practice, upload route emits `.glb`, so real flow is safe.

## 11) Smallest fixes required

- **Applied tiny fix**: updated `public/test-assets/README.md` to explicitly mark test shortcut as legacy/non-pilot and clarify real pilot path is Upload Avatar (.glb) via `/api/avatar/upload`.

## 12) PASS / FAIL

**PASS with caution.**
- Real user-facing upload flow in active shell is wired end-to-end and consistent with backend/storage/profile/runtime contract.
- Caution remains for legacy shell/test-path confusion; this is now documented as non-pilot.
