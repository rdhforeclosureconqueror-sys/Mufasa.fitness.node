# Canonical Exercise Schema

Schema version `1` requires a stable slug `exerciseId`, `contentVersion`, display metadata, normalized classification, coaching knowledge, requirements, relationships, contraindications, movement compatibility, AI metadata, wearable metadata, search keywords, and deprecation metadata.

Classification includes movement pattern, primary and secondary muscles, equipment, difficulty and score, movement plane, body region, mechanic, training goals, execution style, and rehabilitation suitability. Guidance includes tempo support and rep, set, and rest ranges. Coaching separates cues, faults, checkpoints, setup, execution, finish, breathing, tempo, range of motion, and safety.

IDs never change when a display name changes. Deprecated entries remain addressable and point to `replacedBy`. Additive compatible content changes increment `contentVersion`; breaking shape changes require a new `schemaVersion`. Unknown schema versions must fail validation rather than silently downgrade.
