# Relationships, Progressions, and Substitutions

Each directed relationship has a stable relationship ID, source and target exercise IDs, type, replacement quality, movement similarity, equipment compatibility, difficulty delta, and compatible goals. Integrity validation rejects missing endpoints, duplicate IDs, and self-links.

Progression nodes refer to relationship IDs and add prerequisites, minimum competency, movement-quality requirements, equipment, difficulty, and recommended next step. Advancement is returned only when all deterministic gates pass.

Substitutions first preserve movement pattern and training intent, then enforce equipment, injury/contraindication, experience, and goal constraints. Direct curated relationships rank above classification-only candidates. Muscle overlap alone is never sufficient. Travel, time, and home/gym scenarios are represented as equipment and constraint inputs rather than separate exercise copies.
