# Live Capability Verification Report — 2026-05-06

Generated in the repo environment on 2026-05-08 for the final live workout milestone chain:

`login → auth → camera → video → detector → session → pose → rep analysis → rep persistence → workout completion → dashboard propagation`

This report is verification-only. No runtime behavior was patched for this mission.

## Executive status

The live milestone chain is now **healthy at the automated/API/static-contract level**. The required test set passed, including auth/login, login form delegation, session start/rep/complete persistence, retention/progress APIs, lazy-load contracts, coach voice state contracts, and inline-risk markers.

Browser-only capabilities that depend on real media devices, WebGL, TensorFlow runtime execution, speech APIs, and deployed-origin storage still require manual live browser verification before declaring the full production experience complete.

## Capability verification matrix

| Capability | Current verification status | Confirmed working | Still needs manual browser verification |
|---|---|---|---|
| Auth/login | Confirmed automated pass | `/api/auth/login` accepts valid pilot credentials, rejects invalid credentials, returns tokens, supports `/api/auth/me`, and protects authenticated routes. The frontend login form delegates submit ownership to `auth-core` and root/public index files remain synchronized. | Verify deployed frontend login against deployed backend with real env secrets, cookie/localStorage state, CORS/origin configuration, logout, and reload persistence. |
| Profile | Confirmed API pass | Authenticated `/api/me/profile` is reachable only with a valid token; profile route rejects missing tokens. | Verify profile fields, avatar metadata, save UX, profile hydration, and post-login visible state in a real browser session. |
| Camera | Static contract pass | Workout runtime marks `video-playing` before downstream detector handoff, and tests protect against detector failures overwriting a passed video milestone. Camera start also lazy-loads pose runtime instead of loading TensorFlow at login. | Use a real browser with camera permission to confirm camera prompt, stream acquisition, video element playback, device switching, fullscreen camera, and graceful permission-denied UX. |
| Detector/pose | Static contract pass | `initDetector()` lazy-loads `window.__ensurePoseRuntime()`, and pose runtime ownership is protected by tests. | Confirm TensorFlow/MoveNet loads from the deployed site, detector initialization completes, pose packets are emitted, frame loop remains stable, and pose errors are visible without breaking video playback. |
| Rep counting | Partially confirmed | Static/code contracts keep live default exercise selection available and preserve rep-analysis mirrors in the workout shell. Backend rep write routes are healthy. | Manually perform reps in browser and confirm visual rep phase/depth/form analysis increments correctly from live pose data. Automated tests do not execute camera frames or validate biomechanical rep counting accuracy. |
| Rep persistence | Confirmed automated pass | `POST /api/sessions/:id/reps` appends rep updates, authenticated rep writes derive identity from auth, mismatched `userId` is rejected, and legacy `/command` adapter remains covered. | Confirm live pose-triggered reps call the extracted `RepRuntime.persistRepUpdate()` / `SessionWrite.enqueueRepUpdate()` path and survive throttling/offline fallback in the real browser. |
| Workout completion | Confirmed automated pass | `POST /api/sessions/:id/complete` ends sessions, persists summaries, derives authenticated identity when body `userId` is omitted, and rejects spoofed IDs. Frontend completion runtime calls `SessionWrite.completeSession()` and dispatches `workout:completed`. | Complete an end-to-end browser workout and verify the completion modal/state, session summary values, duplicate-completion prevention, and refresh/reopen behavior. |
| Ma’at/coach voice states | Static contract pass | Coach controls call `coach-runtime` directly; inline speech-recognition construction is removed; `coach-runtime` owns browser speech recognition lifecycle and exposes Ma’at ready/speaking/listening/voice-unavailable/mic-error chip states. | Verify real browser speech synthesis, mic permission prompt, speech recognition transcripts, voice unavailable fallback, interruption/stop behavior, and Ma’at chip state transitions on Chrome/Safari/mobile. |
| Dashboard propagation | Static/API contract pass | `dashboard-runtime` listens for `workout:completed`, tracks canonical workout completion, refreshes `/api/me/history` and `/api/progress/dashboard`, emits `progress:dashboard-refreshed`, and marks `dashboard-propagated`. Retention API tests verify dashboard totals/reward summaries after workout tracking. | Complete a browser workout and confirm dashboard cards, history, reward state, and visible progress panels update without refresh and remain correct after page reload. |
| Retention/progress propagation | Confirmed automated pass | Retention tests cover client intake save/load, goals baseline, program assignment, workout tracking, check-ins, progress dashboard, reward latest, streak/comeback state, coach messaging, and progress narrative. | Verify the deployed UI sequence from onboarding/intake through workout completion and check-in display, including cross-tab/session reload behavior. |
| Exercise library selection | Static contract pass | The shell exposes the Exercise Library button, button handler checks are present, and workout start auto-selects a safe default live exercise (`bodyweight_squat`) when no explicit selection exists. | Use the browser Exercise Library page/modal to select multiple exercises and confirm active workout state, HUD labels, session `exerciseId`, and fallback/default behavior. |
| Avatar lazy-load/mirroring | Static contract pass | Login shell avoids eager TensorFlow/Three script tags; avatar render mode triggers lazy Three runtime bootstrap; avatar alignment trace documents mirrored MoveNet image-space to Three world mapping. | Verify WebGL/Three lazy loading, GLB loading, mirrored pose alignment, stage mode/follow-pose behavior, avatar fallback rendering, mobile performance, and offscreen/retarget diagnostics with a real camera. |
| Remaining inline script risk | Confirmed marked risk | Tests require explicit `[INLINE_REMAINING]` markers for auth/profile shell, boot diagnostics, hydration ordering, workout/OHSA glue, pose/camera loop, and avatar render pipeline. This makes remaining inline risk visible and auditable. | Continue browser regression checks while extracting load-bearing inline sections; ensure no remaining inline helpers duplicate canonical runtime ownership. |

## What is now confirmed working

- **Auth/login chain:** valid login, invalid-login rejection, `/api/auth/me`, protected profile access, and login test fixtures all pass.
- **Frontend auth delegation:** the login form is present, duplicate login form risk is guarded, inline login/register submit fetch ownership is removed, and `auth-core` owns submit delegation.
- **Session lifecycle APIs:** session start persists, authenticated session writes derive user identity, spoofed body `userId` is rejected, rep updates append, completion ends sessions, and normalized validation envelopes are returned.
- **Rep persistence API path:** explicit rep endpoint and legacy `/command` compatibility are tested.
- **Retention/progress APIs:** intake, goals, programs, workout tracking, check-ins, dashboard summaries, rewards, streak/comeback status, coach messaging, and progress narrative are covered.
- **Lazy-load/performance contracts:** TensorFlow/Three are not loaded by the login shell, pose runtime loads at camera/detector time, avatar runtime loads on avatar mode, and progress scan boot metrics remain present.
- **Camera/video milestone resilience:** `video-playing` remains a pass once playback is established, even if downstream detector handoff fails.
- **Ma’at voice runtime ownership:** speech recognition and Ma’at status transitions are owned by `coach-runtime`, not the inline shell.
- **Dashboard/retention propagation contract:** workout completion events are wired to dashboard and retention refresh flows.
- **Inline risk visibility:** remaining dangerous inline sections are explicitly labeled for future cleanup.

## What still needs manual browser verification

1. **Real auth session:** deployed login, `/api/auth/me` hydration, reload persistence, logout, and profile display.
2. **Camera/video:** camera permission prompt, stream playback, device compatibility, fullscreen behavior, and denied-permission messaging.
3. **Detector/pose:** TensorFlow/MoveNet network load, backend selection, detector readiness, pose packet cadence, and visible failure states.
4. **Live rep counting:** actual bodyweight squat/pose reps, false positives/false negatives, depth score quality, and cue timing.
5. **Live rep persistence:** confirm each accepted live rep writes to the session without duplicate bursts or throttling loss.
6. **Workout completion:** browser completion UX, payload accuracy, duplicate completion guard, and reload persistence.
7. **Dashboard propagation:** no-refresh dashboard/history/progress updates after completion plus persisted state after reload.
8. **Retention propagation:** reward, streak, comeback, weekly review, and coach message panels after a live completed workout.
9. **Exercise library selection:** library open/select flow, active exercise labels, default fallback, and selected exercise persistence into session payloads.
10. **Ma’at coach voice:** speech synthesis, mic recognition, chip states, stop/interruption handling, and unavailable/error fallbacks across target browsers.
11. **Avatar lazy-load/mirroring:** Three/GLTF load, WebGL support, mirrored skeleton mapping, retarget fidelity, fallback rendering, and performance on target devices.
12. **Inline script regression:** manual smoke test after each extraction because the inline shell still owns several load-bearing glue paths.

## What tests cover

Required command executed:

```bash
node --test test/pilot-login.test.js test/auth-login-form-submit.test.js test/session-api.test.js test/retention-api.test.js test/performance-lazyload.test.js
```

Coverage from that command:

- `test/pilot-login.test.js`
  - Valid/invalid pilot login.
  - `/api/auth/me` token success and missing/invalid token failures.
  - Protected profile route token requirement.
  - Test login fixture behavior and authorization boundaries.
- `test/auth-login-form-submit.test.js`
  - Login form exists and delegates submit handling to `auth-core`.
  - Inline login/register submit fetches are not the owner.
  - Root `index.html` mirrors `public/index.html`.
- `test/session-api.test.js`
  - Session start, authenticated identity derivation, spoofed body-user rejection.
  - Rep update persistence and authenticated rep identity checks.
  - Session completion persistence.
  - Validation envelope shape.
  - Legacy `/command` adapter parity and write observability/authz checks.
- `test/retention-api.test.js`
  - Client intake, goals baseline, program assignment, workout tracking, check-ins, dashboard aggregation, reward latest, streak/comeback summaries, coach messaging, visual-progress scan authorization, and invalid-payload guards.
- `test/performance-lazyload.test.js`
  - Login shell does not eagerly load TensorFlow/Three.
  - Retention/avatar work does not block auth flow.
  - Camera start lazy-loads pose runtime.
  - Avatar render mode lazy-loads Three runtime.
  - Progress scan boot metric presence.
  - Video-playing milestone preservation.
  - Coach runtime voice ownership and Ma’at states.
  - Explicit inline-risk markers.
  - Safe live default workout selection.

Also executed:

```bash
npm run lint
```

The lint/selfcheck command passed.

## What tests do not cover

- Browser camera permission prompts or actual `MediaStream` device behavior.
- Real video playback timing in Chrome/Safari/mobile.
- TensorFlow backend initialization, MoveNet model download, and detector inference on real frames.
- Live pose-to-rep biomechanical accuracy, depth quality, form scoring, and cue timing.
- End-to-end browser rep persistence from actual pose events.
- Speech synthesis audio output, microphone recognition, and browser-specific speech API differences.
- WebGL/Three/GLTF rendering, avatar retarget fidelity, mirrored alignment correctness, and GPU/mobile performance.
- Full no-refresh dashboard UI propagation after a real browser completion.
- Real deployed-origin CORS, storage, service-worker/cache, or CDN behavior.
- Visual accessibility/responsive layout after each inline extraction.

## Remaining cleanup phases

1. **Rep analysis extraction**
   - Move rep phase/depth/form state out of the inline shell into a canonical rep-analysis runtime while keeping `SessionWrite.enqueueRepUpdate()` as the only write path.
2. **HUD lifecycle extraction**
   - Extract workout HUD rendering, active workout state mirrors, rest timer display, and set/progress display into a dedicated runtime.
3. **Completion orchestrator consolidation**
   - Move completion payload assembly, duplicate-completion guards, local completion cache, `SessionWrite.completeSession()`, and `workout:completed` dispatch into one canonical lifecycle owner.
4. **Pose frame adapter consolidation**
   - Route pose frames through a stable adapter that emits form/rep/avatar/HUD events without relying on page-local globals.
5. **Coach cue lifecycle cleanup**
   - Connect workout lifecycle events to `coach-runtime` so cues, Ma’at chip states, and unavailable/error states remain consistent.
6. **Avatar runtime completion**
   - Finish moving Three canvas/GLB mounting/calibration/fallback hooks out of inline code and add browser-level verification for mirroring/retarget diagnostics.
7. **Auth/profile shell reduction**
   - Remove remaining page-local auth/profile mirrors after runtime contracts fully own hydration, profile save, and avatar metadata.
8. **Inline script burn-down**
   - Delete dead legacy helpers, reduce `[INLINE_REMAINING]` sections one by one, and keep tests requiring explicit markers until each section is safely removed.
9. **Browser E2E coverage**
   - Add Playwright/WebDriver smoke tests for login → camera → detector → reps → completion → dashboard propagation once camera/model mocking is agreed.

## Final verification result

- **Report path:** `reports/live-capability-verification-2026-05-06.md`
- **Confirmed working capabilities:** auth/login, protected profile API, session start, rep persistence API, workout completion API, retention/progress APIs, dashboard propagation contract, lazy-load contracts, Ma’at coach runtime ownership, safe default exercise selection, and explicit inline-risk visibility.
- **Remaining manual verification items:** real browser camera/video, detector/pose inference, live rep counting from movement, live rep persistence from pose events, completion UX, no-refresh dashboard propagation, retention UI propagation, exercise library selection UX, Ma’at voice/mic behavior, avatar mirroring/lazy-load, and deployed auth/profile persistence.
- **Remaining cleanup phases:** rep analysis extraction, HUD lifecycle extraction, completion orchestration consolidation, pose frame adapter consolidation, coach cue cleanup, avatar runtime completion, auth/profile shell reduction, inline script burn-down, and browser E2E coverage.
- **Tests passed:** `npm run lint`; `node --test test/pilot-login.test.js test/auth-login-form-submit.test.js test/session-api.test.js test/retention-api.test.js test/performance-lazyload.test.js` (55 tests passed, 0 failed).
