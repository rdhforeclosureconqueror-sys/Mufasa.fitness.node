# INDEPENDENT REVIEW HANDOFF — SYNTHESIZED SQUAT ENGINEERING REFERENCE V1

## ROLE

You are the independent reviewer for a bounded Movement Lego proof.

Do **not** assume the authoring bot is correct.
Do **not** merge automatically.
Do **not** promote this motion to validated/product/runtime-ready status.

Your job is to independently inspect whether PocketPT can synthesize a coherent first-generation bodyweight squat motion from already-reviewed movement evidence without importing a named squat animation.

## REPOSITORY

`rdhforeclosureconqueror-sys/Mufasa.fitness.node`

Review the PR branch against its current `main` base. Record both SHAs before review.

## INTENT

The experiment is deliberately narrow:

`STANDING -> DESCENT -> BOTTOM -> ASCENT -> STANDING`

The implementation should demonstrate **movement composition**, not biomechanical authority.

The source ingredients are:

- standing / standing reacquisition
- crouch / low posture
- hip hinge
- bilateral knee flexion / extension
- root descent / rise
- controlled bilateral loading / recovery relationships

No downloaded or copied named squat animation is supposed to be used.

## FILES ADDED

### `motion-sources/squat-synthesis-v1.source.json`

Evidence/provenance manifest. It identifies which already-reviewed source references contributed coarse mechanics and explicitly separates those relationships from source styling.

Expected evidence references:

- `public/motion/transition-profiles/stand-to-plank.v1.json`
- `motion-sources/crouched-sneaking-left-reference.source.json`
- `motion-sources/kettlebell-swing-reference.source.json`
- `motion-sources/jumping-up-reference.source.json`
- `motion-sources/hard-landing-reference.source.json`

The manifest must say human MoveNet evidence is still pending and validation is not complete.

### `public/motion/squat-motion-spec.js`

Development-only deterministic motion specification.

Expected motion identity:

- exercise: `bodyweight_squat`
- motion: `squat/synthesized_engineering_v1`
- status: `development-test-only`
- skeleton: canonical Mixamo-style Phase E skeleton
- duration: 3.2 sec
- phase order: `start -> descent -> bottom -> ascent -> finish`

The spec uses rest-relative engineering offsets and normalized root offsets in avatar-height units. It intentionally mirrors descent and ascent around the bottom pose.

The implementation must explicitly reject any implication that the values are biomechanical ground truth, scoring tolerances, medical guidance, or individualized fit.

### `test/squat-motion-spec-v1.test.js`

Static Node tests for:

- spec validation
- phase order
- mirrored descent/ascent
- root descent at bottom
- bilateral foot contact
- development-only boundary
- explicit requirement for later human MoveNet review

## WHAT THIS PR DOES NOT DO

It does **not**:

- add a squat FBX/GLB
- copy a named squat animation
- change MoveNet recognition
- change exercise scoring
- change coaching tolerances
- change production motion registry status
- declare the squat VALIDATED or READY
- prove the avatar renders the pose correctly in browser/device runtime
- replace later FRONT + SIDE human recordings

## REVIEW CHECKLIST

1. Confirm the branch starts from the recorded main SHA in the PR.
2. Inspect every new file; confirm there are no unrelated changes.
3. Verify every evidence path referenced by the synthesis manifest exists on main.
4. Verify the squat spec is self-contained and deterministic.
5. Verify `validate(spec)` should pass against the included canonical bone list.
6. Verify phase normalized times strictly increase from 0 to 1.
7. Verify start and finish are neutral standing.
8. Verify descent/ascent are intentionally mirrored.
9. Verify bottom root Y is lower than standing and both feet remain contact anchors.
10. Check that left/right leg targets are symmetric except for intentional abduction sign mirroring.
11. Check for suspicious source-specific styling copied from Kettlebell Swing, Sneaking, Jumping Up, or Hard Landing. The proof should use coarse mechanics only.
12. Run `node --test test/squat-motion-spec-v1.test.js` (or the repository's canonical test command if broader coverage is required).
13. Search for accidental runtime wiring. This PR should not silently insert the squat into product-facing motion registries.
14. If possible, load the spec into an existing development avatar/Motion Lab path and visually inspect it. Treat this as HUMAN/RUNTIME proof, separate from static test proof.

## IMPORTANT REVIEW QUESTION

The central question is **not** "Is this a perfect squat?"

It is:

> Does this PR provide a bounded, auditable, development-only proof that PocketPT can compose a coherent squat-shaped motion from reusable movement knowledge without importing a dedicated squat animation?

If yes, approve the engineering proof while keeping human MoveNet and avatar visual verification pending.

If no, identify the earliest incorrect phase, bone target, root assumption, or evidence claim and request a bounded correction.

## ACCEPTANCE LEVELS

### STATIC/CODE ACCEPTANCE

May be approved if the module is internally valid, bounded, testable, and evidence provenance is accurate.

### VISUAL/RUNTIME ACCEPTANCE

Requires an avatar playback showing a recognizable controlled squat cycle without foot sliding, catastrophic limb inversion, root teleporting, or obvious skeleton-axis errors.

### BIOMECHANICAL VALIDATION

Explicitly **out of scope** until FRONT + SIDE human MoveNet recordings and trainer review exist.

## HANDOFF RESULT FORMAT

Return:

- base SHA
- head SHA
- files reviewed
- tests executed + exact result
- static verdict: GO / NO-GO
- visual/runtime verdict: GO / PENDING / NO-GO
- biomechanical validation: PENDING
- blocking findings
- non-blocking findings
- whether the PR is safe to merge as a **development-only engineering reference**
