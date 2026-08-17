# Canonical Youth Fitness Rule Model

## Contract

The executable reference contract is in `src/youth-fitness/evidence/models.js`; seeded rules are in `rules.js`. Every rule requires:

| Field | Meaning |
| --- | --- |
| `rule_id` | Stable `YT-R-###` identifier. |
| `name`, `category`, `description` | Human-readable identity, policy grouping, and normative behavior. |
| `evidence_class`, `claim_strength` | Independent provenance and assertion-strength labels. |
| `source_ids` | One or more existing evidence source IDs. |
| `hard_rule` | Whether later decision systems must treat the rule as a hard constraint. |
| `admin_override` | Whether administration may override it; a hard rule cannot allow override. |
| `active` | Whether the version is currently eligible for later consumption. |
| `evidence_version` | Positive integer for the evidence interpretation/version. |

Phase 1 also seeds `effective_date`, `review_due`, and `phase_introduced`. Future records may add `reviewed_by`, `notes`, and age bounds. Dates do not substitute for human source review.

## Invariants

1. Classification and claim strength must be canonical values.
2. `CONSERVATIVE_PROGRAM_POLICY` always pairs with `PROGRAM_POLICY`.
3. Every source reference resolves to an existing source.
4. Every initial safety rule is a hard rule and has `admin_override: false`.
5. Hard rules cannot be made overridable by configuration.
6. Rules do not execute planning or safety validation. Phase 6 will implement the fail-closed validator; `YT-R-015` defines its required disposition now.
7. A source link does not upgrade a local threshold into scientific consensus.

## Seed scope

`YT-R-001` through `YT-R-015` establish conservative boundaries for failure/maximal training, pain, prohibited automatic prescriptions, intensity, progression/regression, readiness, sleep, hydration, non-diagnostic screens, separate outcomes/personal baseline, and fail-closed final validation. Exact automatic planner behavior remains out of scope.
