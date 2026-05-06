# Capability Alignment Audit — 2026-05-05

Mission: repo-wide capability map for Mufasa Fitness / Ma’at 2.0 / Simba AI coach.

Audit date in environment: 2026-05-06. Requested report filename retained as `reports/capability-alignment-audit-2026-05-05.md`.

## 1. Inventory scope searched

Searched the requested repo areas:

- `server.js`
- `src/**`
- `public/**`
- `test/**`
- `reports/**`
- `docs/**`
- `exercise-db/**` (no top-level directory found; active DB is under `public/exercise-db/**`)
- `package.json`

Approximate source/audit file count in scope: 1,034 files under the requested paths excluding deep `node_modules` content. Primary runnable code reviewed:

- Backend: `server.js`, `src/middleware/**`, `src/services/**`, `src/repositories/**`, `src/validation/**`, `src/lib/**`, `src/domains/fitness.js`.
- Frontend modules: `public/boot-core.js`, `public/auth-core.js`, `public/status-panels.js`, `public/button-runtime.js`, `public/profile-runtime.js`, `public/app-runtime.js`, `public/workout-runtime.js`, `public/backend-read.js`, `public/session-write.js`, `public/retention-flow.js`, `public/diagnostics-client.js`, `public/landing-diagnostics.js`, `public/dashboard.js`, `public/exercise-library.js`, and the large inline script in `public/index.html`.
- Pages/assets: `public/index.html`, `public/dashboard.html`, `public/exercise-library.html`, `public/vendor/three/**`, `public/exercise-db/**`.
- Tests: all `test/*.js`, with required command focused on pilot login, auth login form submit, session API, and retention API.

## 2. Executive summary

The app contains recognizable pieces for every requested product capability, but the system is not capability-aligned yet. Backend auth/session/retention APIs and some tests are relatively strong. The user-facing workout experience is still split between modular runtime files and a giant inline script; this creates duplicate ownership for boot, camera, session state, voice, avatar, HUD, and diagnostics.

Most important findings:

1. **Exercise API is structurally broken for the committed DB shape.** `public/exercise-db/index.json` is an array of 873 exercises, while `server.js` expects an object with `exercises`; `/api/exercises/search` therefore returns empty results even though the standalone library page can load the static JSON directly.
2. **Rep writes are not wired from frontend to the explicit rep API.** Backend and tests cover `POST /api/sessions/:id/reps`; frontend `SessionWrite` only exposes `startSession` and `completeSession`, while the inline rep loop maintains local counters and uses legacy paths inconsistently.
3. **Dashboard/progress is only partially fed by workout completion.** Dashboard reads `/api/me/history`; retention listens for `workout:completed` and writes `/api/workouts/track`; session completion writes `/api/sessions/:id/complete`; these stores are related but not unified in the UI.
4. **Camera activation works at the modular level, but TensorFlow pose startup is owned by inline script and starts later.** `workout-runtime.js` connects the camera and enables start; `public/index.html` owns MoveNet detector setup and pose loop.
5. **Avatar/Three is lazy-loaded and has diagnostics, but live GLTF mirroring remains fragile.** There is real GLTF load/retarget code, but it depends on inline globals, pose packets, user profile avatar metadata, and a fallback procedural/camera mode.
6. **AI voice uses `/api/speak` and browser `speechSynthesis`, but coach timing/error states are scattered.** The backend proxies a voice upstream; the browser falls back to SpeechSynthesis; no tests cover this route.
7. **Auth is functional but duplicated.** `auth-core.js`, `auth-ui.js`, and inline script all contain auth/login surface area. Tests mostly protect old and current auth contracts, but duplicated ownership is still a risk.
8. **Retention/onboarding APIs are good, but the flow is not strongly connected to selected workout/HUD/session state.** Retention writes client intake, goals, program assignment, check-ins, and workout tracking; the workout runtime separately uses active workout selection in localStorage.
9. **Diagnostics are extensive, but several capabilities exist mainly as diagnostic/status text rather than a clean user flow.** This includes Three module probes, auth propagation panels, app activation panels, and pilot events.
10. **Admin/operator controls exist in backend control-plane routes but are not part of the normal user UI.** Tests cover hardening/control-plane behavior; frontend diagnostic panels can read diagnostics with a token, but there is no dedicated operator console in the main app.

## 3. Capability table

| Capability | User-facing expectation | Frontend owner file/function | Backend route(s) | Data source/store | Auth required | Current status | Evidence | Missing dependency | Recommended fix phase |
|---|---|---|---|---|---|---|---|---|---|
| Login/auth | User can log in/register, app unlocks, token persists, authenticated APIs work. | `public/auth-core.js` form submit/broadcast; `public/auth-ui.js`; inline auth logic in `public/index.html`; `public/app-runtime.js` hydrates `/api/auth/me`. | `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`, `POST /api/auth/logout`, legacy/test `POST /api/auth/bridge`. | LocalStorage token `maatAuthToken`; backend in-memory registered user map and signed auth tokens. | Login/register no; `/me` yes. | Partial/working with duplication. | Tests cover login and auth form submission; frontend has multiple auth owners. | Single canonical auth shell and logout caller. | Phase 1 |
| User profile | User sees profile summary and can save profile/avatar metadata. | `public/profile-runtime.js`; `public/backend-read.js`; inline profile save/avatar fields. | `GET /api/me/profile`, `PUT /api/me/profile`, `POST /api/avatar/upload`. | `src/services/userDataService.js` via `src/repositories/userStore.js`; local cache fallback. | Yes. | Partial/working. | Backend route and tests exist; profile hydration writes UI and lazy-loads avatar. | Remove duplicate inline/profile module paths; define profile schema once. | Phase 1 / Phase 5 |
| Retention/onboarding journey | User completes intake/goals/check-ins and receives retention/reward state. | `public/retention-flow.js`. | `GET/POST /api/client-intake`, `GET/POST /api/goals-baseline`, `GET /api/programs/current`, `POST /api/programs`, `GET/POST /api/check-ins`, `POST /api/workouts/track`, `GET /api/workouts/reward/latest`, `GET /api/progress/dashboard`. | User data service stores intake, goals, programs, check-ins, workout tracking, reward/progress summaries. | Yes. | Partial/working. | Retention API tests pass; flow listens to auth and workout completion. | Stronger connection to active workout selection/session completion and dashboard. | Phase 7 |
| Camera activation | User clicks Connect Camera and sees live video. | `public/workout-runtime.js` `connectCamera`; inline wrapper `connectCamera`; `public/app-runtime.js` diagnostics. | None direct; emits pilot events in inline script for some flows. | Browser `navigator.mediaDevices.getUserMedia`; video element `#video`. | Browser permission; not backend auth once UI is active. | Partial/working. | Modular runtime checks DOM and calls `getUserMedia`, sets video, enables Start. | Cleaner ordering: camera ready should initialize detector or mark detector pending. | Phase 3 |
| TensorFlow/body tracking | After camera/session starts, pose detector tracks body. | Giant inline script in `public/index.html`: detector variables, `loadDetector`, `runPoseLoop`. | None. | CDN/global pose libraries expected in page; video frames; canvas/HUD state. | No backend auth; depends on camera/session. | Partial/fragile. | Inline script checks `poseDetection` and creates MoveNet detector; face/hand detectors optional. | Explicit script/module dependency ownership; fail-fast UI for missing TF globals. | Phase 3 |
| Rep counting | Reps counted live, shown in HUD, saved to backend. | Giant inline script: `repCount`, `repPhase`, active workout state, pose loop. | Backend has `POST /api/sessions/:id/reps`; legacy `/command` supports `fitness.repUpdate`. | Inline state/localStorage; backend `sessionService` for explicit reps. | Explicit route effectively user scoped; token recommended/required by client. | Broken/partial. | Backend route/test exists; frontend `SessionWrite` does not expose rep update and route caller scan found no frontend caller for `/api/sessions/:id/reps`. | Add `SessionWrite.addRep/updateReps`, call from pose loop at debounced rep events, deprecate legacy fallback. | Phase 2 / Phase 3 |
| Workout session start/update/complete | Start creates session, reps update session, stop/complete finalizes. | `public/workout-runtime.js` `startWorkout`; `public/session-write.js` start/complete; inline `prepareWorkoutStart`, `sendStartSessionToNode`, `sendEndSessionToNode`. | `POST /api/sessions`, `POST /api/sessions/:id/reps`, `POST /api/sessions/:id/complete`, legacy `/command`. | `src/services/sessionService.js`; inline/localStorage active workout state. | Client treats explicit routes as auth required. | Partial. | `POST /api/sessions` and complete route are covered; rep update missing from frontend; stop path calls completion/fallback. | Make `SessionWrite` the only write path; wire workout lifecycle events to session IDs. | Phase 2 |
| Ma’at / Simba AI coach voice instructions | Coach speaks start cues, rep/form cues, status updates. | Inline `speak`, voice dropdown/buttons, coach status text. | `POST /api/speak`. | External AIVOICE upstream via env; browser `speechSynthesis` fallback; audio element `#ttsPlayer`. | Server can allow no-auth unless `ENABLE_TTS_NO_AUTH=false`. | Partial/unknown. | Frontend calls `/api/speak` and uses browser TTS fallback; no route tests. | Test `/api/speak`; centralize cue scheduler and error state; auth policy decision. | Phase 4 |
| Speech/voice controls | User toggles voice/mic and gives commands. | Inline SpeechRecognition/SpeechSynthesis code and voice controls. | `/api/speak`; no speech-to-text backend found. | Browser SpeechRecognition; browser TTS; AIVOICE audio. | Browser permission; backend TTS optional auth. | Partial/unknown. | Browser capability checks exist; mic input depends on vendor browser API. | Define supported command grammar and UI states; add tests/manual diagnostics. | Phase 4 |
| Avatar / Three.js / GLTF movement mirroring | User can upload/save avatar and see GLTF mirror movement. | Giant inline avatar runtime: lazy bootstrap, GLTF mounting, `applyPoseToAvatarRig`; `public/vendor/three/**`. | `POST /api/avatar/upload`; `GET/PUT /api/me/profile` for avatar metadata. | Uploaded files under `/uploads/avatars`; profile avatar metadata; Three runtime globals. | Yes for upload/profile. | Partial/fragile. | Three and GLTFLoader local vendor files exist; inline code lazy-loads/probes/mounts GLB and applies pose-to-rig. | Move avatar runtime out of inline script; typed pose packet contract; non-blocking fallback policy. | Phase 5 |
| Workout HUD/cue loop | HUD shows exercise, set, reps, cues, rest/next exercise. | Giant inline active workout state/HUD functions. | Session routes only indirectly. | `ACTIVE_WORKOUT_SELECTION_V1`, `ACTIVE_WORKOUT_COMPLETION_V1`, inline state. | UI gated by auth; HUD local. | Partial. | Inline functions normalize workout prescription, update HUD, dispatch `workout:completed`. | Decouple HUD from inline; connect selection/session/rep write. | Phase 2 |
| Dashboard analytics | Dashboard shows KPIs/history/diagnostics. | `public/dashboard.js`, `public/dashboard.html`, `public/backend-read.js`. | `GET /api/me/history`; diagnostics routes; `/__version`; `/__diagnostic-smoke`. | Backend session history plus localStorage fallback. | History yes; version/smoke no or diagnostics policy dependent. | Partial. | Dashboard maps `completedSessions` from `/api/me/history`; falls back local if token missing. | Also read `/api/progress/dashboard` or reconcile with retention tracking. | Phase 6 |
| Progress dashboard | User sees progress/rewards/check-ins. | `public/retention-flow.js`; dashboard does not currently use progress endpoint as primary. | `GET /api/progress/dashboard`, `GET/POST /api/check-ins`, `GET /api/workouts/reward/latest`. | User data service progress dashboard. | Yes. | Partial. | Retention calls progress routes; dashboard page still centers `/api/me/history`. | Add progress widgets to dashboard and connect workout/session writes. | Phase 6 |
| Workout calendar | User schedules/selects workouts by date. | Inline calendar/program selection code in `public/index.html`; retention program APIs. | `GET /api/programs/current`, `POST /api/programs`; no dedicated calendar route. | Program assignment + local `calendarMeta`/active selection. | Yes for program APIs. | Partial. | Calendar state is inline/local; backend has programs but not calendar-specific endpoints. | Define calendar model and whether it lives in programs or a new route. | Phase 6 |
| Exercise library / 800+ DB | User can browse/search/select exercises and use selected exercise in workout/HUD/session. | `public/exercise-library.js` + `public/exercise-library.html`; main app `exerciseLibraryBtn`; inline listens for `workout:selected`. | `GET /api/exercises/index`, `GET /api/exercises/search`, `GET /api/exercises/:slug`. | `public/exercise-db/index.json` array with 873 exercises + individual JSON/images. | No. | Broken/partial. | Static page can browse/search/filter array; backend search expects `idx.exercises`, so API returns empty; no selection bridge from library page to main HUD. | Fix API shape or index build, add select/start workout bridge, wire exercise IDs to sessions/HUD. | Phase 6 |
| Diagnostics | User/operator sees boot/auth/feature/API diagnostics. | `public/diagnostics-client.js`, `public/landing-diagnostics.js`, status panels, dashboard diagnostics. | `/__version`, `/__diagnostic-smoke`, admin diagnostics routes in server setup. | Diagnostic store/summarizer and route checker libs. | Mixed; admin diagnostics require appropriate role/token. | Partial/working. | Tests cover diagnostics API/client; landing diagnostics probes Three and backend route status. | Separate user diagnostics from operator controls; prevent diagnostics-only capability satisfaction. | Phase 1 / Phase 8 |
| Admin/operator controls | Authorized operator can inspect/modify control-plane behavior. | No dedicated main user UI; diagnostics clients can surface report. | Admin diagnostics/control-plane/enforcement routes in `server.js` before product routes. | `src/lib/enforcementStateStore.js`, `src/lib/adminAuditLog.js`, control-plane libs. | Yes; admin/super-admin role. | Partial/working backend, UI unknown. | Control-plane tests exist; route extraction showed admin setup code but primary product UI has no operator console. | Decide whether to expose an operator console or keep API-only runbooks. | Phase 1 / Ops |

## 4. Frontend module map

| Module | Current owner role | Important functions/state | Backend calls | Status / concerns |
|---|---|---|---|---|
| `public/boot-core.js` | Early boot/build status. | `renderBootStatus`, backend `__version` fetch, build pill. | `GET /__version` hard-coded Render origin. | Working but duplicated with inline `refreshBuildStamp`; hard-coded production origin complicates local/dev. |
| `public/auth-core.js` | Login/register form binding and auth event broadcast. | Form submit, token storage, `auth:changed`, `auth:ready`, overlay hide. | `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`. | Working/partial; duplicate with `auth-ui.js` and inline auth logic. |
| `public/status-panels.js` | Auth/app/feature/system panels. | `updateAuthPropagationStatus`, `updateActivationStatusPanel`, watchdogs. | None directly. | Useful diagnostics, but status panel truth can diverge from actual runtime if duplicate owners mutate DOM. |
| `public/button-runtime.js` | Primary post-login button binding. | Dashboard/library navigation, connect camera, run diagnostics, start workout. | None directly except diagnostics collector. | Mostly working; app-core may also bind nav, so ownership is conditional. |
| `public/profile-runtime.js` | Profile render/hydration after backend read. | `hydrateProfileFromBackend`, `renderSignedInProfile`. | Via `BACKEND_READ_CLIENT.fetchProfile()` -> `/api/me/profile`. | Partial; assumes globals (`loadAvatarAssetForCurrentUser`, `persistUser`, `addLog`) from inline script. |
| `public/app-runtime.js` | App activation/hydration glue and diagnostics. | Auth/profile hydrate, feature panel, fallback `SessionWrite.startSession` creation. | `/api/auth/me`, `/api/me/profile`, `/api/sessions`. | Partial; can fabricate `SessionWrite.startSession` fallback if missing, adding another write path. |
| `public/workout-runtime.js` | Modular camera/session lifecycle shell. | `connectCamera`, `startWorkout`, fullscreen controls, runtime state. | Depends on injected `prepareWorkoutStart`/session functions; route mention `/api/sessions`. | Camera/start shell works; actual TF/rep/avatar loop is still inline. |
| `public/backend-read.js` | Backend read client and storage wrapper. | Token helpers, `fetchProfile`, `fetchHistory`, `normalizeProfile`. | `/api/me/profile`, `/api/me/history`. | Useful; only read-side. |
| `public/session-write.js` | Explicit session write client with legacy fallback. | `startSession`, `completeSession`, fallback observability. | `POST /api/sessions`, `POST /api/sessions/:id/complete`, legacy `/command`. | Missing explicit rep update method despite backend route. |
| `public/retention-flow.js` | Onboarding/retention/progress UI. | Intake/goals/program/check-in rendering, `workout:completed` listener. | Retention/progress/program/workout routes. | API-aligned, but integration with HUD/session lifecycle is event-only. |
| `public/diagnostics-client.js` | Browser diagnostic report collection. | Collect runtime/build/auth/button/avatar diagnostics. | Admin diagnostics/report endpoint. | Working in tests; diagnostic evidence should not replace product flow. |
| `public/landing-diagnostics.js` | Landing/dashboard diagnostic rendering. | Diagnostic report rendering, Three/GLTF probe display. | Admin diagnostics/report, `__version`/smoke. | Good operator insight; not a user-facing repair for runtime gaps. |
| Giant inline script in `public/index.html` | Current de facto app runtime. | Auth remnants, profile, active workout, calendar, voice, TF detector, pose loop, rep counting, avatar/Three, HUD, diagnostics. | Many: auth/profile/sessions/ohsa/avatar/upload/pilot events/speak/legacy command. | Highest-risk area; must be split/deprecated after capabilities are moved to modules. |

## 5. Backend API map

Route list extracted from `server.js`:

| Method | Path | Purpose | Auth requirement | Frontend caller if any | Test coverage if any |
|---|---|---|---|---|---|
| GET | `/` | Serve main app. | No. | Browser navigation. | Indirect frontend/auth tests. |
| GET | `/dashboard.html` | Serve dashboard page. | No. | `app-core.js`, `button-runtime.js`. | None focused. |
| GET | `/exercise-library.html` | Serve library page. | No. | `app-core.js`, `button-runtime.js`. | None focused. |
| GET | `/__version` | Build/version diagnostic. | No. | `boot-core.js`, `dashboard.js`, inline script, `landing-diagnostics.js`. | `diagnostics-api.test.js`. |
| GET | `/__diagnostic-smoke` | Smoke diagnostic. | No. | `dashboard.js`, `landing-diagnostics.js`. | Not in required command. |
| GET | `/health` | Health check/control-plane status. | No. | Inline script. | Control-plane tests. |
| POST | `/api/speak` | Proxy TTS to AIVOICE upstream. | Configurable; no-auth by default unless `ENABLE_TTS_NO_AUTH=false`. | Inline `speak`. | None found. |
| POST | `/api/auth/login` | Pilot/login token issuance. | No. | `auth-core.js`, `auth-ui.js`, inline script. | `pilot-login`, `auth-login-form-submit`, session/retention setup. |
| POST | `/api/auth/register` | Register lightweight user then token. | No. | `auth-core.js`, `auth-ui.js`, inline script. | None focused. |
| GET | `/api/auth/me` | Current auth user contract. | Yes. | `app-runtime.js`, `auth-core.js`, `auth-ui.js`, inline script. | `pilot-login`, `session-api`. |
| POST | `/api/auth/logout` | Logout/token invalidation. | No/optional token behavior. | No caller found. | None found. |
| POST | `/api/auth/bridge` | Legacy/test bridge token route. | Trust-policy based. | No production frontend caller found. | Auth hardening/control-plane/bridge tests. |
| GET | `/api/me` | Auth identity/debug contract. | Yes. | `backend-read.js`, `dashboard.js`, inline/app runtime. | Multiple auth/session/diagnostic tests. |
| POST | `/api/pilot/events` | Append pilot telemetry event. | Optional/user from token if present. | Inline script. | None focused. |
| GET | `/api/exercises/index` | Exercise index API. | No. | No current frontend caller found. | None found. |
| GET | `/api/exercises/search` | Exercise search API. | No. | No current frontend caller found. | None found. |
| GET | `/api/exercises/:slug` | Exercise detail API. | No. | No current frontend caller found. | None found. |
| POST | `/api/sessions` | Start structured workout session. | User-scoped; client sends bearer token. | `app-runtime.js`, inline script, `session-write.js`, `workout-runtime.js`. | `session-api`, `session-write-client`. |
| POST | `/api/sessions/:id/reps` | Append rep update. | User-scoped. | No current frontend caller found. | `session-api`. |
| POST | `/api/sessions/:id/complete` | Complete structured session. | User-scoped. | `session-write.js` constructs path dynamically; inline via client. | `session-api`. |
| GET | `/api/me/profile` | Read profile. | Yes. | `app-runtime.js`, `backend-read.js`, inline script. | `pilot-login`, `session-api`, bridge trace. |
| PUT | `/api/me/profile` | Save profile/avatar metadata. | Yes. | `backend-read.js`, inline script. | `pilot-login`, `session-api`, bridge trace. |
| POST | `/api/ohsa` | Submit overhead squat assessment. | Yes. | Inline script. | `session-api`. |
| GET | `/api/me/ohsa` | Read OHSA history. | Yes. | No current frontend caller found. | `session-api`. |
| GET | `/api/me/history` | Read completed session history. | Yes. | `backend-read.js`, `dashboard.js`. | `session-api`. |
| GET | `/api/client-intake` | Read onboarding intake. | Yes. | `retention-flow.js`. | `retention-api`. |
| POST | `/api/client-intake` | Save onboarding intake. | Yes. | `retention-flow.js`. | `retention-api`. |
| GET | `/api/goals-baseline` | Read goals baseline. | Yes. | `retention-flow.js`. | `retention-api`. |
| POST | `/api/goals-baseline` | Save goals baseline. | Yes. | `retention-flow.js`. | `retention-api`. |
| GET | `/api/programs/current` | Read current assigned program. | Yes. | `retention-flow.js`. | Not directly in required tests except flow context. |
| POST | `/api/programs` | Assign program. | Yes; scoped/client/admin rules. | `retention-flow.js`. | `retention-api`. |
| POST | `/api/workouts/track` | Append retention workout tracking. | Yes. | `retention-flow.js` on `workout:completed`. | `retention-api`. |
| GET | `/api/workouts/reward/latest` | Read latest reward. | Yes. | `retention-flow.js`. | `retention-api`. |
| GET | `/api/check-ins` | Read check-ins. | Yes. | `retention-flow.js`. | `retention-api`. |
| POST | `/api/check-ins` | Save weekly check-in. | Yes. | `retention-flow.js`. | `retention-api`. |
| GET | `/api/progress/dashboard` | Read progress dashboard. | Yes. | `retention-flow.js`. | `retention-api`. |
| GET | `/api/visual-progress-scans` | Read visual scans/comparison. | Yes; feature flag can 404. | No current frontend caller found. | `retention-api`. |
| POST | `/api/visual-progress-scans` | Save visual scan. | Yes; feature flag can 404. | No current frontend caller found. | `retention-api`. |
| POST | `/api/avatar/upload` | Upload `.glb` avatar asset. | Yes. | Inline script. | `session-api`, bridge trace. |
| POST | `/command` | Legacy fitness command fallback. | Optional token; policy can block. | `session-write.js`, inline script. | `session-api`, `session-write-client`. |

## 6. Exercise database map

- File location: `public/exercise-db/index.json` plus 873 individual exercise JSON files and image folders under `public/exercise-db/**`.
- Number of exercises in committed index: **873**.
- Index shape: array of exercise objects. Sample fields: `name`, `force`, `level`, `mechanic`, `equipment`, `primaryMuscles`, `secondaryMuscles`, `instructions`, `category`, `images`, `id`.
- Frontend library caller: `public/exercise-library.html` loads `public/exercise-library.js`, which fetches static `exercise-db/index.json` from asset host candidates and filters in-browser.
- Backend library caller: none found. The backend exposes `/api/exercises/index`, `/api/exercises/search`, `/api/exercises/:slug`, but route caller scan found no current frontend caller.
- Browse/search/select:
  - Browse/search/filter: **yes on the standalone exercise library page** using static JSON.
  - Select into workout/session/HUD: **not confirmed / effectively missing**. Main app listens for `workout:selected`, but the library page does not visibly dispatch a cross-page selected workout/exercise contract in the reviewed code.
- Connection to workout/session/HUD:
  - Inline HUD uses `ACTIVE_WORKOUT_SELECTION_V1` if present, otherwise defaults to Bodyweight Squat.
  - Exercise library cards are display/search focused and do not currently create the active workout selection used by the HUD/session runtime.
- Major backend bug:
  - `server.js` expects `idx.exercises`; the committed `index.json` is an array. `/api/exercises/search` will return an empty array for no query and all queries, even with 873 records present.

## 7. Camera/TensorFlow map

| Item | Current mapping |
|---|---|
| Camera owner | `public/workout-runtime.js` owns `connectCamera`; inline script delegates to `window.WorkoutRuntime.connectCamera()`. |
| Video element | `#video` (fallback `#cameraPreview` in `workout-runtime.js`). |
| Camera activation | `navigator.mediaDevices.getUserMedia({ video: true, audio: false })`; sets `video.srcObject`, `autoplay`, `playsInline`, `muted`, `display/visibility`, calls `video.play()`. |
| TensorFlow/model import path | Inline script expects browser globals such as `poseDetection`, `faceLandmarksDetection`, and `handPoseDetection`; exact source tags are in `public/index.html` rather than modular runtime. |
| Detector initialization | Inline `loadDetector` creates MoveNet `poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, { modelType: SINGLEPOSE_LIGHTNING })`; optional face and hand detectors use TFJS runtime. |
| Pose loop function | Inline `runPoseLoop` / requestAnimationFrame loop estimates poses, updates overlays, rep/HUD/avatar. |
| Rep counter function | Inline state variables `repCount`, `totalReps`, `repPhase`; no explicit module method for rep write. |
| Failure states | Missing `getUserMedia`, permission denial, missing DOM, video play failure, missing `poseDetection`, detector load failures, face/hand tracker fallback, full-body/upper-body acquisition prompts. |
| Starts after camera/session? | Camera starts first in `WorkoutRuntime.connectCamera`; detector/pose loop starts from workout start callback in inline script after session start. |

## 8. Avatar/Three map

| Item | Current mapping |
|---|---|
| Avatar owner | Giant inline script in `public/index.html`; profile runtime triggers lazy load after profile hydration. |
| Three import path | Local vendored `public/vendor/three/build/three.module.js`; diagnostics also check module MIME/probe status. |
| GLTFLoader import path | Local vendored `public/vendor/three/examples/jsm/loaders/GLTFLoader.js`. |
| Lazy-loaded? | Yes. Runtime bootstrap/probe occurs on modal/open/load and after profile avatar metadata is available. |
| Upload/profile routes | `POST /api/avatar/upload` stores `.glb`; `PUT /api/me/profile` persists avatar metadata. |
| Mirrors pose data? | Partially. Inline `applyPoseToAvatarRig` uses latest pose packet to retarget mapped bones and root anchor. |
| Blocks boot? | Intended not to block; there are runtime/probe statuses and fallback render modes. However inline global coupling means errors can still degrade app runtime. |
| Current failure state | Fragile/partial: no avatar saved -> camera/procedural fallback; saved URL 404 clears stale reference; Three/GLTF import/probe failures fall back and log diagnostics; retargeting depends on mapped bones and reliable pose landmarks. |

## 9. AI/voice map

| Item | Current mapping |
|---|---|
| Browser TTS | Inline script checks `speechSynthesis` and uses `SpeechSynthesisUtterance` fallback. |
| Browser speech controls | Inline checks `SpeechRecognition || webkitSpeechRecognition`; mic input is browser-dependent. |
| Backend voice route | `POST /api/speak` proxies `{ text, voice, format, speed, pitch }` to `AIVOICE_URL`/`OPENVOICE_UPSTREAM_URL` defaulting to `https://aivoice-wmrv.onrender.com/speak`. |
| Voice button/dropdown owners | Giant inline script owns `voiceSelect`, Voice On/Off style controls and status elements. |
| Ma’at/Simba status UI | Inline updates `brainStatus`, `brainChipText`, voice support/status elements. |
| When coach should speak | Workout start, good rep/form cue cooldowns, step-back prompts, voice prime. |
| Current failure state | Partial/unknown: route not tested; upstream availability/env not validated in required tests; browser fallback exists; mic support varies by browser. |

## 10. Dashboard/progress map

| Area | Current mapping | Gap |
|---|---|---|
| Dashboard page | `public/dashboard.html` + `public/dashboard.js`. | Page focuses history KPIs and diagnostics, not full progress dashboard endpoint. |
| Read client | `public/backend-read.js` fetches `/api/me/history` and `/api/me/profile`. | No `fetchProgressDashboard` method. |
| Analytics/history endpoint | `GET /api/me/history` returns session history from `sessionService`/user data service integration. | Dashboard falls back to localStorage if no token/history. |
| Progress endpoint | `GET /api/progress/dashboard` used by `retention-flow.js`. | Not primary dashboard data source. |
| Check-ins | `GET/POST /api/check-ins` used by retention. | Dashboard does not surface check-in trend directly. |
| Workout tracking | `POST /api/workouts/track` on `workout:completed` in retention. | Separate from structured session completion, may double-track or diverge. |
| Session writes feed dashboard? | Partially: completed structured sessions feed `/api/me/history`; retention tracking feeds progress/reward summary. | Need a single completion orchestrator that writes session completion and retention tracking with shared IDs. |

## 11. Misalignments found

1. **Exercise index API shape mismatch:** backend expects `{ exercises: [...] }`; committed index is `[...]`.
2. **Exercise backend routes have no frontend callers:** library uses static JSON, not `/api/exercises/*`.
3. **No exercise selection bridge:** browse/search page does not connect selected exercise to `ACTIVE_WORKOUT_SELECTION_V1`, HUD, or session payload.
4. **Rep API has no frontend caller:** `POST /api/sessions/:id/reps` is backend/test-only.
5. **SessionWrite missing rep update method:** explicit API client only starts/completes sessions.
6. **Workout lifecycle has multiple write paths:** inline `sendStartSessionToNode`/`sendEndSessionToNode`, `SessionWrite`, `WorkoutRuntime`, `AppRuntime` fallback, and legacy `/command` overlap.
7. **Dashboard and progress read different stores:** dashboard reads session history; retention reads progress dashboard/rewards/check-ins.
8. **Workout completion event is not the single source of truth:** inline dispatches `workout:completed`, `SessionWrite.completeSession` writes sessions, retention writes workout tracking separately.
9. **Camera and TF detector ownership split:** camera is modular; detector/pose/rep/avatar loop is inline.
10. **Voice has no tests:** `/api/speak` and speech fallback are untested; upstream/env status unknown.
11. **Auth duplicated across modules and inline script:** multiple login/register/auth hydration owners increase regression risk.
12. **Profile runtime depends on inline globals:** profile module calls avatar/persist/log functions that are not owned by profile module.
13. **Avatar runtime is inline and global-heavy:** Three/GLTF diagnostics exist, but avatar lifecycle is not isolated.
14. **Admin/operator capability is backend-first:** no clear UI route for operators even though backend control-plane tests exist.
15. **Diagnostics-only success can mask user-flow failure:** several panels can say dependencies loaded while buttons/session/HUD are not fully connected.
16. **Hard-coded production base URLs:** many frontend modules use `https://mufasa-fitness-node.onrender.com`, complicating local/staging alignment.
17. **Logout route lacks frontend caller:** token clearing may be local-only.
18. **OHSA read route has no frontend caller:** submission exists inline; history endpoint is backend/test-only.
19. **Visual progress scan routes have no frontend caller:** backend/tests exist; UI is absent/unknown.
20. **Tests skew toward API contracts, not full user capability:** required tests pass but do not exercise camera, TF, voice, avatar retargeting, exercise selection, or dashboard/progress integration.

## 12. Recommended repair roadmap

### Phase 1 — boot/auth/status final cleanup

- Choose one auth owner (`auth-core.js`) and remove/disable duplicate inline/auth-ui responsibilities after coverage is added.
- Centralize `NODE_BASE_URL` resolution and remove hard-coded production origins from modules where possible.
- Keep status panels, but make their data read from canonical runtime state rather than DOM inference.
- Add logout UI caller or document route as API-only.
- Keep diagnostics separate from user readiness.

### Phase 2 — workout runtime + session lifecycle

- Make `public/session-write.js` the only structured session writer.
- Add explicit `appendRepUpdate(sessionId, payload)` to `SessionWrite` for `/api/sessions/:id/reps`.
- Refactor `WorkoutRuntime.startWorkout` to own start/stop/complete orchestration and emit state events.
- Remove duplicate inline `sendStartSessionToNode` / `sendEndSessionToNode` paths after parity.
- Ensure `workout:completed` contains the canonical session ID, workout ID, exercise IDs, reps, and duration.

### Phase 3 — camera + TensorFlow + rep tracking

- Move detector initialization and pose loop out of inline script into a `pose-runtime`/`tracking-runtime` module.
- Define a pose packet schema shared by rep counter, avatar, HUD, diagnostics.
- Wire counted reps to `SessionWrite.appendRepUpdate` with debounce/idempotency.
- Add failure UI for missing TF globals, detector load failure, camera permission, and poor body visibility.

### Phase 4 — AI voice coach

- Centralize `speak()` and voice/mic controls in a voice runtime.
- Add backend tests for `/api/speak` with mocked upstream/failure.
- Define cue scheduler: workout start, set start, rep success, form warning, rest start/end, completion.
- Decide auth policy for TTS route and align frontend headers.

### Phase 5 — avatar/Three mirroring

- Extract avatar runtime from inline script.
- Make Three/GLTF imports a lazy, non-blocking service with explicit states.
- Keep camera/procedural fallback, but do not let avatar failure block workout start.
- Document retarget bone map and pose packet mapping.
- Add tests/static checks for import paths and a manual verification checklist for GLB mirroring.

### Phase 6 — exercise library + dashboard/progress integration

- Fix `/api/exercises/*` to support the committed array index or rebuild index as `{ exercises }` consistently.
- Add “Select exercise / Build workout / Start workout” from library into `ACTIVE_WORKOUT_SELECTION_V1` or a backend program/session draft.
- Add dashboard widgets that consume `/api/progress/dashboard`, check-ins, rewards, and session history together.
- Make structured session completion update the data that dashboard/progress use, or make a backend aggregation layer do it.

### Phase 7 — retention/onboarding

- Connect retention program assignment to workout selector/calendar and HUD.
- Ensure onboarding completion creates or selects a first workout plan.
- Make `workout:completed` update retention and rewards exactly once per session.
- Add UI tests for first-login -> onboarding -> workout selection -> completion -> reward.

### Phase 8 — remove/deprecate giant inline leftovers

- After modules own auth/profile/workout/pose/voice/avatar/HUD/calendar, remove the giant inline script in stages.
- Keep only bootstrapping script tags and small config hydration in HTML.
- Add tests that assert deprecated inline functions/routes are no longer present.

## 13. Top 10 broken or misaligned capabilities

1. Exercise API returns wrong/empty data because index shape is array but backend expects `idx.exercises`.
2. Exercise library does not connect browse/search/select to workout/session/HUD.
3. Rep counting does not write to explicit backend rep route.
4. `SessionWrite` lacks a rep update method despite backend support.
5. Workout lifecycle has competing inline/module/legacy write paths.
6. Dashboard history and progress/retention dashboards are not unified.
7. Camera is modular but TensorFlow detector/pose loop remains inline and fragile.
8. AI voice route and browser voice controls are untested and scattered.
9. Avatar/Three GLTF mirroring is real but inline/global-heavy and failure-prone.
10. Auth/profile/status boot responsibilities are duplicated across modules and inline code.

## 14. Recommended next repair phase

**Recommended next repair phase: Phase 2 — workout runtime + session lifecycle**, with a Phase 6 quick fix for the exercise API shape if exercise browsing is blocking demos.

Rationale: auth/session APIs are passing tests, but the central pilot value proposition depends on a reliable session lifecycle. Once start/rep/complete are canonical, camera/TF rep tracking, voice cues, avatar movement, retention rewards, and dashboard analytics can all subscribe to one source of truth.

## 15. Verification commands run

- `npm run lint`
- `node --test test/pilot-login.test.js test/auth-login-form-submit.test.js test/session-api.test.js test/retention-api.test.js`

