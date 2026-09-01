# PocketPT Movement Lego Recorder v1

## Purpose

This slice turns the existing private Coach Demo Exercise Template Builder on `/workout.html` into the first reusable movement-data collection surface for the Motion Lego system.

The existing Phase 29 builder already proved that PocketPT could capture several seconds of MoveNet pose data for coach-created exercise templates. This PR does not replace that builder or create another camera/MoveNet runtime. Instead, it subscribes to the canonical `pose-runtime:frame` event already emitted by `public/pose-runtime.js` and records a compact normalized movement trace.

## Recorder contract

A recording contains:

- a target movement primitive / Lego block
- a human label and optional notes
- source timing
- normalized major body joints
- shoulder, hip, ankle and body centers where available
- body/torso/hip/shoulder direction vectors where available
- elbow and knee angles derived from the normalized joints
- per-frame confidence and visibility quality
- a recording-level quality summary

The recorder deliberately does **not** store raw camera video.

MoveNet remains a 2D perception source. A recorder file explicitly declares that it does not contain true 3D bone rotations and that hand information stops at the wrist. Animation/FBX references remain the complementary source for mechanics that 2D MoveNet cannot observe reliably.

## Canonical pipeline

`camera -> PoseRuntime / MoveNet -> pose-runtime:frame -> normalized-pose -> MovementRecorder`

There is no second `getUserMedia`, second MoveNet detector, or second pose loop.

## Trainer UI

`public/boot-core.js` conditionally loads `/motion/movement-recorder.js` only when the private `[data-coach-template-builder]` surface is present.

The module adds a compact `Movement Lego Recorder` section inside the existing builder. It provides:

- target Lego-block selector
- human recording label
- 5/10/15 second recording windows
- notes
- Record / Stop controls
- quality summary
- bounded browser-local evidence storage
- JSON export
- a compact card-button scavenger board

The card board is intentionally not a large project-management Kanban. Cards are grouped only as Transitions, Postures and Actions. Selecting a card shows its status, local recordings, exercise uses and Mixamo search hints.

## Scavenger registry

Canonical hunt status lives in:

`public/motion/registry/movement-lego-scavenger.v1.json`

Status progression is deliberately small:

`EMPTY -> CANDIDATE -> STUDIED -> VALIDATED -> READY`

The merged Start Plank work seeds the first candidates, including stand-to-ground, crouch, ground support and plank. A local MoveNet recording counts as evidence in the browser UI but does not silently promote the canonical in-repo status. Review is required before registry status changes.

## Storage boundary

V1 uses bounded local browser storage for up to eight recent evidence recordings and lets the trainer export the latest recording as JSON.

This PR intentionally does not invent a new backend persistence route. The existing exercise-template backend remains unchanged. A later bounded slice can decide whether reviewed movement evidence should attach to that existing service or to a dedicated motion evidence store.

## Live acceptance

1. Sign in with a role that can open the private Coach Demo Exercise Template Builder.
2. Connect Camera and wait for MoveNet pose tracking.
3. Open the template builder and verify the Movement Lego Recorder appears inside it.
4. Select `Stand -> Ground` or another card.
5. Record a 5-second movement.
6. Verify frame count increases during the recording.
7. Verify completion shows frame count, usable-frame ratio and average confidence.
8. Save Local Evidence and confirm that card reports local evidence.
9. Export the JSON and verify it contains normalized joints/metrics but no video/image payload.
10. Confirm the existing exercise-template demo capture, live avatar, camera and workout behavior are unchanged.

## Deferred

- server-side reviewed motion-evidence persistence
- automated primitive classification
- automatic exercise recipe classification
- 3D bone-rotation reconstruction
- hand/finger tracking
- Motion Lab animation-to-Lego extraction UI
- live avatar confidence-limited Lego assistance
