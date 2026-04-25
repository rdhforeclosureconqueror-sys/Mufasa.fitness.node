# Pocket PT / Ma’at 2.0 Pilot Runbook (Non-Security Scope)

## Pilot scope
- Controlled pilot size: **10–20 users**.
- Focus: camera connect reliability, first workout completion, session save reliability, and avatar upload safety.
- Security/SSO hardening is **intentionally deferred** for this pilot phase.

## Browser + device requirements
- Chrome (desktop + Android), Safari (iOS), Edge (desktop).
- Camera permission must be granted.
- Stable internet connection recommended for profile/session sync and avatar upload.
- Mobile defaults to camera-first render mode for stability.

## Known non-security risks
- Some browsers/devices may block camera or degrade detector/WebGL performance.
- Legacy `/command` fallback remains for compatibility and can still indicate degraded write path.
- Avatar upload is restricted to `.glb` with magic-header validation; malformed files are rejected.
- Optional face/hand tracking is disabled by default on mobile for performance safety.

## Feedback collection process
1. Capture pilot events and write degradations from client/server logs.
2. Ask users after first workout:
   - Could they connect camera without help?
   - Could they complete one workout without confusion?
   - Did any save/upload failure happen, and was recovery clear?
3. Aggregate event rates weekly against success targets.

## Success metrics targets
- Camera connect success: **80%+**.
- Workout start success: **70%+**.
- First workout completion: **50%+**.
- Crash/error session rate: **<5%**.
- 7-day return intent/actual return: **25%+**.

## Rollback steps
1. Revert to previous commit/tag for `public/index.html`, `public/session-write.js`, and `server.js`.
2. Redeploy Node service and static assets.
3. Verify:
   - `/health` returns `ok: true`.
   - `/api/sessions` and `/command` still accept writes.
4. Announce rollback in pilot channel with timestamp and reason.

