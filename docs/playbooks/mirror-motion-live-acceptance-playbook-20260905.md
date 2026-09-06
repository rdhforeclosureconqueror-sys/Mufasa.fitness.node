# MIRROR MOTION — FINAL AUDIT + LIVE ACCEPTANCE PLAYBOOK

## Purpose
This document is the operator playbook for proving that the mirror-motion system behaves the way it was designed to behave. It is not another architecture phase. It maps each intended capability to an observable live test, expected behavior, likely failure meaning, and the diagnostic boundary to inspect first.

## Canonical baseline
The foundation is the Phase 2–18 mirror-motion stack plus the post-foundation closures:

- Closure A: canonical foundation truth instead of legacy numeric phase reporting;
- Closure B: review-first camera-motion discrimination;
- Closure C: trusted camera-aware lateral correction;
- Closure D: final acceptance requires healthy camera closures;
- live acceptance harness + visible controls;
- calibration/Mufasa voice-ownership hardening.

The acceptance UI is authoritative for test order. Stop at the first FAIL/BLOCKED result. Do not continue and diagnose downstream symptoms later.

## Audit verdict
From a code-coverage standpoint, the intended Avaturn/MoveNet mirror foundation is represented in executable runtime code. The final audit found one leftover health-semantics bug in Phase 12: historical Phase 11 `processErrors` could still create a current failure after Phase 11 recovered. This playbook branch fixes that and adds a regression.

The following remain intentional separate workstreams and are NOT required for this acceptance pass:

- universal arbitrary-rig Skeleton Inspector / canonical mapper;
- full 3D self/world collision physics;
- true measured Z-depth / 3D pose reconstruction;
- literal Blender F-curves in live mirroring.

The live system uses causal/adaptive smoothing and quaternion/root/IK logic instead.

---

# 1. Capability coverage matrix

| Capability we intended | Runtime owner | What it should prevent / enable |
| --- | --- | --- |
| Confidence-aware temporal stabilization | Phase 2 / pose stability engine | jitter, unsafe low-confidence joints, stale coasted points |
| Limb-length calibration and structural consistency | Phase 3 | knees/elbows stretching or collapsing unnaturally |
| Left/right identity recovery | Phase 3 | limbs swapping sides when legs/arms cross or approach |
| Exercise-aware planted contacts | Phase 4 | squat feet sliding; push-up hands/feet losing anchor |
| Contact-aware IK | Phase 5 | planted limbs bending incorrectly while endpoint stays fixed |
| Causal adaptive live curves | Phase 6 | robotic/choppy motion without adding excessive lag |
| Facing intent | Phase 7 | avatar behaving like a permanent front-facing cutout |
| Rest-relative bounded quaternion yaw | Phase 8 | unstable 3D turns / long-way rotation / axis accumulation |
| Foreshortening protection | Phase 9 | side-view limb collapse when 2D projected length shrinks |
| Runtime health activation bridge | Phase 10/12 | silent downstream stage absence |
| Occlusion/overlap authority | Phase 11 | left/right limbs fighting when overlapping in side view |
| Camera-scale-normalized lateral intent | Phase 13 | whole-body side movement being absorbed only by limbs |
| Bounded root-X activation | Phase 14 | avatar failing to translate laterally with the member |
| Contact conflict analysis | Phase 15 | planted contact vs root translation conflict |
| Root/contact compensation | Phase 16 | planted feet/hands visually sliding during root translation |
| Ordered stand↔floor transition intelligence | Phase 17 | forward bend being mistaken for push-up transition; unstable floor state |
| Direction-aware bounded floor assist | Phase 18 | collapsing/snapping while moving down to or up from plank |
| Canonical overall runtime truth | Acceptance / Closure A | UI claiming "Phase 3" while full stack is live |
| Camera-motion discrimination | Closure B | phone pan/shake being blindly treated as subject movement |
| Trusted camera-aware root correction | Closure C | camera pan shifting avatar root after trusted scene evidence exists |
| Final closure-aware acceptance | Closure D | false READY while camera closures are missing/broken |
| Ordered acceptance recording | live acceptance harness | testing later symptoms after an earlier failure |
| Visible stopped-state controls | acceptance controls | UI implying next step is runnable after FAIL/BLOCKED |
| Calibration voice exclusivity | calibration arbiter / CoachRuntime | Mufasa and calibration TTS competing during rest capture |
| First-failure diagnostics | all stages + final acceptance | guessing which downstream visual symptom caused the issue |

---

# 2. Before-you-test gate

Do not begin movement testing until all of the following are true:

1. Camera permission granted and one canonical camera stream active.
2. MoveNet/person tracking active.
3. AvatarRuntime present.
4. Calibration voice has exclusive ownership while rest/base position is being captured.
5. Complete protected rest/base pose is captured for the mapped rig.
6. Foundation status is `READY`.
7. Closure status is `HEALTHY`.
8. Camera review and camera activation are loaded.
9. Live acceptance harness and visible controls are loaded.
10. First failing boundary is `NONE` and first waiting boundary is `NONE`.

If any condition is false, mark the first test BLOCKED. Do not attempt squat/jumping jack/etc. yet.

---

# 3. Ordered real-device test protocol

## Test 1 — Calibration voice + rest/base capture

### Setup
Stand fully visible, facing camera, normal neutral stance. Do not move during capture.

### Expected
- calibration voice speaks alone;
- Mufasa wake/listening path does not compete while calibration owns voice;
- no overlapping browser/backend TTS;
- rest/base pose reaches complete/captured state;
- after completion, Mufasa can resume;
- canonical acceptance becomes READY if all other stages are healthy.

### PASS
One clear voice owner, complete rest pose, no crash, Mufasa resumes afterward.

### Look for
- two voices talking at once;
- calibration restarting repeatedly;
- "Hey Mufasa" interrupting calibration;
- rest pose remaining PARTIAL/UNOBSERVED;
- avatar suddenly jumping when rest capture completes.

### Meaning
Voice overlap → calibration/CoachRuntime ownership regression.
Partial rest pose → mapped-bone/rest-baseline problem.
Avatar jumps at capture → rest-relative solver/baseline mismatch.

---

## Test 2 — Standing neutral hold

### Procedure
Stand still 10–15 seconds. Then make very small natural weight shifts without stepping.

### Expected
- avatar remains stable;
- no knee/elbow buzzing;
- feet do not creep apart;
- no left/right swapping;
- small natural movement is visible without excessive lag;
- root should not wander sideways on its own.

### PASS
Stable body with natural small motion and no accumulating drift.

### Look for / likely meaning
- tiny rapid joint shake → Phase 2 stabilization threshold / confidence issue;
- limb length pulsing → Phase 3 structural calibration issue;
- left knee/right knee suddenly exchange → Phase 3 identity recovery issue;
- entire avatar slowly drifts → Phase 13/14 baseline or Closure C camera-offset accumulation issue;
- motion feels several beats behind you → Phase 6 smoothing too aggressive.

---

## Test 3 — Squat

### Procedure
Perform three controlled squats: slow, normal, then moderately fast. Keep feet planted.

### Expected
- feet stay visually planted;
- knees bend rather than legs stretching;
- thighs/shins preserve plausible lengths;
- hips descend smoothly;
- no sudden split-like leg separation;
- faster squat becomes more responsive rather than equally over-smoothed;
- standing reset returns cleanly.

### PASS
Stable planted squat at all three speeds with no leg buckling or foot skating.

### Look for / likely meaning
- feet slide → Phase 4 contact, Phase 5 IK, or Phase 15/16 root-contact compensation;
- knees snap inward/outward → Phase 3 structural/identity issue or Phase 5 IK;
- legs stretch → Phase 3 calibration/constraint failure;
- fast squat lags badly → Phase 6 adaptive-response tuning;
- avatar root moves sideways while camera is stationary → Phase 13/14 or camera correction baseline issue.

---

## Test 4 — Jumping jack

### Procedure
Perform 5 slow jacks, then 5 normal-speed jacks.

### Expected
- feet are NOT glued to the floor as if squatting;
- arms/legs separate and return symmetrically;
- left/right identity remains stable as limbs approach/cross centerline;
- motion accelerates naturally without harsh snaps;
- no permanent foot anchor survives between repetitions.

### PASS
Fluid synchronized jacks with no planted-foot fighting and no limb swaps.

### Look for / likely meaning
- feet appear glued or dragged → Phase 4 exercise-context/contact release issue;
- legs attempt a split or buckle when near center → Phase 3 identity/structural issue;
- arms cross wrong side → Phase 3 identity or Phase 11 overlap authority;
- visible robotic start/stop → Phase 6 curve tuning;
- whole body translated sideways after repetitions → Phase 13/14 baseline drift.

---

## Test 5 — Turning / side view

### Procedure
Front → 45° quarter turn → full side → quarter → front. Repeat opposite direction.

### Expected
- avatar rotates smoothly from rest-relative orientation;
- does not spin the long way around;
- limbs do not collapse simply because projected 2D length becomes short;
- overlapping side-view limbs remain stable instead of fighting ownership;
- returning front restores neutral orientation without accumulated twist.

### PASS
Controlled turn both directions with no flip, long-way spin, or limb collapse.

### Look for / likely meaning
- avatar cannot turn at all → Phase 7 facing or Phase 8 yaw not active;
- sudden 180° flip → Phase 8 sign/quaternion/yaw transition issue;
- arms/legs shorten badly at side view → Phase 9 foreshortening;
- left/right limbs chatter while overlapping → Phase 11 occlusion authority;
- returns front but stays twisted → rest-relative quaternion/baseline accumulation issue.

---

## Test 6 — Standing → floor → plank → standing

### Procedure
From standing, bend/crouch, place hands down, transition into plank/push-up position, hold, then return to standing. Repeat twice.

### Expected
- a normal forward hinge alone does not immediately become a floor transition;
- transition progresses through ordered intermediate states;
- root follows downward without collapsing or teleporting;
- hands/feet stabilize appropriately in plank;
- upward recovery does not receive downward assist;
- final standing state returns cleanly.

### PASS
Avatar follows the entire transition both ways without snap, floor drop, or directional fighting.

### Look for / likely meaning
- bending to touch knees triggers plank state → Phase 17 classifier threshold/order issue;
- avatar drops to floor suddenly → Phase 17 state progression or Phase 18 assist bound;
- avatar is pushed back downward while standing up → Phase 18 directional-assist regression;
- hands slide in plank → Phase 4/5/15/16 contact chain;
- transition freezes after tracker confidence dip → Phase 2 confidence/coast handling or Phase 17 confidence gate.

---

## Test 7 — Lateral side-step with camera stationary

### Procedure
Keep phone/camera stationary. Step left, return center, step right, return center. Repeat at normal and slightly larger distance.

### Expected
- avatar root translates laterally with you;
- limbs do not have to fake the entire side movement;
- deliberate movement is not suppressed as "camera motion";
- planted contacts release when stepping and re-establish when appropriate;
- no residual root drift after returning center.

### PASS
Root follows real side movement in both directions and returns close to baseline.

### Look for / likely meaning
- avatar stays centered while legs stretch sideways → Phase 13 intent or Phase 14 activation;
- real step gets suppressed → Closure B/C falsely classifying pose motion as trusted camera motion;
- foot remains glued during step → Phase 4 contact release / Phase 16 compensation overreach;
- root returns to wrong center → Phase 13 neutral calibration or Closure C accumulated camera offset.

---

## Test 8 — Camera pan/shake, member still — near distance

### Procedure
Stand still. Have the camera/phone move left/right slightly and perform a small controlled shake. Do not step.

### Expected
- where trusted scene/global-motion evidence exists, camera displacement is recognized as camera evidence;
- camera correction is consumed once per source frame;
- duplicate/retried frames do not double-accumulate offset;
- avatar should not interpret camera movement as equivalent member root travel;
- ambiguous pose-only evidence fails open rather than deleting legitimate member motion.

### PASS
Camera movement does not create persistent avatar lateral drift.

### Look for / likely meaning
- avatar walks sideways with camera pan → Closure B evidence unavailable/insufficient or Closure C not applying trusted scene correction;
- avatar continues drifting after camera stops → Closure C offset/dedup/reset issue;
- one pan produces increasingly large displacement → duplicate source-frame consumption regression;
- member movement later becomes suppressed → camera offset not reset/managed correctly.

---

## Test 9 — Camera pan/shake, member still — farther distance

Repeat Test 8 farther from the camera.

### Why
This checks normalization. Pixel displacement changes with distance; the behavior should remain qualitatively stable.

### Look for
Works near but not far → scale normalization / evidence threshold needs tuning rather than a new architecture layer.

---

## Test 10 — Tracker loss/reacquisition

### Procedure
Step fully out of frame. Wait a few seconds. Re-enter and stand neutral.

### Expected
- temporal histories reset;
- structural calibration/history does not use stale previous-person motion;
- camera accumulated offset resets at the person/tracker boundary where designed;
- avatar reacquires without jumping to stale pose/root position.

### PASS
Clean reacquisition with no stale limb, coast, root, or identity state.

### Look for / likely meaning
- avatar resumes old pose before following you → Phase 2 tracker reset/history issue;
- limb lengths wildly wrong after return → Phase 3 reset/calibration issue;
- root appears displaced after return → Phase 13/Closure C reset issue;
- side-view authority remains stuck → Phase 11 context reset issue.

---

## Test 11 — Presentation modes

### Procedure
Test avatar overlay and avatar-only mode. Where camera-only mode exists, confirm avatar root writes are irrelevant/hidden there.

### Expected
- same motion semantics in overlay and avatar-only;
- lateral sign feels correct in both visible-avatar modes;
- no double mirror inversion;
- switching modes does not create a new renderer/solver authority or reset the avatar unexpectedly.

### Look for / likely meaning
- left step appears right in one mode only → presentation/mirror sign issue around Phase 14;
- avatar works overlay but not avatar-only → presentation-state/renderer binding;
- switching mode resets orientation/root → lifecycle integration issue.

---

# 4. Diagnostic symptom dictionary

Use this before changing thresholds.

| Symptom | First places to inspect | What it usually means |
| --- | --- | --- |
| Raw skeleton itself jitters before avatar | MoveNet confidence / Phase 2 | perception/stabilization issue |
| Raw skeleton stable, avatar jitters | Phase 3+ / solver | presentation constraint/retarget issue |
| Knees/ankles suddenly swap | Phase 3 identity diagnostics | left/right identity ambiguity |
| One limb changes apparent length | Phase 3 segment model | calibration outlier or constraint miss |
| Feet skate during squat | Phase 4 → 5 → 15/16 | contact not created, IK not holding, or root/contact conflict |
| Feet glued during jumping jack | Phase 4 | exercise-aware contact release incorrect |
| Movement smooth but too delayed | Phase 6 | smoothing/response too strong |
| Movement twitchy but low latency | Phase 2/6 | smoothing too weak or confidence gate too permissive |
| Avatar cannot turn | Phase 7/8 | facing/yaw signal missing |
| Avatar flips/spins wrong direction | Phase 8 | yaw sign, wrap, quaternion/rest-relative problem |
| Limbs collapse in side view | Phase 9 | foreshortening protection failing |
| Side-view left/right limbs fight | Phase 11 | occlusion authority/ambiguity handling |
| Side-step only moves legs, not body | Phase 13/14 | lateral root intent/activation absent |
| Side-step suppressed | Closure B/C | camera evidence trusted incorrectly |
| Camera pan moves avatar sideways | Closure B/C | global scene evidence absent/untrusted or activation failed |
| Camera pan creates accumulating drift | Closure C | duplicate-frame consumption / camera offset issue |
| Planted foot slides only while body moves sideways | Phase 15/16 | root/contact compensation |
| Forward bend becomes plank too early | Phase 17 | transition classifier false positive |
| Avatar drops/snaps while going to floor | Phase 17/18 | state transition or assist bound |
| Avatar pushed downward while standing up | Phase 18 | directional assist regression |
| Re-entry after leaving frame starts from old pose | Phase 2 reset | stale temporal history |
| Re-entry has wrong body proportions | Phase 3 reset | stale structural calibration |
| Acceptance says FAIL forever after error recovered | first failing boundary vs historical errors | health semantics bug; historical counters must not drive current health |
| UI says Phase 3 while full stack is loaded | legacy `mirrorMotionPhase` consumer | use canonical foundation status/range instead |
| Calibration and Mufasa speak together | calibration voice arbiter / CoachRuntime | competing voice ownership/fallback |
| Rest pose never completes | calibration/rest diagnostics | incomplete mapped-bone baseline |
| Overlay direction correct, avatar-only wrong | presentation-state sign mapping | mirror transform applied in wrong layer |

---

# 5. How to classify a failure

## A. Perception failure
The keypoints themselves are wrong before avatar correction. Examples: MoveNet loses knee, swaps a limb, confidence collapses.

Do not tune the avatar solver first.

## B. Stabilization failure
Raw point is noisy, stabilized point is also noisy or lags incorrectly.

Inspect Phase 2 raw vs stabilized, alpha, velocity, confidence, coast/drop state.

## C. Structural failure
Stabilized pose is plausible but segment length/identity output is wrong.

Inspect Phase 3 segment model and identity recovery.

## D. Contact/IK failure
Body pose is plausible until a planted hand/foot should remain fixed.

Inspect Phase 4 contact state, then Phase 5 IK, then Phase 15/16 compensation.

## E. Temporal/curve failure
Movement path is correct but feels robotic, delayed, or twitchy.

Inspect Phase 6 rather than changing anatomy rules.

## F. Orientation/side-view failure
Front view works, turn/side view breaks.

Inspect Phase 7 → Phase 8 → Phase 9 → Phase 11 in order.

## G. Root translation failure
Limbs work but body center does not follow member or drifts.

Inspect Phase 13 → Phase 14 → Closure B/C → Phase 15/16.

## H. Floor-transition failure
Standing motion works but getting to plank fails.

Inspect Phase 17 state and confidence first, then Phase 18 assist.

## I. Lifecycle/reset failure
Works until camera/person disappears or mode changes.

Inspect Phase 2 reset propagation, Phase 3 reset, Phase 11 context reset, Phase 13/Closure C reset.

## J. Calibration/voice failure
System cannot establish baseline because speech/listening collides.

Inspect calibration speech lock and CoachRuntime fallback/recognition handoff before any motion tuning.

---

# 6. First-failure discipline

For every live failure:

1. Stop immediately.
2. Enter a short note describing exactly what was visible.
3. Press FAIL or BLOCKED in Mirror Acceptance Controls.
4. Capture the displayed canonical status, first failing boundary, first waiting boundary, current acceptance step, and relevant phase diagnostics.
5. Do not reset until the evidence is recorded.
6. Open one bounded corrective PR for the earliest failing boundary.
7. After the fix is reviewed/merged, RESET the acceptance harness and restart from Test 1 unless the reviewer explicitly proves an earlier state can be safely reused.

This prevents downstream symptoms from being mistaken for root causes.

---

# 7. Final acceptance definition

The mirror foundation is accepted only when:

- canonical foundation status remains READY during the test;
- closure status remains HEALTHY;
- all 11 live acceptance steps are PASS in order;
- no unhandled first failing/waiting boundary appears;
- no test relies on pretending measured Z-depth exists;
- no duplicate camera, MoveNet, IK, contact, exercise, root, or retarget authority is introduced;
- calibration voice ownership remains exclusive until the rest pose is complete;
- live member motion remains primary and correction layers remain bounded.

At that point future work moves to movement-specific tuning or separate engine workstreams, not more speculative foundation phases.
