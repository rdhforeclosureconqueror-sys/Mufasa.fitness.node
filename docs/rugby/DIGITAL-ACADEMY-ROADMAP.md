# Rugby HQ Digital Academy — canonical delivery roadmap
Date: 2026-11-25 (Central time)
Status: active planning and discovery. Existing master-intelligence roadmap remains authoritative for athlete evidence and Beast Mode.
Production baseline: V8C PR #1413, merge 952a95e72398ad0baac6ef612350131936738b21. Owner reports mobile checks look good; directional kick controls not seen. This is owner observation, not exhaustive tactical certification.
Rollback: targeted revert of V8C if needed; preserve unrelated changes.

## Operating contract
"Next" means choose the highest-priority unblocked task, audit before implementing, use existing canonical services, establish explicit acceptance evidence, test, correct first failure, review, merge, deploy and verify when appropriate. Never claim tests ran without results. No fabricated source rules. Preserve working gameplay and separate outcome, decision quality, execution and physical capacity. Record PR, commit, tests, observed limitations, rollback and next action. No proprietary club tactics or player records in public GitHub, exported PCK or static public assets. Coach-approved criteria versioned and editable through authorized server-side workflows. No medical clearance.

## Phases
- [ ] P00 Baseline: V8C merge and owner observation recorded; confirm deployed hashes, archive capability inventory and complete regression baseline.
- [ ] P01 Security: verify existing auth and team scopes; anonymous, unrelated member, own team player, coach, admin, revoked membership and cross-team object access tests. Direct API, static, CDN/cache, export and storage access. Keep generic demo public only if intentional; deny private tactical content by default. No new sensitive uploads before gate.
- [ ] P02 Coaching acceptance lab: deterministic seeds, exhaustive supported decision combinations, actual simulator telemetry and emitted coaching responses, expected principles with provenance and coach approval, mirrored cases and boundary timing, score decision separately from execution/outcome, record uncertainty. No invented run results.
- [ ] P03 Simulator audit: inventory V1/V2/V3 and canonical implementation paths, directional kick left/right (reported missing), mobile gestures, scenario fidelity, replay, responsive layout. Regression tests before changes.
- [ ] P04 Playbook ingestion: private upload, immutable source/version/hash, text/diagram extraction, source anchors, uncertainty, structured formation/roles/routes/triggers/ball events; validate coordinates and supported mechanics; no automatic publication.
- [ ] P05 Coach workspace: scoped review/edit/approve/reject/version, audit, rollback, player visibility and coach-customizable criteria; reject unauthorized changes.
- [ ] P06 Playbook-to-simulator: approved structured data only, runtime authorization, validate geometry/timing/ball/defense, unsupported mechanics flagged, deterministic replay.
- [ ] P07 V9 window of opportunity: commitment/spacing/orientation, time to contact, receiver depth, ball flight, recovery/interception; Coach/Guided/IQ modes; calibrated evidence, not invented precision.
- [ ] P08 Academy: integrate canonical athlete development, assessment/evidence, Beast Mode and team readiness; no duplicate identity, no automatic medical clearance.
- [ ] P09 Multi-team pilot: isolation, coach signoff, real device and match-context feedback, longitudinal validity and measured adoption.

## P01 initial evidence (source inspection, not runtime verification)
- Existing audit: docs/rugby/attack-intelligence/ACCESS-AUDIT-AND-ACCEPTANCE.md identifies public landing and client-side requireUser gate; direct asset and team access remain unverified.
- Existing architecture: docs/architecture/RUGBY_COACHING_OS_INTEGRATION_PLAN.md recommends canonical identity, scoped team membership, server authorization and secure storage. Historical design; verify current implementation.
- Existing handoff: docs/rugby/rugby-hq-coaching-os-handoff.md requires immutable original coach material and separation of private tactical sources from public content.
- public/rugby-ravens-protected.js and test/quins-ravens-real-playbook.test.js identify an existing protected API pattern; inspect full route and live responses rather than assume isolation.
- Owner previously reported direct game access without authentication. Generic simulation may intentionally be public; private club material must not be. Inspect export and public asset content before changing access.
- P01 next: trace actual server route registration/static mounts, team membership resolver, private store, and existing tests; verify anonymous requests safely without exposing protected contents. Build negative-access matrix and fix verified leaks using existing boundaries.

## P02 initial coaching observation
Production godot/rugby-hq-web/playbook/playbook_arena.gd has _show_reaction_feedback and _three_on_two_read; contains outcome-not-decision-quality principle. Some feedback depends on defense labels and sampled clearance; actual correctness requires run-based evidence. Test rush/hold, blitz/drift/deep cover, 2v1/2v2/3v2, support/draw/pass/run/dummy/kick and timing. Compare measured commitment and release rather than assume a defense label determines correct response. Run counts and expected rules remain to be established.

## Resume pointer
P01 source trace and negative access matrix. P02 can use generic synthetic scenarios in parallel, but no private uploads until P01 passes. Do not redesign V8C or modify production access without verified scope.
