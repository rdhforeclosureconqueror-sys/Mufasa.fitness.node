# INDEPENDENT REVIEW HANDOFF — PR #595 MOVEMENT LEGO RECORDER

## ROLE

You are an independent technical reviewer.

Do NOT assume the implementing bot is correct.
Do NOT merge anything.
Your job is to independently inspect PR #595 against current `main`, verify the architecture and implementation, identify defects/regressions, and return a clear GO / NO-GO recommendation.

Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`
Pull request: #595
Head branch: `movement-lego-recorder-v1`

## PRODUCT GOAL

PocketPT needs a private trainer-facing system that can collect reusable movement evidence and organize it into Motion Lego blocks.

Two evidence sources are intentionally separate:

1. **MoveNet recordings** = real 2D perception evidence showing what PocketPT actually sees from a human body.
2. **Animation / FBX / GLB references** = complementary 3D evidence for root travel, pelvis/spine orientation and bone rotation that MoveNet cannot directly observe.

Do not collapse those two systems into one.

## REQUIRED ARCHITECTURE

Canonical flow:

`existing camera -> existing PoseRuntime / MoveNet -> pose-runtime:frame -> normalized-pose -> Movement Recorder -> paired-view evidence -> pose checkpoints -> later Lego study/review`

The PR MUST NOT create:
- a second `getUserMedia`
- a second MoveNet detector
- a second pose loop
- raw video storage
- public exercise scoring from unreviewed captures

## EXISTING SYSTEM THAT MUST BE PRESERVED

The repo already contains a private Coach Demo Exercise Template Builder on `/workout.html` with trainer/admin capture behavior. PR #595 should extend that surface, not invent a parallel trainer product.

Existing workout, camera, avatar, MoveNet, auth, push-up challenge, template builder and persistence behavior must remain functional.

## REQUIRED PR #595 CAPABILITIES

### 1. Movement Lego Recorder
Verify `public/motion/movement-recorder.js`:
- subscribes to canonical `pose-runtime:frame`
- stores normalized movement frames only
- stores major joints, centers, body directions, elbow/knee angles and confidence
- supports bounded 5/10/15 second recording
- does not store raw camera video/images
- explicitly states wrist-only hand detail and no true 3D bone rotations

### 2. Paired FRONT + SIDE capture
Every Foundation movement must require both views.

Expected flow:
- load a Foundation task
- first missing view defaults to FRONT
- save front evidence
- UI marks Front ✓ and prompts the trainer to rotate and record SIDE
- save side evidence
- UI marks paired 2D evidence complete

A single view MUST NOT mark the movement paired-complete.

### 3. Foundation roadmap
Verify `public/motion/registry/movement-recording-roadmap.v1.json` and `public/motion/movement-recording-roadmap.js`.

Foundation movements:
1. Standing Baseline
2. Slow Bodyweight Squat
3. Forward Lunge — Both Sides
4. Vertical Jump + Landing
5. Stand -> Ground / Plank Entry
6. Ground / Plank -> Stand
7. Slow Push-Up Cycle
8. Alternating Knee Drive / Mountain Climber

Every task must declare `requiredViews: ["front", "side"]` and explain:
- what to perform
- front-view guidance
- side-view guidance
- what 2D MoveNet teaches
- what animation/FBX must still add
- what exercises/behaviors the evidence can help create

### 4. Custom movements
Verify the trainer can create a local custom movement such as:
- One-Arm Push-Up Left
- One-Arm Push-Up Right

Custom movements should:
- receive a stable local primitive ID
- default to required front + side capture
- be selectable in the existing recorder
- remain evidence/research data, not automatically active public scoring

### 5. Pose checkpoints / skeleton pictures
Verify `public/motion/movement-capture-studio.js`.

After a saved recording, the system should derive reviewable milestone frames such as:
- START / TOP
- KEY / BOTTOM or movement extreme
- RETURN / FINISH

Each checkpoint must store:
- frame index
- timestamp in milliseconds
- a generated skeleton SVG based on normalized MoveNet joints

These images are 2D reference skeletons only. They must not be represented as reconstructed 3D bone rotations.

### 6. Scavenger registry
Verify the compact Motion Lego Hunt remains organized into only:
- Transitions
- Postures
- Actions

Canonical status progression remains:
`EMPTY -> CANDIDATE -> STUDIED -> VALIDATED -> READY`

Local captures may add evidence but must not silently promote canonical repo status.

## IMPORTANT IMPLEMENTATION RISKS TO CHECK

1. **Load order / race conditions**
`boot-core.js` should load Recorder -> Roadmap -> Capture Studio in a deterministic chain.

2. **Local storage annotation race**
The existing recorder saves a frozen recording object. The capture studio annotates the serialized local evidence with `captureView`, movement identity and pose checkpoints. Verify the saved item being annotated is the intended latest capture and that roadmap rendering refreshes after annotation.

3. **Duplicate primitive recordings**
If multiple recordings exist for the same primitive, verify front/side coverage does not accidentally relabel an older untagged recording.

4. **Custom movement collisions**
Custom IDs should be stable enough for local use and should not overwrite canonical registry IDs.

5. **Skeleton SVG safety**
Verify labels are escaped before insertion into SVG/HTML and no untrusted raw markup is injected.

6. **Milestone heuristics**
Milestones are suggestions, not biomechanical truth. Verify the code does not present the automatically chosen key frame as validated form.

7. **Storage limit**
The original recorder keeps only a bounded recent local evidence set. Confirm the UI/documentation does not imply this is durable permanent storage.

8. **No regression to camera or MoveNet**
Search the PR for `getUserMedia`, detector creation, or independent inference loops. There should be none in the new movement modules.

## AUTOMATED REVIEW

Inspect and, if environment permits, run at minimum:

- `node --test test/movement-lego-recorder-v1.test.js`
- `node --test test/movement-recording-roadmap-v1.test.js`
- `node --test test/movement-capture-studio-v1.test.js`

Then run relevant existing pose/workout tests if practical.

Do not claim tests passed unless actually executed.

## REQUIRED LIVE ACCEPTANCE

Before recommending merge, confirm the following in a trainer/admin browser session:

1. Existing Coach Demo Exercise Template Builder still opens.
2. Foundation Movement Recording Roadmap appears.
3. Movement Lego Recorder appears.
4. Paired View + Pose Checkpoint Studio appears.
5. Connect existing camera and wait for canonical MoveNet tracking.
6. Load one Foundation movement.
7. Record/save FRONT.
8. Confirm Front ✓ / Side □ and explicit prompt to rotate for SIDE.
9. Record/save SIDE.
10. Confirm Front ✓ / Side ✓ and paired 2D complete.
11. Confirm skeleton checkpoint cards appear with timestamp + frame number.
12. Create a custom `One-Arm Push-Up Left` movement and verify it enters the recorder with FRONT first, then SIDE.
13. Export JSON and verify no raw video/image payload exists. Skeleton SVG checkpoint strings are allowed because they are generated from landmarks.
14. Confirm existing template demo capture, workout, camera and avatar behavior still work.

## REVIEW RESPONSE FORMAT

Return:

- Current main SHA
- PR head SHA
- Files changed
- Automated checks actually run + exact result
- Findings ordered by severity
- Live/browser checks performed vs not performed
- Architecture verdict
- Final recommendation: `GO`, `GO WITH CONDITIONS`, or `NO-GO`

Do not merge the PR.
