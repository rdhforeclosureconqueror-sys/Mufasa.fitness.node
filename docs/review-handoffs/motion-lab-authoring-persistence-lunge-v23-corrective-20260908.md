# Motion Lab authoring persistence + lunge v2.3 corrective handoff

## Purpose
Correct post-merge findings from PR #737 without weakening Motion Lab IK or changing mirror-motion authority.

## Corrected first failures
1. Multi-phase authored edits could be omitted from the saved clip even when the structured JSON listed them.
2. Loading a saved draft restored the clip but cleared the structured edit state, so subsequent saves could lose prior edit history.
3. Draft-store installation could time out before the operator explicitly initialized Motion Lab.
4. PR #737 described lunge v2.3, but the merged files left the canonical lunge source at v2.1.

## Fix
- Pose Editor now accumulates phase edits into the preview clip as edits are made and uses the accumulated preview as the next patch base.
- Saved adjustment payloads can be imported back into the Pose Editor after a saved clip is loaded.
- Draft-store installation is explicitly invoked by Motion Lab bootstrap after Pose Editor installation and on later initialize calls; the old finite retry loop is removed.
- Canonical stationary left lunge is restored to the already-reviewed v2.2 longer-stride geometry and advanced to v2.3 with the owner-approved `split_plant / right_knee / +5° pitch` correction.
- v2.3 canonical split-plant RightLeg pitch is `-1°` (v2.2 base `-6°` + owner-approved `+5°`). Rep-top RightLeg values remain `-6°` because they were not part of that owner acceptance.
- Contract and regression tests record the owner calibration and fail on drift.

## Required verification
Run focused tests for:
- `test/motion-lab-authoring-draft-store.test.js`
- `test/lunge-motion-spec-v1.test.js`
- relevant Pose Editor / phase-authoring / adjusted-preview regression tests

Then perform iPhone Safari acceptance:
1. Initialize after leaving the page idle for more than 20 seconds; Save/Load/Delete must still wire.
2. Load lunge v2.3 and confirm `split_plant` starts from the approved knee position without manually adding +5°.
3. Make edits in at least two different phases, save, reload, load saved motion, and verify both edits remain in the clip and structured JSON.
4. Add a third edit after restoring and save again; prior edits must remain.

## Readiness contract
This connector environment cannot execute the repository CLI. Before merge, a repository-capable reviewer must run the canonical readiness update/validation workflow required by `AGENTS.md`; do not hand-edit readiness JSON and do not claim human/device acceptance until the owner verifies it.
