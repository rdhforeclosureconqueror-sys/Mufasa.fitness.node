# Independent review — Arena diagnostics and phone setup

Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`

Branch: `review/arena-first-failure-diagnostics-20260903`

Draft PR: [#633](https://github.com/rdhforeclosureconqueror-sys/Mufasa.fitness.node/pull/633)

Main/base verified: `743c9ac4490264dbea95176a97c716a95ed28efa`.

Previous keyboard repair: `4bc9b0f8951529d842bc6c966a11c36000739da9`, followed by evidence head `d56fd119e33fc19a066da2175b6ccd74aadce199`.

Tested phone implementation: `ee1384420493011b114a72728a450bd99269b018`. Review the actual current PR head as well as that implementation; a later handoff/readiness commit records its evidence. The owner explicitly approved expanding the same draft PR to include the phone flow. Earlier independent findings apply only to the previously reviewed scope. Re-review the expanded change before owner acceptance. Do not merge or deploy.

## What the owner can expect

The existing bridge debug panel becomes Arena Diagnostics, with observed first failure, blocked/unconnected dependencies, ownership and safe next actions. Opening focuses Close; Escape restores focus to its toggle. Repeated updates preserve manual-copy focus.

The arena now has phone entry and guided camera setup. A compatible Godot build can negotiate thumb controls, Go to mat, caption briefing and down/stand acknowledgements. The current deployed export only sends legacy READY: it does not yet implement touch controls or the optional diagnostic sender. It remains usable for its existing avatar/keyboard behavior. Touch stays unavailable; Check my camera is usable independently.

Camera access is explicit. The canonical CameraController, MoveNet runtime and PoseCaptureEngine provide the camera check. Visibility reports fresh required joints, not an accepted push-up posture. Full start-position/rep rules remain draft/unconnected, so this implementation cannot start a countdown, count challenge reps, save a score or update a leaderboard. Coach audio and the actual coach avatar are not implemented here; the briefing is captioned.

The approved gym, generated Godot export, avatar import pipeline, server/auth implementation, exercise definitions and result stores remain unchanged. Read the [Godot/phone integration handoff](arena-phone-flow-godot-handoff.md) for the exact receiver contract, current state machine and remaining work.

## Changed-file scope

| File | Review focus |
| --- | --- |
| `public/arena-push-up.html` | Existing frame/exit plus phone controls, camera preview, responsive layout, explicit scripts and accessible labels. |
| `public/arena-push-up.js` | Canonical config/ticket/bootstrap/build flow; source/origin isolation; phone lifecycle and expiry/exit cleanup. |
| `public/arena-diagnostics.js` | Dependency model, allowlists, truthful states, safe copying, focus/Escape, new camera/control boundaries. |
| `public/arena-phone-flow.js` | Capability negotiation, input contexts, movement leases, command correlation, setup/return/suspension; no competitive counting. |
| `public/arena-camera.js` | Canonical camera/capture reuse; permission cancellation, late grants, one detector, required-joint visibility and cleanup. |
| `public/arena-phone-ui.js` | Thumb pointer handling, touch/keyboard recovery controls, camera opt-in, frame interaction lock and local camera selector. |
| `test/arena-diagnostics.test.js` | Diagnostics/launcher coverage, real focus-path fixture, iframe isolation and phone lifecycle integration. |
| `test/arena-phone-flow.test.js` | Scoped protocol, contexts, stale acknowledgements, leases, no start/counting from visibility. |
| `test/arena-camera.test.js` | Real canonical CameraController with controlled devices, late permission/model completion, switching and disposal. |
| `test/arena-phone-ui.test.js` | Actual UI bindings in a controlled DOM fixture, pointer cancellation, focus, camera opt-in and preview HTTP assets. |
| `test/world-bridge-pocketpt-finish.test.js` | Existing bridge assertions updated for scripts extracted from HTML. |
| `scripts/preview-arena-diagnostics.js` | Isolated synthetic preview. Never imported by a production server; substitutes a camera double only in this local server. |
| `data/readiness/development-cards.json` | Existing PR's diagnostics development-card definition. Canonical requirements remain unchanged. |
| `data/readiness/development-evidence.json` | Canonical CLI evidence for diagnostics and V1 phone work, without human approval. |
| `docs/review-handoffs/pushup-arena-v1-reconnaissance.md` | Historical reconnaissance with explicit phone-first sequence supersession. |
| `docs/review-handoffs/arena-phone-flow-godot-handoff.md` | Exact remaining Godot integration and exercise/competition limits. |
| This handoff | Review procedure, proof limits and owner preview. |

Expected full PR scope: seventeen files. No `public/game/push-up-arena/*`, generated `data/ops/`, Godot scenes/animations, server/auth services, exercise rules, scores or deployment configuration may change.

## Required independent checks

1. **Base and scope:** fetch current main/head, inspect all seventeen files and preserve the merged PR #632 planning material. Verify the current head descends from the tested implementation.
2. **Launch/auth:** preserve one-use fragment ticket clearing, same-origin cookie requests, canonical return destination and fixed PUSH_UP_ARENA/push_up context. No bearer tokens copied into the arena.
3. **First failure:** bootstrap failure blocks dependents; actual import/video/model failure names its boundary. READY does not imply avatar/animation/challenge success. Retry, expiry and frame replacement clear stale successes. A camera grant does not prove playable video or inference.
4. **Evidence:** no sender means unconnected, no capability means disabled touch, and BODY_VISIBLE cannot imply valid posture/countdown/reps. Fallback never becomes personal-avatar success. Caption briefing never becomes voice PASS.
5. **Message isolation:** exact current iframe/source/origin and numeric protocol v1. Diagnostic and phone flow request IDs and counters are independent. Check invalid versions, sequences, old generations and replies to cancelled/replaced commands. Godot cannot turn PocketPT camera, identity, readiness, timer or score rows green.
6. **Controls:** pointer up/cancel/lost capture, blur, rotation, hide, reset and exit stop held movement. Leases are 300 ms, refreshed at ten Hz. Keyboard activation of a thumb button is a bounded nudge. Camera setup disallows navigation; return from an attempted lowering requires a matching standing acknowledgement. Read the receiver's required context lock; HTML inert alone is not controller proof.
7. **Camera:** no getUserMedia/model download on launch. Use the existing controller/capture/runtime. Check denied and unanswered permission, late grants after cancel, model completion after exit, camera switching, track end, stale frames, orientation and hide. Only one detector per session; no second inference owner, recorder, profile store or body-data bridge.
8. **Bounded behavior:** preserve existing HTTP/frame/READY/exit limits. Phone capability wait is three seconds, command acknowledgement twenty seconds and camera/model startup thirty seconds. Late valid capability replies cannot interrupt camera setup. Missing standing acknowledgement leaves movement locked. No polling/retry loop or second avatar download.
9. **Privacy:** fixed safe diagnostic strings only; no raw browser/device errors, device IDs, member/session identifiers, tokens, video, landmarks or health data in copied reports. Camera IDs are confined to the local selector. Clipboard denial exposes manual copying without claiming success.
10. **Keyboard/device UX:** focused toggle → Enter → Close focus → immediate Escape → hidden board and toggle focus. Test camera/return/stop controls, pointer release outside the button, scrolling, small portrait/landscape layouts and diagnostics access. Required controls must remain reachable. Real browser and physical-iPhone acceptance are still open.
11. **Production/fixture separation:** the production page loads the real `arena-camera.js`. Only the isolated preview server supplies the camera double and synthetic APIs. No query parameter enables simulated evidence in production. A synthetic green panel is not production acceptance.

## Automated validation

The implementer's current result is **120 passing tests**, zero failures/skips, using:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
node --test --test-reporter=spec test/arena-phone-flow.test.js test/arena-camera.test.js test/arena-phone-ui.test.js test/arena-diagnostics.test.js test/world-bridge-pocketpt-finish.test.js test/world-bridge-production-entry.test.js test/world-bridge-mobile-auth.test.js test/world-bridge.test.js test/world-avatar-bridge.test.js test/push-up-challenge-mvp.test.js test/push-up-tracking-continuity.test.js
npm run readiness:validate -- --base 743c9ac4490264dbea95176a97c716a95ed28efa
git diff --check 743c9ac4490264dbea95176a97c716a95ed28efa
```

The earlier focused keyboard regression failed before its repair. Its realistic focus/bubbling coverage remains in this suite. The previous independent reviewer could not rerun the earlier 55-test suite due to GitHub DNS failure; the 120-pass result above is implementation evidence, not their independent execution.

No new live-browser, authenticated Godot, real camera/movement, visual or physical-iPhone acceptance is claimed. The cloud browser rejected the preview with `net::ERR_BLOCKED_BY_CLIENT`. HTTP preview asset and JavaScript checks pass but do not establish rendered layout quality. The owner and reviewer must perform the checks below.

## Local visual preview from PowerShell

In a checkout of this branch:

```powershell
node scripts/preview-arena-diagnostics.js
```

Open its printed local URL. Stop with Ctrl+C. No real account, avatar, camera, model or score is used. A prominent SYNTHETIC PREVIEW banner stays visible.

| Case | Expected behavior |
| --- | --- |
| `legacy` | READY succeeds, touch/diagnostic sender remain unavailable; Check my camera uses the simulated camera only. |
| `phone-flow` | Go to mat → simulated arrival → caption briefing → Set up my camera → Enable camera → simulated body visibility. No countdown. Return waits for simulated standing. Thumb controls send commands. |
| `phone-timeout` | Capabilities arrive; mat command never acknowledges. After twenty seconds, report command failure and allow another attempt. |
| `phone-camera-denied` | Mat/briefing/setup work; Enable camera reports a synthetic permission failure. Retry and Return remain available. |
| `avatar-failure` | Download PASS, import FAIL, mount BLOCKED; first failure is import. |
| `avatar-pass` | Separately reported import/mount pass; no inferred walking/body/challenge success. |
| `unauthorized` | Bootstrap fails; no gym launches. |
| `fallback` | Default and personal-avatar evidence remain distinct. |
| `clipboard-denied` | Copy exposes a selectable report, not false success. |
| `390px narrow layout` | Inspect scrolling and controls. This is not an iPhone emulator. |

## Owner/device acceptance after review and deployment decision

1. Launch normally from signed-in PocketPT. Confirm the same personal avatar, approved gym and existing keyboard movement.
2. On the current export, expect touch movement and the new Godot diagnostic reporter to be unavailable. Their missing reports do not prove the avatar failed.
3. Tap Check my camera, then Enable camera. Only now should permission/model initialization begin. Test permission denial/retry, front/back selection where offered, rotation and app backgrounding. The camera must stop on Return/Exit and not restart automatically.
4. Check framing guidance and BODY_VISIBLE with current joints. It must not start a countdown, score movement or label the person ready for a technically valid push-up.
5. Inspect diagnostics, copying, Escape and recovery controls on desktop and a physical iPhone. Record human acceptance through the authorized readiness UI/API.
6. After the Godot receiver/animations are reviewed and exported, repeat with Go to mat and in-world mat taps, correct walking/idle, real arrival/down/stand acknowledgements and keyboard locking during setup. That is separate evidence from this receiver-only PocketPT implementation.

## Required response

Return reviewed base/head SHA, scope, PASS/FAIL/BLOCKED for each item, commands/results independently obtained, first defect with file, actual browser/device evidence, Godot work still outstanding and whether this expanded PR is ready for the owner's visual test. Keep full challenge completion and human approval separate. Do not merge, deploy or self-approve human readiness.
