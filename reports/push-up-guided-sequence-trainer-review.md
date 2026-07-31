# Push-Up guided sequence — trainer review artifact

Status: **trainer review required** (not approved or published)  
Sequence: `push_up_standard_v1`, version 1  
Capability: `push_up.sequence.phase.v1-proposed`  
Template fingerprint: `sha256:badc1b814829b0b30ea82bf10f08182904db85ba63038ae9aaa9a8c4a458f66b`

## Branch gap and architecture audit

| Area | Finding before this change |
|---|---|
| Visual preview | Implemented: autonomous Top → Bottom → Top animation and pause/resume. |
| Target-pose model | Not implemented. |
| Live pose comparison | Not implemented. |
| Transition matching | Not implemented. |
| Repetition integration | Not implemented for the preview; the approved path used hip displacement only. |
| Fitness Lego integration | Not implemented for the preview. |
| Trainer-review integration | Not implemented for a sequence capability. |

Runtime authority is the generated `push_up` profile resolved by `ExerciseMetadata`; it declares only the side-view shoulder–hip–ankle alignment capability and an 18° threshold. The tracking path is MoveNet → side selection → normalized observations → continuity cache for display → SEARCHING/STABILIZING/LOCKED/DEGRADED/RECOVERING/LOST. Cached/predicted points are display-only. The legacy repetition engine uses usable LOCKED-frame hip displacement. `GhostRenderer` is the existing full-body visual renderer, while generated profile/review workspaces and fingerprinted metadata are the existing capability-review architecture.

Repository searches found phase/cadence and joint vocabularies in generated exercise profiles and source definitions, measurements/rules/findings in the form engine, movement patterns in the Lego source, continuity/repetition states in the challenge runtime, and cue/compensation boundaries in review and legacy-reference material. The sequence reuses these concepts rather than introducing a second form-finding ontology.

## Phase and transition proposal

- **Top:** stable LOCKED observations; all five proposed landmarks at ≥0.75 confidence; provisionally extended relative elbow configuration persisting for 3 frames. The 145° implementation constant is a sequence prototype threshold only. Wording: “Top position matched,” never “perfect lockout.”
- **Lowering:** correct predecessor plus 2 consecutive usable frame deltas showing shoulder movement toward the floor and increasing elbow flexion.
- **Bottom:** only after lowering; elbow angle reduced by a provisional 25° relative to that repetition's Top and shoulder displaced by 0.08 torso lengths, persisting for 3 frames. This is not a floor, 90°, clinical, or approved range-of-motion claim.
- **Rising:** correct predecessor plus 2 consecutive usable frame deltas showing shoulder movement away from the floor and increasing elbow extension.
- **Top complete:** returns near the established Top reference for 3 frames after Rising; then and only then emits one sequence repetition.
- Slow movement has no deadline or tempo penalty. Missing, degraded, recovering, cached, or predicted frames cannot create transition evidence.

Feature weights are body alignment 0.20, elbow angle 0.35, relative position 0.25, and movement direction 0.20. Similarity is explainable per feature. Sequence completion and the existing form finding/score outputs remain separate.

## Fitness Lego mapping

| Existing Lego / profile concept | Sequence classification | Use |
|---|---|---|
| HORIZONTAL PUSH / `horizontal_push` | required phase context | Reused as the exercise movement identity; not a numeric rule. |
| SUPPORT / HOLD and `stable_four_point_support` | important phase feature | Stable position concept; only tracking persistence is measured. |
| SAGITTAL | transition feature | Direction vocabulary for lower/rise; no plane-quality score. |
| Gear 1 slow patterning / controlled eccentric | coaching-only cue | Supports self-paced wording; no tempo score. |
| body alignment capability | important phase feature and form-only finding | Availability contributes to phase explainability; its existing 18° rule remains solely form analysis. |
| `lower` / `hold` / `press` cadence | visualization/coaching mapping | Reused for Down/Up prompts, not animation timing or scoring. |
| “perfect alignment” Lego prose | unsupported | Not converted to machine judgment. |
| Strength-block sets/reps/rest | unsupported for phase matching | No programming or public scoring change. |

## NASM knowledge boundary

The NASM-style files are reference prose, not approved observation datasets and do not imply NASM endorsement. Movement direction and joint-angle math are **measurable now**. Elbow/wrist phase observations are **measurable after capability expansion** and **trainer review required**. Controlled lowering and breathing remain **coaching-only**. The retained athlete is **visual-only**. Wrist comfort, pain, chest-to-floor depth, exact universal depth, joint loading, and 3-D alignment are **not reliably measurable by one camera**. No corrective, diagnostic, rehabilitation, or official-NASM claim is generated.

## Capability expansion and limitations

Elbow and wrist are proposed sequence landmarks alongside shoulder, hip, and ankle. They have independent confidence gating, side-camera compatibility, a proposed capability version, and trainer-review-required state. They do not alter or approve the validated shoulder–hip–ankle capability and cannot authorize elbow form feedback. Front/rear presentation and mirroring do not affect body-relative geometry; camera distance and body size are normalized by torso length. A side view remains required. Two-dimensional occlusion, loose clothing, camera pitch, perspective distortion, and MoveNet error remain limitations.

## Review checklist

A qualified trainer must review phase wording, the provisional 145°/25°/15° angle references, 0.08 torso travel, persistence counts, direction deltas, feature weights, camera setup, and supported/unsupported wording. Review must explicitly preserve the sequence/form-scoring distinction. This artifact does **not** approve production form scoring, Personal Best migration, leaderboard use, or publication.
