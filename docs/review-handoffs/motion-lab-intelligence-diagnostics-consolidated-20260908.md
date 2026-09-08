# Motion Lab Motion Intelligence Diagnostics — Consolidated Review Handoff

## Purpose

Consolidate the overlapping observability work from PRs #716, #717, and #718 into one canonical Motion Intelligence diagnostic authority.

## Canonical observation boundary

The consolidated implementation wraps `PocketPTMotionSpecClip.compile()` after the Motion Spec compiler loads and before `DisposableMotionSession` loads. This is the earliest shared generated-motion boundary that all Motion Spec compilation must traverse.

It intentionally does not wrap `MotionLabRuntime.loadMotionSpec()` as the primary authority, because internal or future runtime paths could bypass an exported runtime wrapper while still reaching the compiler.

## One diagnostic surface

The implementation creates one Motion Intelligence block under the existing **Loaded motion** area. It does not create another independent debug section.

The surface remains `NOT RUN` until an actual Motion Spec compile occurs and reports:

- compile status and code;
- first failing boundary and phase;
- shared core and adapter evidence plus versions;
- motion/exercise identity;
- kinematic validation;
- contact lock;
- declared contact count;
- declared vs validated contact phases;
- root-contact correction state;
- maximum root correction;
- maximum post-correction contact residual;
- complete per-phase correction/residual/first-failure evidence.

A single **Copy Motion Intelligence Debug** button copies the same consolidated evidence as a plain-text block for review.

## Truth rules

1. Module presence alone cannot create PASS.
2. Before an actual compiler invocation, Motion Intelligence remains `NOT RUN`.
3. A compile that never reaches shared adapter evidence reports `NOT REACHED`, not PASS.
4. A generated motion with no applicable contact solve reports `NOT APPLICABLE`/`INACTIVE`, not fake kinematic success.
5. First-failure evidence comes directly from compiler/adapter diagnostics.
6. Per-phase evidence is preserved so a visually bad movement can be traced even when compilation succeeds.

## Authority boundaries

This PR changes observability only. It does not change lunge angles, Motion Specs, contact/root correction math, IK, retargeting, renderer/mixer ownership, rest-pose handling, or live mirror behavior.

Phase 2 remains the generated-motion contact/root enforcement authority. This module only exposes its evidence.

## Superseded approaches

- #716: compiler wrapper plus a separate debug panel.
- #717: compiler-level truth without the requested copyable consolidated block.
- #718: copyable block, but primarily wrapping exported `MotionLabRuntime.loadMotionSpec()` instead of the universal compiler seam.

This branch combines the strongest parts into one implementation and should be the only Motion Intelligence observability PR merged.

## Manual acceptance

1. Initialize Motion Lab.
2. Start Session.
3. Load the reference avatar.
4. Confirm Motion Intelligence says `NOT RUN` before generated motion compilation.
5. Load synthesized squat and confirm no regression.
6. Load synthesized lunge.
7. Confirm the diagnostic block shows the motion/exercise ID and adapter evidence when reached.
8. Press **Copy Motion Intelligence Debug** and paste the complete block into review.
9. Use the first failing boundary and per-phase correction/residual evidence to choose the next generalized motion-engine fix.

## Required reviewer execution

Run:

- `node --test test/avatar-motion-intelligence-core-phase1.test.js`
- `node --test test/motion-lab-intelligence-adapter-phase2.test.js`
- `node --test test/motion-lab-intelligence-diagnostics-consolidated.test.js`
- relevant Motion Lab / Motion Spec / squat / lunge suites
- full suite if practical

Tests were added but were not executed in the GitHub connector environment. Do not treat code presence as test execution or human acceptance.
