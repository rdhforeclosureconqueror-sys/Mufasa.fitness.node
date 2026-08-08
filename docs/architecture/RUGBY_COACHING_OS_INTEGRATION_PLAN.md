# Pocket PT Rugby Coaching OS Integration Plan

**Status:** Phase 0 discovery handoff  
**Date:** 2026-08-08  
**Decision:** Treat `exercise-generation/` as an uploaded design/specification handoff, not as the production home or a deployable second application.

## 1. Executive summary

Pocket PT is a single Node/Express application whose production UI is primarily static HTML/JavaScript under `public/`, with domain/service/repository modules under `src/`, route composition in `server.js`, bearer authentication, centralized role/permission resolution, and mostly file-backed JSON persistence. The uploaded Rugby Coaching OS is a separate React/Next/Vite local-first prototype plus standalone HTML artifacts. It is valuable as a product and interaction specification, but it has no production authentication, durable domain APIs, secure storage, or authoritative medical/safeguarding controls.

The recommended architecture is a **rugby sport-intelligence bounded context inside the existing Pocket PT application**. Reuse Pocket PT user identity, trainer-client access concepts, authentication/authorization middleware, exercise intelligence, workout/program/session foundations, testing/pose capabilities, nutrition, notifications, and AI-coach integration points. Add organization/team/roster membership; versioned rugby competency definitions; append-only evidence; derived readiness projections with explicit hard gates; rugby session plans and attendance; selection; Activate participation; and separate welfare/safeguarding boundaries. Do not add `rugby_athletes`, iframe the prototype, or make readiness percentages editable.

Phase 1 should establish organization/team/roster/position primitives, rugby permissions and navigation, and a rugby extension of the existing player identity. Evidence and readiness calculations follow only after those ownership boundaries exist.

## 2. Existing Pocket PT architecture discovered

### Application and delivery

- The application root is this repository, launched by `server.js` through the root `package.json`; it is not the nested package in `exercise-generation/`.
- Express serves explicit top-level pages and `public/` static assets. The current client is predominantly framework-free HTML and JavaScript (`public/dashboard.html`, `public/trainer.html`, `public/workout.html`, `public/nutrition.html`, and their runtime files).
- `server.js` is currently the API composition root. Business logic is increasingly separated into `src/services/`, storage into `src/repositories/`, validation into `src/validation/`, middleware into `src/middleware/`, and domain engines into focused `src/*` directories.
- There is no relational database or ORM in the production root. `src/repositories/userStore.js` stores one normalized JSON document per user using temporary-file replacement. Other repositories use JSON or NDJSON. This is acceptable for prototype/pilot data but not sufficient by itself for confidential safeguarding or clinical-grade production records.

### Existing capabilities

| Area | What exists | Reuse assessment |
|---|---|---|
| Users/authentication | User JSON records, login/register/bridge, signed bearer tokens, identity trust modes, logout/revocation controls | Reuse and harden; one Pocket PT identity per person |
| Roles/permissions | Central `src/lib/authorization.js`, `requireAuth`/`requirePermission`, roles including super admin/admin/trainer/user, route authorization validation/audit tooling | Reuse mechanism; add scoped organization/team rugby permissions rather than only global roles |
| Athletes/coaches | Users act as members/clients; trainer-client assignments and trainer notes/programs exist | Reuse identity and assignment pattern; add team membership and coaching staff scope. “Athlete” is a role/context, not a duplicate identity |
| Teams/rosters | A free-text team exists in a small challenge; no durable organization/team/season/roster domain | New bounded models required |
| Exercises | Large exercise database and `src/exercise-intelligence/` catalog, classification, media, progressions, relationships, substitutions, validation | Reuse and extend with sport/protocol/source metadata; do not build another exercise engine |
| Workouts/programs | Workout templates/builders, program engine, generated workout plans, trainer-assigned programs, progression/adaptation | Reuse for individual conditioning and later Beast Mode prescriptions; rugby practice planning needs additional team/block semantics |
| Sessions | Member workout session state and completion service, generated-workout execution, yoga sessions | Reuse event/attendance concepts where possible; rugby team sessions and blocks are genuinely new aggregates |
| Assessments/testing | OHSA history, movement engine, pose/camera runtime, form engine, longitudinal workout metrics | Reuse capture/version/measurement concepts; add rugby test definitions and immutable observations rather than overwriting results |
| Wellness/injuries/readiness | Profile has a basic `injuries` array; check-ins and health-review restrictions exist; training adaptation honors a health restriction | Extend/replace the basic profile field with permissioned welfare/restriction records. No complete wellness, concussion, availability, or rugby-readiness system exists |
| Nutrition | Full nutrition service/UI, entries, summaries, meals, grocery/weekly plans and missions | Reuse; link only when a rugby development plan needs nutrition context |
| Media/video | Browser camera/pose pipelines, exercise media metadata and local landmark/session evidence; no general secure evidence-object service | Reuse capture and metadata patterns; create secure media reference/attachment service before player clips or restricted documents |
| AI coaching | Provider abstraction, safety layer, prompt/context builders, circuit breaker, AI coach service/UI | Reuse only with redacted, permission-filtered rugby summaries; never send safeguarding narratives or unrestricted medical data to a model |
| Persistence/audit | Atomic JSON stores, append-only operational logs, tamper-evident admin audit chain | Reuse patterns for an initial non-sensitive pilot; introduce a transactional datastore, encrypted object storage, access audit and retention controls before sensitive production use |

### Existing rugby functionality

Outside this upload, rugby is limited to a quick fitness challenge and incidental team label in `public/workout.html`; there is no rugby roster, competency, readiness, Activate, pack/backs, selection, concussion, or safeguarding domain. The Rugby Coaching OS package is therefore the first coherent rugby product specification.

### What `exercise-generation/` is

Historically, Pocket PT already documents a generalized exercise-generation runtime whose production authority is the root `sources`/`generated`/`src/exercise-intelligence` pipeline. The newly uploaded contents of `exercise-generation/` instead form a self-contained `pocket-pt-rugby-coaching-os` React/Next/Vite demo, mixed with older push-up exercise-generation schemas/tooling. It is currently a **handoff/development artifact with a naming collision**, not production architecture.

## 3. Rugby Coaching OS source files inspected

All 108 tracked entries and the untracked dependency directory inventory were inspected, including the requested documents in order and every top-level HTML, source, schema, script, log, and hash-named artifact.

### Legitimate product specification/reference

- `COACH_OPERATIONS_GUIDE.md` — operating model, evidence ladder, workflows, hard restrictions, forward/back readiness, Activate.
- `SYSTEM_DATA_ENTRY_SPEC.md` — actions, states, schemas, calculations, and editability rules.
- `UPGRADE_NOTES_V2.md` through `UPGRADE_NOTES_V5.md` — movement/testing/technical/video, guide, backs parity, and Adult Activate evolution.
- `ACTIVATE_ADULT_HANDOFF_V1.md` — Adult Activate preparation and distinct Beast Mode extension.
- `page.tsx`, `globals.css`, `layout.tsx`, `entry.tsx` — primary React visual/interaction prototype.
- `index.html`, `site.js`, `site.css` — compiled standalone command-center prototype.
- `coach-guide.html`, `backs-ready.html`, `activate-adult.html` — standalone guide and focused V4/V5 demonstrations.
- `README.md` — prototype scope and explicit non-production boundaries.

### Legitimate but misplaced/mixed-in exercise-generation material

- `schema.json`, `rules.json`, `schemas/*.schema.json`, `sources/push_up.json`, `validate-artifact.sh`, and related build/install scripts describe the generalized push-up/exercise artifact pipeline, not rugby domain persistence.
- `package.json`, lockfile, Vite/Next/PostCSS/ESLint/TypeScript configs, `chatgpt-auth.ts`, framework SVGs and favicon support the nested demo build. They are useful for provenance/reproduction, but should not become a second production frontend.

### Generated, duplicate, or cleanup candidates (no deletion in this pass)

- `site.js` and `site.css` are generated browser bundles of the editable prototype and duplicate its behavior/styles in compiled form.
- The 68 extensionless eight-character/hash-like files are binary package-manager/build cache objects (their binary cache header and upload grouping distinguish them from application source). They are generated artifacts, not rugby source.
- `2026-08-07T20_17_36_434Z-debug-0.log`, `2026-08-07T20_17_36_591Z-debug-0.log`, and empty `install.lock` are installation residue.
- `node_modules/` is an untracked/generated dependency tree and must remain uncommitted.
- Documentation refers to former `app/` and `standalone/` paths, but the upload flattened those files at the directory root. Preserve now; after approval, move the product documents to a versioned archive/reference location, retain only necessary provenance, and remove caches/logs/build outputs in a dedicated cleanup change.

## 4. Existing systems that can be reused

1. **Identity:** extend the existing user/client record via references; never create a parallel rugby athlete identity.
2. **Trainer access:** generalize trainer-client assignment concepts into organization/team staff and roster memberships.
3. **Auth and route guards:** retain bearer authentication, permission middleware, denial behavior, authorization-contract validation, rate limiting, and audit patterns.
4. **Exercise intelligence:** tag existing exercises with rugby purpose, protocol attribution/version, applicable Activate part/level, equipment, dose, cues, regressions and progressions.
5. **Programs/workouts:** prescribe conditioning, development actions and later Beast Mode work through existing program/workout foundations.
6. **Movement/testing:** reuse camera/pose measurement boundaries, OHSA history patterns and exercise metadata; coach/qualified-person interpretation remains explicit.
7. **Sessions:** reuse identifiers/events and completion conventions, while adding a team session-plan aggregate and attendance/evidence links.
8. **Wellness inputs:** reuse check-in UX/service patterns, but route safety flags into new restriction records rather than profile notes.
9. **Nutrition:** link the existing nutrition plan/read model; keep it optional and outside readiness safety calculations.
10. **Media and notifications:** reuse browser capture/media metadata and notification delivery after secure object storage/access policy is introduced.
11. **AI:** add permission-filtered rugby context to the existing coach service only after deterministic evidence/readiness services exist.

## 5. New systems that genuinely need to be created

- Organizations/clubs, teams, seasons, staff assignments, roster memberships and rugby positions/position groups.
- A player rugby profile extension (rugby age/development stage, primary/secondary positions, season/team context), referencing `userId`.
- Versioned competency/rubric/protocol registry and dependency graph.
- Append-only evidence records, acknowledgments, reassessment, confidence, provenance and secure attachments.
- Derived readiness projection/calculation service with explainable breakdown, freshness and safety gates.
- First-class forward/pack pathways and first-class Backs Rugby Ready universal/position-overlay pathways.
- Rugby welfare availability and restriction service, including concussion workflow integration; authorized clearance remains distinct from coaching evidence.
- Adult Activate definitions, session delivery/attendance/quality observations, athlete/team progression recommendations and approval.
- Rugby session planner: blocks, groups, contact/load, staff, observation targets, EAP/safety checklist, publication and attendance.
- Match/event, squad, shirt/role assignment, eligibility evaluation, coach decision, publication and next action.
- Secure safeguarding concern/case/action/referral domain isolated from performance records.
- Coach Guide content registry and contextual help/deep links.
- Source/protocol attribution and version registry for official versus Pocket PT proprietary content.

## 6. Proposed production routes/navigation

Use an authenticated **Rugby** section in the existing Pocket PT shell, with team/season context in every URL:

- `/rugby` — derived Command Center
- `/rugby/teams`, `/rugby/teams/:teamId/roster`
- `/rugby/teams/:teamId/players/:userId` — player rugby development summary
- `/rugby/teams/:teamId/readiness` and `/players/:userId/readiness/:domain`
- `/rugby/teams/:teamId/evidence` and `/players/:userId/evidence`
- `/rugby/teams/:teamId/activate`
- `/rugby/teams/:teamId/sessions` and `/sessions/:sessionId`
- `/rugby/teams/:teamId/matches` and `/matches/:matchId/selection`
- `/rugby/teams/:teamId/welfare` (summary/restrictions only for authorized roles)
- `/rugby/safeguarding` (separate permissioned workspace; no team-performance navigation leakage)
- `/rugby/coach-guide` plus contextual `?topic=` panels

Initial implementation should follow the current static-page convention (`public/rugby.html` plus `public/rugby-*.js/css`) rather than introduce a second React deployment. The URL scheme above can be represented by query/hash state initially and migrated to explicit server routes as the shell evolves.

## 7. Proposed data-model changes

All mutable records require `id`, organization scope, creator/updater, timestamps, version, and archival state where applicable.

### Foundation

- `organization`; `team`; `season`
- `team_staff_assignment(user_id, team_id, staff_role, permissions, status)`
- `roster_membership(user_id, team_id, season_id, status, joined_at, archived_at)`
- `player_rugby_profile(user_id, primary_position, secondary_positions, development_stage, rugby_age, preferred_roles)`
- Versioned `rugby_position` reference data (1–15, 7s roles, position groups)

### Competency and evidence

- `competency_definition`, `competency_version`, `competency_prerequisite`, `rubric_criterion`, `protocol_source_version`
- `evidence_record(player_id, evaluated_position, competency_version_id, environment, pressure, independence, result, score_if_rubric_defined, factual_note, confidence, observed_at, observer_id, next_action, reassess_at)`
- `evidence_attachment` (object reference, clip timestamps, checksum, media type, access class)
- `competency_acknowledgment` and append-only `competency_state_event`; current state is a projection, never a silently overwritten fact

### Readiness and participation

- `readiness_policy_version`, `readiness_projection`, `readiness_gate_result`, `availability_projection`
- `participation_restriction` with type, scope, start/end, authorized issuer, status, and minimal coach-visible reason code
- Separate concussion workflow/stage events and authorized clearance reference

### Operations

- `rugby_session`, `rugby_session_block`, `session_group_assignment`, `session_attendance`, `session_safety_check`
- `activate_level/part/exercise/cue` linked to the shared exercise catalog, `activate_session_config`, `athlete_activate_observation`, `athlete_activate_state_event`
- `match_event`, `match_squad`, `selection_assignment`, `selection_decision_event`
- `development_goal`, `next_action`, `coach_guide_topic/version`

### Safeguarding

- Physically/logically separate `safeguarding_concern`, `safeguarding_case`, `safeguarding_action`, `safeguarding_referral`, `safeguarding_access_event`, and encrypted attachment records. Performance tables store no case narrative or discoverable case identifier.

## 8. Proposed API/service changes

Create route modules rather than expanding `server.js` indefinitely:

- `src/routes/rugbyTeams.js`, `rugbyPlayers.js`, `rugbyEvidence.js`, `rugbyReadiness.js`, `rugbySessions.js`, `rugbyActivate.js`, `rugbyMatches.js`, `rugbyWelfare.js`, `rugbySafeguarding.js`, `rugbyGuide.js`.
- Services mirror the aggregates: roster, competency registry, evidence, readiness policy/projection, restriction/availability, Activate, session planner, selection eligibility, safeguarding case routing and guide content.
- Repository interfaces must hide the eventual database choice. Use schema/validation modules at every write boundary, optimistic versions/idempotency keys, pagination, and structured audit events.
- Command Center endpoints return projections and links to their sources; they expose no write method for totals.
- Media endpoints issue scoped upload/download tokens and store only references in evidence records.
- Notifications consume domain events such as reassessment due, restriction change, session published and selection published.

## 9. Permissions/security considerations

Global `trainer` is insufficient for rugby. Resolve permissions from global role **and** active organization/team assignment. Proposed capabilities include `rugby.team.read/manage`, `rugby.roster.manage`, `rugby.evidence.read/write/acknowledge`, `rugby.session.manage`, `rugby.selection.manage/publish`, `rugby.welfare.summary.read`, `rugby.restriction.manage`, `rugby.clearance.record`, `rugby.safeguarding.submit`, `rugby.safeguarding.case.read/manage`, and `rugby.audit.read`.

Enforce object-level team/player access on every endpoint; deny archived assignments; prevent insecure direct-object references; rate-limit writes; audit reads as well as writes for restricted domains; redact API/log errors; protect exports; define retention/deletion/legal-hold behavior; encrypt in transit and at rest; and never infer a medical clearance from performance evidence. Athlete-facing access should show their development evidence and actionable restriction outcome without exposing staff-only or third-party-sensitive material.

## 10. Safeguarding data-separation strategy

Safeguarding is not a competency, note, readiness percentage, or ordinary team feed. Use a separate datastore/schema and encryption keys, dedicated repository/service/routes, stricter permissions with designated officer/backup assignment, row/object-level access, access-purpose logging, and isolated encrypted attachments. Coaches may submit a concern but cannot browse cases unless separately authorized. Rugby dashboards receive at most a non-sensitive operational control such as `participation_action_required`, only when necessary and authorized; they must not reveal that a case exists or why. Preserve factual original reports and append actions/referrals; never overwrite history, score credibility, infer guilt, or send narratives to AI/analytics. External referral and immediate-danger workflows remain organization/jurisdiction-configured placeholders pending legal and safeguarding review.

## 11. Evidence architecture

The invariant is **coach records evidence → deterministic policy derives status**. Evidence records are append-only observations answering what, who, where, pressure, independence and outcome, with competency/protocol version, evaluated position, timestamp, confidence, next action and optional secure clip. Corrections supersede records with a reason; they do not erase history. Competency states use the specified discrete ladder (`LOCKED` through `VERIFIED`/`REASSESSMENT_DUE`). A projection stores its input evidence IDs and policy version so every displayed state can answer “where did this come from?” and “what changes it?”. Weak/free-form notes cannot alone satisfy a defined verification requirement.

## 12. Readiness calculation architecture

Keep independent projections for availability, movement, conditioning, contact/tackle, ruck, maul, lineout, scrum, backs Skill/IQ, position readiness and selection evidence. Stage completion is verified required nodes divided by total required nodes; rubrics use explicit weighted criteria only when a versioned policy defines them. Safety-critical criterion failure is a gate, never an averaged deduction. A readiness result contains status, display completion, evidence freshness, unmet prerequisites, active gate reason codes, calculation/policy version, input evidence IDs and next actions.

Selection eligibility is a policy evaluation layered over—not merged into—readiness. Active medical/concussion/participation restrictions, unsafe tackle criteria and applicable front-row/competition locks fail closed. Coach selection remains a recorded human decision; the system neither auto-selects nor permits percentage edits to bypass a gate.

## 13. Activate integration architecture

Name and present the foundation as **Activate-Aligned Adult Foundation** and its distinct extension as **Pocket PT Beast Mode Rugby Performance System**. Store official-source attribution/version on definitions and retain placeholders until authorized/current exercise content is supplied.

Activate reuses teams, athletes, shared exercises, sessions, attendance, movement observations and restrictions. A rugby session selects training/match-day type, level and four-part delivery; exercises link to the existing catalog plus protocol dose/cues/faults/regression/progression. Coaches record the 1–5 quality dimensions, attendance, factual notes and safety flags. The policy derives hold/regress/reduced-volume/progress recommendation; coach approval is a separate event. Team advancement (default 70%) never advances an individual who needs scaling. Pain/injury/concussion flags create/route welfare actions and block progression. Activate informs Movement Ready, Conditioning Ready and development plans, but never replaces technical/tactical readiness, selection, concussion or safeguarding. Beast Mode begins only after foundation gates and is delivered through the existing program/workout engine.

## 14. Backs Rugby Ready architecture

Implement Backs Rugby Ready as a first-class competency family sharing the common evidence engine. Its universal card covers Defensive IQ (20%), Tackling in Space (15%), Attack IQ (20%), Ball Skills (15%), Movement & Evasion (15%) and Role-Specific Skill (15%), with versioned criteria beneath every category. Position overlays for 10, 12, 13, 11/14 and 15 select role-specific competency requirements without duplicating the athlete or universal evidence. Track off-ball and on-ball attack explicitly. Tackling in Space below the policy minimum (prototype: 70) is a starter hard gate; unsafe individual criteria can regress state regardless of average.

The Backline Athletic Index remains a separate testing projection (Speed 25%, Agility 25%, Repeat Effort 20%, Endurance 15%, Power 10%, Strength 5%). It may inform selection evidence but cannot repair a Skill/IQ, role, welfare or safety failure.

## 15. Forward/pack readiness architecture

Use the same versioned graph/evidence/state engine with forward-specific competency families: contact, tackle, ruck/breakdown, maul, lineout and scrum. Model individual role competencies separately from unit evidence. Scrum preserves its staged prerequisites and reports “Stage N verified / Stage N+1 next,” not a free score. Position/role overlays cover front row, locks and back row; lineout evidence distinguishes thrower/jumper/lifter/support roles. Official competition/front-row eligibility is an external/versioned restriction and is never inferred from internal Scrum Ready. Pack readiness is a team/unit projection over eligible individual roles and current unit evidence, not an average that hides one unsafe player.

## 16. Coach Guide/onboarding architecture

Move guide content into versioned Markdown/JSON topics rendered inside the existing mobile shell. Maintain a persistent Rugby Coach Guide entry and contextual `?` links keyed by route, domain and action. Each topic must state meaning, evidence source, permitted change action, downstream effect, role boundary and authoritative/proprietary source. Cover every workflow listed in the handoff, including archive/restore, team/position changes, evidence/readiness, Activate, wellness, safeguarding, sessions, selection and Command Center. Add empty-state walkthroughs and permission-aware guidance; do not expose restricted workflow detail to unauthorized roles.

## 17. Match-selection architecture

A match/event records team, season, format (15s/7s/etc.), opponent, date and applicable eligibility-policy version. The coach builds a squad and assigns shirt/role/status (starter, bench/rotation, competing, developing/not selected). Before each assignment, a deterministic eligibility service evaluates current availability, restrictions, tackle/contact gates, position pathway, competition/front-row rules and evidence freshness. Failed hard gates reject the write with a visible non-sensitive reason and source action. Selection decisions, reasons and next actions are append-only; publishing creates an athlete-safe view and notifications. Readiness never auto-selects, and safeguarding narrative never appears in the selection record.

## 18. Migration strategy: prototype to production

1. Freeze and checksum the uploaded package as a design reference; do not modify or delete it during feature work.
2. Extract a reviewed terminology/domain glossary and versioned seed definitions, labeling Pocket PT content versus governing-body-derived placeholders.
3. Implement production models/services/routes in root architecture and reproduce workflows with the existing Pocket PT shell/design primitives—not copied prototype state or localStorage.
4. Use fictional fixtures derived from the prototype; never migrate its sample/local browser data.
5. Add read-only feature flags and pilot teams, then progressive write capabilities by module.
6. Backfill existing users/trainer assignments only through explicit organization/team mapping; do not infer teams from challenge free text.
7. Validate projection parity against specification examples, then conduct coaching, medical, safeguarding, privacy and accessibility reviews.
8. After approval, relocate product specs to a versioned reference archive and remove only the identified caches/logs/build artifacts in a separate auditable cleanup PR.

## 19. Testing strategy

- Unit tests for schemas, graph transitions, evidence correction/history, weighted projections, freshness and every hard-gate precedence rule.
- Property/table tests proving no performance score can override any active safety restriction and no locked prerequisite can be silently verified.
- Service/repository contract tests for tenant/team isolation, archival behavior, optimistic concurrency, idempotency and audit events.
- Authorization matrix and IDOR tests across athlete, coach, team admin, medical/authorized clearance role, safeguarding officer and global admin.
- Safeguarding tests proving ordinary APIs, search, exports, logs, AI context and Command Center cannot disclose case existence/narrative.
- API integration tests for roster → evidence → readiness → session → selection workflows and invalid/stale policy versions.
- Projection replay tests: identical versioned evidence produces identical result and records input IDs/policy version.
- UI tests for mobile coach workflows, help links, source breakdowns, hard-gate explanations, keyboard/accessibility and no editable control on calculated values.
- Source/version tests preventing unversioned “official” content and preventing Beast Mode attribution to World Rugby.
- Migration/rollback, retention, encrypted attachment access, backup/restore and audit-chain verification tests before sensitive pilots.

## 20. Implementation phases

0. **Discovery (this document):** architecture, package classification and dependency plan.
1. **Rugby domain foundation:** organizations/teams/seasons, roster/staff membership, rugby positions/profile, scoped permissions, navigation, fixtures and audit events.
2. **Evidence and competency engine:** versioned definitions/graph, immutable evidence, attachments interface, reassessment and explainable projections.
3. **Safety/welfare foundation before readiness:** availability/restrictions, concussion event skeleton, clearance roles and hard-gate contract. This moves earlier than the suggested sequence because readiness/selection must not ship without enforceable safety ownership.
4. **Rugby readiness:** common domains, forward/pack paths, Backs Rugby Ready/position overlays, athletic index and selection-evidence projection.
5. **Activate and movement preparation:** versioned Adult Activate, session observations, progression/regression/team logic, movement/conditioning feeds.
6. **Sessions and development planning:** team blocks/groups/load/safety checks, attendance, observation targets, goals/next actions.
7. **Match selection:** events/squads/shirts, eligibility engine, publication and athlete-facing next actions.
8. **Safeguarding production integration:** isolated case store/workspace, referral/audit/retention after specialist review. Concern intake may be prototyped earlier only if it fails closed and stores no real data.
9. **Coach Guide/onboarding:** content system and full contextual coverage; foundational help stubs should accompany each earlier phase.
10. **Beast Mode:** proprietary advanced pathway over existing programs/workouts after Activate foundation validation.

## 21. Risks, blockers and open questions

### Blocking before real athlete/sensitive data

- Current file-backed persistence does not provide the transactional isolation, fine-grained access controls, encryption/key separation, secure attachments, retention/legal hold or high-assurance audit required for safeguarding/medical data.
- Medical, concussion, safeguarding, privacy, jurisdiction, competition/front-row eligibility and data-retention policies require qualified review. The prototype must not be treated as authoritative policy.
- Authorized/current World Rugby Activate exercise content, licensing/usage terms, source URL/version and update process must be supplied/approved; structural placeholders should remain until then.

### Product/technical decisions needed

- Organization tenancy model, team hierarchy, seasons and whether youth teams are in scope (the current Activate handoff is adult 20+).
- Who may record welfare observations, issue restrictions, record clearance, acknowledge competencies and publish selection in each organization.
- Which transactional datastore/object-storage/KMS providers and deployment region satisfy privacy requirements.
- Evidence retention, athlete access/correction, export and deletion policy; consent/legal basis for video.
- Governing body/jurisdiction and configurable competition rules for the first pilot.
- Whether numeric backs category scores remain coach-entered rubric outcomes or are fully derived from criterion events. Recommendation: criterion evidence derives category values; allow an explicitly audited rubric assessment, never a naked total edit.
- Exact readiness thresholds/freshness windows and which competencies are safety-critical need versioned coaching approval.

## 22. Exact files/directories recommended for Phase 1

Phase 1 should change only the root production application and leave `exercise-generation/` untouched:

### Add

- `src/rugby/reference/positions.v1.json`
- `src/rugby/models/rugbySchemas.js`
- `src/rugby/services/teamService.js`
- `src/rugby/services/rosterService.js`
- `src/rugby/services/playerRugbyProfileService.js`
- `src/rugby/repositories/rugbyOrganizationStore.js` (repository interface plus pilot adapter; explicitly non-sensitive)
- `src/rugby/routes/teams.js`
- `src/rugby/routes/players.js`
- `src/validation/rugbyValidators.js`
- `public/rugby.html`
- `public/rugby.css`
- `public/rugby.js`
- `test/rugby-domain-foundation.test.js`
- `test/rugby-authorization.test.js`
- `docs/rugby/permission-matrix.md`
- `docs/rugby/domain-glossary.md`

### Modify

- `server.js` — mount the rugby route modules and authenticated page entry only.
- `src/lib/authorization.js` — add rugby capabilities and team-scope resolution hooks without weakening existing permissions.
- `config/route-authorization-contract.js` — declare all new routes and guards.
- `public/trainer-navigation.js` and the appropriate existing dashboard navigation runtime — add the feature-flagged Rugby entry.
- `.env.example` — document the rugby feature flag and non-sensitive pilot persistence configuration.
- `README.md` — document the Rugby bounded context and local test commands.

### Do not change in Phase 1

- `exercise-generation/**` (preserve handoff evidence).
- Existing exercise catalog/generated artifacts (rugby metadata belongs in a later reviewed phase).
- Existing user JSON shape beyond referenced/normalized extension access; do not embed team rosters or sensitive records in user documents.
- Safeguarding/medical production storage until the datastore, security and specialist-review blockers are resolved.
