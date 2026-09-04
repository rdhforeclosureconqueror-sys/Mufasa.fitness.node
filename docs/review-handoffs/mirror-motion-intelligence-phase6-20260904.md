# PocketPT Mirror Motion Intelligence — Phase 6 review handoff

## Scope

Phase 6 adds the causal live-curve/tuning layer after hardened Phase 5 contact-aware IK and before the existing avatar retarget renderer.

Stacked base:
- parent branch: `feature/mirror-motion-intelligence-phase4-20260904`
- hardened Phase 5 state includes merged PRs #643 and #644
- audited Phase 6 base SHA: `5de7232fff128bcc95ff7eac80621c065944d520`
- Phase 6 branch: `feature/mirror-motion-intelligence-phase6-20260904`

## Pipeline

`MoveNet raw -> Phase 2 temporal stabilization -> Phase 3 structural constraints -> Phase 4 exercise/contact context -> Phase 5 contact-aware IK -> Phase 6 live curve/tuning -> existing retarget renderer -> avatar`

Phase 6 does not create another detector, exercise authority, IK solver, or render loop.

## Responsibilities

- causal, per-frame motion shaping without future keyframes;
- velocity- and acceleration-aware responsiveness when trustworthy body scale exists;
- per-joint response bias (responsive wrists/ankles, more stable hips/shoulders);
- phase-aware tuning (transitions and jumping-jack motion respond faster; squat bottom can be steadier);
- preserve Phase 4 contact anchors by bypassing curve smoothing on anchored endpoints;
- preserve Phase 2 uncertainty semantics by bypassing dropped/coasted points;
- do not invent a body-scale fallback: if trustworthy scale is unavailable, pass through and diagnose it;
- clear curve history on exercise changes, timestamp regression, and Phase 2 tracker reset/reacquisition;
- expose latency-versus-stability telemetry.

## Diagnostics

`Mirror Motion Phase 6 Debug` reports:
- first failing boundary;
- pipeline stage;
- runtime patch/bind status;
- curve frames and tuned points;
- anchor, uncertainty, and body-scale bypass counts;
- average adaptive alpha;
- average movement suppression in pixels;
- estimated curve-induced latency;
- context reset count;
- last curve issue;
- process errors.

## Review risks to challenge

1. Double-smoothing: confirm Phase 6 improves presentation rather than compounding Phase 2 lag.
2. Fast movement: verify high-confidence deliberate motion increases alpha and remains responsive.
3. Contacts: wrists/ankles planted by Phase 4 must not drift because of Phase 6.
4. IK output: Phase 5 solved knee/elbow positions must remain structurally valid after curve tuning.
5. Missing scale: no arbitrary pixel normalization may be introduced.
6. Lifecycle: old curve history must not survive exercise/person/session discontinuities.
7. Telemetry: frame-level stats must be distinguishable from cumulative diagnostics.

## Automated verification

Run:

`node --test test/pose-stability-engine.test.js test/mirror-motion-phase2.test.js test/mirror-motion-phase3.test.js test/mirror-motion-phase4.test.js test/mirror-motion-phase5.test.js test/mirror-motion-phase6.test.js`

Then run the full repository suite.

## Manual acceptance

Test at minimum:
- standing still;
- slow squat;
- fast squat ascent;
- squat bottom hold;
- deliberate stance change/re-anchor;
- jumping jack open/close cycles;
- standing-to-floor push-up transition;
- stable push-up contacts;
- fast arm raise;
- partial occlusion/coasting;
- left/right crossing;
- camera/person reconnect;
- avatar overlay and avatar-only modes.

Record visible lag and jitter together. A visually smoother avatar that feels delayed is not a Phase 6 success.

## Explicit non-goals

No offline Blender F-curves, future-frame interpolation, full 3D reconstruction, quaternion retarget rewrite, collision solver, second camera/MoveNet path, second exercise authority, or second rep counter.

Return `GO` or `CHANGES REQUIRED` with exact evidence. Do not merge during independent review unless explicitly requested by the owner.