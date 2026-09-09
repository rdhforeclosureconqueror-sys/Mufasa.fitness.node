# Independent Review Handoff — Motion Lab Overhead Squat Assessment v1

Date: 2026-09-09
Branch: `feat/motion-lab-overhead-squat-assessment-20260909`
Base: `main`
Status: **DO NOT MERGE UNTIL OWNER VISUAL ACCEPTANCE**

## Why this PR exists

The Motion Lab lunge work demonstrated that the system performs better when a movement is described phase-by-phase with explicit position authority, contact constraints, trajectory intent, repetition structure, and owner calibration checkpoints.

This PR uses an **Overhead Squat Assessment (OHSA)** as the next proof case. The goal is not to ship clinical scoring. The goal is to test whether Motion Lab can take a new movement description and produce a useful Coach Avatar demonstration without relying on a copied exercise animation.

## Core hypothesis

The minimum information needed for a desired generated movement is:

1. **Start position authority** — exact intended setup.
2. **Ordered phase sequence** — what positions happen and in what order.
3. **Contact constraints** — what stays planted/anchored.
4. **Trajectory constraints** — how body segments move between approved positions.
5. **Timing/repetition intent** — tempo, holds, rep count, autoplay behavior.
6. **Visual acceptance checkpoints** — where a human must approve the generated result.
7. **Calibration ownership** — which values are provisional and must not be treated as canonical until visually approved.
8. **Assessment/scoring boundary** — movement demonstration must remain separate from compensation detection and severity scoring.

That contract is captured explicitly in:

`public/motion/contracts/overhead-squat-assessment.v1.json`

## Files changed

### New

- `public/motion/overhead-squat-assessment-motion-spec.js`
- `public/motion/contracts/overhead-squat-assessment.v1.json`
- `public/motion/motion-lab-overhead-squat-assessment-preview.js`
- `test/overhead-squat-assessment-motion-spec.test.js`
- `docs/review-handoffs/motion-lab-overhead-squat-assessment-v1-20260909.md`

### Updated

- `public/motion/motion-lab-lunge-preview.js`
  - reuses the already-approved canonical-to-Coach Avatar retarget bridge;
  - dynamically installs a separate **Load Overhead Squat Assessment v1 (Coach Avatar)** button when Motion Lab initializes;
  - does not replace or alter the existing lunge button behavior.

## Movement definition

### Setup authority

- feet approximately hip-width;
- feet directed forward;
- bilateral planted foot contacts;
- tall/braced trunk;
- elbows straight;
- arms maintained overhead near the ears.

### Phase order

`setup_overhead`
→ `rep1_descent`
→ `rep1_bottom`
→ `rep1_top`
→ `rep2_descent`
→ `rep2_bottom`
→ `rep2_top`
→ `rep3_descent`
→ `rep3_bottom`
→ `rep3_top`
→ `finish_overhead`

### Lower-body source

The lower-body geometry deliberately reuses the current synthesized squat engineering reference. This keeps the experiment focused on whether Motion Lab can compose a **new contract + overhead constraint + three-rep assessment sequence** rather than reopening squat mechanics at the same time.

### Overhead arm boundary

The initial overhead arm rotation is explicitly marked:

`provisional-owner-calibration-required`

It is a seed so the movement can be rendered and edited. It is **not** claimed to be anatomically exact or owner-approved.

If the arms are not visually correct, use the Motion Lab Pose Editor on `setup_overhead`, correct the arm position, and promote the approved pose before treating it as canonical.

## Assessment boundary

The Motion Spec demonstrates the requested movement. It does **not** perform production scoring.

Separate camera/pose-analysis work can later inspect:

### Front

- feet turning out;
- knees moving inward;
- left/right asymmetry.

### Side

- excessive forward lean;
- lumbar extension pattern;
- arms falling forward;
- depth and heel contact.

### Back (optional)

- left/right asymmetry;
- foot/knee tracking.

Do not encode compensations into the reference animation itself.

## Required automated review

Run at minimum:

```bash
node --test test/overhead-squat-assessment-motion-spec.test.js
```

Then run the existing Motion Lab motion regressions that cover lunge, squat, Motion Spec compilation, Coach Avatar retargeting, diagnostics, and authoring if available in the review environment.

The reviewer should specifically verify that the lunge bridge still exposes and loads the lunge normally after the OHSA installer was added.

## Required visual acceptance — stop at first failure

Open Motion Lab and initialize the runtime.

A separate button should appear:

**Load Overhead Squat Assessment v1 (Coach Avatar)**

### Gate 1 — setup_overhead

Do not judge the rest of the motion yet.

Verify:

- Coach Avatar loads;
- both feet are planted;
- stance looks approximately hip-width;
- elbows appear straight;
- arms are actually overhead rather than merely forward/backward;
- upper arms are reasonably near the ears;
- torso is upright enough for the intended starting assessment pose.

**If Gate 1 fails, stop.** Record the first wrong joint/axis and use Pose Editor calibration. Do not compensate by rewriting later phases.

### Gate 2 — rep1_bottom

After setup is acceptable:

- pelvis descends;
- pelvis has the expected posterior squat component;
- both feet remain grounded;
- knees flex bilaterally;
- there is no obvious floating/sliding artifact;
- arms remain overhead;
- elbows remain straight.

**If Gate 2 fails, stop.** Fix the bottom-position authority before tuning transitions.

### Gate 3 — transition quality

Only after setup and first bottom are acceptable:

- descent moves from approved setup toward approved bottom;
- ascent returns to the exact overhead setup pose;
- there is no unexpected intermediate split, lunge, jump, or pose collapse.

### Gate 4 — three-rep repeatability

- exactly three repetitions;
- stance/contact remains stable;
- overhead reach does not drift;
- each top reacquires the same setup pose;
- final position matches the overhead start.

### Gate 5 — inspection views

Use front and right-side inspection presets. Back is optional for this first proof.

Confirm the reference motion is visually inspectable for the future compensation categories without embedding those compensations into the generated movement.

## Diagnostics expected on failure

Capture the canonical Motion Lab diagnostic summary and identify the earliest boundary that failed, especially:

- OHSA contract validation;
- canonical-to-Coach bone aliasing;
- motion-spec compilation;
- bilateral contact-anchor enforcement;
- generated clip creation;
- runtime load;
- Pose Editor phase availability;
- first visibly incorrect joint/axis.

## Reviewer decision

Return one of:

### GO

The new movement contract loads, generates, retargets, plays, remains grounded, keeps arms overhead, repeats three times, and existing lunge/squat paths are not regressed.

### CALIBRATION REQUIRED

Architecture works but `setup_overhead` and/or `rep1_bottom` require owner pose adjustment. Record exact bone/axis corrections. This is an expected acceptable outcome for the experiment and should not be mislabeled as an architecture failure.

### NO-GO

The Motion Lab cannot compile/load the contract, retargeting breaks, contacts cannot be preserved, the generated motion cannot follow the defined phase sequence, or an existing motion path regresses.

## Owner question this PR is designed to answer

**When we describe a new exercise to Motion Lab, what information must we provide so the system can create the movement we intended?**

This PR operationalizes the answer as: exact key positions + ordered phases + contacts + trajectories + timing/reps + acceptance checkpoints + explicit provisional calibration fields + a clear boundary between demonstration and scoring.
