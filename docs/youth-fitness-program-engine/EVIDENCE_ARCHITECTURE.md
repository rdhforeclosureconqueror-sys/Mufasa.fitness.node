# Phase 1 — Canonical Evidence Architecture

## Purpose and boundary

This is the canonical Phase 1 foundation for the Youth Fitness Brain. It makes important rules attributable, reviewable, and honest about claim strength before planning exists. It does **not** generate programs, workouts, sessions, activities, diagnoses, or participant recommendations. Pocket PT remains the delivery/tracking system and canonical participant identity owner; Leader Within receives no new integration in this phase.

## Classification vocabulary

| Class | Canonical meaning |
| --- | --- |
| `EVIDENCE_CONSENSUS` | A recommendation appearing in established pediatric/youth exercise consensus statements or major guidelines. |
| `VALIDATED_TEST_PROTOCOL` | A procedure supported by published youth reliability/validity research or an established youth fitness-testing system. |
| `RESEARCH_SUPPORTED` | Supported by published research, but not necessarily a universal consensus rule. |
| `CONSERVATIVE_PROGRAM_POLICY` | A safety-oriented software/program choice. It is not a scientifically proven threshold unless a source specifically establishes it. |
| `COACH_CONFIGURABLE` | An authorized program administrator may modify it within established safety boundaries. |

Claim strength is a separate required axis: `CONSENSUS`, `SUPPORTED`, `PROGRAM_POLICY`, or `CONFIGURABLE`. A conservative policy must use `PROGRAM_POLICY`; classification and claim strength must never be inferred from the number of citations.

## Source architecture and review

The canonical source fixture is `src/youth-fitness/evidence/sources.js`. Each source identifies its population and type and explicitly records both `supports` and `does_not_establish`. The latter is a mandatory anti-overclaim boundary, not optional commentary. URLs are reference locators, not an assertion that a paper proves every linked rule.

Sources and rules are active, versioned reference records. `last_reviewed`, optional `review_due`, and future reviewer metadata support periodic review. Changing a material interpretation requires a new evidence/rule version and review; silently editing provenance is prohibited. The Phase 1 fixtures are code-level seed/reference architecture because the repository has no selected production relational store. They do not create runtime participant state.

## Linking and validation

Rules link through `source_ids`. Module load validates seeded source records first, builds the known source-ID set, and validates every rule against it. Unknown IDs, invalid classification or claim strength, incomplete arrays, invalid hard-rule overrides, and mismatched conservative-policy claim strength fail validation. A link means the source informs the rule; the source's `does_not_establish` boundaries continue to apply.

## Initial library scope

The ten-source seed covers youth resistance consensus and safety, resistance dose-response, development/maturation, field assessment systems, youth test reliability, the National Academies measures review, a field-test validity systematic review, pediatric sleep consensus, and fluid replacement. The library is intentionally conservative and is not a complete systematic review or clinical guidance system.

## Future administration

A production evidence repository, immutable audit history, reviewer identity, source retirement workflow, and full admin editor remain deferred. Any future UI must preserve versioning, authorization, `supports`, `does_not_establish`, and claim-strength constraints. Planning may consume only validated active rule versions in later phases.
