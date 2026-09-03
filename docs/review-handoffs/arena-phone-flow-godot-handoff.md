# Phone entry → camera setup → body-ready challenge: Godot handoff

Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`

Draft PR: [#633](https://github.com/rdhforeclosureconqueror-sys/Mufasa.fitness.node/pull/633), branch `review/arena-first-failure-diagnostics-20260903`.

Audited main/base: `743c9ac4490264dbea95176a97c716a95ed28efa`. Phone work starts after head `d56fd119e33fc19a066da2175b6ccd74aadce199`. Tested PocketPT implementation: `ee1384420493011b114a72728a450bd99269b018`. Read the actual current PR head; later documentation/evidence commits do not constitute a new runtime test.

## Owner-approved interaction

Most members enter holding a phone. They should tap the mat or use thumb controls, hear/read the coach briefing, enable the camera, put the phone down, and get into position. The held valid starting posture becomes the ready signal. They must not raise both hands while supporting themselves on the floor.

After valid framing and starting posture, the target experience is countdown → fixed sixty-second challenge → completed valid TOP/BOTTOM/TOP reps → avatar standing → canonical results. Touch returns for results or gym navigation. This supersedes the standing-gesture-first entry sequence in the original reconnaissance, not its findings about authentication, scoring gaps or ownership.

## Implemented versus remaining

| Boundary | Current status |
| --- | --- |
| PocketPT phone interface | Implemented: Go to mat, thumb direction controls, Stop, caption briefing, explicit camera setup, Return to gym. |
| Control transport | Implemented in PocketPT: capability negotiation, exact-frame isolation, independent flow nonce and monotonic sequences, bounded command acknowledgements. |
| Existing deployed Godot build | Still legacy READY only. Touch controls are unavailable until the new receiver is added and exported. Existing avatar and keyboard movement remain intact. |
| Camera check | Implemented using existing CameraController, MoveNet initializer and PoseCaptureEngine; starts only on Enable camera. A legacy gym can still use Check my camera. |
| Body visibility | Implemented: stable current required joints, finite coordinates/confidence, in-frame checks, no predicted/cached/display-only evidence. This does not prove a push-up start posture. |
| Challenge start/rep rules | Blocked. Existing sequence is draft and the generated profile explicitly lacks full-depth capability. No new thresholds or approval flags were invented. |
| Countdown, competitive clock, scoring, saving | Not started by this implementation. Reuse and extend the canonical owners described in the reconnaissance when reviewed rules and timed attempts are available. |
| Coach presentation/voice | Caption briefing only in PocketPT. The actual coach avatar and canonical authenticated voice integration remain separate work. No provider credentials or parallel voice service added. |
| Godot walking/down/up animations | Not modified. Requires the editable working gym project and actual imported rig/animation inspection. |

Merging PR #633 alone does not make the production avatar walk or start a push-up challenge. Its camera check is useful independently; its new touch path waits for genuine Godot support rather than silently pretending to navigate.

## Source requirement

The working project was reported at `C:\Users\pftgu\Documents\avlobytest`, source commit `4fbb43774a7cb93436eb17a162a78526a2f97509`. Inspect that actual project before editing. The accessible `mufasa-world` main remains `a55b495b996999974f4543bed51b1d7462112a6d`, the old demo. The correct editable gym is not in this PocketPT checkout.

Do not replace the gym, avatar mount, skeleton, collisions, camera or mat. Do not edit `.pck`/`.wasm` as source. Reuse the existing `PocketPTGameClient`, browser bridge, avatar loader, player controller and animation infrastructure after verifying their actual names and behavior.

## Ownership and platform boundary

| Owner | Responsibility |
| --- | --- |
| PocketPT | Camera/MoveNet, current body evidence, reviewed exercise rules, workflow, identity, canonical score/result services and voice backend. |
| World bridge | Validated processed commands and acknowledgements scoped to the current frame and flow. |
| Godot | Mat selection/pathfinding, collisions, character movement, locomotion animation, coach/world presentation, down/stand transitions. |
| Future app adapter | Camera permission and page/app lifecycle integration. Reuse the coordinator and commands; verify WebView/native behavior before claiming parity. |

No raw camera video, landmarks, member IDs, session IDs, avatar URLs or tokens are sent by the phone flow. Camera device IDs remain local to its selector. Copied diagnostics use fixed safe messages. No local personal-best store, parallel auth, leaderboard, detector implementation, or scoring authority was introduced.

## Additive protocol: flowVersion 1

Keep the existing `POCKETPT_GODOT_BRIDGE` / numeric protocol version 1 READY unchanged. After READY, PocketPT sends:

```json
{"type":"POCKETPT_GODOT_BRIDGE","protocolVersion":1,"event":"ARENA_FLOW_REQUEST","flowVersion":1,"requestId":"opaque-flow-id","sequence":1,"experience":"PUSH_UP_ARENA"}
```

The flow request ID and sequence are separate from the optional diagnostics request ID/sequence. Do not share their counters. Each direction has its own increasing safe-integer sequence. A new flow request resets this channel and invalidates previous commands. Duplicate requests for the same ID must not reset the receiver's command sequence.

Reply only after the actual controller implements context locking:

```json
{"type":"POCKETPT_GODOT_BRIDGE","protocolVersion":1,"event":"ARENA_FLOW_CAPABILITIES","flowVersion":1,"requestId":"opaque-flow-id","sequence":1,"capabilities":{"contextLock":true,"touchNavigation":true,"matApproach":true,"pushUpTransition":true}}
```

All three feature flags must be booleans and must reflect implemented behavior. `contextLock` must be true. An absent response leaves touch unconnected after three seconds. A valid late response may connect it but must not pull an active camera check back into gym navigation.

A representative movement command:

```json
{"type":"POCKETPT_GODOT_BRIDGE","protocolVersion":1,"event":"CONTROL_INTENT","flowVersion":1,"requestId":"opaque-flow-id","sequence":5,"context":"GYM_NAVIGATION","action":"MOVE_LEFT","intensity":1,"validForMs":300}
```

Actions implemented by the sender:

| Action | Receiver requirement |
| --- | --- |
| MOVE_LEFT / RIGHT / FORWARD / BACKWARD | Use the existing character controller and camera-relative ground axes. Refresh at most ten times per second. Expire input after at most 300 ms measured on receipt. Connect idle/walk/strafe to actual movement and the imported rig. |
| STOP | Clear held navigation and cancel an active mat route. Always accept a valid scoped STOP regardless of context or confidence. It must not cancel a down/stand presentation animation. |
| SET_CONTEXT | Accept GYM_NAVIGATION, CAMERA_SETUP or LOCKED. Clear prior navigation. All keyboard, touch, body and autopilot navigation sources must respect the current context. |
| GO_TO_MAT | Navigate to the existing mat using collisions/pathfinding. Do not teleport. Only report arrival after the real player reaches the zone. |
| PUSH_UP_START | Play the compatible lowering/down transition; report completion after actual playback. |
| STAND_UP | Cancel/replace an outstanding lowering request as appropriate, play the stand transition and report actual completion. |

For the last three actions, return a command acknowledgement:

```json
{"type":"POCKETPT_GODOT_BRIDGE","protocolVersion":1,"event":"ARENA_FLOW_EVENT","flowVersion":1,"requestId":"opaque-flow-id","sequence":2,"replyTo":5,"result":"AT_MAT"}
```

`replyTo` is the exact incoming command sequence. Results are `AT_MAT`, `AVATAR_DOWN` and `AVATAR_STANDING`. There is one outstanding presentation/navigation command. PocketPT rejects cancelled, mismatched, duplicate, old-scope and unexpected-state replies. It waits up to twenty seconds. Failure to confirm standing leaves navigation locked and exposes retry.

To support tapping the actual mat inside Godot, emit `ARENA_MAT_SELECTED` using the same validated flow envelope. PocketPT accepts it only during eligible gym navigation, then sends the same GO_TO_MAT command used by the thumb button. Do not start a separate autonomous workflow from the raycast.

Validate exact parent window and trusted origin, numeric protocol/flow versions, current request ID and increasing finite safe-integer sequence before any side effect. Use exact `targetOrigin`, never `*`. Request IDs correlate commands; they are not authentication. Respect the existing bootstrap session lifetime. Stop movement on expiry, disconnect, lost focus and exhausted leases even if a final STOP never arrives.

## Current coordinator states

`CONNECTING → NEGOTIATING → GYM` (or `LEGACY` when support is absent).

`GYM → APPROACHING → INTRO → CAMERA_SETUP → CAMERA_STARTING → CAMERA_POSITIONING → CALIBRATING_TOP → CALIBRATING_BOTTOM → CONFIRMING_TOP → CALIBRATED`.

A legacy/normal gym can enter CAMERA_SETUP directly for a camera check; that path does not claim arrival or lower the avatar. Navigation is disabled during setup. When entered from the mat briefing, PocketPT also requests PUSH_UP_START.

Return from an attempted down transition requires `RETURNING → AVATAR_STANDING → GYM`. Missing confirmation becomes RETURN_BLOCKED, with movement still disabled. Backgrounding becomes SUSPENDED and stops camera/movement. A fresh explicit return is required; camera access never resumes automatically. Expiry/exit becomes CLOSED. Reload/frame replacement invalidates both camera work and old game replies.

PocketPT now derives attempt-scoped TOP and BOTTOM geometry after BODY_VISIBLE and confirms a return to TOP. Those templates stay in browser memory; photographs are not saved and landmarks are not sent through this bridge. `CALIBRATED` is the current endpoint. START_POSITION remains unconnected because calibration identifies the member's two pose gates but does not certify side orientation, safe form or approved depth. Do not turn visibility or calibration alone into a countdown-ready signal.

The next challenge implementation must connect reviewed orientation/top/alignment rules, a held ready posture, and the canonical timed-attempt owner. If readiness drops before start, cancel countdown/arming. During the sixty-second run, tracking loss invalidates the current cycle; it must not complete a rep. Use a single authoritative deadline and canonical result persistence. Do not copy the legacy hip-Y counter into this arena.

## Camera lifecycle and app preparation

The adapter reuses the canonical camera controller and one canonical MoveNet detector per page session. Switching cameras restarts capture while reusing the detector. Exit disposes it, including a model that finishes loading late.

Permission/video/model startup is bounded at thirty seconds. An ignored permission request may resolve later; the adapter stops a late-granted stream before attaching it. Cancel, expiry, replacement and background events stop capture/tracks and invalidate callbacks. A 1.5-second gap clears visibility evidence; that is a freshness bound, not an exercise threshold. Rotation clears tracking readiness without automatically requesting another camera.

The page uses inline muted video, contain framing, safe-area padding and large touch buttons. These are implementation choices, not physical-device proof. Future app work must verify permission prompts, camera switching, rotation, background/lock behavior, audio activation and cookie/session continuity in the chosen wrapper/native approach.

Platform references: [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) documents pending permission promises; [MDN pointer capture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) describes keeping pointer events on the held control.

## Required Godot handoff back

Return the actual source branch/head, files changed, animation/rig binding findings, supported capability flags, lease/context-lock checks, mat arrival and down/stand acknowledgement proof, source parser/runtime results, exported build provenance, independent review findings and remaining physical-device/visual requirements. Preserve the approved gym and personal avatar. Do not merge or deploy during this review.
