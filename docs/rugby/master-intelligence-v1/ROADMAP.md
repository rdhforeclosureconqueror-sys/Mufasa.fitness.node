# Rugby HQ master intelligence roadmap

Tracking branch: rugby/master-intelligence-v1-recovery. PR #1406.
Production destination: Mufasa.fitness.node. No competing scoring engine.
Update this checklist with every completed milestone, in the same PR where practical. Check an item only after its stated acceptance evidence exists. Source recovery is not evidence validation or live activation.

## Recovery and consolidation
- [x] Recover 780 unique ACR identifiers and 20 master records.
- [x] Preserve eight recovered batches and original registry; verify complete ACR identifier union.
- [x] Create unified registry index and link 20 master wording variants.
- [x] Align fields of 166 recovered records without inventing missing semantics.
- [x] Audit 20 master source pointers and preserve 19 divergent identifier meanings without overwriting originals.
- [x] Preserve 40 qualified master source references and reject ambiguous legacy references (6 isolated cases passed).
- [x] Group all 40 qualified master statements into 13 traceable proposed principles with safety precedence.
- [ ] Approve canonical master semantics and normalize unresolved triggers, actions, exceptions and tests.
- [x] Archive twelve original knowledge documents (12/12 byte-exact verified).
- [ ] Archive supporting batch narratives, protocols and references.
- [x] Transfer Activate/Beast Mode archive (16/16 payload files byte-exact verified).
- [x] Transfer Backs Readiness archive (22/22 payload files byte-exact verified).
- [ ] Reconcile Activate/Beast Mode and Backs Readiness with existing production architecture; preserve archive transfer manifests.
- [x] Verify historical resources 01, 03, 05, 08 on main (13/13 PR paths present; current hashes recorded).
- [x] Preserve introductory conditioning candidate archive (11 exact originals and 2 verified privacy-redacted copies; 13/13 accounted for).
- [ ] Confirm Resource 04 numbering and reconcile introductory conditioning content against ACR and production architecture.
- [ ] Independently verify evidence and course protocol claims; document unresolved gaps.

## Decision intelligence
- [x] Save eight safety policy specifications and twelve proposed acceptance vectors.
- [x] Write isolated safety evaluator and expanded 22-case regression suite; record prior local results.
- [ ] Re-run safety suite from repository checkout/CI and audit malformed field and conflicting decision handling.
- [x] Save Player Profile specification covering ACR-001–077.
- [x] Implement isolated Player Profile evaluator; 12 functional cases passed.
- [ ] Run repository Player Profile suite and integrate trusted safety evaluation rather than caller-supplied clearance.
- [x] Save Programme Management specification covering ACR-237–250.
- [x] Implement and test isolated programme hierarchy, nonmutating planned versus actual load comparison, and adaptation review (12 functional cases passed).
- [ ] Enforce persistent plan immutability, validate calendar/date constraints, and run repository programme tests with trusted safety integration.
- [x] Save movement assessment decision specification covering ACR-119–190 and four foundational tests.
- [x] Implement and test isolated movement assessment capture and review evaluator (13 functional cases passed; scoring disabled).
- [x] Map remaining movement reasoning ACR-191–198 in specification addendum.
- [ ] Verify movement protocols, implement remaining reasoning, integrate trusted safety and run repository tests before enabling scoring.
- [x] Save injury surveillance specification ACR-199–236 and isolated descriptive metrics evaluator (8 functional cases passed).
- [ ] Validate injury case definitions, cohort/exposure completeness, privacy, availability and medical workflow; run repository tests.
- [x] Save readiness and recovery specification ACR-078–100 and isolated evaluator (13 functional cases passed).
- [ ] Integrate trusted privacy/safety, dated trends, recovery feedback and programme review; run repository readiness tests.
- [x] Save nutrition specification ACR-101–118 and isolated context/scope evaluator (13 functional cases passed).
- [ ] Inspect and reconcile existing Nutrition Lab interface, trusted safety, fueling education and performance feedback; run repository nutrition tests.
- [x] Map conditioning ACR-435–542 and implement isolated MAS arithmetic (10 functional cases passed).
- [x] Implement isolated RSA decrement, speed reserve and rolling running/contact peak analytics (14 functional cases passed).
- [ ] Validate RHIE, contact classification, limiting-factor and progression logic; reconcile existing conditioning engine and run repository tests.
- [x] Map resistance training ACR-543–690 and implement isolated gym review evaluator (12 functional cases passed).
- [ ] Reconcile exercise library, competency, force velocity, microcycle coverage and progression; run repository resistance tests.
- [x] Map gamespeed ACR-691–780 and implement isolated assessment evaluator (13 functional cases passed).
- [ ] Reconcile SAQ, exposure tracking, phase planning and simulator interfaces; run repository gamespeed tests.
- [x] Map ACR-251–434 programme management, periodisation, female athlete and monitoring rules; implement isolated monitoring evaluator (14 functional cases passed).
- [x] Verify complete ACR domain mapping union and all 780 source pointers.
- [ ] Reconcile advanced programme semantics, trusted authorization and longitudinal monitoring; run repository tests.
- [ ] Reconcile with existing production engines; avoid duplicate scoring and prescription logic.

## Production acceptance
- [ ] Inspect existing runtime architecture and data contracts; integrate behind restricted feature controls.
- [ ] Verify privacy, medical referral, anti-doping and authorization safeguards.
- [ ] Run repository CI, integration and regression tests; review PR and resolve failures.
- [ ] Prepare rollback plan and verify deployment configuration.
- [ ] Merge approved changes to main; verify source files and deployment.
- [ ] Verify live Rugby HQ with authorized acceptance tests; record results and rollback readiness.

## Current checkpoint
Historical resources 01, 03, 05, 08: 13/13 paths present on main. Introductory conditioning candidate archive: 13/13 accounted for; numbering and overlap review pending.

## Closeout execution plan (approved batching approach)

Preserve the original acceptance checklist and denominator. Group remaining milestones into bounded workstreams; use separate PRs when dependencies or risk require. Do not expand scope except to resolve an acceptance blocker.

1. Unified athlete intelligence: master semantics, movement protocols, safety, profile, injury privacy, readiness, longitudinal evidence, eligibility and Beast Mode progression.
2. Training prescription intelligence: conditioning, resistance, gamespeed, nutrition interfaces and exercise library reconciliation.
3. Programme and season management: immutable plans, calendar constraints, advanced programme semantics and longitudinal monitoring.
4. Production integration: reconcile recovered resources and existing engines, verify outstanding source claims, integrate behind restricted feature controls; avoid duplicate engines.
5. Final acceptance: security/privacy/medical safeguards, repository CI, regression and integration tests, review, rollback, merge, deployment and authorized live acceptance.

Batch exit gate: implementation and tests where applicable; source and runtime evidence distinguished; actual checklist and manifest updated; unresolved blockers documented; review and rollback plan before production changes. A design-only commit is not a functional completion. PR #1406 is the existing recovery PR; inspect its scope and CI before deciding merge or split. No production activation without acceptance evidence.

## Maintenance rule
For each subsequent change, update this roadmap and recovery-manifest.json with actual acceptance evidence, remaining work and activation status. Do not mark a design specification as an executed test or production integration.

## Phase 1B checkpoint — PR #1410
Recovery PR #1406 merged. Evidence core CI: 214/214 passed. Authenticated assessment evidence persistence and private read route implemented on PR #1410; three new route cases pending CI. Legacy assessments preserved, not backfilled. Coach authorization and production acceptance pending. Original milestone count unchanged.

## Coach evidence checkpoint — PR #1411
PR #1410 merged at 83e042108bf16ae19a9bb7270060b74e61ce5f40; 217/217 CI tests passed. Coach service 227/227 CI tests passed at 02f2512008c74f355f0056bab89b5a1b6c6648b1. Canonical assignment store and authorization resolver reused; review queue and write endpoint default disabled. Three additional queue tests and route inventory committed; latest CI and live acceptance pending. No automatic progression. Original milestone count unchanged.

## Safety and readiness integration checkpoint
PR #1411 merged at 71ca4b05318c3cee1879420ffc1cb3187083539e; 230/230 prototype tests and 11 workflows passed. Stored readiness, optional versioned recovery validation and fail-closed eligibility adapter implemented; 17 new regression cases pending CI. No runtime eligibility activation or automatic progression. Original milestone count unchanged.

## Beast Mode configurable development checkpoint
- [x] Owner-directed baseline/programme/adherence/field transfer/retest policy recorded on development branch.
- [x] Candidate stage criteria validation and pure append-only policy ledger implemented on development branch.
- [x] Verify 28 new regression cases in CI; PR #1414 merged at 0a355c098978bf594a7ca47054338aacc97c7074; 277 recovery tests passed.
- [ ] Trusted evidence provenance and complete programme records. PR #1435 added an isolated evaluator; end-to-end evidence writers and programme reconciliation remain incomplete.
- [ ] Dedicated owner authorization, atomic persistent policy storage, drafts and alternative pathways.
- [ ] Admin dashboard, policy pinning, privacy review, deployment and live acceptance.
Original 53-milestone count unchanged. No runtime activation.

## Owner policy storage checkpoint — PR #1415
- [x] Dedicated owner authorization and append-only PostgreSQL policy store implemented and tested at 225dbb968c323642a00dd1eea1cd219ec748a3c4.
- [x] Restricted runtime role, concurrent publication, restoration and opt-in integration tests verified: 316 passing tests across runs 45751034194, 45751034195, 45751034264; one intentional no-database skip.
- [ ] Canonical readiness registration via CLI (outstanding; owner authorized PR-specific merge exception if necessary, not human acceptance).
- [ ] Drafts, alternative pathways, trusted evidence, version pinning, production database configuration, privacy correction and admin interface.
No production migration, runtime activation or owner device acceptance. Original 53-milestone denominator unchanged. Rollback: reviewed revert of squash commit and redeploy; no database schema or data change in this PR.

### Simba production activation — PR #1420

- [x] Read-only production audit: Simba database `simba_db_jda4` available; Rugby schema and policy table absent; current connector read-only.
- [x] Implement main-only manually dispatched migration and isolated PostgreSQL rehearsal.
- [x] Verify rehearsal, readiness evidence and technical review; merge PR #1420 (`a98e05d331242ebaf7cf71da2fd836322f552e71`); both Render services verified live.
- [ ] Configure protected production environment, migration secret, backup and TLS verification; execute approved migration.
- [ ] Verify schema, dedicated runtime role and denial of unrelated data access; connect API and owner dashboard.

This activation checklist does not alter the original 53-milestone denominator. No production migration or human acceptance asserted.

- [ ] Read-only production connection preflight: owner reported environment and secret configured; screenshots show main-only rule, owner reviewer, administrator bypass disabled and fresh export November 26 at 2:08 AM. Saved protection rules, actual restore and external TLS connection remain unverified.

## Policy preview checkpoint
Recovery clone authentication and restore verification deferred by owner; independent development may continue. Production migration remains separately gated. Owner-only nonmutating draft preview and field-level comparison implemented on development branch; CI and review pending. No API exposure, production activation or milestone completion asserted.

## Trusted evidence evaluator — PR #1435
Merged at d4dc2e69e9072a0c1a9458fc6cd61ccb072678e4; five CI workflows passed. This evaluator is not called by a live athlete route. It does not establish trusted programme adherence or a meaningful baseline/retest comparison. Original checklist remains 30/53 (56.6%); the previously reported 31/53 was incorrect.

## Active athlete evidence review
Admin review screen and authenticated read routes connect saved athlete measurements, assessment review status, candidate stage requirements and the existing stored-readiness evaluator. Review is enabled in production startup without a new feature flag. Candidate stage selection is an inspection target, not an assigned athlete stage. Linked assessments are distinguished from legacy/unlinked records.

Remaining: saved stage assignment, trusted movement observation capture, policy publication/version pinning, immutable programme completion, comparable retesting, field-transfer recording and authorized progression. These are visibly listed in the review. No original milestone is newly checked.

Automated service/UI tests cover access, timestamp and cross-athlete validation, measurement linkage, legacy records, pain versus missing readiness, empty/error states, spoken review and stale-response handling. CI and deployment acceptance are recorded in the PR. Owner iPhone/UX acceptance follows deployment.

Rollback: revert the reviewed squash commit and redeploy backend and static frontend. This change writes no athlete records and needs no database migration; existing assessment/check-in routes remain available.

## Active movement and physical assessment capture

Extends the athlete workflow with overhead-squat observations, physical measurements, admin-defined physical tests and combine batteries. Results retain athlete, assessor, source, pain response, trial, local test date, procedure and combine/session context. Append-only records survive service recreation and load in the admin athlete review. Self-report and admin capture remain distinct from independent verification. Legacy records are preserved.

Production startup enables capture/configuration routes and the linked screen without a new feature flag. Save/readback and retry deduplication are covered in service/UI tests. Stage scoring, approved protocol interpretation and assessment-driven exercise/programme selection remain pending. Original checklist remains 30/53; capture alone does not satisfy the broader source-verification and trusted-safety milestone. See ASSESSMENT_FLOW.md for operation and rollback. Human iPhone acceptance follows deployment.
