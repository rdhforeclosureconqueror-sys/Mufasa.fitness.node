# Lunge Movement Definition v2 — step in, three vertical reps, step back

## Owner-observed reason for redesign

The pose editor persistence fix worked, but continuing to correct the previous lunge by rotating individual hip/knee/ankle bones caused coupled changes elsewhere in the leg chains. The movement itself needed a stronger definition so the solver could be given the intended path and contacts rather than being sculpted frame-by-frame.

## New movement definition

The lunge now follows this complete sequence:

1. `stand_start` — neutral upright rest-relative standing pose.
2. `step_forward` — left foot steps forward while the right side remains the support side.
3. `split_plant` — establish the left whole-foot and right forefoot anchors.
4. Rep 1: pelvis travels down → bottom → straight back up.
5. Rep 2: same planted down/up cycle.
6. Rep 3: same planted down/up cycle.
7. `step_back` — release the left forward anchor and return the left foot.
8. `stand_finish` — same neutral pose as `stand_start`.

The motion is intentionally `loop: false`; one playback contains the entry, three repetitions, exit, and return to standing.

## Mechanics reused

This does not add a new animation runtime, renderer, mixer, IK solver, or bone mapper. It continues to use:

- the existing Motion Spec compiler;
- existing rest-relative local rotations;
- existing phase-specific root positions;
- existing phase-aware `contacts` support in `motion-spec-clip.js`;
- existing generated two-bone IK for front and rear leg contact chains;
- existing split-stance front-foot and rear-forefoot contact mappings.

The important change is when the anchors are established. The old version anchored from the first split-stance frame. V2 begins in standing and establishes loaded anchors only at `split_plant`, after the forward step.

## Trajectory rule

Loaded repetitions author no horizontal root travel. During descent and bottom phases:

- root X = `0`;
- root Z = `0`;
- only root Y changes;
- `trajectoryPolicy.loadedDescent.dominantAxis = vertical`;
- rear-knee intent is explicitly down toward the floor.

The engineering bottom root drop is reduced to `0.14 avatar_height` from the previous `0.22 avatar_height` authoring target to avoid the over-folded visual seen during owner testing.

## Bottom targets

Engineering intent for each bottom:

- front knee inside angle: about `90° ± 10°`;
- rear knee inside angle: about `90° ± 15°`;
- front shin: approximately vertical (`0° ± 10°` from vertical);
- left whole foot remains planted;
- right forefoot/toes remain planted, heel may rise;
- rear knee approaches the floor without hard impact;
- torso remains tall.

These are development reference targets, not production biomechanics/scoring thresholds.

## Files

- `public/motion/lunge-motion-spec.js`
- `public/motion/contracts/stationary-lunge-left.v2.json`
- `test/lunge-motion-spec-v1.test.js`

The v1 contract remains in the repo for historical/reference continuity. The active lunge spec now points to the v2 contract.

## Owner visual acceptance

After deployment:

1. Motion Lab → Initialize Runtime → Start Session.
2. Load the synthesized left lunge.
3. Play from the beginning without pose-editor corrections first.
4. Confirm the avatar begins standing rather than already split/folded.
5. Confirm the left foot visibly moves into a forward split stance before loaded descent begins.
6. Confirm the planted phase is stable before rep 1.
7. Confirm each repetition drives primarily straight down/up instead of forward/back.
8. At each bottom, inspect side view for front knee near 90°, front shin near vertical, and rear knee moving down toward the floor.
9. Confirm both feet stay planted across all three loaded reps.
10. Confirm the avatar steps back after rep 3 and returns to neutral standing.
11. Only after this base motion passes should Pose Editor adjustments be used for small refinements.

## First-failure review order

If the visual result is wrong, identify the first failing boundary in this order:

`stand pose → step trajectory → split_plant ground contacts → anchor establishment → generated IK → vertical root trajectory → bottom geometry → ascent → repetition retention → step-back release → standing return`

Do not compensate for an earlier failure by adding more downstream bone rotations.
