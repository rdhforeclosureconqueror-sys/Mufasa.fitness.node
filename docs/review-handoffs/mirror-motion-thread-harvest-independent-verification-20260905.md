# INDEPENDENT REVIEW HANDOFF — MIRROR MOTION THREAD HARVEST CLOSURE

## ROLE

You are the independent reviewer for the post-Phase-18 mirror-motion closure plan.

Do not assume the planning bot correctly remembered the conversation or correctly classified every requirement.

Do not merge behavior code as part of this planning review.

Your job is to verify that the closure plan accurately represents what is already implemented, what is genuinely missing, what is intentionally deferred, and when live testing is required.

## REPOSITORY

`rdhforeclosureconqueror-sys/Mufasa.fitness.node`

## BASELINE

Planning branch was created from current `main`:

`ee7b45d9e6a7825f9681c61717675b776128d1db`

That baseline includes PR #677, the final read-only mirror-motion acceptance gate.

## PRIMARY PLAN TO REVIEW

`docs/plans/mirror-motion-thread-harvest-closure-plan-20260905.md`

## REVIEW OBJECTIVE

Return one of:

- `GO` — plan accurately covers the harvested requirements and can be executed in the proposed order;
- `CHANGES REQUIRED` — identify each missing, misclassified, duplicated, or unsafe item with repo evidence.

## REQUIREMENT MATRIX TO VERIFY

### A. Already implemented — verify code really exists

Confirm each item is present in current `main` and is not merely mentioned in handoffs:

1. temporal MoveNet stabilization and confidence-aware coast/drop handling;
2. structural limb-length calibration;
3. left/right identity recovery;
4. exercise-aware planted contacts;
5. contact-aware IK;
6. causal adaptive live motion curves;
7. rest-relative quaternion solver behavior;
8. facing / turn intent;
9. bounded root yaw;
10. foreshortening protection;
11. side-view occlusion authority;
12. lateral root translation;
13. root/contact compensation;
14. ordered standing↔floor transition intelligence;
15. direction-aware bounded transition root assist;
16. calibration/Mufasa exclusive voice handoff;
17. first-failure diagnostics;
18. final acceptance gate.

If an item is present only in documentation but not executable code, mark `CHANGES REQUIRED`.

### B. Genuine closure gap — runtime truth/status

Verify whether older modules still write a generic numeric `mirrorMotionPhase` value and whether a consumer could read it as overall build status.

The plan proposes a canonical status layer backed by final acceptance rather than relying on the legacy numeric field.

Reviewer must determine:

- whether this gap is real;
- all current readers/writers of `mirrorMotionPhase`;
- whether deprecation or replacement is safer than continuing to mutate the numeric field;
- whether the proposed canonical fields are sufficient.

GO only if the Phase A scope cannot create a second competing diagnostics authority.

### C. Genuine closure gap — camera-motion discrimination

Verify current Phase 13/14 lateral translation behavior and current Phase 15/16 handoffs/code.

Determine whether camera pan/shake can still be interpreted as subject lateral movement.

Confirm no existing module already solves global camera motion before approving new work.

If the gap is real, validate the proposed review-first design:

- use the already-owned video/camera path;
- no second camera stream;
- prefer global scene/background evidence when safely available;
- conservative pose-coherence fallback only when needed;
- fail open on ambiguity;
- no measured-depth claim;
- output review-first evidence before live root suppression.

Reviewer should explicitly state whether real-device threshold testing is needed before activation.

### D. Explicit deferrals — confirm classification

Verify that these should remain separate workstreams rather than blocking current Avaturn mirror acceptance:

1. universal Skeleton Inspector / canonical arbitrary-rig mapper;
2. full 3D physics/self-collision/world collision;
3. true measured Z-depth / 3D pose reconstruction;
4. literal Blender F-curves in live mirroring.

If any of these is already required by current production behavior, explain why and mark `CHANGES REQUIRED`.

### E. Testing sequence

Validate the proposed testing cadence:

- Phase A: automated/static verification; no user test required;
- Phase B: unit/synthetic review first, then a short real-device pan/step/shake test if thresholds cannot be justified without it;
- Phase C: camera-aware activation only after B is accepted;
- Phase D: full live acceptance across calibration, standing, squat, jumping jack, turning, push-up floor transition, lateral steps, camera motion, tracker reacquisition, and presentation modes.

The user should not be forced into full acceptance testing before the code is ready, but any threshold that cannot be responsibly selected without real camera data must be surfaced early rather than guessed.

## AUTHORITY INVARIANTS

The closure plan must preserve all of these:

- one canonical camera stream;
- one MoveNet detection authority;
- raw perception remains distinct from avatar presentation correction;
- one exercise authority;
- Phase 4 remains contact creation/release authority;
- Phase 5 remains IK authority;
- existing Avaturn solver remains retarget/root authority;
- no new measured Z-depth authority;
- calibration owns voice exclusively until rest/base capture completes, then Mufasa resumes;
- first-failure diagnostics remain ordered and observable.

Any plan step that violates an invariant is `CHANGES REQUIRED`.

## FILES / AREAS TO INSPECT

At minimum inspect:

- `public/mirror-motion-phase2.js`
- `public/mirror-motion-phase3.js`
- `public/mirror-motion-phase4.js`
- `public/mirror-motion-phase5.js`
- `public/mirror-motion-phase6.js`
- `public/mirror-motion-phase7.js`
- `public/mirror-motion-phase8.js`
- `public/mirror-motion-phase9.js`
- `public/mirror-motion-phase10.js`
- `public/mirror-motion-phase11.js`
- `public/mirror-motion-phase12.js`
- `public/mirror-motion-phase13.js`
- `public/mirror-motion-phase14.js`
- `public/mirror-motion-phase15.js`
- `public/mirror-motion-phase16.js`
- `public/mirror-motion-phase17.js`
- `public/mirror-motion-phase18.js`
- `public/mirror-motion-acceptance.js`
- `public/runtime-state.js`
- existing Avaturn live-pose solver / normalized-pose path;
- avatar calibration voice arbiter and CoachRuntime speech path;
- relevant tests and review handoffs.

Search the full repository for:

- `mirrorMotionPhase`
- camera pan / shake / motion references
- `lateralRootAppliedX`
- `cameraSpaceNormalized`
- rest pose / base position status
- acceptance status readers

Do not rely solely on filenames or prior PR descriptions.

## EXPECTED REVIEW OUTPUT

Return a concise report with:

1. audited main SHA;
2. `GO` or `CHANGES REQUIRED`;
3. requirement matrix: implemented / missing / deferred;
4. any additional harvested gap not present in the plan;
5. verdict on Phase A runtime status cleanup;
6. verdict on Phase B camera-motion discrimination;
7. whether a short early live camera test is necessary;
8. whether the universal avatar mapper should remain separate;
9. exact recommended execution order.

## IMPORTANT

Do not create more numbered mirror-motion foundation phases simply because Phases 2–18 exist.

After this closure plan is verified, new code should be organized as bounded closure/fix PRs. After final acceptance passes, additional work should be driven by reproduced live failures or new product requirements.
