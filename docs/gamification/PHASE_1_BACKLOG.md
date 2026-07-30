# Phase 1 Gamification Backlog

## Working agreement

Statuses are `READY`, `BLOCKED`, `IN PROGRESS`, or `DONE`; every item begins `READY` unless a decision is explicitly required. Complexity: **XS** (< half day), **S** (0.5–1 day), **M** (1–3 days), **L** (3–5 days). File paths are planned and may be narrowed after current-route drift verification. Production implementation starts only after blueprint approval.

## A. Decisions and seed normalization

| Task ID | Description | Files affected | Dependencies | Complexity | Testing required | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| GAM-001 | Record product decisions: currency purpose, no-cash value, caps, privacy, minors, timezone, seasons, backfill date. | `docs/gamification/decisions.md` | Blueprint approval | S | Decision checklist lint/review | Every required decision has owner/date/rationale; unresolved items block relevant flags. | READY |
| GAM-002 | Inventory/checksum four legacy gamification CSVs without executing legacy code. | `scripts/import-gamification-seeds.js`, `docs/legacy-integration/01_LEGACY_ASSET_REGISTRY.md` | GAM-001 | S | Fixture checksum test | Manifest identifies source path/hash/rows; runtime has no CSV import. | READY |
| GAM-003 | Define JSON schemas for actions, achievements/rules, badges, tiers, streaks, levels, seasons, titles. | `data/gamification/schemas/*.schema.json` | GAM-001 | M | Valid/invalid fixture tests | Schemas reject unknown fields, unsafe numbers, string comparators, missing refs/versions. | READY |
| GAM-004 | Implement deterministic CSV-to-candidate importer. | `scripts/import-gamification-seeds.js`, `test/gamification-seed-import.test.js` | GAM-002,GAM-003 | M | Snapshot/idempotency/malformed CSV | Repeated import is byte-stable; legacy gaps become disabled warnings, never guesses. | READY |
| GAM-005 | Create reviewed normalized definition candidates. | `data/gamification/*.json` | GAM-004, product/safety review | M | Schema + semantic validation | Source trace/checksum present; unsupported items disabled with rationale. | READY |
| GAM-006 | Add semantic definition validator (IDs, refs, intervals, DAG, tier monotonicity, max issuance). | `scripts/validate-gamification-definitions.js`, `package.json`, `test/gamification-definitions.test.js` | GAM-003 | M | Mutation fixtures for every invariant | Command exits nonzero with actionable safe errors for all invalid candidates. | READY |

## B. Event foundation and persistence

| Task ID | Description | Files affected | Dependencies | Complexity | Testing required | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| GAM-010 | Register canonical event types, versions, sources, payload allow-lists, bounds. | `src/gamification/eventTypes.js` | GAM-003 | M | Table-driven registry tests | Every `EVENT_MODEL.md` launch event has immutable v1 contract; future events inactive. | READY |
| GAM-011 | Add event envelope validator/minimizer. | `src/gamification/validators.js`, `test/gamification-event-validation.test.js` | GAM-010 | M | Boundary, unknown field, PII fixtures | Invalid/oversized facts rejected; sensitive and unknown payload keys never persist. | READY |
| GAM-012 | Add injected clock/ID and deterministic effect-key utilities. | `src/gamification/identifiers.js`, `test/gamification-identifiers.test.js` | None | S | Collision/format/determinism tests | IDs opaque; effect keys stable; no secrets in keys. | READY |
| GAM-013 | Implement append-only event repository following current data-dir conventions. | `src/repositories/gamificationEventStore.js` | GAM-011,GAM-012 | L | Append, duplicate, restart, corrupt/partial file, concurrency | `(subject,idempotencyKey)` unique; committed records survive restart; corruption is surfaced safely. | READY |
| GAM-014 | Implement append-only ledger repository. | `src/repositories/gamificationLedgerStore.js` | GAM-012 | L | Conservation, unique effects, reversal, restart | Balance is derived; original entries immutable; reversal rules enforced. | READY |
| GAM-015 | Implement award/revocation repository. | `src/repositories/gamificationAwardStore.js` | GAM-012 | M | Once/period uniqueness, revoke/restart | Qualification key is unique; revocation is append-only and traceable. | READY |
| GAM-016 | Implement projection/cursor repository with versioned snapshots. | `src/repositories/gamificationProjectionStore.js` | GAM-012 | L | Cursor atomicity, checksum, recovery, rebuild swap | Cursor never advances before effects; snapshot activation is atomic. | READY |
| GAM-017 | Implement immutable published-definition store. | `src/repositories/gamificationDefinitionStore.js` | GAM-005,GAM-006 | M | Checksum/state/effective lookup | Runtime reads only published snapshots and can retain old versions. | READY |
| GAM-018 | Add store backup/restore and corruption runbook. | `scripts/gamification-store-maintenance.js`, `docs/operations/gamification.md` | GAM-013–017 | M | Temp-directory disaster rehearsal | Backup verifies checksums; restore is explicit and followed by reconciliation. | READY |

## C. Engine and projections

| Task ID | Description | Files affected | Dependencies | Complexity | Testing required | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| GAM-020 | Implement `eventService.record` validation/deduplication contract. | `src/gamification/eventService.js` | GAM-011,GAM-013 | M | New/duplicate/rejected/retry cases | Duplicate returns original ID and creates no second record. | READY |
| GAM-021 | Implement effective action-policy selection and cap/overlap groups. | `src/gamification/policyService.js` | GAM-014,GAM-017 | L | Boundary dates, caps, overlap, provisional verification | Only occurrence-effective published policies issue bounded integer effects. | READY |
| GAM-022 | Implement typed aggregate operators. | `src/gamification/achievementEvaluator.js` | GAM-015,GAM-017 | L | Count/sum/distinct/all/any/percent fixtures | No arbitrary code; results deterministic under documented ordering. | READY |
| GAM-023 | Implement achievement qualification and reward effects. | `src/gamification/achievementEvaluator.js` | GAM-021,GAM-022 | L | One-time/repeat/hidden/tier/version tests | Qualification, award, and ledger effects are atomic/logically idempotent. | READY |
| GAM-024 | Implement user-local streak projector and timezone history policy. | `src/gamification/streakProjector.js` | GAM-016,GAM-017 | L | DST, leap day, travel, late event, grace tests | Current/longest counts reproduce from events; login alone cannot qualify activity streak. | READY |
| GAM-025 | Implement lifetime/season level and title projection. | `src/gamification/levelService.js` | GAM-014,GAM-017 | M | Threshold boundaries, reversals, curve versions | Lifetime XP never resets; highest grandfathered level follows policy. | READY |
| GAM-026 | Implement summary/achievement/ledger projection composer. | `src/gamification/projectionService.js` | GAM-016,GAM-023–025 | L | Empty/earned/revoked/retired/lag fixtures | Projection includes version/as-of and no raw sensitive evidence. | READY |
| GAM-027 | Implement replay/shadow comparison command. | `scripts/rebuild-gamification-projections.js` | GAM-020–026 | L | Interrupt/resume, double rebuild, dry run | Two rebuilds match checksums; dry run performs no writes; cursor resume is exact. | READY |
| GAM-028 | Implement approved correction/reversal command with audit input. | `scripts/correct-gamification.js` | GAM-014,GAM-015,GAM-027 | M | Unauthorized/malformed/double reversal | Requires run ID/reason/operator; never edits/deletes original data. | READY |
| GAM-029 | Add safe metrics/health snapshot. | `src/gamification/observability.js`, `server.js` | GAM-020,GAM-026 | M | No-PII snapshot and lag/failure tests | Counts, lag, duplicate/failure rates and checksum visible to approved ops only. | READY |

## D. Authoritative event adapters

| Task ID | Description | Files affected | Dependencies | Complexity | Testing required | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| GAM-030 | Add per-component and per-source flags defaulting off. | `server.js`, `.env.example`, `README.md` | GAM-020 | S | Default-off/env parsing tests | Capture/evaluation/read/UI-equivalent controls are independent; bad values fail safely. | READY |
| GAM-031 | Emit session/workout completion event after commit. | `src/services/sessionService.js`, `server.js`, `test/gamification-workout-adapter.test.js` | GAM-020,GAM-030 | M | Complete/fail/retry/evaluator-down integration | Exactly one event after first completion; session success unaffected by gamification outage. | READY |
| GAM-032 | Emit generated-workout completion/progression facts without base double-pay. | `src/services/generatedWorkoutService.js`, `src/services/generatedWorkoutProgressionService.js` | GAM-021,GAM-031 | M | Same-effort overlap integration | Generated completion shares base reward and progresses plan-specific rule once. | READY |
| GAM-033 | Emit walking activity/distance facts. | `src/services/steppingIntoGreatnessService.js`, walking services | GAM-020,GAM-030 | M | Plausibility, cap, no-GPS-payload tests | Only completed activities emit; no raw route/coordinates persist. | READY |
| GAM-034 | Emit trail completion/unique-trail facts. | `src/services/steppingIntoGreatnessService.js`, `src/services/nearbyTrailService.js` | GAM-033 | M | Canonical trail/dedup/offline-late tests | Canonical trail and activity keys deduplicate; location remains private. | READY |
| GAM-035 | Emit running/run-club participation facts where authoritative records exist. | `src/services/steppingIntoGreatnessService.js` | GAM-020,GAM-030, current-flow verification | M | Participation, pace independence, duplicate tests | Rank/pace does not alter base reward; unsupported flows stay disabled. | READY |
| GAM-036 | Emit accepted push-up challenge participation/PR facts. | `src/services/challengeService.js`, `server.js` | GAM-020,GAM-030 | M | Auth identity, submission replay, outlier/cooldown | User ID is server-derived; one participation reward/challenge; outliers provisional. | READY |
| GAM-037 | Emit nutrition logging/goal/mission facts. | `src/services/nutritionService.js` | GAM-020,GAM-030 | L | Private payload, once/day, contraindication/overlap tests | No values/meal text copied; goals approved; low intake never rewarded. | READY |
| GAM-038 | Emit check-in and assessment completion facts. | `src/services/userDataService.js`, relevant current services/routes | GAM-020,GAM-030, flow verification | M | Completion transition, private answers, reassessment interval | Answers/results excluded; incomplete/failed writes emit none. | READY |
| GAM-039 | Emit bodyweight-update occurrence without measurement value. | `src/services/userDataService.js`, profile write service | GAM-020,GAM-030 | S | Value-redaction and weekly-cap tests | Event states occurrence/source only; direction/magnitude has no reward. | READY |
| GAM-040 | Emit profile-completion transition. | profile/intake services | GAM-020,GAM-030,GAM-001 | M | Requirements version and optional-sensitive-field tests | One award/version; optional sensitive data not required. | READY |
| GAM-041 | Emit first active authenticated daily-login fact. | auth/activity middleware, `server.js` | GAM-020,GAM-030 | M | Refresh/reload/timezone/rate tests | Token refreshes do not emit; maximum one key/day and login cannot sustain activity streak. | READY |
| GAM-042 | Design/implement qualified referral only if current authoritative referral flow exists. | future current-platform referral service | GAM-001,GAM-020, privacy/fraud review | L | Consent, self-referral, delayed qualification, cap | If no current flow, remains disabled; no legacy/external runtime is created. | BLOCKED |
| GAM-043 | Reserve yoga/gymnastics event constants as inactive metadata only. | `src/gamification/eventTypes.js`, `data/gamification/*.json` | GAM-010 | XS | Publication-disabled tests | Cannot record/reward until future current-platform source and Phase 3 approval. | READY |

## E. APIs and security

| Task ID | Description | Files affected | Dependencies | Complexity | Testing required | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| GAM-050 | Add authenticated summary endpoint. | `server.js`, `src/gamification/projectionService.js` | GAM-026,GAM-030 | M | Auth/membership/cross-user/disabled/shape | Only own safe summary returned with `projectionAsOf`/version. | READY |
| GAM-051 | Add cursor-paginated ledger endpoint. | `server.js`, projection service | GAM-014,GAM-030 | M | Cursor tampering, limit, redaction | Capped stable pagination; no raw payload/internal risk fields. | READY |
| GAM-052 | Add achievement/streak endpoints. | `server.js`, projection service | GAM-024,GAM-026 | M | Hidden/revoked/retired/filter/auth tests | Hidden criteria do not leak; owner sees accurate status/progress. | READY |
| GAM-053 | Add safe published catalogue endpoint with ETag/version. | `server.js`, definition store | GAM-017,GAM-030 | S | Draft/hidden exclusion, cache tests | Only safe published localized metadata returned. | READY |
| GAM-054 | Add gamification preferences endpoint. | `server.js`, current user store/service | GAM-001,GAM-030 | M | CSRF/auth/version/validation tests | Opt-in/visibility/title/notification preferences persist atomically. | READY |
| GAM-055 | Implement privacy-preserving leaderboard service/API behind flag. | `src/gamification/leaderboardService.js`, `server.js` | GAM-001,GAM-026,GAM-054 | L | opt-in, cohort minimum, tie, block/report, correction | Default off; only eligible pseudonymous users and bounded safe rows appear. | READY |
| GAM-056 | Update authorization contract and route audit expectations. | `config/route-authorization-contract.js`, route audit fixtures/tests | GAM-050–055 | M | Security/route-audit suites | Every new path has explicit current auth/permission classification. | READY |

## F. Frontend experience

| Task ID | Description | Files affected | Dependencies | Complexity | Testing required | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| GAM-060 | Add shared authenticated gamification API/runtime state module. | `public/gamification-runtime.js`, active HTML boot wiring | GAM-050–054 | M | fetch/auth/error/stale-response tests | Server is authority; failures produce optional unavailable state and block no workflow. | READY |
| GAM-061 | Add member-home level/XP/streak/recent-awards card. | `public/dashboard.html`, `public/dashboard-runtime.js`, `public/member-home-runtime.js` | GAM-060 | M | empty/loading/error/mobile/accessibility | Accurate versioned summary, keyboard-readable, no layout break with flag off. | READY |
| GAM-062 | Add achievement catalogue/progress view. | `public/achievements.html`, `public/achievements.js`, styles | GAM-052,GAM-053,GAM-060 | L | filters, hidden, earned, localization, keyboard | Status/rarity/tier/evidence rendered accessibly; hidden rules stay hidden. | READY |
| GAM-063 | Add deduplicated unlock notification queue. | `public/gamification-runtime.js`, active page boot wiring | GAM-060 | M | reduced motion, rate, reload, screen reader | At most one toast at a time; mute works; notification never asserts before API confirmation. | READY |
| GAM-064 | Refresh rewards after workout success. | `public/workout-runtime.js`, generated workout runtime | GAM-031,GAM-032,GAM-063 | S | success/evaluator lag/failure regression | Existing completion UI finishes first; reward refresh is non-blocking. | READY |
| GAM-065 | Add contextual progress to walking/trails/run club. | `public/greatness.html`, `public/greatness.js` | GAM-033–035,GAM-060 | M | no-location-leak/error/mobile tests | Displays safe milestone progress only; activity workflow unchanged. | READY |
| GAM-066 | Add contextual challenge progress. | `public/push-up-challenge*.js/html` | GAM-036,GAM-060 | M | duplicate/outlier/provisional copy | Participation celebrated; no unsafe rep escalation or rank shame. | READY |
| GAM-067 | Add contextual nutrition progress. | `public/nutrition.html`, `public/nutrition-runtime.js` | GAM-037,GAM-060 | M | privacy/safe-copy/goal-ineligible tests | No deficit/weight morality; private nutrient values not exposed beyond existing journal. | READY |
| GAM-068 | Add preference and leaderboard opt-in UI. | active profile/dashboard runtime and HTML | GAM-054,GAM-055,GAM-060 | M | default-off/consent/leave/block/a11y | Clear voluntary consent and reset explanation; leaving removes future visibility. | READY |
| GAM-069 | Add original badge art and accessible metadata after design approval. | `public/assets/gamification/*`, catalogue JSON | GAM-005, content/art/license review | L | asset manifest, alt text, contrast, missing fallback | Original/licensed assets, tier distinguishable without color, fallback works. | READY |

## G. Backfill, rollout, and operations

| Task ID | Description | Files affected | Dependencies | Complexity | Testing required | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| GAM-070 | Build deterministic backfill planner/dry run for approved source records. | `scripts/backfill-gamification-events.js` | GAM-020,GAM-027,GAM-001 | L | boundaries, resume, unavailable facts, no-write dry run | Emits only provable facts with migration/key; report counts/checksums and omissions. | READY |
| GAM-071 | Reconcile source entities, events, ledger, awards, projections. | `scripts/reconcile-gamification.js` | GAM-027,GAM-070 | L | injected missing/duplicate/corrupt fixtures | Safe report identifies discrepancies; never auto-edits immutable data. | READY |
| GAM-072 | Add rollout dashboard thresholds and alerts. | ops docs/current observability configuration | GAM-029 | M | synthetic lag/error/duplicate alerts | Named owners and thresholds for lag, failures, duplicates, reversals, cap/anomaly rates. | READY |
| GAM-073 | Run shadow workout capture and sign-off. | `reports/gamification-shadow-workout.md` | GAM-031,GAM-071,GAM-072 | M | 2 rebuilds + source-count comparison | Zero unexplained duplicate/reward differences; domain error rate unchanged. | READY |
| GAM-074 | Run each source through independent shadow gate. | `reports/gamification-shadow-sources.md` | GAM-032–041,GAM-073 | L | source-specific reconciliation | Each source receives explicit go/no-go; failures do not block other sources. | READY |
| GAM-075 | Conduct security/privacy/abuse review. | `docs/security/gamification-threat-model.md` | APIs/adapters complete | L | adversarial suite and manual review | No client award path, PII leak, cross-user access, unbounded issuance, or unsafe public ranking. | READY |
| GAM-076 | Conduct fitness-safety/content/accessibility review. | `reports/gamification-safety-accessibility.md` | Catalogue/UI complete | M | prohibited-criteria scan + a11y suite | Reviewers approve copy/criteria; alternatives/rest and reduced-motion support verified. | READY |
| GAM-077 | Rehearse rollback and recovery. | `docs/operations/gamification.md`, report | GAM-018,GAM-027,GAM-071 | M | evaluator outage, flags, corruption restore, domain success | Operators disable independently; workout succeeds; replay restores matching checksum. | READY |
| GAM-078 | Execute staff/5%/25%/50%/100% staged rollout. | release checklist/report | GAM-073–077 | L | gate metrics at every stage | Each expansion has owner approval; notification/leaderboard remain separate last gates. | READY |
| GAM-079 | Post-launch economy/fairness review and future-version proposal. | `reports/gamification-economy-review.md` | 30 days production data | M | distribution simulation | Changes are prospective versioned policies; earned value/history preserved. | BLOCKED |

## Definition of done for Phase 1

Phase 1 is done only when all launch-source tasks are `DONE` or explicitly descoped with owner rationale; immutable provenance and idempotent replay are demonstrated; two rebuilds match; current workflows pass with all flags off and during engine failure; privacy/safety/accessibility/security reviews pass; backfill (if any) is signed off; staged rollout and rollback rehearsal complete; and future yoga/gymnastics remain inactive current-platform placeholders rather than revived legacy runtimes.
