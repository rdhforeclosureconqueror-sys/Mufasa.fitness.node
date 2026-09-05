# MIRROR MOTION CLOSURE B — CAMERA MOTION DISCRIMINATION REVIEW

## Role
Independent reviewer. Do not merge during review. Return GO or CHANGES REQUIRED with exact evidence.

## Baseline
Built from current main after Closure A (#679 plus corrective #680) merged. Canonical foundation truth is now WAITING / FAIL / READY and partial rest-pose coverage cannot produce READY.

## Problem
Phase 13 derives lateral movement from camera-space body-center displacement. A camera pan or handheld shake can therefore resemble member lateral movement.

## Scope
This PR is REVIEW-FIRST ONLY. It adds camera-motion evidence and diagnostics. It does NOT suppress or rewrite Phase 13/14 lateral root movement.

## Architecture
New module: `public/mirror-motion-camera-review.js`.

Phase 12 loads it after the final acceptance script. Phase 13 passes its already-processed packet through the review module when available. The review module adds only `cameraMotionIntent` metadata and returns the packet.

No second camera stream, MoveNet detector, IK solver, retargeter, root solver, exercise authority, or measured-depth authority is introduced.

## Evidence hierarchy
1. If the existing packet contains normalized scene/global motion metadata in `cameraFrameMotion`, `sceneMotion`, or `globalFrameMotion`, Closure B may treat that as scene evidence.
2. Without scene evidence, it compares trusted shoulders/hips/knees/ankles frame-to-frame.
3. Highly coherent rigid pose translation with stable body geometry is marked only as `pose_coherence` suspicion.
4. Pose-only evidence is deliberately ambiguous because rigid member translation and camera translation are not identifiable from pose landmarks alone.
5. Ambiguous pose evidence never becomes `detected: true` and residual subject motion is left unchanged.

## Output contract
`cameraMotionIntent` includes:
- `detected`
- `ambiguous`
- `confidence`
- `globalDxNormalized`
- `globalDyNormalized`
- `subjectDxNormalized`
- `residualSubjectDxNormalized`
- `source`: `scene | pose_coherence | unavailable`
- `reviewFirst: true`
- `measuredDepth: false`
- coherence / geometry diagnostics when available.

## Safety rules
- Scene evidence is accepted only when it is explicitly normalized and confidence-bearing.
- Pose-only coherence confidence is capped and cannot assert camera detection.
- Low point count, invalid scale, unstable geometry, coasted/dropped/weak landmarks, and processing errors fail open.
- Phase 2 tracker reset clears camera-review history.
- No root correction is activated in this PR.

## Required review
1. Confirm #679/#680 behavior remains intact on base main.
2. Verify Phase 13 output is unchanged except for optional review metadata.
3. Verify no existing camera/global-motion solution was overlooked that should be used instead.
4. Verify pose-only rigid translation cannot become authoritative camera detection.
5. Verify scene evidence with matched subject/global displacement yields near-zero residual subject dx.
6. Verify a pose-only side step remains residual subject motion rather than being suppressed.
7. Verify unreliable geometry fails open.
8. Verify tracker/person reset clears history.
9. Verify loader order: Phase 2–18 -> acceptance -> camera review.
10. Run `node --test test/mirror-motion-camera-review.test.js test/mirror-motion-acceptance.test.js` plus focused Phase 13/14/15/16 tests and full suite.

## Manual checkpoint recommendation
Reviewer must state whether Closure C can be implemented from synthetic evidence alone. If not, require a short real-device threshold test before activation:
- stand still; pan camera left/right;
- camera still; side-step left/right;
- stand still; small handheld shake;
- repeat at two distances.

## GO criteria
GO means the evidence layer is truthful, review-first, resets safely, and introduces zero root authority. GO does NOT mean camera correction should be activated automatically; Closure C remains a separate PR.