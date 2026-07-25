# Pocket PT trainer exercise metadata review

**Review package scope:** metadata schema 1, asset `20260725-em1`, Guided Coach runtime `20260725-em-wc1`, and Form runtime `20260725-em-fr1`. This document records the exact current profile content and proposals for qualified review; it does **not** indicate trainer review or approval. Every profile is `draft`, so production corrective form feedback remains blocked.

## How to use this package

“Instruction coaching supported” means Pocket PT can present stored setup, movement, cadence, and phrase text. “Automated form judgment supported” means a profile contains a deterministic pose rule; even then, the runtime will not issue corrective feedback until its status is truthfully `approved`. Pose estimates are two-dimensional estimates—not medical, pain, injury, or biomechanical certainty. Empty safety-cue lists below are exact current metadata and require trainer review.

## Exercise review matrix

| Exercise | Setup cues complete | Movement cues complete | Cadence appropriate | Camera view | Pose support | Rules implemented | Corrective feedback currently allowed | Primary limitation | Trainer action required |
|---|---|---|---|---|---|---|---|---|---|
| Dead Bug | Review required | Review required | Review required | Not supported | Instruction coaching supported; automated form judgment unsupported | None | No—draft | Torso/pelvic control and coordination not measurable | Review coaching; decide whether analysis should remain rejected |
| Cat-Cow Flow | Review required | Review required | Review required | Not supported | Instruction coaching supported; automated form judgment unsupported | None | No—draft | No detailed spinal landmarks | Review cues/cadence; reject precise curvature judgment |
| Push-Up | Review required | Review required | Review required | Side | Instruction coaching and rule configured; automated judgment blocked | Body alignment | No—draft | One 2D shoulder–hip–ankle angle | Review 18° threshold, language, and camera protocol |
| Bodyweight Squat | Review required | Review required | Review required | Side | Instruction coaching and rule configured; automated judgment blocked | “Torso control” | No—draft | Rule is actually shoulder–hip–ankle alignment, not independent torso/depth/tracking | Decide whether rule/name/35° threshold are suitable |
| Squat | Review required | Review required | Review required | Side | Instruction coaching and rule configured; automated judgment blocked | “Torso control” | No—draft | Duplicates Bodyweight Squat content without catalog rationale | Decide catalog distinction, aliases, and rule reuse |
| Dumbbell Bicep Curl | Review required | Review required | Review required | Not supported | Instruction coaching supported; automated form judgment unsupported | None | No—draft | Elbow/shoulder/range measurements absent; occlusion likely | Review cues and define or reject future camera analysis |
| Side Bridge | Review required | Review required | Review required | Side | Instruction coaching and rule configured; automated judgment blocked | Body alignment | No—draft | Lower-body occlusion invalidates the 2D line | Review 18° threshold, setup, and visibility protocol |

## Deterministic rule mechanics (plain language)

All four implemented rules use the same calculation. On each sampled frame (at most every 125 ms), the application chooses whichever left or right side has the best visible **shoulder, hip, and ankle**, requiring every selected landmark to score at least **0.75**. It calculates the two-dimensional angle at the hip between the shoulder-to-hip and ankle-to-hip vectors using the dot product and arccosine. “Alignment deviation” is the absolute difference between that angle and 180°. This does not measure a three-dimensional body line, spinal shape, joint loading, pain, comfort, balance, or intent.

A set is usable only when at least **60%** of received frames produced measurements and their mean confidence is at least **0.75**. A rule qualifies only when deviation is **greater than** its exercise threshold in at least **35%** of accepted frames **and** an affected run persists for at least **500 ms**. Low-confidence/unmeasurable frames are rejected. If set-level confidence is insufficient, the form report is `insufficient_data` and supplies no rule phrase. The profile’s uncertainty phrase is the intended rule reference, but the current runtime does not select it in that path; this is a technical behavior trainers should understand. When a concern qualifies at mean confidence below 0.85, the runtime prefixes the correction with “It looks like you may need an adjustment.” Draft gating currently prevents all these positive/corrective outcomes in production.

- **Push-Up `body_alignment`:** concern above **18°**. Qualified correction: “On the next set, try keeping your hips in line with your shoulders.” Positive: “Your body position stayed controlled.” Profile uncertainty: “I could not get a clear enough view of your body position.” It cannot determine hand suitability, wrist comfort, pain, elbow angle, lowering depth, or full 3D alignment.
- **Bodyweight Squat `torso_control`:** concern above **35°**. Qualified correction: “On the next set, keep your torso controlled as you stand.” Positive: “Your squat stayed controlled.” Profile uncertainty: “I could not get a clear enough side view.” Despite its name, it uses the ankle as the third point and cannot isolate torso inclination, depth, knee tracking, or whether the stance is appropriate.
- **Squat `torso_control`:** identical **35°**, calculation, thresholds, and phrases (with Squat-owned phrase IDs) to Bodyweight Squat. It cannot assess load, depth, knee tracking, independent torso angle, or justify that the same rule fits a potentially distinct catalog movement.
- **Side Bridge `body_alignment`:** concern above **18°**. Qualified correction: “On the next set, keep your hips in line with your shoulders.” Positive: “Your side position stayed controlled.” Profile uncertainty: “I could not get a clear enough side view.” It cannot determine elbow comfort, shoulder loading, stacked alignment in depth, or a body line when an ankle is obscured.

The 18° and 35° values have no trainer rationale recorded in metadata. They are review candidates, not validated standards.

## Proposed camera setup (review text only; not Focus Mode text)

These are proposals for trainer and later device testing, not production member-facing instructions.

- **Push-Up:** Place the phone on a stable support at approximately hip/torso height, perpendicular to one side of the body, roughly 2–3 m away (adjust to fit). Show the selected shoulder, hip, and ankle for the entire set; preferably show hands and feet too. Use even front lighting, avoid backlighting, and wear clothing that leaves the torso outline visible. A mirrored preview changes screen direction but not the member’s actual left/right; do not rotate into an oblique view to match it. An inadequate view causes rejected frames or `insufficient_data`; draft status blocks judgment regardless.
- **Bodyweight Squat:** Place the phone around hip height, approximately 2–3 m away, in a true side view. Keep head/shoulder through hip, knee, and ankle visible, including top and bottom positions. Use even lighting and clothing that does not conceal hip/knee outlines. Mirroring does not convert a side view into a front view. A front or oblique view is unsuitable for the configured alignment rule and must not be used to infer knee tracking; inadequate frames yield no feedback.
- **Squat:** Use the same provisional side setup as Bodyweight Squat only if a trainer confirms this catalog item represents the same unloaded movement. If it is loaded or otherwise distinct, the trainer must define a separate visibility/camera protocol. Keep shoulder, hip, knee, ankle, and any equipment within frame; avoid clothing/equipment occlusion. Mirroring is display-only. Inadequate view yields no judgment.
- **Side Bridge:** Put the phone near hip height, roughly 2–3 m away, perpendicular to the member’s front-facing plane so the supported side is visible. Keep shoulder, hip, and ankle visible throughout; preferably include elbow and feet. Use even lighting and contrasting clothing/background. Mirroring only reverses the preview. If the lower body is cropped or obscured, the ankle-based measurement cannot be made and feedback must be withheld.

Unsupported profiles have no production pose camera requirement. For future study only: Dead Bug likely needs full torso and opposite limbs visible from a trainer-selected angle; Cat-Cow needs a side view but MoveNet still lacks spinal segmentation; Dumbbell Curl would need shoulder, elbow, wrist, torso, and weights visible while avoiding dumbbell/torso occlusion. These suggestions do not establish support.

## Profile reviews

### Dead Bug

- **Exercise name:** Dead Bug
- **Canonical exercise ID:** `dead_bug`
- **Profile version:** 1 (schema 1)
- **Current approval status:** `draft`
- **Form-analysis support status:** Unsupported (`not_supported`); instruction coaching supported, automated form judgment unsupported.
- **Required camera view:** None in current metadata.
- **Guided Coach setup cues:** “Lie on your back.”; “Bring your knees over your hips.”; “Reach your arms toward the ceiling.”
- **Guided Coach movement cues:** “Extend the opposite arm and leg, then return with control.”
- **Cadence words:** Reach / Hold / Return
- **Safety cues:** None (empty list).
- **Positive coaching phrases:** None in `positiveForm`; encouragement “Keep breathing.”, “Stay controlled.”; completion “Good job.”; recovery “Take a breath.”
- **Corrective coaching phrases:** None.
- **Uncertainty phrases:** None.
- **Pose landmarks used / derived measurements used / rule thresholds:** None.
- **Minimum confidence / minimum affected-frame percentage / minimum consecutive duration:** Profile-level usable frames 60% and overall confidence 0.75 exist but no rule consumes them; rule values not applicable.
- **Known technical limitations:** Present measurements cannot reliably infer torso stability, pelvic control, lumbar contact, opposite-limb coordination, pain, or range; perspective and floor occlusion compound ambiguity.
- **Trainer review checklist:** Verify setup, knee/hip description, contralateral wording, breathing, cadence, regression options, safety language, and continued rejection of deterministic analysis.
- **Trainer comments area:** ________________________________________________
- **Trainer decision area (select none until reviewed):** ☐ Accept instructions ☐ Revise instructions ☐ Accept camera view ☐ Revise camera view ☐ Accept form rule ☐ Revise form rule ☐ Reject automated form analysis for this exercise ☐ Ready for `trainer_reviewed` status ☐ Not ready

### Cat-Cow Flow

- **Exercise name:** Cat-Cow Flow
- **Canonical exercise ID:** `cat_cow`
- **Profile version:** 1 (schema 1); aliases `cat_cow_flow`, `cat-cow` (both normalize consistently).
- **Current approval status:** `draft`
- **Form-analysis support status:** Unsupported; instruction coaching supported, automated form judgment unsupported.
- **Required camera view:** None (`not_supported`).
- **Guided Coach setup cues:** “Start on your hands and knees.”; “Stack your shoulders over your hands and hips over your knees.”
- **Guided Coach movement cues:** “Move smoothly between spinal flexion and extension with your breath.”
- **Cadence words:** Round / Breathe / Extend
- **Safety cues:** None.
- **Positive coaching phrases:** No form-positive phrase; encouragement “Keep breathing.”, “Move smoothly.”; completion “Nice work.”; recovery “Take a breath.”
- **Corrective coaching phrases / uncertainty phrases:** None.
- **Pose landmarks used / derived measurements used / rule thresholds:** None.
- **Minimum confidence / minimum affected-frame percentage / minimum consecutive duration:** Profile defaults 60%/0.75 but no rule; affected frames/duration not applicable.
- **Known technical limitations:** MoveNet’s 17 landmarks do not segment the spine, so precise spinal curvature, segment motion, comfort, or breathing cannot be determined.
- **Trainer review checklist:** Review wrist/knee setup, breath coordination, whether “Extend” is understandable, safety/modification cues, and rejection of precise curvature judgment.
- **Trainer comments area:** ________________________________________________
- **Trainer decision area:** ☐ Accept instructions ☐ Revise instructions ☐ Accept camera view ☐ Revise camera view ☐ Accept form rule ☐ Revise form rule ☐ Reject automated form analysis for this exercise ☐ Ready for `trainer_reviewed` status ☐ Not ready

### Push-Up

- **Exercise name:** Push-Up
- **Canonical exercise ID:** `push_up`
- **Profile version:** 1 (schema 1); aliases `pushup`, `push-up`.
- **Current approval status:** `draft`
- **Form-analysis support status:** Rule configured but automated judgment/corrective feedback blocked until approved.
- **Required camera view:** Side.
- **Guided Coach setup cues:** “Place your hands beneath your shoulders.”; “Brace in a straight line from shoulders to heels.”
- **Guided Coach movement cues:** “Lower your body with control, pause, then press the floor away.”
- **Cadence words:** Lower / Hold / Press
- **Safety cues:** None.
- **Positive coaching phrases:** “Your body position stayed controlled.”; encouragement “Keep your body strong.”, “Stay controlled.”; completion “Good job.”; recovery “Take a breath.”
- **Corrective coaching phrases:** “On the next set, try keeping your hips in line with your shoulders.”
- **Uncertainty phrases:** “I could not get a clear enough view of your body position.”
- **Pose landmarks used / derived measurements used:** Best-visible-side shoulder, hip, ankle; 2D alignment deviation from 180° at the hip. Elbow-angle analysis is **not** supported by this metadata rule.
- **Rule thresholds:** `body_alignment`, concern >18°; minimum landmark confidence 0.75; affected frames 35%; consecutive duration 500 ms. Profile minimums: 60% usable frames, 0.75 overall confidence.
- **Known technical limitations:** Cannot assess wrist comfort/pain, elbow angle, true depth, hand width suitability, or 3D rotation/alignment.
- **Trainer review checklist:** Review hand placement inclusivity, shoulder-to-heel cue, lower/hold/press cadence, side view, landmark relevance, 18°/35%/500 ms thresholds, and probabilistic correction wording.
- **Trainer comments area:** ________________________________________________
- **Trainer decision area:** ☐ Accept instructions ☐ Revise instructions ☐ Accept camera view ☐ Revise camera view ☐ Accept form rule ☐ Revise form rule ☐ Reject automated form analysis for this exercise ☐ Ready for `trainer_reviewed` status ☐ Not ready

### Bodyweight Squat

- **Exercise name:** Bodyweight Squat
- **Canonical exercise ID:** `bodyweight_squat`
- **Profile version:** 1 (schema 1); alias `bodyweight squat` normalizes to the canonical ID.
- **Current approval status:** `draft`
- **Form-analysis support status:** Rule configured but automated judgment blocked.
- **Required camera view:** Side (not front).
- **Guided Coach setup cues:** “Stand with your feet in a comfortable stance.”; “Keep your chest tall.”
- **Guided Coach movement cues:** “Sit your hips back, pause with control, then stand tall.”
- **Cadence words:** Sit back / Hold / Stand
- **Safety cues:** None.
- **Positive coaching phrases:** “Your squat stayed controlled.”; encouragement “Keep your rhythm.”, “Stay controlled.”; completion “Good job.”; recovery “Take a breath.”
- **Corrective coaching phrases:** “On the next set, keep your torso controlled as you stand.”
- **Uncertainty phrases:** “I could not get a clear enough side view.”
- **Pose landmarks used / derived measurements used:** Shoulder, hip, ankle on one side; 2D deviation from a straight angle at hip. Knee is not used although it must remain visible in the proposed setup for contextual review.
- **Rule thresholds:** `torso_control`, >35°; landmark confidence 0.75; affected frames 35%; consecutive duration 500 ms; profile usable 60%, overall confidence 0.75.
- **Known technical limitations:** Does not independently measure torso angle or depth and cannot infer knee tracking from side, front-to-back depth, foot pressure, comfort, or a poor camera angle.
- **Trainer review checklist:** Review stance and “chest tall,” descent/standing cue, front-versus-side objectives, hip/knee/ankle visibility, misleading rule name, 35° threshold, and whether analysis should be rejected.
- **Trainer comments area:** ________________________________________________
- **Trainer decision area:** ☐ Accept instructions ☐ Revise instructions ☐ Accept camera view ☐ Revise camera view ☐ Accept form rule ☐ Revise form rule ☐ Reject automated form analysis for this exercise ☐ Ready for `trainer_reviewed` status ☐ Not ready

### Squat

- **Exercise name:** Squat
- **Canonical exercise ID:** `squat`
- **Profile version:** 1 (schema 1); no aliases.
- **Current approval status:** `draft`
- **Form-analysis support status:** Rule configured but automated judgment blocked.
- **Required camera view:** Side.
- **Guided Coach setup/movement/cadence/safety cues:** Exactly identical to Bodyweight Squat; safety cues empty.
- **Cadence words:** Sit back / Hold / Stand
- **Positive coaching phrases:** “Your squat stayed controlled.”; encouragement “Keep your rhythm.”, “Stay controlled.”; completion “Good job.”; recovery “Take a breath.”
- **Corrective coaching phrases / uncertainty phrases:** “On the next set, keep your torso controlled as you stand.” / “I could not get a clear enough side view.” (IDs remain Squat-owned).
- **Pose landmarks used / derived measurements / thresholds / minimums:** Identical shoulder–hip–ankle alignment calculation and >35°, 0.75 landmark confidence, 35%, 500 ms, 60% usable, 0.75 overall values.
- **Known technical limitations:** The repository has separate canonical catalog IDs, but this metadata provides no rationale or content distinction. It must not be merged without catalog evidence. Current aliases do not collide: Bodyweight Squat’s alias normalizes only to `bodyweight_squat`; `squat` remains separate. Reusing the same rule may be inappropriate if Squat denotes a loaded or otherwise different variant.
- **Trainer review checklist:** Confirm intended catalog distinction and whether both remain; define variant/load, aliases and unique cues; review whether the same camera/rule/threshold is appropriate; avoid adding alias `squat` to Bodyweight Squat.
- **Trainer comments area:** ________________________________________________
- **Trainer decision area:** ☐ Accept instructions ☐ Revise instructions ☐ Accept camera view ☐ Revise camera view ☐ Accept form rule ☐ Revise form rule ☐ Reject automated form analysis for this exercise ☐ Ready for `trainer_reviewed` status ☐ Not ready

### Dumbbell Bicep Curl

- **Exercise name:** Dumbbell Bicep Curl
- **Canonical exercise ID:** `dumbbell_bicep_curl`
- **Profile version:** 1 (schema 1); aliases `bicep_curl`, `dumbbell curl`.
- **Current approval status:** `draft`
- **Form-analysis support status:** Unsupported; instruction coaching supported.
- **Required camera view:** None (`not_supported`).
- **Guided Coach setup cues:** “Stand tall with the weights at your sides.”; “Keep your elbows close to your body.”
- **Guided Coach movement cues:** “Curl the weights, pause, then lower with control.”
- **Cadence words:** Curl / Hold / Lower
- **Safety cues:** None.
- **Positive coaching phrases:** No form-positive phrase; encouragement “Keep your elbows steady.”, “Stay controlled.”; completion “Nice work.”; recovery “Take a breath.”
- **Corrective coaching phrases / uncertainty phrases:** None.
- **Pose landmarks used / derived measurements / thresholds:** None; profile minimum 60% usable/0.75 confidence is inert; affected frames/duration not applicable.
- **Known technical limitations:** Elbow position, shoulder movement, curl range and left/right loading are unimplemented. Dumbbells, torso, loose clothing, front/side orientation, and self-occlusion can hide wrist/elbow landmarks.
- **Trainer review checklist:** Review stance, elbow cue, range/cadence, safety and equipment assumptions; define a validated view/measurements or reject automated analysis.
- **Trainer comments area:** ________________________________________________
- **Trainer decision area:** ☐ Accept instructions ☐ Revise instructions ☐ Accept camera view ☐ Revise camera view ☐ Accept form rule ☐ Revise form rule ☐ Reject automated form analysis for this exercise ☐ Ready for `trainer_reviewed` status ☐ Not ready

### Side Bridge

- **Exercise name:** Side Bridge
- **Canonical exercise ID:** `side_bridge`
- **Profile version:** 1 (schema 1); alias `side plank`.
- **Current approval status:** `draft`
- **Form-analysis support status:** Rule configured but automated judgment blocked.
- **Required camera view:** Side.
- **Guided Coach setup cues:** “Lie on your side with your elbow beneath your shoulder.”; “Stack or stagger your feet comfortably.”
- **Guided Coach movement cues:** “Lift your hips into a strong line, pause, then lower with control.”
- **Cadence words:** Lift / Hold / Lower
- **Safety cues:** None.
- **Positive coaching phrases:** “Your side position stayed controlled.”; encouragement “Keep breathing.”, “Stay strong.”; completion “Good job.”; recovery “Take a breath.”
- **Corrective coaching phrases:** “On the next set, keep your hips in line with your shoulders.”
- **Uncertainty phrases:** “I could not get a clear enough side view.”
- **Pose landmarks used / derived measurements used:** Best-visible-side shoulder, hip, ankle; 2D alignment deviation at hip.
- **Rule thresholds:** `body_alignment`, >18°; landmark confidence 0.75; affected frames 35%; consecutive 500 ms; profile 60% usable and 0.75 overall confidence.
- **Known technical limitations:** Lower body/ankle is easily obscured; cannot assess elbow comfort, shoulder loading, foot stacking, rotation, or 3D alignment.
- **Trainer review checklist:** Review elbow/shoulder setup, stack/stagger option, side-body cue, required landmark visibility, 18°/35%/500 ms values, and uncertainty/correction phrasing.
- **Trainer comments area:** ________________________________________________
- **Trainer decision area:** ☐ Accept instructions ☐ Revise instructions ☐ Accept camera view ☐ Revise camera view ☐ Accept form rule ☐ Revise form rule ☐ Reject automated form analysis for this exercise ☐ Ready for `trainer_reviewed` status ☐ Not ready

## Proposed metadata corrections

### Implemented technical corrections

None. Inspection found no broken phrase references, invalid/colliding aliases, impossible numeric ranges, invalid landmark identifiers, unsafe placeholders/HTML, or cross-exercise phrase ownership. Production metadata, profile versions, statuses, and runtime behavior are unchanged.

### Trainer decisions still required

Review every empty safety pool, all instructional/cadence text, camera proposals, certainty/tone, and limitations. In particular, decide whether the generic alignment calculation is valid for each supported exercise; justify or revise 18°/35° thresholds and persistence settings; clarify Squat versus Bodyweight Squat; and decide whether supported rules should instead be rejected. A separate technical correction should consider wiring uncertainty phrases to insufficient-confidence results, but wording/behavior changes require product/trainer agreement.

## Approval transition procedure

`draft` → `trainer_reviewed` → `approved` is sequential; never infer a transition from this package.

**Draft to trainer reviewed:** record qualified reviewer identity; credential or role; ISO-8601 timestamp; exact exercise ID, schema/profile versions and metadata fingerprint; explicit reviews of instructions, cadence, camera position, form rules, feedback language and limitations; selected decisions; and substantive comments. Store the record separately from runtime code and update status only in a later reviewed change.

**Trainer reviewed to approved:** require technical and schema validation, phrase-reference and alias-collision checks, deterministic fixture tests, completed camera protocol on the exact profile, final approver identity and approval timestamp, and a profile-version increment whenever content changes. The final approver must confirm the fingerprint matches. Publishing/deployment and device validation remain separate operations. No approval API or UI is provided here.

## Evidence and traceability

The export calculates `sha256:` plus SHA-256 of the exact JSON-serialized production profile and includes it beside `exerciseId`, `profileVersion`, and `schemaVersion`. Copy `docs/fixtures/exercise-metadata-review-record.json` per decision and fill reviewer identity/role, review date, decision, and comments. A review is stale if any version or fingerprint differs. Do not edit the generated export as a substitute for changing metadata, and do not put an untraceable approval comment in runtime code. The fixture contains no member, camera, or pose-session data.
