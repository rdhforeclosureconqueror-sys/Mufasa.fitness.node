# Mirror Motion Intelligence — Phase 5 review handoff

## Scope

Phase 5 adds a bounded 2D contact-aware inverse-kinematics chain solver after Phase 4 exercise/contact constraints and before the existing avatar retarget renderer.

## Base

- Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`
- Stacked base: hardened Phase 4 head `07b9a8fbd54743a4adec0342d51b0a2cc2cf54bc`
- Parent PR: #641
- Phase 4 hardening PR: #642 merged into the Phase 4 branch
- Phase 5 branch: `feature/mirror-motion-intelligence-phase5-20260904`

Phase 4 is not yet on `main` at the time this branch was created, so this PR is intentionally stacked on the hardened Phase 4 branch rather than pretending the dependency is merged.

## Pipeline

`MoveNet raw -> Phase 2 temporal stabilization -> Phase 3 structural body model -> Phase 4 exercise/contact constraints -> Phase 5 contact-aware IK -> existing retarget renderer -> avatar`

Raw MoveNet evidence remains untouched for rep/form authorities.

## Behavior

### Squat

When Phase 4 has an ankle contact anchor and Phase 3 has calibrated thigh/shin lengths, Phase 5 solves the knee as the intersection of two circles:

- hip-centered radius = learned thigh length;
- ankle-centered radius = learned shin length.

It chooses the valid intersection nearest the established bend-side history/current trustworthy knee so the knee does not randomly invert sides.

### Push-up

When Phase 4 has confirmed push-up contacts, Phase 5 can solve:

- shoulder -> elbow -> wrist chains;
- hip -> knee -> ankle chains.

This keeps planted endpoints and learned limb lengths mutually consistent instead of allowing the middle joint to collapse or stretch.

## Safety / fail-open behavior

- No IK is applied without a Phase 4 contact anchor.
- No IK is applied without usable Phase 3 calibrated segment lengths.
- Unreachable geometry is reported and left unchanged; the solver does not force an impossible chain.
- Processing exceptions fail open to the Phase 4 packet.
- Low-confidence middle joints do not become bend-direction authority when a prior solved bend history exists.
- Bend history clears on exercise changes and Phase 2 tracker resets/reacquisition boundaries.

## Diagnostics

Dedicated `Mirror Motion Phase 5 Debug` panel reports:

- first failing Phase 5 boundary;
- pipeline stage;
- runtime patch/bind status;
- IK frames;
- chains solved;
- unreachable chains;
- skipped chains;
- bend-history chain count;
- history/context reset count;
- maximum solve residual;
- last IK issue;
- process errors.

## Regression coverage

`test/mirror-motion-phase5.test.js` covers:

- planted squat leg solving to learned lengths;
- bend-side preservation;
- no solving without Phase 4 anchor;
- push-up arm and leg solving;
- unreachable geometry fail-open behavior;
- missing structural model skip behavior;
- downstream packet delivery;
- diagnostics fields.

## Explicit non-goals

This phase does **not** add:

- full 3D IK;
- depth reconstruction from monocular video;
- quaternion retarget rewrite;
- collision solving;
- live F-curve/trajectory shaping;
- new MoveNet/camera ownership;
- new exercise-selection or rep-count authority.

The solver operates in the same 2D projected coordinate space used by the current mirror packet and should be reviewed as a presentation-consistency layer, not as final 3D biomechanics.

## Independent review request

Review the actual current PR head and challenge:

1. false bend-side flips after low-confidence knee/elbow frames;
2. stale bend history after camera/person reacquisition or exercise change;
3. unreachable-chain handling;
4. whether Phase 3 projected segment lengths remain compatible after Phase 4 contact corrections;
5. wrapper ordering remains Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> retarget;
6. no raw MoveNet authority is replaced.

Run at minimum:

`node --test test/pose-stability-engine.test.js test/mirror-motion-phase2.test.js test/mirror-motion-phase3.test.js test/mirror-motion-phase4.test.js test/mirror-motion-phase5.test.js`

plus the full repository suite and live-camera acceptance for squat, push-up floor transition/contact, side-on push-ups, deliberate stance changes, camera reconnect/reacquisition, avatar overlay, and avatar-only modes.

Return `GO` or `CHANGES REQUIRED` with exact evidence. Do not merge during independent review unless explicitly requested by the owner.
