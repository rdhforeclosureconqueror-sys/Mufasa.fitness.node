# Youth Fitness Program Engine Deferred Work

This log preserves intentionally postponed work. An item may move into scope only when the phase ledger reaches its owning phase and prerequisites are satisfied.

| ID | Deferred item | Earliest phase | Prerequisite / note |
| --- | --- | --- | --- |
| YF-D-001 | Full canonical master specification checked into the repository | Phase 1 | Preserve the supplied master handoff as normative documentation; Phase 0 records boundaries only. |
| YF-D-002 | Versioned rule and evidence-source persistence, validation, seed sources, and review lifecycle | Phase 1 | Source claims must be reviewed; do not invent citations. |
| YF-D-003 | Production-backed expansion of the conservative approved youth exercise seed library | After Phase 2 | Phase 2 added validated immutable seeds; future expansion must preserve youth eligibility, approval, evidence, and stop metadata. |
| YF-D-004 | Production movement-game administration workflow | After Phase 2 | Phase 2 added first-class validated game fixtures; editing requires authorization, immutable audit, versioning, and rollback. |
| YF-D-005 | Opaque participant-reference resolver and canonical youth fitness profile | Phase 3 | Decide guardian/consent, privacy, age verification, and durable persistence policy first. |
| YF-D-006 | Foundation multi-week program planner | Phase 4 | Requires Phase 1 rules, Phase 2 registries, and Phase 3 profile. |
| YF-D-007 | Program-bound adaptive session planner | Phase 5 | No orphan workout endpoint. |
| YF-D-008 | Youth final safety-veto implementation | Phase 6 | Must encode prohibited prescriptions and fail closed. |
| YF-D-009 | Competency counters, one-variable progression/regression, adaptation events, and training memory | Phase 7 | Result-quality contract must distinguish prescribed, attempted, and valid reps. |
| YF-D-010 | Pocket PT youth journey UI and accessibility/user testing | Phase 8 | Requires stable read projection; screenshot and real-device verification required. |
| YF-D-011 | Conservative baseline assessment protocols and movement-observation categories | Phase 9 | Existing OHSA output requires non-diagnostic review before youth reuse. |
| YF-D-012 | Exclusion-aware consistency and personal progress reporting | Phase 10 | Replace generic streak assumptions with eligible scheduled-session denominator. |
| YF-D-013 | Minimal Leader Within assignment/completion bridge | Phase 11 | No integration exists in this repository; agree authentication, idempotency, event schema, and data minimization with owning system. |
| YF-D-014 | Youth-safe gamification | Phase 12 | Existing XP/streak/leaderboard system is reusable only behind minor privacy and anti-overexercise policy. |
| YF-D-015 | Reassessment and next-cycle generation | Phase 13 | Assessment protocol identity must remain stable across comparisons. |
| YF-D-016 | Advanced resistance, sport specialization, maturation modeling, agility analytics, computer vision, ML injury prediction, global score, and extensive coach analytics | Post-V1 | Explicitly outside Version 1. |
| YF-D-017 | Production database selection and normalized youth tables | Before production persistence | Repository currently uses JSON files and has no relational migration framework; requires deployment/backup/retention decision. |
| YF-D-018 | Reconcile duplicate legacy fitness domain implementations | Maintenance phase | `domains/fitness.js` and `src/domains/fitness.js` overlap; avoid expanding either for youth work. |
| YF-D-019 | Remove browser-local random “today workout” generation from youth paths | Before Phase 8 launch | `public/fitness.js` is not authoritative and must never power youth delivery. |
| YF-D-020 | External Ma’at program API disposition | Before youth planner rollout | Treat external generation as untrusted/non-youth until a constrained, versioned adapter and safety validation exist. |
| YF-D-021 | Production program planner | Phase 4 | Requires evidence rules, approved registries, and canonical youth profile. |
| YF-D-022 | Session/workout planner | Phase 5 | Must remain program-bound; no orphan youth workout generation. |
| YF-D-023 | Full admin evidence editor | Before production evidence administration | Requires authorization, immutable audit, source retirement, versioning, and reviewer workflow. |
| YF-D-024 | Fitness assessments and reassessment scheduling | Phases 9 and 13 | Requires protocol identity, non-diagnostic output, and stable comparisons. |
| YF-D-025 | Advanced gamification | Phase 12 or post-V1 | Requires youth privacy, anti-overexercise, and neutral consistency policy. |
| YF-D-026 | Production Youth Fitness Profile persistence and opaque participant-reference resolver | Before production profile writes | Phase 3 is code-level state only; requires authenticated Pocket PT resolution, guardian/coach authorization, consent, retention, migration, and rollback policy. |
| YF-D-027 | Pocket PT youth profile UI and admin profile editor | Phase 8 or later | Requires persistence, authorization, accessibility, audit, and safe validation presentation. |
| YF-D-028 | Baseline assessment engine | Phase 9 | Phase 3 includes only a partial-data placeholder; protocols and non-diagnostic interpretation remain separate. |
| YF-D-029 | Full recent-training memory | Phase 7 | Phase 3 stores only validated summary state and controlled stress tags. |
| YF-D-030 | Advanced consistency reporting | Phase 10 | Phase 3 provides only neutral, exclusion-aware arithmetic with a safe zero-denominator state. |
| YF-D-031 | Phase 3 successors: Program Planner, Session Planner, and safety validator | Phases 4–6 | Planners must consume the canonical profile and approved registries; the final validator remains an independent fail-closed veto. |
| YF-D-032 | Leader Within bridge, youth gamification, and sport-specific programming | Phase 11, Phase 12, and post-V1 | Phase 3 context labels create no integration, reward behavior, or sport-specific prescription. |
| YF-D-033 | Detailed program-bound Session Planner and approved exercise/game selection | Phase 5 | Must consume Phase 4 objectives and use Phase 2 approved-only lookup; no orphan workouts. |
| YF-D-034 | Complete prescription safety validator beyond Phase 4 output validation | Phase 6 | Phase 4 validates roadmap structure and prohibits selections; readiness, dose, impact, recovery, and activity eligibility require the independent final veto. |
| YF-D-035 | Program persistence, migrations, Pocket PT UI, and coach/admin editor | Phase 8 or before production writes | Requires authorization, consent/privacy, durable storage, audit, accessibility, deployment, and rollback decisions. |
| YF-D-036 | Baseline assessment and reassessment execution | Phases 9 and 13 | Phase 4 schedules metadata only; protocols, stable comparison identity, execution, and non-diagnostic interpretation remain separate. |
| YF-D-037 | Leader Within bridge, youth-safe gamification, and live/staging verification | Phases 11–12 / integration release | Phase 4 has no integration or participant-facing runtime to verify; these claims remain explicitly unmade. |
| YF-D-038 | Independent final prescription Safety Validator | Phase 6 | Phase 5 has local blueprint validation only; the independent final safety veto remains next. |
| YF-D-039 | Full adaptation engine and longitudinal training memory | Phase 7 | Phase 5 only filters avoidable impact from its normalized recent-stress snapshot. |
| YF-D-040 | Session persistence, migrations, Pocket PT UI, and coach/admin session editor | Phase 8 or before production writes | Requires identity authorization, consent/privacy, storage/audit/rollback, accessibility, and integration decisions. |
| YF-D-041 | Baseline assessment and reassessment execution | Phases 9 and 13 | Session planning neither chooses nor executes assessment protocols. |
| YF-D-042 | Leader Within bridge, youth-safe gamification, and Phase 5 staging/live verification | Phases 11–12 / integration release | No Phase 5 runtime, participant UI, or external integration exists to verify. |
