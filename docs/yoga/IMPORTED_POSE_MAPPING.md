# Imported Pose Mapping

Canonical IDs come from `data/yoga/poses.v1.json`. “Keypoints” counts frame JSON files; filename labels are coarse and are not ground-truth fault annotations.

| Imported name | Pocket PT ID | Match | Confidence | Keypoints | Correction logic | Media | Camera-coach readiness |
|---|---|---|---:|---:|---|---|---|
| Chair / Utkata Konasana | `chair` | semantic | high | 389 | no pose-specific production-safe logic found | none identified | proof of concept; thresholds require review |
| Warrior / Veerabhadrasana (README UI identifies Warrior II) | `warrior-ii` | semantic | medium | 345 | arms, knee, gaze, hips, stance, shoulders, torso | one incorrect AVI | proof of concept; independently implemented subset |
| Plank | `plank` | exact | high | 119 | no correction pipeline traced | none identified | data research only |
| Triangle / Trikonasana | `triangle` | semantic | high | 0 (CSV only) | angle-derived CSVs/notebooks | none identified | not yet usable |
| Downward Dog | `downward-dog` | semantic | high | 0 (CSV only) | angle-derived CSVs/notebooks | none identified | not yet usable |
| Vrukshasana | `tree` | semantic | high | 0 (CSV only) | angle-derived CSVs/notebooks | none identified | not yet usable |
| Mountain, Warrior I, Cobra, Bridge | corresponding canonical IDs | canonical only | low | 0 | none found | none found | unsupported by import |
| Natarajasana, Baddha Konasana, Ardha Chandrasana | none | no canonical pose | high | 0 (CSV only) | experimental notebooks/data | none identified | not eligible until product adds a canonical pose |

The `warrior` filenames do not distinguish Warrior I from II. Mapping to `warrior-ii` is an inference from the rule checks (horizontal arms, sideways hips, front gaze) and upstream route naming, not a trusted dataset label.
