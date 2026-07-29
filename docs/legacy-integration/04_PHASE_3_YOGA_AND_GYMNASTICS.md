# Phase 3 — Yoga and Gymnastics Content Domains

Phase 3 creates current-platform domains. It does **not** activate legacy routers/Python, promise pose scoring, or infer safe gymnastics advancement from level labels.

## Shared platform integration

Both domains use canonical content IDs, the Phase 2 exercise/block contract, Phase 1 events/achievements, shared cue records, current auth/membership/security, existing session execution/history, and the existing exercise review/version/fingerprint philosophy. Domain content is publishable only after role-appropriate professional review.

Common current files likely affected: `server.js`; new `src/services/yogaContentService.js` and `gymnasticsContentService.js`; current repositories/persistence; `src/services/generatedWorkoutService.js`; exercise-generation sources/schemas; `public/exercise-library*`, `public/workout*`, dashboard/member-home runtimes; new current-platform pages under `public/`; and dedicated `test/` suites.

## 3A. Yoga

### Content inventory matrix

| Capability | Exists now | Normalize | Professional review | Create later |
|---|---|---|---|---|
| Pose identity | Eight dataset class names; a legacy pose API concept | Canonical Sanskrit ID, English name, transliteration aliases, exact variant/laterality | Yoga content reviewer | Full licensed catalogue |
| Instructions | No reliable pose instructions in CSVs; universal cues only | Applicable generic cues/breathing | Yoga teacher + safety/editorial | Pose-specific setup/execution/exit |
| Breathing | Generic breathing notes | Shared breathing cue records | Yoga teacher | Pose/sequence-specific patterns |
| Common mistakes | Not labeled in datasets | None from raw samples | Yoga teacher/biomechanics reviewer | Authored fault catalogue |
| Regressions/progressions | Not present for poses | General graph schema | Yoga teacher | Pose-specific reviewed edges/props |
| Mobility categories | Movement taxonomy concepts only | Canonical tags | Trainer/yoga reviewer | Curated taxonomy mappings |
| Curricula | Not present | Curriculum schema | Yoga teacher/program reviewer | Beginner first; intermediate/advanced only after evidence |
| Reference landmarks | Eight small MediaPipe sets | Research manifest only | Data/privacy + movement review | Representative consented dataset |
| Scoring | Not present/validated | Nothing for launch | Separate validation program | Later research only |

### Pose schema

`poseId`, schema/content version, Sanskrit canonical name/script (if supported), transliteration, English name, aliases, variant, laterality, difficulty, categories, movement patterns, prerequisites, instructions (`entry`, `setup`, `execution`, `breathing`, `exit`), common-mistake/cue refs, contraindication/safety notes, regressions/progressions, props/equipment, target duration/dose bounds, media with license/alt text, achievement eligibility, workout capability tags, provenance, reviewer/approval/effective dates.

Do not place angle targets in the general pose record. Approved measurement profiles are versioned separately by detector, view, variant and population.

### Curriculum and pages

Curriculum records define ordered lessons/sequences, prerequisites, allowed substitutions, time, rest, learning objectives, completion/mastery evidence and reviewer. Launch order: pose library/detail → reviewed beginner familiarization → mobility/recovery/strength-and-balance sequences → intermediate → advanced. “Advanced” never means automatically eligible.

Current-platform UI:

* Yoga home and filters;
* accessible pose library and pose detail;
* sequence detail/start routed into existing workout/session execution;
* progress/achievement history from Phase 1;
* assessment entry only when the separate movement gate passes; content launch must not depend on camera support.

Proposed read APIs: `GET /api/yoga/poses`, `GET /api/yoga/poses/:poseId`, `GET /api/yoga/curricula`, `GET /api/yoga/sequences/:id`. Authoring/publication is a later admin workflow with audit/permissions, not public writes.

### Yoga acceptance

Canonical alias resolution is deterministic; every published pose has licensed media or an accessible media-free presentation, reviewed entry/exit/breath/safety text, a regression, explicit difficulty/prerequisites and version provenance. Beginner curriculum is completable using existing sessions and emits idempotent Phase 1 events. No page claims camera scoring unless capability is approved and available.

## 3B. Gymnastics

### Content inventory matrix

| Capability | Exists now | Normalize | Professional review | Create later |
|---|---|---|---|---|
| Foundations | Summary shapes, lines, landings, prep and event skills | Skill nodes/tags | Qualified gymnastics coach | Complete teaching content/media |
| Levels | “L3–L5” and “L4–L8/elite style,” explicitly not official routines | Treat as source tags, not certification | Governing-body/version/legal review | Product-owned curriculum levels |
| Progressions | Example arrow chains for floor/beam/bars/vault | Candidate directed edges | Coach validates each edge | Missing regressions, intermediary skills |
| Prerequisites | Implied, incomplete | Graph schema | Coach + safeguarding | Objective prerequisites/mastery gates |
| Mastery | “repeatable shapes/landings” only | Typed criterion schema | Coach defines thresholds/evidence | Observation/coach verification workflow |
| Coaching cues | Universal cues/mindset/safety | Shared cue refs | Coach/editor | Skill-specific cues |
| Achievements | “checklists, badges, skill trees” concept | Phase 1 event mapping | Product + coach | Approved achievement catalogue |

### Skill and edge schemas

Skill: `skillId`, apparatus/event, source-level tags, difficulty, shape/strength/flexibility prerequisites, setup/execution/landing, common faults/cue refs, regressions, required equipment, spotting/supervision, environment, contraindications, dose, mastery criteria, media/provenance/review/version.

Edge: `fromSkillId`, `toSkillId`, edge type, required mastery set, minimum evidence, equipment/spotter/coach gates, allowed setting, risk class, reviewer/version/status. Graph publication rejects missing nodes, cycles where forbidden, unsafe skip edges and unapproved advanced destinations.

Mastery evidence types should begin with `coach_verified`, `self_practice_completed` (not mastery), and objective strength/hold prerequisites where professionally specified. Computer vision does not verify advanced gymnastics in this phase.

### Workout and achievement integration

Phase 2 skill blocks may select only approved skills within user eligibility and environment/equipment gates. General workouts may include reviewed physical preparation but not infer apparatus availability or spotting. Phase 1 can reward practice consistency, foundation checklists and coach-verified mastery; never reward attempting difficulty, height, extreme flexibility, pain, or unverified dangerous skills.

### Safety review and acceptance

Required reviewers: qualified gymnastics program owner, safeguarding/minors owner, legal/insurance, product safety and accessibility. Confirm governing-body naming/licensing, age policy, facility/equipment inspection, spotting authority, emergency/stop rules and geographic scope.

Acceptance requires a DAG/graph integrity report, reviewer attribution per skill/edge, explicit supervision/equipment/risk class, no auto-advancement, no unsupervised advanced skill prescriptions, safe fallback when gates fail, session/history integration, idempotent achievements, and feature-off isolation.

## Migration, tests and rollback

Normalize into new versioned sources with legacy checksums; do not edit source files. Publish a tiny reviewed pilot catalogue before bulk import. Tests cover schemas, aliases, graph/FKs/cycles, publication approval, search/pagination, auth, session round-trip, block eligibility, achievements, accessible pages, broken/licensed media, safety copy and “unsupported assessment” states. Snapshot approved content separately from runtime output.

Independent `ENABLE_YOGA_CONTENT` and `ENABLE_GYMNASTICS_CONTENT` flags hide navigation/APIs while preserving completed session/history records. Content versions remain readable after withdrawal; revoke publication via status/effective date, never destructive edits. Assessment is a separate flag and rollback boundary.
