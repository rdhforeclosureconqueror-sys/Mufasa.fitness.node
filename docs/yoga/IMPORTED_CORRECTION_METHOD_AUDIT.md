# Imported Correction Method Audit

## Pipeline traced (reference only)

The imported app records video, invokes OpenPose, converts BODY_25 triples to tabular frames, finds a relatively still ten-frame window, averages it, runs hand-written geometric tests, converts binary labels to canned feedback, and routes the result through Flask. Relevant quarantined references are `process_openpose_user.py`, `Pose_Lables_from_Line_Slopes_csv.py`, `process_label.py`, and `routes.py`. This logic was **not copied into production**.

The still-window implementation sums frame-to-frame changes over ten rows and selects the minimum. It does not appear to weight coordinates by confidence, reject extra people, normalize orientation/scale consistently, or aggregate uncertainty. Those gaps, plus ambiguous provenance, make direct reuse inappropriate.

## Warrior II concepts observed

| Check | Geometry observed | Fault category | Reference-only threshold |
|---|---|---|---|
| arms | wrist slope plus shoulder slope/area fallback | arms not level/straight | wrist `-0.07..0.0481`; shoulder gate `-0.25..0.25` |
| front shin | ankle-to-knee `atan2` | knee too open / beyond desired line | 75° and 100° |
| gaze | nose-eye distance divided by nose-ear distance | head not turned | ratio `0.5` |
| hips | left/right hip slope | hips not square to camera | absolute slope `0.1` |
| stance | ankle distance divided by wrist distance | too narrow / too wide | `0.61..0.9` |
| shoulders | shoulder-neck angles and shoulder slope | shoulders lifted | 10° plus slope `0.25` |
| torso | neck-to-mid-hip reversed slope | leaning forward/back | `-0.2` / `0.02` |

All numbers above are `REFERENCE_ONLY_THRESHOLD`. They are camera-coordinate and framing dependent, have no medical validation recorded, and are absent from Pocket PT runtime rules. The imported feedback emits up to three canned messages for two-to-six failures and a retry message for seven or more.

## Dataset limitations

Filename labels distinguish `incorrect` versus unqualified and sometimes `back`; they do **not** encode the specific fault. Every frame has at least one person, but 94 frames have multiple people. Confidence exists per BODY_25 point. These facts make the frames sufficient for exploratory pose geometry, but insufficient to validate fault-specific accuracy without provenance, subject splits, label review, and consent/license confirmation.
