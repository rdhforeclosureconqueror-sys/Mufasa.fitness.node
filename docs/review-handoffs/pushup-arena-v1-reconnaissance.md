# Beast Mode Gym → Push-Up Arena V1: reconnaissance and implementation handoff

Date: 2026-09-03. Status: architecture proposal for independent review, before runtime implementation. No merge or deployment is authorized by this document.

Update: the owner subsequently approved touch-first phone entry, camera setup and held start posture as the ready signal. See [the phone/Godot handoff](arena-phone-flow-godot-handoff.md) for the superseding entry sequence and current implementation limits. The standing-gesture-first sequence below is historical; its ownership and unresolved exercise/scoring findings remain relevant.

The member's saved avatar now appears in the existing gym. The owner reports passing bridge/avatar panels and working arrow movement, with the avatar gliding in its rest pose. The next visible deliverable is **that same avatar walking, stopping, and returning to idle in that same gym**. Body gestures will feed the same movement controller. PocketPT will recognize exercise; Godot will animate and present the competition.

This handoff covers the fourteen requested reconnaissance outputs. Existing behavior, proposed behavior, and unavailable evidence are distinguished below. The city intro, other gyms, other games, multiplayer, and skeletal mirroring are outside this implementation.

## 1. Audited revisions and proof boundary

| Item | Revision / evidence |
| --- | --- |
| PocketPT repository | `rdhforeclosureconqueror-sys/Mufasa.fitness.node` |
| Current main at audit | [`2e09f66101c6c77b5485cc4696a739a8a01872de`](https://github.com/rdhforeclosureconqueror-sys/Mufasa.fitness.node/commit/2e09f66101c6c77b5485cc4696a739a8a01872de) |
| Last main change | Merge of [PR #631](https://github.com/rdhforeclosureconqueror-sys/Mufasa.fitness.node/pull/631), after the avatar endpoint in PR #630 |
| Shipped build identity | `pocketpt-avatar-phase2-4fbb437`, Godot 4.5.1; `public/game/push-up-arena/pocketpt-world-build.json` |
| Reported Godot source commit | `4fbb43774a7cb93436eb17a162a78526a2f97509`, Windows project `C:\Users\pftgu\Documents\avlobytest` |
| Accessible Godot repository | `rdhforeclosureconqueror-sys/mufasa-world`, main `a55b495b996999974f4543bed51b1d7462112a6d`; only main exists and its tree is the old demo |
| Current observation | Owner reports the personal avatar and arrow movement working. Screenshot shows READY, PUSH_UP_ARENA, descriptor/download/import/mount PASS, six meshes and one skeleton. |
| Evidence not obtained here | Working Godot source inspection, animation binding, a new authenticated browser session, physical iPhone, account switching, real exercise recognition, and competitive acceptance |
| Readiness | Board `avatar`, development card `avatar-development-pushup-arena-v1`; implementation and human verification remain incomplete |

The accessible PocketPT build contains compiled Godot scripts, not the editable working project. The source must be shared from the existing Windows project to implement walking here, or the Godot developer must make that bounded source change there. Uploading the finished export proved avatar delivery; it did not publish the working Godot source. Do not replace the gym with the demo or edit `.pck`/`.wasm` as source.

## 2. Relevant current files and routes

All current-source references below are relative to the audited PocketPT revision.

| Boundary | Current files / routes | Finding |
| --- | --- | --- |
| Production assembly | `world-bridge-server.js`, `server.js`, `render.yaml` | Backend serves the arena and Godot export. Services are created in the canonical server; the bridge currently receives only the avatar capability. |
| Identity and launch | `public/auth-state-runtime.js`, `public/world-bridge-launch.js`, `src/middleware/auth.js`; `POST /api/game/sessions` | Canonical bearer creates an experience-bound, one-use launch ticket. |
| Arena authorization | `src/world/worldBridge.js`, `config/world-route-authorization-contract.js`; session exchange, bootstrap, session deletion under `/api/game` | HttpOnly arena cookie, ten-minute default expiry, process-local session maps. No second login is needed. |
| Arena shell | `public/arena-push-up.html`; `GET /arena/push-up` | Fixed PUSH_UP_ARENA/push_up context, iframe and ordered bridge diagnostics. No camera/gesture/challenge runner is installed in this shell. |
| Personal avatar | `src/world/avatarBridge.js`, canonical avatar capability in `server.js`; `GET /api/game/avatar/asset?version=…` | Resolves the session member's selected GLB, existing asset ownership, revision and fallback. Preserve this path. |
| Godot mount | Reported `scripts/pocketpt/pocketpt_avatar_loader.gd`, `pocketpt_game_client.gd`, `player/avataranchor` | Runtime import/mount is owner-observed. Source-level controller, skeleton and AnimationTree details cannot be confirmed from this checkout. |
| Camera and pose | `public/runtime-state.js`, `public/pose-runtime.js`, `public/push-up-challenge.js` | Existing dependency loader, MoveNet detector, `pose-runtime:frame` event, CameraController, tracking states and continuity handling. |
| Exercise definition | `exercise-generation/sources/push_up.json`, `exercise-generation/rules.json`, `scripts/lib/exercise-profile-generator.js`; generated `public/exercise-metadata.js` | Current canonical analysis is side-view shoulder–hip–ankle alignment. Elbow angle and depth are explicitly unsupported in this profile. |
| Repetition paths | `public/push-up-challenge.js`, `public/push-up-sequence-engine.js`, `public/generic-exercise-sequence-engine.js`, `public/exercise-sequence-definitions.js`, `public/workout-runtime.js` | Multiple existing paths need reconciliation; see section 4. |
| Challenge page | `public/push-up-challenge.html`, `public/push-up-challenge-page.js`, `public/challenge-controller.js` | Practice/challenge start and manual finish; local recording/comparison. No fixed sixty-second arena run. |
| Motion research | `motion-lab/motion-lab-runtime.js`, `public/motion/*-motion-spec.js`, `public/motion/registry/`, `motion-sources/` | Reusable research, rig profiles, source manifests and diagnostics; not a complete production locomotion library. |
| Results and history | `src/services/challengeService.js`, `src/services/sessionService.js`; `/api/challenges/pushup/results`, `/api/challenges/pushup/leaderboard`, `/api/me/challenges/pushup`, `/api/sessions/*` | Push-up ranking already has a canonical service and OPS store. General workout sessions have a separate existing purpose. |
| Gamification and XP boards | `src/gamification/eventService.js`, `src/leaderboards/leaderboardService.js`; `/api/me/leaderboards/*`, `/api/me/leaderboard-preferences` | Existing push-up completion events; XP leaderboards are separate from push-up score ranking. |
| Voice | `public/coach-runtime.js`, `public/workout-coach-runtime.js`, `server.js`; `POST /api/speak` | Existing audio lifecycle, cue cancellation, preferences and authenticated backend provider proxy. No semantic arena voice endpoint yet. |

## 3. Existing systems to reuse

- Keep the canonical auth/profile/avatar upload and arena-session chain intact. Add narrowly scoped capabilities to the bridge as the avatar integration already does.
- Run one camera stream and one MoveNet inference loop in the PocketPT arena shell. Reuse its local pose event for gesture and exercise consumers. `public/motion/normalized-pose.js` already provides full-body joints and pixel-corrected segment directions. Local consumers may inspect landmarks; the Godot bridge receives processed events only.
- Reuse CameraController, tracking loss/recovery, source-versus-display separation, version metadata and the generic exercise sequence evaluator. Cached/predicted display points cannot qualify exercise.
- Keep `ChallengeController` as the exercise session adapter. Add an arena coordinator for the gym flow, not a second exercise recognizer. Reuse recorder phase/rep event concepts and version compatibility checks, while persisting only bounded V1 evidence needed for results/replay.
- Extend `challengeService` for timed attempts, results, personal bests and champion lookup. Reuse its gamification completion path, including existing event idempotency. Do not route this sixty-second event through the unrelated multiweek `challengeEngineService` schedule.
- Reuse existing voice preferences, cancellation and the backend synthesis implementation. Arena speech requests should resolve semantic content through that service rather than call a provider from Godot.
- Retain existing Movement Lego evidence and Motion Lab as authoring/review tools. Their renderers, local capture store and research clips are not additional arena runtime owners.

## 4. Missing systems and concrete gaps

### Counting authority needs to be resolved

| Existing path | Actual behavior | V1 treatment |
| --- | --- | --- |
| `RepetitionEventEngine` | Uses hip Y excursion, default threshold `.045`; `ExerciseSessionEngine` records these events and the page displays this count. | Must not qualify clean push-up challenge reps. Preserve legacy compatibility while making the approved sequence the sole V1 counting path. |
| `PushUpSequenceMatcher` / GESE | Ordered top/lowering/bottom/rising/top_complete and persistence. Definition is draft / trainer-review-required. Current proposal uses elbow `>145` for top and `<145` for bottom. Body alignment is not a required phase condition. | Reuse evaluator architecture, but these current conditions do not establish approved full depth or full form validation. |
| Pilot workout rule engine | `analyzePushup` uses elbow top `>=150`, bottom `<=105`, confidence `.35`, and a hip-sag heuristic; `completeCycle` tracks top→bottom→top. | Existing logic/evidence to consolidate, not another authoritative rule set to copy. It lacks the required tracking and dwell safeguards. |
| Generated canonical profile | Confidence `.75`, alignment deviation `18°`, temporal/session quality conditions; explicitly excludes elbow/depth assessment and awaits trainer review. | Change the normalized source/capability inputs and regenerate only after the new capability and threshold evidence are reviewed. Do not hand-edit generated metadata. |

Those numbers describe current code, not newly approved exercise targets. Implement one versioned sequence/capability contract consumed by PocketPT recognition and challenge validation; migrate the relevant adapters to it. Do not derive coaching thresholds from animation bone rotations.

Two isolated probes reproduced additional gaps without touching member data:

1. Pilot engine: valid top, valid bottom, then a pose with no keypoints yields `keypointConfidenceOk=false` **and** `repDetected=true, goodRep=true`. Loss of tracking can therefore finish its cycle.
2. Challenge service: `validRepCount: 2, totalScore: 500` persists score 500. The legacy API checks authentication and submission identity, but does not own an attempt deadline or recompute this score from phase evidence.

Other missing pieces are a negotiated control channel, gesture bindings/calibration, avatar animation binding, challenge-zone event integration, coach presentation, an authoritative timed-attempt lifecycle, arena-authenticated result/voice adapters, champion consent projection, persisted ghost cadence and arena-wide first-failure diagnostics.

Current browser personal-best storage uses a shared localStorage key and defaults to `local-user` if auth has not resolved. It is not suitable as cross-account canonical history. Its canvas ghost loops local normalized frames; it is not a champion replay service.

## 5. Proposed control-event schema and routing

Keep `POCKETPT_GODOT_BRIDGE` and protocol version 1 for the existing READY handshake. Negotiate additive, versioned capabilities before enabling new controls: `controlIntent:1`, `challengePresentation:1`, `ghostCadence:1`, `semanticVoice:1`. An older build remains usable for its supported avatar/keyboard behavior and reports new capabilities BLOCKED.

Illustrative control packet:

```json
{
  "type": "POCKETPT_GODOT_BRIDGE",
  "protocolVersion": 1,
  "event": "CONTROL_INTENT",
  "schemaVersion": 1,
  "sessionId": "bootstrap-session-id",
  "generation": 1,
  "sequence": 42,
  "context": "GYM_NAVIGATION",
  "payload": {
    "action": "MOVE_LEFT",
    "intensity": 0.72,
    "confidence": 0.94,
    "state": "active",
    "validForMs": 300
  }
}
```

Actions: `STOP`, `MOVE_LEFT`, `MOVE_RIGHT`, `MOVE_FORWARD`, `MOVE_BACKWARD`, `READY_SIGNAL`, and capability-gated `JUMP`. The STOP payload may contain only `action`; stopping never requires high confidence. READY/JUMP are one-shot triggers, rearmed after a neutral interval. Handshake `READY` and athlete `READY_SIGNAL` are different events.

Movement uses a short receiver-timed lease, refreshed while the gesture remains active. Initial engineering proposal: refresh at most 10 Hz; a lease may not exceed 300 ms. These transport settings require device verification and are not form thresholds. Loss of tracking, neutral, focus/page loss, camera change, context change, disconnect or exit stops movement. An expired lease stops it even when the sender fails to send STOP.

Check exact origin and `event.source === game.contentWindow` in the parent, and the matching parent source in the Godot Web adapter. Validate allowed fields, capability version, action/context, finite bounded numbers, payload size, current session/generation and increasing sequence. Use the exact `targetOrigin`, never `*`. IDs/generations are correlation and replay guards, not credentials or proof of a trustworthy client. This follows the browser's [postMessage security model](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

| Control context | Accepted inputs / behavior |
| --- | --- |
| GYM_NAVIGATION | Movement, STOP, negotiated jump; keyboard/touch and body input converge on one Godot router, with explicit input-source arbitration. |
| WAITING_FOR_READY_SIGNAL | STOP and a fresh READY_SIGNAL after the prompt. Both-hands gesture takes precedence over single-arm gestures. |
| AVATAR_TRANSITION / CAMERA_POSITIONING | Navigation disabled. PocketPT evaluates framing, visibility and start posture. |
| PUSH_UP_CHALLENGE | Versioned movement/form/rep events and authoritative timeline snapshots; no navigation input. |
| RESULTS / RETURN_TO_GYM | Show result; navigation resumes only after avatar standing acknowledgement and fresh standing/neutral body reacquisition. |

Godot maps MOVE directions to the arena camera's ground-plane axes. Gesture labels refer to the member's anatomical left/right arm; undo/handle the existing `flipHorizontal:true` and preview mirror exactly once. Calibrate standing and arm gestures from reliable current joints. Forward/back lean or depth steps remain candidate bindings: 2D pose data must not be treated as measured 3D depth. Use separate front-facing navigation and side-facing exercise setup; retest bindings with both camera facings and mirrored previews.

PocketPT emits a game-agnostic `MOVEMENT_EVENT` carrying movement ID, phase (`TOP_VALID`, `BOTTOM_VALID`, `REP_COMPLETED`), attempt ID, relative timestamp and rules identity. Godot maps it to presentation. A future game can map another detected movement to a boost without changing its detector. Authoritative challenge scoring stays in PocketPT.

## 6. Proposed Push-Up Arena state machine

PocketPT's arena coordinator owns the workflow. Godot owns world/animation state and acknowledges zone and animation events. The backend owns the competitive attempt clock and final result. Messages carry attempt/generation/state revision so delayed acknowledgements cannot advance a later attempt.

| State | Exit condition / action |
| --- | --- |
| ENTER_GYM | Authenticated scope and current avatar mount/fallback resolved; negotiated client ready. |
| WALK_TO_CHALLENGE | Navigation enabled; Godot reports entry into the existing push-up mat zone. |
| COACH_INTRO | Navigation stops; coach appears near mat; semantic intro plays with captions. Completion, or an explicit caption fallback, advances. |
| WAITING_FOR_READY_SIGNAL | Accept a fresh both-hands signal only now. |
| AVATAR_GET_DOWN | Godot performs stand→lower/kneel→push-up start; acknowledge completion. No timer yet. |
| CAMERA_POSITIONING | Coach asks member to move into side-view framing; PocketPT owns the camera overlay. |
| BODY_VISIBLE | Required current shoulder/elbow/wrist/hip/ankle joints are in frame and tracking has stabilized. Loss returns to positioning. |
| PUSH_UP_START_POSITION | Approved top posture and body alignment held with dwell. Visibility alone is insufficient. |
| COUNTDOWN | Backend arms a start; player/ghost presentation is prepared. Loss of required readiness before start cancels that arm and returns to positioning. |
| ACTIVE_CHALLENGE | Sixty-second fixed window. Fresh TOP→BOTTOM→TOP with required gates produces one completed rep. Godot displays movement and score snapshots. |
| CHALLENGE_COMPLETE | Deadline closes scoring; partial final cycle does not count; ghost stops and result finalization begins. |
| AVATAR_STAND | Godot performs the exit animation. Animation delay cannot extend the scoring deadline. |
| RESULTS | Show server-persisted valid reps, compatible previous PB, champion target, record outcome, and saving/error state. |
| LEADERBOARD | Read the canonical ranking. A retry uses the same attempt identity. |
| RETURN_TO_GYM | Require fresh standing neutral before navigation resumes. |
| ABORTED / BLOCKED | Cancellation, expiry, reload, missing capability or unrecoverable boundary. Clear inputs/resources; never invent a successful score. |

During ACTIVE_CHALLENGE, temporary tracking loss makes the current cycle unscorable and requires a fresh valid top before counting again; the clock keeps running. Hiding/reloading the competitive session aborts it for V1. Neutral STOP does not pause or extend a competition. A later practice mode may have different pause behavior.

Green means an accepted rep/target; red identifies a rejected attempt at a rep; a separate unclear-tracking state explains missing evidence. Show text/icons with color. Display time, valid count, form state, top/bottom status and champion target. The live camera/skeleton overlay is PocketPT DOM/canvas above the Godot iframe, not video transmitted into Godot.

## 7. PocketPT vs Bridge vs Godot ownership

| Concern | PocketPT | World Bridge | Godot |
| --- | --- | --- | --- |
| Login / selected avatar | Canonical account, ownership, GLB and revision | Existing scoped bootstrap/download | Import and mount selected visual |
| Camera / body intelligence | One stream, MoveNet, geometry, confidence, calibration, recognition | Processed intents/events only | No detector or raw camera feed |
| Navigation | Recognize body gesture | Validate and route intent/context | CharacterBody movement, collision, jump/land |
| Walking / exercise pose | Semantic action/phase | Commands and acknowledgements | Animation binding, blending, floor contacts |
| Gym / mat / coach | Challenge identity and content | Zone/voice/presentation events | Preserve gym, locate zone and characters |
| Exercise count | One approved versioned recognition contract | Attempt-scoped observations/snapshots | Visual feedback; never increments authoritative score from an animation |
| Timer / result | Backend-owned start, deadline, persistence and qualification | Timeline/state projection | Render the supplied timeline |
| Champion / replay | Canonical record, privacy projection, recorded cadence | Bounded authorized DTO/assets | Champion placement and timed animation |
| Voice | Content, provider access, preferences and cancellation policy | Semantic request, safe audio delivery | Requested V1 audio playback and coach presentation |

### Animation implementation decision

First inventory the working source: skeleton names, parent/rest transforms, existing AnimationPlayer/AnimationTree, clip names, track targets, source scale/facing and licenses. Also identify rest-pose restoration scripts and every active bone writer so the existing movement test cannot overwrite walking each frame. Bind animations to the successfully imported member skeleton. Do not silently replace the member with the Motion Lab reference avatar.

Use one animation state owner. An AnimationTree can blend clips owned by an AnimationPlayer; simultaneously driving both playback systems would create competing state. [Godot 4.5 AnimationTree documentation](https://docs.godotengine.org/en/4.5/classes/class_animationtree.html).

Matching bone names alone is insufficient across rigs; rest transforms and scale also matter. Godot's editor retargeting workflow is not automatically applied to GLBs downloaded by `GLTFDocument.append_from_buffer()`. After the source audit, choose either proven native-compatible tracks or an explicit runtime adapter. `RetargetModifier3D` is an available runtime option if the existing rig hierarchy and mapping support it, not a promise that every uploaded model will work. Preserve the current rig/mesh bindings and fail visibly for unsupported mappings. [Retargeting guide](https://docs.godotengine.org/en/4.5/tutorials/assets_pipeline/retargeting_3d_skeletons.html), [RetargetModifier3D](https://docs.godotengine.org/en/4.5/classes/class_retargetmodifier3d.html).

Initial states: IDLE, WALK_FORWARD/BACKWARD, STRAFE_LEFT/RIGHT, JUMP/LAND, KNEEL/LOWER, PUSH_UP_START/DOWN/UP, STAND_UP. Start by proving idle/walk/stop using the existing arrows. Drive locomotion from actual movement after collision, not button state alone; walking into a wall must not keep translating the mesh. Use controller-owned displacement with compatible in-place clips for the first proof. Audit root motion before adding it so displacement is not applied twice. Evaluate floor contacts and stride on the personal model, not just the fallback.

Keep the existing player body/camera and gym geometry. Any posture-specific collision adjustment must be scoped to that same player and restored on exit. Animation failures must not leave an input lock, remove the personal avatar or reset the gym. Do not substitute the synthesized squat for a push-up.

## 8. Persistence and authoritative timer plan

Extend `challengeService` and its existing `OPS_DIR/pushup-challenge-results.json` store. Preserve old `results` records while adding versioned attempt and cadence fields with an explicit migration. Use atomic writes, fail closed on unreadable/corrupt data, and keep operational records out of Git. Do not create a competing leaderboard database.

An attempt contains: server-issued attempt ID; session-bound member internally; experience/challenge/variant; sixty-second duration; rules/profile/template versions; status; start/deadline metadata; accepted phase/rep events; quality/qualification; consent snapshot; final result ID; and gamification delivery state. Public projections exclude the member's private record. Use `standard_pushup`, one point per accepted rep for this V1 rule set; retain legacy weighted variants separately.

Proposed arena routes (not present yet), all using the existing arena session and canonical service instances:

| Route | Purpose |
| --- | --- |
| `GET /api/game/challenge` | Versioned rules identity, duration, eligible champion target and member PB |
| `POST /api/game/attempts` | Create/arm a session-owned attempt after readiness |
| `GET /api/game/attempts/:id` | Owned timeline, status and final-result readback |
| `POST /api/game/attempts/:id/events` | Bounded, sequenced phase/quality evidence; idempotent duplicate handling |
| `POST /api/game/attempts/:id/complete` | Finalize/read back the same result after deadline |
| `POST /api/game/attempts/:id/cancel` | Abort without creating a qualifying result |
| `GET /api/game/leaderboard` | Canonical push-up ranking projected for this rule set |
| `GET /api/game/ghosts/:performanceId` | Own or approved competitor cadence, subject to current access/consent |
| `POST /api/game/voice/events` | Allowlisted semantic cue through the shared synthesis service |

The backend is the only competitive clock owner. It establishes a start/deadline and uses an injected monotonic clock for the active run. The browser estimates the supplied timeline for smooth display; Godot renders that projection. Neither setInterval frequency nor animation length adds time. Persist wall-clock metadata for audit; interrupted server-process attempts become aborted instead of gaining a new sixty seconds.

For the initial ranked implementation, phase evidence must arrive before the backend cutoff; events received at/after the deadline are rejected even when backdated. This is conservative and can reject an in-flight final rep on a slow connection. Measure that loss explicitly before competitive acceptance; any later bounded arrival grace must be versioned and separately reviewed, not silently added by Godot. Deadline/receipt tests must document this tradeoff.

Recompute score from the accepted event sequence, never `score`, `validRepCount` or a Godot animation-complete payload supplied by a client. Validate version, order, current top reestablishment, confidence/form gates, durations and bounded timestamps. Use the same approved PocketPT rules/evaluator rather than duplicate threshold math on the server. Processed measurement evidence may be sent to the PocketPT backend for revalidation; it does not go to Godot.

Make finalization idempotent by member+attempt. A successful write with a lost response must read back the same result/PB/rank, not submit again. Preserve the existing `pushup.session.completed` / milestone event path and add recoverable delivery keyed to the committed result. Do not also award workout-completed XP for the same attempt through a second route.

Legacy client-reported results remain available as legacy history; they lack the timed evidence to become new V1 qualifying records automatically. Filter the new champion/PB/ranking by comparable variant, duration, rules and qualification. Browser localStorage is not the canonical source of ME VS ME.

## 9. Ghost-performance format and champion selection

Keep **identity presentation** and **performance** separate. A champion DTO links a permitted display name/avatar projection to an opaque performance ID. It must not expose an arbitrary member ID lookup or reuse the player's private avatar endpoint to fetch other members.

Illustrative minimum performance (three synthetic example reps, not an observed champion):

```json
{
  "schemaVersion": 1,
  "performanceId": "performance-id",
  "attemptId": "attempt-id",
  "exerciseId": "push_up",
  "variant": "standard_pushup",
  "challengePolicyVersion": "push_up_60s_standard_v1",
  "rulesVersion": "approved-rules-version",
  "profileFingerprint": "approved-profile-fingerprint",
  "templateFingerprint": "approved-sequence-fingerprint",
  "durationMs": 60000,
  "timeOrigin": "attempt_start",
  "captureKind": "rep_timestamps",
  "validRepCount": 3,
  "repCompletedAtMs": [1080, 2040, 3010],
  "phaseEvents": []
}
```

Require finite increasing timestamps within the accepted window, array count matching score, bounded size and compatible versions. Optional phase events later store actual top/bottom/return times; no raw video is required. Separate permission controls whether cadence can be shared and whether a personal avatar can be shown. Own historical playback uses the same format.

At arm time, freeze the opponent performance ID/score so a new leaderboard leader does not change the current race. Recheck presentation consent on asset delivery and invalidate personal presentation on revocation. Without avatar permission, use a clearly generic ghost with only permitted record information.

Playback uses recorded rep timestamps on the shared attempt timeline. For each timestamp, schedule an authored push-up cycle to finish at that time, holding at the top for remaining gaps. If only completion times exist, within-rep pose timing is an approximation and must not be described as captured skeletal motion. Optional phase events improve that timing. Seek by elapsed time after a slow frame; do not fire a backlog of visible reps, repeat the recording forever, or evenly distribute `score / 60`.

Old scores without cadence display a record target and “replay unavailable.” No fabricated replay. A missing or malformed ghost does not prevent an otherwise valid personal challenge.

V1 champion target is the highest qualifying comparable push-up record, with deterministic ties (reps, then earliest qualifying completion, then stable result ID). Model separate `allTimeRecordHolder` and `monthlyChampion` references. Future monthly awards use calendar-month boundaries and a configured challenge timezone, eligibility and award-policy version; the existing XP `monthly` board is a rolling thirty-day window and must not be reused for this rule. Prior-month winners may compete and hold the all-time record but are excluded from the next normal monthly title. Do not assign the alternate award name or implement a hall of fame in V1.

## 10. Security, privacy and browser behavior

- Keep canonical bearer and provider credentials out of Godot packets/builds. Arena result and voice adapters must resolve the member from the arena session; existing `/api/challenges/pushup/results` and `/api/speak` expect canonical bearer auth, so calling them with only the arena cookie will not solve integration.
- Add explicit same-origin/JSON and CSRF protections plus rate/size limits to cookie-authenticated writes. Reuse existing protection mechanisms where suitable; record new routes in the authorization contract. Do not weaken the existing bearer routes or trust a payload member ID.
- On session expiry, exit or identity change, stop controls, abort pending generations, clear personal assets and prevent scoring. Audit canonical logout/revocation integration: current bridge maps expire/revoke on arena exit, but canonical logout is not wired to them. Prevent qualifying runs through the pilot/test bypass identity.
- Challenge-service leaderboard consent and XP visibility/name preferences are distinct today. Neither grants public use of a member's avatar or private motion trace. Extend canonical member preferences/consent with explicit arena presentation and cadence choices, defaulting personal display/sharing off. Support revocation and privacy-respecting fallback.
- A browser detector and a validated event sequence are not tamper-proof evidence of a real human performance. Distinguish protocol-valid/client-detected results from reviewed competitive qualification. The existing gamification label `authoritative-write` proves persistence, not real-world form. Resolve the champion qualification policy before public record promotion; do not certify client-supplied totals as verified.
- Obtain camera permission in the PocketPT parent and keep Godot's iframe free of camera access. HTTPS and browser permission are still required. Provide one explicit camera/audio enable action when the platform requires it; body gestures cannot grant browser permission. After setup, the core ready/start flow remains gesture-driven. [Camera API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [audio autoplay behavior](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).
- Resolve semantic coach cues through existing content/preferences and the backend voice provider. Reuse/refactor the current provider proxy into a shared internal service, with bounded cancellation and caching of approved generic cues. Godot receives bounded audio or a scoped same-origin audio reference and acknowledges playback; suppress duplicate browser playback. Captions and an explicit enable/retry path handle autoplay or provider failure. Do not let TTS duration control the competition clock.
- The shell currently reveals the Godot iframe on HTML `onload`, before engine/avatar readiness, and checks message origin without checking source. Fix this in the arena-shell phase. A branded Lion's Den cover should remain until actual world/presentation readiness. A prerendered intro video can run over loading; the Godot city scene cannot run before its engine boots. Video sourcing remains separate from the walking milestone.
- Restrict diagnostics to safe codes, counts, versions and boundary timings. Do not export raw landmarks/video, private member records, credentials or provider responses into the shared debug report.

## 11. Phased delivery plan

| Phase | Reviewable outcome | Gate |
| --- | --- | --- |
| 1 — Reconnaissance | This handoff, exact baseline, ownership and evidence | Independent architecture review; no runtime implementation in this PR |
| 2 — Control protocol | Negotiated intent/context/state messages; STOP/left/right/forward/back/READY contract | Wrong origin/source, stale packets and lost input fail safely |
| 3 — Godot locomotion | Existing personal avatar idle/walk/stop with arrows first, then the same router with basic body gestures; strafe/jump and floor transitions as assets permit | Working source shared; compatible licensed clips; human floor/stride/transition inspection |
| 4 — Arena coordinator | Existing mat, coach introduction, ready signal, animation acknowledgements and camera-positioning flow | No timer before fresh start readiness; no navigation during exercise |
| 5 — Rep engine | One approved top/bottom/top authority using existing evaluators and reviewed canonical definitions | Real positive/negative exercise evidence, tracking-loss and aspect-ratio checks |
| 6 — Timer and results | Backend sixty-second cutoff, canonical idempotent save, PB/readback | Deadline, network latency, retry, restart and duplicate-award checks |
| 7 — Champion | Rule-compatible record lookup and consent-safe identity/presentation | Legacy/unqualified/private/pilot entries cannot become a public champion |
| 8 — Ghost | Persist and replay actual cadence; same format supports own PB | Irregular cadence and pauses remain faithful; no fake old-record replay |
| 9 — Voice | Semantic cues through existing provider service; Godot playback | No secrets, duplicate audio or TTS-owned timer; captions work |
| 10 — Hardening | First-failure diagnostics and complete desktop/iPhone journey | Independent developer review plus human/device acceptance before merge |

The protocol and locomotion source work should meet at one small visible proof: the currently loaded avatar walks left/right/forward/back and stops in the approved gym. The full ten-phase plan is not a reason to delay that proof or rebuild the import pipeline.

## 12. Risks and blockers

| Risk / blocker | Resolution required |
| --- | --- |
| Working Godot source is unavailable in the connected repo | Share the exact `avlobytest` project on a review branch, preserving the active main scene and assets. PowerShell can upload it; another full design conversation with Godot Codex is unnecessary. |
| Imported skeleton is not proven animation-compatible | Inspect actual member rig and clip bindings, then prove runtime replacement and a second rig/account. Mesh/skeleton import PASS is not animation PASS. |
| Reference coverage overstates ready animation coverage | All 17 Lego entries are CANDIDATE; stand-to-plank is `reference-only-not-wired`; the product registry has a native push-up and a development dance, not walking/strafe/get-up clips. |
| Existing push-up clip has unresolved metadata | Native Avaturn provenance says `licenseStatus: not-cleared`, human verification pending, with a head/face transparency defect noted. Resolve reuse rights/visual acceptance before shipping it as an arena asset. This is a repository metadata finding, not a legal conclusion. |
| Recognition paths disagree and have reproduced gaps | Consolidate through reviewed capability/sequence inputs; reject missing/stale frames; correct anisotropic image-coordinate angle calculations before approving thresholds. |
| Existing results trust client totals and have no run window | Add authoritative attempt and qualification validation to the existing service before record promotion. |
| Forward/back gesture ambiguity and camera view changes | Calibrate/test bindings, explicitly switch navigation/exercise context, require neutral reacquisition and retain accessible keyboard/touch alternatives. |
| Browser + Godot performance | Test concurrent MoveNet/WebGL/WASM, memory, cold load and background behavior on the physical target iPhone. Existing avatar observation does not cover this workload. |
| Coach asset, public champion consent, award policy | Resolve approved coach presentation; use generic champion fallback absent consent; leave unapproved monthly naming outside V1. |
| Session expiry, backend restart or multiple instances | Do not start a run without enough session lifetime; abort interrupted runs safely. Current in-memory bridge sessions require one instance or a deliberate shared-session change before horizontal scaling. |

## 13. Expected implementation files

This reconnaissance change contains this document, refreshed bridge status and canonical readiness definitions/evidence only. The following are **expected future runtime changes**, not implemented files or final Godot paths:

| Area | Expected existing changes / proposed additions |
| --- | --- |
| Arena UI | `public/arena-push-up.html`; proposed `public/arena-push-up-runtime.js`, `public/world-control-runtime.js`, `public/body-control-intents.js` |
| Recognition | `public/push-up-challenge.js`, `public/push-up-sequence-engine.js`, `public/generic-exercise-sequence-engine.js`, `public/exercise-sequence-definitions.js`, relevant adapter in `public/workout-runtime.js`; extract/reuse existing logic, do not add another recognizer |
| Canonical content | `exercise-generation/sources/push_up.json`, `exercise-generation/rules.json`, schemas/generator/template as required, generated artifacts via the generator; proposed `data/challenges/pushup-arena.v1.json` for arena wording/policy, not duplicate exercise thresholds |
| Backend adapters | `server.js`, `world-bridge-server.js`, `src/world/worldBridge.js`, `config/world-route-authorization-contract.js`; proposed small `src/world/challengeBridge.js` and `src/world/voiceBridge.js` |
| Results/privacy/events | `src/services/challengeService.js`, `src/leaderboards/leaderboardService.js` preferences/projections as needed, `src/gamification/eventService.js`; use existing canonical stores |
| Shared voice | Extract current `/api/speak` provider operation into a shared service while retaining the current route contract; reuse cue cancellation/preferences without starting speech recognition |
| Godot source, after access | Existing `player.gd`, `scripts/pocketpt/pocketpt_game_client.gd`, avatar mount lifecycle hooks; proposed control router, animation controller, arena coordinator and ghost presenter; adapt the existing mat scripts once inspected |
| Godot scene/assets | Existing active player/gym scene, AnimationTree/AnimationLibrary and approved clips; only scoped controller/zone/coach wiring, no environment redesign or startup-scene swap |
| Export | Regenerated `public/game/push-up-arena/*` plus build/source manifest after each Godot slice is validated; no hand-patched binaries |
| Evidence | Focused tests, bridge/handoff documentation and canonical readiness CLI updates; never commit OPS state or member recordings |

## 14. Proposed test plan and review gate

| Boundary | Required proof |
| --- | --- |
| Baseline/auth/avatar | Preserve working launch; Account A/B, replacement, missing avatar, expiry, exit/re-entry; correct personal rig and no previous-member visual |
| Control protocol | Exact origin/source, version negotiation, malformed/oversized packets, unknown action, stale generation/sequence, lease expiry, duplicate READY, context rejection, low-confidence STOP |
| Camera/gestures | One stream/detector; front/rear and mirrored views; left/right anatomical mapping; jitter/occlusion; camera switch/denial; front navigation→side exercise→standing return |
| Locomotion/animation | Actual member idle/walk/stop, walls/collisions, strafe/jump/land, stable floor contacts, no double root motion, mount replacement while animations exist, stand↔floor transitions |
| Recognition | Ordered full cycle versus top-only, bottom-first, shallow cycle, low confidence at return, wrong body line, stale/cached landmarks, tracking loss mid-cycle, slow/fast pace, varied frame rate and portrait/landscape aspect ratio; trainer-reviewed real examples |
| Challenge state | Zone enter/exit, intro once, early READY ignored, animation acknowledgement missing/late, full-body visibility without valid top, countdown readiness loss, navigation blocked in floor context |
| Clock | Fake-clock tests at start and immediately before/at/after deadline; fixed 60,000 ms; duplicate completion; slow render/TTS cannot extend time; network-late final rep behavior measured; background/reload/restart handling |
| Persistence/gamification | Owner isolation, forged totals rejected, versions checked, atomic migration, duplicate submission and response loss, failed event delivery recoverable without duplicate XP, private history remains private |
| Champion/ghost | Ties, qualifying rule set, old score without cadence, corrupted/nonmonotonic timing, irregular pace and pauses, seek without duplicate count, consent denial/revocation, generic fallback, own historical replay |
| Voice | Semantic allowlist, session/rate/size checks, no provider key in export, provider timeout, mute/cancel, autoplay denial and captions, single playback owner |
| Diagnostics | Ordered PASS/FAIL/BLOCKED/NOT_STARTED/SKIP; first broken prerequisite remains first; downstream waiting cannot hide it; optional absent ghost marked unavailable without blocking a personal attempt |
| Whole journey | Owner's 24 V1 acceptance criteria on desktop and a physical iPhone; human judges animation quality, exercise validity and game usability |

Diagnostic order should cover authenticated member → handshake → challenge scope → avatar descriptor/download/import/mount → animation capability → control channel → detector → visibility → ready gesture → state/animation acknowledgement → rep detector → timer → persistence → leaderboard → ghost load/playback. Voice is a parallel presentation boundary with its own visible fallback. Keep an unstarted stage unstarted; do not infer PASS from another panel being green.

### Checks executed for this reconnaissance

- Read-only inspection of current main, working tree separation, Godot repository main/tree/branch inventory and the existing systems above.
- **50 existing tests passed**:

  ```sh
  node --test --test-reporter=dot test/push-up-sequence-engine.test.js test/generic-exercise-sequence-engine.test.js test/push-up-challenge-mvp.test.js test/push-up-tracking-continuity.test.js
  ```

- The two isolated probes in section 4 reproduced scoring gaps that these tests do not prevent. No production writes or member records were used.
- Readiness validation and `git diff --check` passed for the four documentation/readiness files. The fourteen numbered outputs and both illustrative JSON packets were checked; no runtime file or OPS state is included.
- No claim of full-suite, authenticated browser, actual MoveNet exercise, Godot animation or physical-device validation. Those remain required implementation acceptance work.

Before merge, a second developer must independently review the ownership, authentication adapters, rule consolidation, timing/receipt policy, result idempotency, privacy projection and actual Godot source. A machine cannot approve trainer thresholds, movement naturalness or physical-device acceptance. Record those decisions through the authorized readiness UI/API. Keep the implementation in draft review until the applicable evidence exists.
