# MIRROR MOTION — THREAD HARVEST CLOSURE PLAN

## Purpose

Close the remaining gaps identified by harvesting the full mirror-motion design conversation against the code that is now on `main`.

This is not a restart of numbered Phases 2–18. PR #677 merged the final read-only acceptance gate into `main`; the numbered foundation is considered built. This plan addresses only requirements discussed in the design thread that are either still missing, only partially implemented, or intentionally deferred.

## Canonical baseline

- Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`
- Baseline main: `ee7b45d9e6a7825f9681c61717675b776128d1db`
- Baseline includes:
  - mirror-motion Phases 2–18;
  - Phase 18 direction-aware floor assistance;
  - calibration/Mufasa voice-ownership repair;
  - final mirror-motion acceptance gate from PR #677.

## Harvest result

### Already implemented and not to be rebuilt

The following design ideas are already represented in code and must be preserved:

- temporal stabilization and confidence-aware coast/drop behavior;
- structural limb-length calibration and left/right identity recovery;
- exercise-aware contact anchors;
- contact-aware 2D IK;
- adaptive causal live motion curves (the live equivalent of F-curve shaping);
- rest-relative quaternion retargeting and bounded yaw;
- facing / quarter-turn / side-view intent;
- foreshortening protection;
- side-view occlusion authority;
- lateral root translation;
- root/contact compensation;
- stand-to-floor and floor-to-stand transition intelligence;
- bounded transition root assistance;
- exclusive calibration voice ownership before Mufasa resumes;
- first-failure diagnostics throughout the stack;
- final acceptance status surface.

These systems are dependencies, not candidates for parallel replacement.

---

# CLOSURE WORKSTREAM

## Closure Phase A — Runtime truth and status consolidation

### Problem

Older mirror phases still write a generic `mirrorMotionPhase` value such as 2, 3, or 4. A legacy UI/debug consumer can therefore display a stale low phase number even though the actual stack is loaded through Phase 18 and the final acceptance gate.

### Goal

Make the runtime expose one truthful canonical mirror-stack status.

### Required behavior

1. The final acceptance gate becomes the canonical high-level status source.
2. Add a stable runtime summary with fields equivalent to:
   - `mirrorMotionFoundationStatus`: `WAITING | FAIL | READY`;
   - `mirrorMotionStagesExpected`: 17;
   - `mirrorMotionStagesLoaded`: actual Phase 2–18 count;
   - `mirrorMotionFirstFailingBoundary`;
   - `mirrorMotionFirstWaitingBoundary`;
   - `mirrorMotionRestPoseStatus`.
3. Retire, deprecate, or explicitly mark the generic numeric `mirrorMotionPhase` as legacy so it cannot be mistaken for the stack's build level.
4. Do not remove per-phase diagnostics; they remain useful for first-failure analysis.
5. Add regression coverage proving a late Phase 2/3/4 status update cannot make the canonical frontend/runtime summary claim the system is only on an early phase.

### GO criteria

- No canonical UI/status path reports "Phase 3" or another stale phase number as overall build status.
- Acceptance status remains the source of truth.
- Per-phase diagnostics remain intact.
- No behavior authority changes.

### User testing

Not required before merge. Automated/static regression is sufficient. Verify visually during final live acceptance.

---

## Closure Phase B — Camera-motion discrimination, review-first

### Problem

Phase 13/14 interprets camera-space body-center translation as member lateral movement. A phone/camera pan or shake can therefore look like the member stepped sideways. Existing Phase 15/16 handoffs explicitly preserved this as an unresolved risk.

### Goal

Estimate whether observed global image movement is likely camera motion before it is allowed to influence avatar root translation.

### Authority rules

- Do not create a second MoveNet detector.
- Do not change form-analysis raw evidence.
- Do not create a second camera capture loop.
- Do not claim true Z-depth.
- Do not make camera-motion estimation the sole authority over body motion.
- This first implementation is review-first: emit evidence/intent only; do not suppress root movement live yet.

### Preferred evidence hierarchy

Use the strongest evidence already available in the current camera/render architecture, in this order if practical:

1. global background/image motion from the same already-owned video frames;
2. stable scene-feature displacement outside the subject body region;
3. if no scene evidence is safely available, a conservative pose-only fallback based on highly coherent displacement of shoulders/hips/ankles with nearly unchanged inter-joint geometry.

Do not introduce a second camera stream solely for this feature.

### Proposed output contract

Emit metadata equivalent to:

- `cameraMotionIntent.detected`;
- `cameraMotionIntent.confidence`;
- `cameraMotionIntent.globalDxNormalized`;
- `cameraMotionIntent.globalDyNormalized`;
- `cameraMotionIntent.subjectDxNormalized`;
- `cameraMotionIntent.residualSubjectDxNormalized`;
- `cameraMotionIntent.source` (`scene | pose_coherence | unavailable`);
- `cameraMotionIntent.reviewFirst = true`.

### Diagnostics

Add a dedicated debug surface with:

- evidence source;
- scene/global displacement;
- subject displacement;
- residual body displacement;
- confidence;
- camera-motion detections;
- unavailable-evidence bypasses;
- tracker resets;
- process errors;
- first failing boundary.

### GO criteria

- Person standing still + camera pan produces camera-motion evidence.
- Person side-steps with stable camera leaves meaningful residual subject motion.
- Small camera shake does not create large lateral root intent in the review signal.
- Low/ambiguous evidence fails open rather than inventing camera motion.
- No new camera, detector, IK, retarget, exercise, or depth authority appears.

### User testing checkpoint

A **small early live test is recommended here before activation**, because camera pan/shake thresholds depend on real device video behavior. This is not the full acceptance workout. It is a 2–3 minute calibration test:

1. stand still and gently pan phone left/right;
2. hold camera still and side-step left/right;
3. stand still and create a small handheld shake;
4. repeat at two camera distances.

If synthetic/unit evidence is strong and thresholds are intentionally conservative, implementation may proceed to Phase C before this test, but live threshold tuning must happen before final acceptance.

---

## Closure Phase C — Camera-motion-aware root activation

### Goal

Use reviewed camera-motion evidence to prevent Phase 13/14 lateral root translation from following the camera itself.

### Required behavior

1. Consume the review-approved camera-motion signal at the existing lateral-root boundary.
2. Compute residual body motion rather than raw camera-space body-center movement when confidence is sufficient.
3. Preserve deliberate stepping.
4. Preserve Phase 4 contact release and Phase 15/16 compensation behavior.
5. Fail open to the current behavior when camera-motion evidence is unavailable or ambiguous.
6. Reset camera-motion history on Phase 2 tracker/person resets, camera restart, or presentation-session replacement.
7. Add first-failure diagnostics and counters for:
   - camera-motion corrections;
   - bypasses;
   - corrected residual X;
   - deliberate-step preservation;
   - reset events.

### GO criteria

- Camera pan no longer translates the avatar root as if the member stepped.
- Real side steps still translate the avatar.
- Planted-contact compensation does not fight intentional locomotion.
- Jumping jack foot freedom remains intact.
- Floor transition behavior is unchanged unless camera movement is actually detected.

### User testing

Required before declaring closure complete. Can be combined with final acceptance if Phase B thresholds were already verified live.

---

## Closure Phase D — Acceptance gate hardening and final live acceptance

### Goal

Make the existing final acceptance gate cover the harvested closure work and then use it as the single entry point for live testing.

### Required code work

1. Add Closure Phase A canonical status to the acceptance panel.
2. Add camera-motion review/activation health to the acceptance panel.
3. The gate must still report earliest failure before downstream symptoms.
4. READY must require:
   - Phases 2–18 healthy;
   - AvatarRuntime present;
   - protected rest/base pose observable;
   - canonical status layer healthy;
   - camera-motion discrimination loaded/healthy if activated.
5. Do not make animation quality itself a READY dependency; READY means architecture/runtime health, then visual acceptance is performed.

### Full live acceptance script

Perform in this order and record first failure only:

1. **Calibration / voice ownership**
   - AI calibration voice speaks alone;
   - no browser/Mufasa voice collision;
   - base/rest position reaches READY;
   - Mufasa resumes afterward.
2. **Standing neutral**
   - avatar holds stable rest-relative posture;
   - no unexplained knee/ankle jitter.
3. **Squat**
   - feet remain planted when appropriate;
   - knees do not buckle/split;
   - deliberate repositioning releases contact rather than gluing feet.
4. **Jumping jack**
   - feet open/close freely;
   - legs do not collapse from crossing/identity errors;
   - adaptive curves reduce jitter without obvious lag.
5. **Turn left/right**
   - front → quarter → side state is stable;
   - bounded yaw follows without spin/flicker;
   - overlapping limbs do not rapidly swap authority.
6. **Push-up transition**
   - standing → hinge → crouch → hands down → plank;
   - simple forward bend is not mistaken for floor acquisition;
   - assist does not push opposite the direction of travel;
   - return to standing succeeds.
7. **Lateral locomotion**
   - deliberate side step moves avatar root;
   - planted contacts release appropriately.
8. **Camera movement discrimination**
   - camera pan/shake does not masquerade as member translation;
   - real body movement remains visible.
9. **Tracker loss/reacquisition**
   - no stale contacts, bend direction, yaw, transition assist, or camera-motion history survives.
10. **Presentation modes**
   - camera, avatar overlay, and avatar-only retain correct mirror/sign behavior.

### Exit rule

If all architecture checks are READY and the live script passes, the mirror-motion foundation is closed.

Future work becomes reproduced-bug tuning, not numbered foundation phases.

---

# EXPLICITLY DEFERRED / SEPARATE WORKSTREAMS

These were discussed in the thread but should not block current Avaturn mirror acceptance unless a product requirement changes.

## Universal Avatar / Canonical Retarget Engine

Still a separate major workstream. It should eventually provide:

1. Skeleton Inspector;
2. native bone hierarchy capture;
3. original rest-pose capture;
4. canonical PocketPT humanoid mapping;
5. rig-axis/rest-frame adapter;
6. semantic anatomical motion → rig-local quaternion translation;
7. validation for Avaturn, Mixamo, DeepMotion, and other supported humanoid rigs.

Current mirror work should not be described as a universal arbitrary-rig solution until this exists.

## Full physics / self-collision

Not part of the current mirror foundation. Existing structural constraints, contacts and IK are biomechanical safeguards, not a general 3D collision engine.

Future physics could cover body self-collision, equipment/floor/world collisions, and loose clothing interaction.

## True 3D / measured depth

Explicitly deferred. Current yaw, foreshortening and occlusion systems infer safer presentation from 2D evidence and must continue to state `Measured depth authority: NO`.

## Literal Blender F-curves in live mirroring

Not required. Phase 6's causal adaptive live curves are the intended runtime equivalent. Blender F-curves remain relevant for authored/offline animation study and motion-library generation, not real-time future-aware mirroring.

---

# EXECUTION ORDER

1. Independent bot reviews this harvest plan and confirms the inventory.
2. Closure Phase A — runtime truth/status cleanup.
3. Closure Phase B — camera-motion discrimination, review-first.
4. Optional small live camera-motion threshold test if reviewer says synthetic evidence is insufficient.
5. Closure Phase C — activate camera-aware residual lateral motion.
6. Closure Phase D — acceptance-gate extension and full live acceptance.
7. Freeze the mirror foundation if acceptance passes.
8. Start universal-avatar/retarget work separately when desired.

Do not add new numbered mirror-motion foundation phases merely to continue a sequence. Any new behavior after closure must be justified by a reproduced live failure or a new product requirement.
