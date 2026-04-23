# INTEGRATION PLAN REPORT

## Current avatar render truth

### 1) Where the existing render loop expects avatar data
- The live pose/render loop (`runPoseLoop`) builds `posePacket` from TensorFlow MoveNet keypoints each frame, then branches by `renderMode` (`camera`, `avatar_overlay`, `avatar_only`).
- Avatar drawing is currently invoked only via `drawAvatar(ctx, posePacket)` in the overlay/only branches.
- The current avatar path is **purely keypoint-driven** and does **not** load any external avatar model/URL.

Current frame contract used by avatar draw path:
```js
posePacket = {
  timestamp: Number,
  keypoints: [
    { x: Number, y: Number, score: Number, name?: String, part?: String },
    ...
  ]
}
```

### 2) What shape the system needs to render user-specific avatar instead of placeholder output
Minimal extension (without broad TF loop refactor):
- Keep existing `posePacket` unchanged.
- Introduce a **separate runtime avatar descriptor** loaded once per user/session, e.g.:
```ts
avatarDescriptor = {
  provider: "readyplayerme" | "custom_upload" | "none",
  assetUrl: string | null,      // GLB/VRM/image depending on provider path
  modelType: "glb" | "vrm" | "image2d" | "builtin_skeleton",
  thumbnailUrl?: string | null,
  updatedAt?: number
}
```
- Replace direct call site with a tiny adapter boundary only:
  - `drawAvatar(ctx, posePacket)` -> `avatarRenderer.draw(ctx, posePacket, avatarDescriptor)`
  - If `avatarDescriptor` missing/unusable, adapter falls back to existing procedural `drawAvatar` behavior.

This keeps render loop timing/flow intact and isolates provider-specific runtime handling.

---

## Required profile/data additions

Smallest additive profile fields (inside existing `profile` object persisted by `/api/me/profile`):

```json
{
  "avatarProvider": "readyplayerme",
  "avatarUrl": "https://.../avatar.glb",
  "avatarModelType": "glb",
  "avatarThumbnailUrl": "https://.../thumb.png",
  "avatarUpdatedAt": 1770000000000
}
```

Recommended semantics:
- `avatarProvider` (string, nullable): source authority for compatibility rules.
- `avatarUrl` (string, nullable): canonical runtime asset reference.
- `avatarModelType` (enum string, nullable): determines renderer path.
- `avatarThumbnailUrl` (string, nullable, optional): dashboard/status preview.
- `avatarUpdatedAt` (number epoch ms, nullable): cache busting + recency.

Validation constraints (minimal):
- `avatarProvider`: max len 64, lowercase slug-like.
- `avatarUrl`, `avatarThumbnailUrl`: max len 2048; must be `https://` when external.
- `avatarModelType`: allowlist enum.
- `avatarUpdatedAt`: finite number or null.

No new top-level DB/table needed; this remains additive in current user JSON profile storage.

---

## Recommended UI placements

Use current right-side **Profile pane** in `public/index.html` as the narrowest live pilot surface.

### Placement details
1. Under existing **Profile** title/subtitle and above current profile summary card:
   - **Create Avatar** (primary CTA when none exists)
   - **Current avatar status** text chip:
     - `No avatar set`
     - `Provider avatar connected`
     - `Avatar unavailable — using default`

2. If avatar exists, replace CTA set with:
   - **Change Avatar**
   - **Remove Avatar**

3. Keep render mode selector where it is (left pane controls), but add soft dependency hint:
   - if user selects `avatar_overlay`/`avatar_only` and no valid saved avatar: show non-blocking message and retain default procedural avatar or camera fallback.

### Embedded provider surface
- Launch from Create/Change button into a modal containing provider iframe/webview.
- Keep modal decoupled from workout loop; open/close independent of camera state.

---

## Integration surface plan

## A) "Create Avatar" button
- Add button in Profile pane.
- Click opens provider modal and starts hosted/embedded creator session.

## B) Embedded provider flow (modal/iframe)
- Preferred: hosted provider URL in iframe/modal with postMessage callback.
- Backup: popup window with redirect/callback token if provider iframe is blocked.

## C) Callback/result capture
- Listen for provider success event payload (asset URL + thumbnail when available).
- Normalize payload into internal shape:
  - `avatarProvider`
  - `avatarUrl`
  - `avatarModelType`
  - `avatarThumbnailUrl`
  - `avatarUpdatedAt = Date.now()`

## D) Saving avatar reference to user profile
- Reuse existing authenticated profile write path (`PUT /api/me/profile`).
- Submit only additive avatar fields together with current profile payload builder.
- Keep legacy fallback path unchanged; if explicit API unavailable, retain local profile cache and defer sync.

## E) Loading saved avatar next session
- Reuse existing backend profile hydration (`GET /api/me/profile` already runs on login/session restore).
- During hydrate:
  - map avatar fields from backend profile into local `USER_PROFILE`.
  - prefetch/check `avatarUrl` asynchronously.
  - initialize `avatarDescriptor` before workout start if asset is reachable.

---

## Fail-safe behavior

### 1) No avatar exists
- Render mode behavior:
  - `camera`: unchanged.
  - `avatar_overlay` / `avatar_only`: use existing built-in procedural avatar draw path.
- UI status: `No avatar set (using default avatar)`.

### 2) Provider creation fails
- Keep modal open with retry/cancel.
- On cancel/failure: do not mutate stored profile avatar fields.
- Show toast/log message; maintain existing render behavior.

### 3) Saved avatar cannot load
- Mark avatar status degraded for this session.
- Automatically switch runtime renderer to built-in procedural avatar; if that path also errors, execute existing `fallbackRenderModeToCamera(...)`.
- Do not delete stored URL automatically; allow user to retry/change/remove.

### 4) Pose runs but avatar asset unavailable
- Never block pose estimation or rep counting.
- Render fallback priority:
  1. provider avatar (if ready)
  2. built-in procedural avatar (`drawAvatar` current)
  3. camera mode fallback via existing guard

This preserves coaching/session continuity.

---

## Provider integration phases

### Phase 1 — provider/embed wiring
- Add Profile-pane Avatar controls + modal shell.
- Implement provider launch and callback capture only.
- Store callback result in in-memory client state first.
- No renderer changes yet beyond status wiring.

### Phase 2 — profile persistence
- Extend profile validation + normalization to include avatar fields.
- Persist via existing `PUT /api/me/profile` path.
- Hydrate via existing `GET /api/me/profile` path and local cache.

### Phase 3 — runtime avatar loading
- Add lightweight `avatarDescriptor` state and loader.
- Add adapter boundary in draw call:
  - try provider asset renderer path;
  - fallback to current procedural avatar draw;
  - retain existing camera fallback on error.
- Keep TensorFlow pose loop structure unchanged.

### Phase 4 — polish / avatar management UX
- Add explicit `Change Avatar` / `Remove Avatar` flows.
- Add thumbnail + status messaging.
- Add cache refresh + stale-asset retry affordances.

---

## Smallest safe first implementation step

**Implement only Phase 1 UI + callback capture with no render-path changes:**
1. Add `Create Avatar` button + modal container in Profile pane.
2. Wire provider hosted URL into iframe/popup.
3. Capture success payload and display `Avatar captured (not yet saved)` status.
4. Leave all current render logic untouched.

This is reversible, low-risk, and validates provider compatibility before persistence/runtime loading work.
