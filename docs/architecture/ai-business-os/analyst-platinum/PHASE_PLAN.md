# Analyst Platinum phase plan

## Responsibility agreement

| Owner | Responsibility | Reviewable output |
|---|---|---|
| Planning/review assistant | Establish scope, contracts, analytical rules, acceptance cases, and independent review questions; review the implementation after delivery | This package, review findings, and evidence-based report |
| Codex implementation run | Reconcile current main, implement A0–A8, run production-path scenarios and regression checks, maintain readiness, open a draft implementation PR | Code, phase receipts, diagnostics, test evidence, and truthful blocked gates |
| Rashad | Supply external account authorization/configuration, authorize live experiments and any budget, judge usefulness, complete authenticated human acceptance | External configuration and human-owned acceptance records |
| Independent reviewer | Challenge outputs, introduce unseen cases and negative controls, examine the actual integrated path | Findings tied to a reviewed commit and resolution evidence |

These are collaboration responsibilities, not extra runtime bots. A second reviewer must be independent of the implementation run; creating a second actor string in the same self-review is insufficient evidence of independence.

## Phases

All implementation rows begin at NOT_RUN. A phase's done condition is a requirement, not a claim that it has passed.

| Phase | Dependency | What it adds | Codex deliverable | Done means |
|---|---|---|---|---|
| A0 — Baseline and reuse map | Planning package | A known starting point | Current-main SHA, instructions, route/record/tool map, protected-path baseline, tracked cards | Three baseline findings reproduced or explicitly resolved by newer code; meaningful baseline tests recorded; no unaccounted overlap with other work |
| A1 — Assessment contract and truthful diagnostics | A0 | Meaningful validated outputs | Versioned AnalystAssessment and judgment policy; coordinator validation; repair shared diagnostic aggregation | Empty/unsupported assessments rejected before publication; required NOT_RUN/BLOCKED checks never yield PASS; unaffected roles retain evidenced behavior |
| A2 — Evidence desk and governed tools | A1 | Access to canonical information | Bounded internal readers, evidence packets, tool availability, coordinator handoff | Organization/version/source scope checked; missing capability stays unavailable; no direct provider or role bypass; production composition reaches the registered readers |
| A3 — Measurement | A2 | Reproducible numbers | Event normalization, funnel metrics, window and population checks, comparability, uncertainty | Duplicates, missing denominators, late records, small samples and invalid populations handled as specified; model cannot overwrite calculations |
| A4 — Gold judgment | A3 | A justified next inquiry | Evidence qualification, fit analysis, hypothesis comparison, decision table and structured rationale | Actual runtime produces validated assessments; Gold-required Academy cases pass, including integrated negative controls; no action is launched by the assessment |
| A5 — Cross-system diagnosis | A4 | Explanations that include product state | Funnel-to-diagnostic/version/payment/delivery linkage | Technical and measurement failures remain distinct from demand; alternative explanations and unresolved evidence survive the report |
| A6 — Comparisons and outcome calibration | A5 | Historical judgment | Cohort and version comparisons, immutable predictions, feedback and drift summaries | Only comparable populations are ranked; predictions precede outcomes; immature outcomes are pending; no automatic policy/prompt changes |
| A7 — Full Academy and review package | A6 | Observable proof | All 42 scenario executors, repeatable fixtures, holdout protocol, negative controls, certification report | Each scenario exercises production functions; golden, integration and negative cases pass; missing executor blocks certification; independent/model-quality checks are reported separately |
| A8 — Command visibility and operational handoff | A7 | Usable reporting | Authenticated Command Center projection, read-only shadow evaluation, certification CLI, authenticated human-acceptance API/UI integration | Complete internal path is demonstrated; UI does not fabricate green status; empty evidence blocks final certification; owner can inspect evidence and later accept a specific version |

## Reviewable implementation slices

- Slice 1: A0–A1, contract and diagnostic correctness.
- Slice 2: A2–A4, evidence access, calculations, and Gold judgment.
- Slice 3: A5–A6, diagnosis and comparison.
- Slice 4: A7–A8, integrated Academy, Command Center, and activation handoff.

Use separate commits and phase receipts. A single draft implementation PR can contain the slices if review stays manageable. Continue through the authorized coding scope when its machine prerequisites pass. No new permission is required merely to proceed to the next coding phase. Preserve existing runtime authority gates; a development plan is not authority to run live business actions.

## Acceptance layers

| Gate ID | Required evidence | Can offline work close it? |
|---|---|---|
| ANALYST_ARCHITECTURE_READY | A1–A3 contracts, real adapters/registration, production composition tests and diagnostics | Yes, for explicitly supported internal capabilities |
| ANALYST_GOLD_READY | A4 and all Gold-required scenarios through the actual production path | Yes; label evidence as deterministic architecture evidence |
| ANALYST_PLATINUM_ARCHITECTURE_READY | A0–A8 machine deliverables and all required deterministic/integration cases | Yes; provider quality and live operation remain separate |
| ANALYST_MODEL_QUALITY_VERIFIED | Independent unseen-case rubric, actual configured shared model path, version/trial metadata | Only when that provider path is available and authorized; fake adapters do not qualify |
| ANALYST_LIVE_ANALYSIS_VERIFIED | Authorized real source → internal record → Analyst → Command report, independently reconciled | No |
| ANALYST_OUTCOME_CALIBRATION_VERIFIED | Pre-outcome assessment joined to matured independent outcomes and reviewed comparison | No |
| ANALYST_HUMAN_ACCEPTANCE_VERIFIED | Authenticated authorized human acceptance of the reviewed evidence/version | No |
| ANALYST_PLATINUM_CERTIFIED | All applicable gates above PASS for the same supported scope/version and independent review complete | No |

Use the existing verdict vocabulary: PASS, FAIL, BLOCKED, NOT_RUN, NOT_APPLICABLE, INCONCLUSIVE, PENDING_HUMAN. Separate the gate ID from its verdict. NOT_APPLICABLE needs a scoped reason; it cannot waive a mandatory certification gate. Stale or changed critical inputs require relevant gates to be rerun. A correct recommendation to reject or pause a poor opportunity may pass Analyst evaluation even if the campaign loses money.

## External activation, after A8

Rashad authorizes and configures official read-only sources through protected settings. Codex supplies the exact setup instructions and a preflight report without exposing secrets. The actual experiment remains Experiment Manager-owned under existing authority. Controlled Test A can verify plumbing but cannot establish independent market demand. Payment, refund, delivery, and cost truth comes from existing canonical services. Missing source or account configuration does not block completing the offline code and tests; missing internal wiring does block architectural completion.

## Readiness tracking

Board: `launch`. Cards are noncanonical development cards created through `npm run readiness:update`:

- `launch-development-analyst-platinum-plan` — this planning package only.
- `launch-development-analyst-platinum-a0` through `launch-development-analyst-platinum-a8` — corresponding implementation phases.
- `launch-development-analyst-platinum-live` — configuration, live/model-quality evidence, outcome calibration, independent review and human acceptance.

Select only the current coding phase as CURRENT. Attach correlated files, commands/results, commit/PR, limitations, and next owner. CodeComplete on the planning card does not promote any implementation card. Human state is written only by the authenticated Admin path. Never commit generated `data/ops/` files.

## Every phase receipt

Record: phase ID; base and tested commit; changed files; reuse decisions; executed commands and actual counts; negative-control results; expected versus observed behavior; production/browser checks actually performed; unresolved baseline failures; first failure and owner; gate verdict; source/model/role/policy versions; next phase eligibility. Preserve receipts when later work supersedes them.
