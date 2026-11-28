# Handoff to assessment and programme integration

## Starting point

PR #1435 introduced trusted-evidence reconciliation without live progression. PR #1436 connected saved athlete review. PR #1437 enabled overhead-squat observations, five legacy physical measures, admin-defined scalar physical tests and named batteries. PR #1438 supplies full-XV candidate definitions. The live adapter now exposes those definitions as position-aware menus and allows verified admins to register exact local procedures for raw capture. Registration does not approve a scoring protocol or independently verify an athlete.

Use `data/rugby/full-xv-assessments/position-profiles.v1.json` as the position coverage map. Resolve its assessment IDs in `assessment-candidates.v1.json` and its domains in `development-links.v1.json`. Run `node scripts/validate-rugby-full-xv.js` before consuming them.

## Compatibility with the actual capture service

| Definition need | Current `src/rugby/assessmentCapture.js` | Integration action |
|---|---|---|
| 10/20 m, left/right 505, ankle scalar and overhead squat | Built-in IDs listed as `liveBuiltinId` in candidates | Alias only; do not claim existing historical results followed the new procedure. Pin the approved procedure/version in future definitions |
| Additional scalar measurements | Admin physical-test configuration accepts seconds, cm, m, kg and reps; generates UUID IDs | Review and configure variants, then persist candidate ID/version → actual UUID mapping. Never send candidate IDs as though they were already registered |
| CMJ versus broad jump | Both can be separate scalar definitions | Select an appropriate alternative; never convert or merge methods |
| Strength load/reps/body mass | One scalar outcome per definition | Use separate linked metrics/records with a common approved session ID; retain exact lift/reps and body mass date/method. No silent 1RM conversion |
| Repeated sprint | One result per record with trial and combine/session | Define exact series and rep meaning. Verify all expected reps and interval before deriving summaries. UI `trial` supports 1–20; larger series need a reviewed extension |
| Ankle left/right, stance and approach speed | Descriptive setup notes; no general structured side/conditions model | Introduce approved structured metadata rather than parsing free text into trusted metrics |
| Rugby skill/tackle/scrum/lineout observations | Only overhead squat has structured observation capture; admin custom definitions are physical-only | Add a versioned skill-evidence writer using existing authorization and storage. Never encode not-assessed or unsafe skill as numeric zero or pretend a combine makes it supported |
| Velocity, force, milliseconds or multi-metric protocols | Unsupported by current admin unit list or single-value model | Extend with explicit units/schema/conversions and tests; never relabel m/s as metres or milliseconds as seconds |
| Coach verification | Capture records distinguish self-report/admin source; `independentlyVerified:false` | Use authorized independent review, persist reviewer/provenance and retain original capture. Admin entry is not independent verification |
| Recommendations | No capture-driven prescription | Apply approved interpretation plus current readiness/club load, then coach chooses priority/exercise/block. Use existing exercise catalog and programme services |

`liveBuiltinId` documents a mapping, not protocol equivalence. Legacy builtin setup is generic and does not prove exact timing/side/procedure. Do not backfill versions or verification into old records.

## Observation contract to implement next

Keep the existing athlete identity, authorization resolver, canonical user store and append-only evidence services. An observation should retain assessment ID/version, athlete/role, timestamp, assessor, environment and pressure, side/shoulder where applicable, prompts, factual behavior, decision, execution, outcome, pain/readiness, clip reference and review state. Store statuses such as not assessed / introduced / assisted / independent controlled / independent live / repeatable under pressure. The existing coach evidence service remains the authority; this package introduces no second scoring engine.

## Connection order and acceptance criteria

1. Coach reviews local protocols and confirms population, role, safety and measurement reliability. Record approval/provenance; candidate status alone cannot authorize scoring.
2. Bind approved candidates to live definitions; show the athlete's primary/secondary position and relevant menu without demanding every test.
3. Extend skill and context capture. Verify authenticated ownership, assigned coach permissions, immutable definition snapshots, correction/history and missing-data behavior.
4. Reconcile saved measurements and independent reviews into the existing athlete review, preserving linkage and source confidence. Unapproved/unknown protocol, unknown pain or stale/incomparable data hold interpretation.
5. Present development hypotheses with supporting evidence and alternatives; coach confirms the priority. Strength, technique and perception deficits must remain distinguishable.
6. Resolve approved exercises against `src/exercise-intelligence/exerciseCatalog.js`; store programme version, team-load context and coach decision. Candidate exercise examples supply no sets, reps or progression.
7. Compare retests only under compatible protocols/conditions; record field transfer separately. Stage progression and publication use existing authorized services and criteria.
8. Verify persistence/readback, cross-athlete isolation, unknown/missing inputs, retries, version changes and owner iPhone acceptance after deployment.

## Completed here / still pending

- [x] Audit forwards and backs source coverage and recent assessment PR direction.
- [x] Define all 15 positions, with explicit number 9 and assigned set-piece roles.
- [x] Define physical and rugby-observation candidates with references and limitations.
- [x] Provide conditional development menus and compatibility mapping.
- [ ] Qualified coaching approval and protocol repeatability review.
- [x] Live position menus, explicit candidate-to-UUID capture bindings and structured skill/context capture (raw records, no scoring approval).
- [ ] Independent verification, interpreted priorities and programme connection.
- [ ] Comparable retests, field transfer and owner acceptance.

This checklist supplements the original roadmap; it does not change its denominator or claim scoring/programme activation. No production migration is authorized by this handoff.

## Live adapter operation

Use `/rugby-assessments.html`. Save primary and optional secondary assessment-menu preferences for the selected athlete; these do not assign selection, Beast Mode stage, scrum eligibility or contact clearance. Their relevant candidates and alternatives appear together. A named combine retains its explicit test list rather than silently dropping tests under a position filter.

Select a framework candidate, read its procedure/validity/stop conditions, and enter the exact local variant under Register procedure for capture. A verified admin receives a new live UUID carrying the candidate ID/version, original definition snapshot, unit or observation schema and registration actor/note. Existing generic builtins remain distinct; no historical data is relabelled.

Choose the registered procedure in the capture form. All bound records retain actual role/position, side, environment, pressure, reported readiness and conditions. State-based observations additionally retain prompts, factual behavior, decision, execution, outcome and optional clip reference. Contact candidates require supervisor, reported supervision, contact level, space and prerequisite status, including explicit unknown/not-assessed values. Recording these claims does not certify them or authorize further contact. All bound records remain review-required and independently unverified.

The assessment history retains originals. Choose a current result under New result or correction to append a correction for that same athlete and procedure. The admin review excludes superseded results from its current view; no historical record is deleted. Independent coach verification and approved interpretation remain separate next integrations.

Rollback is a reviewed revert and redeployment of backend/static frontend. Preserve all new definitions, position preferences and assessment records. The previous UI does not support the new skill/context controls; use an existing standalone procedure or roll forward a correction rather than editing stored data to simulate compatibility. Human iPhone, visual/UX and speech acceptance remain post-deployment checks.
