# Shared Coaching Cue Library Design

## Purpose and authority

One reviewed cue system serves authored workout instructions, yoga, gymnastics, manual OHSA observations and supported MoveNet/form rules. It separates **what was observed** from **what may be said**. A cue is content, not detection logic; no cue proves a fault occurred.

Current `public/exercise-metadata.js` phrase pools and generated exercise profiles remain authoritative until a versioned migration is approved. The new library should compile into those runtime profiles or be resolved by a shared service—never create two conflicting phrase authorities.

## Recommended schema

| Field | Requirement |
|---|---|
| `cueId` | Stable lowercase namespaced ID; never reused for new meaning |
| `schemaVersion`, `contentVersion` | Required integers |
| `domain` | `workout`, `yoga`, `gymnastics`, `ohsa`, or shared |
| `movementPatternIds` | Canonical movements, zero or more |
| `exerciseIds`, `poseIds`, `skillIds` | Explicit applicability; no fuzzy name matching |
| `observationId` / `faultId` | Reviewed trigger identity; optional for setup/universal cues |
| `cueType` | setup, execution, breathing, safety_stop, corrective, positive, uncertain, transition |
| `priority` | Unique/ordered within a rule set; safety classes outrank refinement |
| `text` | Source-locale instruction; concise and non-diagnostic |
| `safetyWarning` | Structured stop/escalation text/ref, not concatenated ad hoc |
| `regressionId`, `progressionId` | Optional reviewed references, never free-text auto-selection |
| `bodyRegionIds` | Controlled taxonomy |
| `cameraViews` | Required views or `not_applicable`; cue still requires rule confidence |
| `minimumEvidence` | Evidence/quality contract or `authored_instruction` |
| `contraindicationTags` | Applicability exclusions |
| `audience`, `readingLevel`, `locale` | Delivery context |
| `sourceProvenance` | Legacy file/lines or authored source checksum |
| `evidence` | Rationale/citation/evidence grade; distinguish expert consensus |
| `reviewerId`, `reviewerRole`, `reviewedAt` | Mandatory for publication |
| `approvalStatus` | draft, review_pending, approved, rejected, retired |
| `effectiveFrom`, `effectiveTo` | Publication window |
| `supersedesCueId` | Explicit evolution link |

Translations are separate records keyed by cue/content version and require semantic/safety review. Runtime responses include cue ID/version so history remains explainable.

## Resolution contract

Input: domain entity ID, observation IDs, evidence/confidence, view, severity, phase, user eligibility/contraindications, locale, recently delivered cues and maximum count. Output: approved applicable cue records plus reasons, or a typed abstention.

Deterministic order:

1. pain/emergency/stop;
2. fall/stability and environment;
3. reviewed joint/spine safety observation;
4. pose/skill/exercise-defining correction;
5. asymmetry;
6. refinement/positive reinforcement.

Filter before ranking: correct version/status/date; exact entity/movement applicability; view/evidence threshold; eligibility; locale fallback; regression prerequisites. Collapse cues sharing the same root observation/body region, limit to one or two corrections, apply cooldown, and prefer uncertainty language when evidence is marginal. Never downgrade a stop cue because it was shown recently.

## Reuse by subsystem

| Consumer | Trigger/evidence | Library use | Hard boundary |
|---|---|---|---|
| Workouts | Session phase and selected exercise; authored metadata | Setup, breathing, cadence, positive/corrective wording | Builder cannot invent cues |
| Yoga | Pose/sequence phase; later approved measurement observation | Pose instructions, common mistakes, regression | Content launch works without detection |
| Gymnastics | Skill block and coach-approved state | Setup, shape, landing, safety/spotting cues | No vision-based advanced mastery in Phase 3 |
| OHSA | Manual observation or separately approved detection/view | Non-diagnostic observation and strategy cues | Possible contributors never presented as diagnoses |
| MoveNet | Existing normalized keypoints + supported capability rule + confidence/persistence | Resolve phrase ID for a validated observation | 17-keypoint limitations and view contract remain explicit |
| Form analysis | Existing `form-engine` rule output | Shared priority/dedupe/cooldown and approved text | A cue does not expand supported measurements |

## Authoring and publication workflow

Draft normalized legacy candidates with provenance → schema/FK/language lint → domain professional review → safety/editorial review → optional translation review → approval → deterministic compile → fingerprint/parity checks → staged preview → publication. Only human-authorized roles approve. AI may propose drafts or lint wording but cannot approve, add evidence, thresholds, safety claims or applicability.

## Tests and acceptance

Tests validate schema/FKs, unique IDs/versions, exact applicability, status/effective dates, locale fallback, priority, safety dominance, dedupe/cooldown, max count, abstention, unsupported measurement isolation, regression prerequisites, semantic translation placeholders, generated artifact fingerprints and deterministic replay.

Acceptance: every production cue is approved/versioned/traceable; identical context resolves identically; unsafe or unsupported evidence abstains; consumers share IDs rather than copy strings; history can render the original version; retiring content stops new delivery without rewriting old sessions; and all existing form-feedback/metadata tests remain green.
