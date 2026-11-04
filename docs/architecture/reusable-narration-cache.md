# Site-wide reusable narration — implementation contract

## Goal
Any readable long-form content (weekly stories, lessons, guided reflections, educational articles) may offer **Read aloud**. Audio is generated or recorded **once per unique content version and voice configuration**, stored persistently, and replayed for subsequent listeners without repeat AI synthesis.

**Status: architecture specification only. No narration endpoint, storage, player, or generated audio has been deployed.**

## Content and playback
- Maintain accessible, readable HTML text; audio is optional, not a replacement.
- Player: Play/Pause, seek, playback speed (0.75–1.5x), restart, duration/progress, transcript, and visible loading/error states.
- Prefer the author's approved recording when available. Provide a secure admin upload workflow with review/approval and attribution. Do not silently treat any user's playback as a reusable recording: listening is not recording.
- If no approved recording exists, a server-side synthesis job may create a narrated asset, but only once after permissions, quota, and consent checks.
- Store MP3 or AAC in durable object storage (not ephemeral Render filesystem), with metadata in the application database; use CDN caching and HTTP Range support.
- Do not expose synthesis credentials or paid generation endpoints directly to the browser.

## Cache key and versioning
Use a deterministic key based on:
`SHA256(canonical_content_text + content_version + locale + voice_id + voice_model_version + narration_settings)`.
Different voices or revised texts get distinct keys. Keep old approved recordings until safely retired. A user-uploaded narration is an independently versioned source asset.

## Deduplicated job state machine
`missing → queued → generating → review_required → ready`; failures → `failed` with retry limits.
- One shared unique database constraint on the cache key.
- Concurrent requests reuse the existing pending job or ready asset; no duplicate synthesis.
- Return ready asset URL or pending status; browser polls with bounded backoff.
- Job processing must be asynchronous, rate-limited, authenticated where required, and idempotent.
- Store checksum, source type, narrator, creation timestamp, approval status, text hash, license/consent metadata, storage URI, length, and generation cost.

## Suggested API
- `GET /api/narration/:contentId?locale=en-US&voice=default`: read-only status, transcript, and ready media URL if authorized.
- `POST /api/admin/narration/:contentId/recording`: authenticated admin upload, validation, and review.
- `POST /api/narration/:contentId/generate`: protected, rate-limited generation request; enqueue only when missing.
- `POST /api/admin/narration/:assetId/approve`: publish approved recording.

## Security, privacy, and cost
- Never cache user-specific/private text globally; use scoped access controls and tenant/user-specific cache keys when required.
- Do not clone a person's voice or reuse their recording without explicit permission.
- Validate file type, size, duration, and malware risk; restrict uploads and generation to approved roles.
- Log cache hit/miss, generation count, estimated spend, storage cost, playback failures, and time to first audio.
- Prefer pre-generating the eight approved story narrations in a batch after editorial approval, rather than first-click generation.
- Use existing repository conventions, auth, storage, and database after an implementation audit. Do not create a parallel stack without justification.

## Acceptance checks
1. First approved playback creates or uses exactly one asset.
2. Repeated clicks and simultaneous visitors result in zero additional synthesis calls.
3. Changing the story text or voice produces a new asset without overwriting the original.
4. Recording upload requires permission and approval; ordinary listener playback is never recorded.
5. Missing/failed audio gracefully falls back to the readable story.
6. Private content never leaks through shared cache/CDN.
7. Audio playback works on iPhone Safari, including seeking and background audio where supported.
8. Audio is served from persistent storage across deployments and restarts.

## Editorial release dependency
The eight **full approved manuscripts are not yet in the repository**. Import and verify them first, then wire the player and pre-generate narration. Do not advertise narration as available until end-to-end live checks pass.
