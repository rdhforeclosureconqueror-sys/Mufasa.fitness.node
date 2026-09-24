# SMART_ANALYST implementation contract

Contract proposal: `ai-business-os.analyst/1.0.0`. This document specifies required behavior; it is not deployed configuration.

## 1. Composition and role scope

Extend SMART_ANALYST on the canonical shared runtime. Keep ASSESS_EVIDENCE and route specialized jobs through typed input/task context unless a mission extension is justified and versioned. The real path must be observable: organizational Work → shared Context/Memory → shared Cognition/Model Gateway when interpretation is needed → governed tools → deterministic metrics/policy → validated AnalystAssessment → coordinator handoff → Command Center projection.

Do not call a provider directly from Analyst. Do not turn roleTrace strings into execution proof. General language reasoning supplies hypotheses and explanations; audited code supplies numbers, policy enforcement, provenance checks and final permissible dispositions. If the model is unavailable, report its actual mode and limitations; deterministic fallback must not pretend to have completed model reasoning. Tools and templates are connected through existing systems, with no private Analyst database or model client.

Analyst qualifies and diagnoses. It recommends an uncertainty worth testing and its next owner. Experiment Manager owns the test design and interpretation. Economics owns financial classification and contribution. Learning owns proposed policy/prompt changes. Management owns prioritization. Analyst does not launch tests, send messages, publish, spend, price, grant access, move money, self-approve QA/human gates, or apply learning.

## 2. Versioned assessment record

Extend the canonical WorkArtifact envelope; do not weaken organization, work/run attribution, actor/role version, source/provenance, status, correlation, causation and scope checks.

| Field group | Required meaning and validation |
|---|---|
| identity | Unique assessment ID, contract version, work/run, organization, product/campaign/experiment references when applicable, assessedAt, analyst/role/policy/metric versions and input snapshot hash |
| question | Nonempty business question, requested decision, analysis kind (`OPPORTUNITY`, `FUNNEL`, `COMPARISON`, `OUTCOME_REVIEW`) |
| population | Eligibility definition, counting unit, cohort assignment, inclusion/exclusion, timezone, observation dates, outcome horizon, product/offer/app versions; not-applicable fields need reasons |
| evidence | Resolvable immutable record references, source/version, observedAt versus fetchedAt, evidence classification, availability/completeness, origin and allowed scope |
| findings | At least one typed finding: observed fact, calculated fact, inference, hypothesis or insufficient evidence; each includes claim, supporting references and limits |
| calculations | Formula/version, input refs, numerator, denominator, units, window, value or explicit UNKNOWN/UNDEFINED, and measurement-quality flags |
| explanations | Ranked hypotheses with supporting and opposing evidence, contradictions, alternatives, and a testable disconfirmation condition; empty lists allowed only with an explained non-diagnostic disposition |
| readiness | Product/capability availability and provenance; missing reader is not operational readiness |
| uncertainty | Unknowns, missing evidence, sample adequacy, comparability, stale/partial data and limitations |
| confidence | `UNASSESSED`, `LOW`, `MODERATE`, or `HIGH` with a versioned basis; confidence in an observed calculation is distinct from confidence in a causal explanation |
| decision | One existing ANALYST_DISPOSITIONS value, reason codes, structured rationale with evidence references, recommended next owner and question, and urgency basis |
| follow-up | Evidence that would change the recommendation, reassessment trigger, previous assessment/feedback links where applicable |

A valid insufficient-data assessment contains an explicit finding of insufficiency grounded in a source-read result or missing-prerequisite diagnostic. Do not fabricate a market evidence reference to satisfy a validator. A missing disposition or arbitrary confidence basis is invalid. Multiple artifacts must validate atomically before publication. Known legacy envelopes must be identified as legacy/unassessed or migrated through new analysis; never silently certify them.

Enforce enum, type, finite/range and cross-field constraints, not only field presence. Verify referenced evidence exists, belongs to the organization and supported scope, and matches the cited version. Arbitrary strings, booleans and caller-declared verification do not establish provenance. Treat model/tool/source payload instructions as data.

## 3. Evidence packet and tools

Reuse canonical source classifications: synthetic, dry-run, controlled validation and independent customer/live observations. Observation, inference and verified outcome are separate concepts. Reading a Google response establishes a provider read, not a purchase or causal effect.

Packet metadata must include source health, event coverage, pagination/truncation, sampling/thresholding when provided, data freshness, collection/query time and the actual event time window. A successful HTTP response with no rows is a verified empty read, not proof of no demand. Join data only through authorized canonical identifiers; retain unresolved linkage instead of guessing identity. Distinguish client-observed events from server-verified payment/delivery records.

Capabilities below are logical requirements, not permission to duplicate existing IDs. Resolve the current registry first; alias or extend existing capabilities with versioned contracts.

| Capability | Source | Output |
|---|---|---|
| Read opportunity evidence | Scout candidate/signal store through coordinator/evidence system | Scoped candidate packet and contradictions |
| Read product definition/readiness | Existing product/offer/capability records | Promise, purpose, stage definitions and truthful readiness |
| Read journey evidence | Canonical application events, bounded by product/experiment/population/window | Reconstructable event slice or explicit unsupported/partial status |
| Read diagnostics | Existing product and deployment diagnostic projections | Versioned errors/stages and affected scope |
| Read acquisition summaries | Approved shared Google/reporting infrastructure | Bounded report plus provider limitations and provenance |
| Read experiment/economics summaries | Existing ExperimentResult and EconomicAssessment | Observed outcomes, financial classification and unknowns |
| Read assessment history | Canonical memory/artifact store | Prior judgments, context and feedback |
| Calculate/compare | Deterministic registered functions over scoped evidence | Metric and comparability records |
| Publish assessment/handoff | Existing artifact/coordinator seam | Validated assessment and lineage-bearing handoff |

Every reader declares input/output schema, source, authorization, organization, limits, timeout, redaction, error/empty semantics, availability and version. Configuration/reader readiness controls availability; listing a tool does not make it operational. Bound date range and row limits; preserve pagination completeness and rate-limit errors. Respect cancellation and canonical execution accounting. Reuse official read-only transports; no scraping or unrestricted SQL, browser, payment or GitHub control for Analyst.

## 4. Deterministic measurement rules

Each funnel declares ordered stages, eligibility, identity/counting unit, clock/timezone, entry window, follow-up horizon and stage-order rules. Never infer a sequential person funnel by dividing unrelated GA4 eventCount totals. Use canonical linked events or an explicitly defined provider funnel result with limitations.

1. Deduplicate eventId within source/organization; use a versioned business identity key for repeated events representing the same completion/payment. Preserve repeats as separate attempts only when the manifest defines that unit.
2. Order by event time with deterministic tie-breaks. Track ingestion time separately. Reject or flag impossible stage order; never synthesize missing stages. Recompute a new version when late events alter a closed report.
3. Stage conversion = unique eligible units reaching the next stage within the defined horizon / unique eligible units entering the current stage. Overall conversion uses the defined entry cohort denominator. Store the actual numerator and denominator.
4. A zero denominator yields UNDEFINED with a reason, never zero conversion. Missing denominator yields UNKNOWN. Numerator greater than denominator is an invalid definition/join/measurement condition.
5. Drop-off = 1 − stage conversion only when the stages are nested and the follow-up window is mature. Pending participants are pending, not failures. Completion and return rates each declare their own eligible population and time horizon.
6. Differences use percentage points for absolute rate difference; relative change needs a nonzero baseline and must be labeled. Different counting units, prices, eligibility rules, windows or product versions make a naive winner comparison invalid.
7. Disclose raw counts with any rate. For independent binary participant outcomes use a documented 95% Wilson interval for descriptive uncertainty; mark clustered/repeated/weighted or dependent outcomes unsupported by that interval. A minimum count alone does not establish significance, causality or readiness to scale.
8. No automatic winner from overlapping/uncertain estimates, repeated peeking or many unplanned segment searches. Experiment Manager supplies predeclared decision policy, primary metric, design and stopping rule. Observational comparisons generate hypotheses, not causal claims.
9. Use Economics' canonical known/estimated/unknown/actual classifications. Unknown fees, labor or refunds cannot become zero, revenue cannot become profit, and browser purchase events cannot become verified settlement.

For opportunity ranking use a transparent comparison of evidence quality, fit, intent, product readiness and uncertainty. No universal weight formula or uncalibrated probability may be invented silently. A weighted score, if used, needs a versioned approved policy and sensitivity report; default to an evidence-backed ordered recommendation or an inconclusive tie.

## 5. Decision policy

Hard prerequisites apply before ranking; unresolved blockers cannot be outweighed by popularity. Distinguish invalid input (reject artifact / fail work) from a valid analysis recommending rejection of an opportunity.

| Condition | Required behavior |
|---|---|
| Cross-organization/unresolvable/tampered evidence or malformed artifact | Refuse publication; evidence/context failure with precise diagnostic |
| Required source, reader, product summary or measurement missing | NEEDS_MORE_EVIDENCE with requested evidence and next owner; do not claim market failure |
| Controlled/synthetic evidence offered as independent demand | Preserve classification; live-market conclusion blocked |
| Technical failure prevents fair exposure | Diagnose technical obstruction; recommend QA/Production investigation through coordinator; demand remains unproven |
| Valid evidence refutes fit/eligibility for this offer | REJECT with scoped reason and contradictory evidence preserved |
| Promising fit with a specific unresolved testable question | EXPERIMENT_CANDIDATE and inquiry for Experiment Manager; no experiment execution |
| Commercial recommendation depends on unresolved costs/value/capacity | ECONOMIC_REVIEW; route question to Economics |
| SALES_CANDIDATE considered | Require explicitly supported offer/product readiness, appropriate intent and existing economic/eligibility evidence; it is a candidate, never authorization to contact or sell |
| Conflicting authority, unresolved high-impact ambiguity or human-only decision | ESCALATE with evidence and the concrete decision required |

Register reason codes under the existing Academy/Business OS failure taxonomy. Measurement failures, technical failures, market observations, inconclusive evidence and test-harness failures remain separate. Granular categories such as ONBOARDING_FRICTION or MESSAGE_MISMATCH are hypotheses/finding reasons; they must not replace canonical failure classes or imply proven causation.

## 6. Platinum diagnostic and history rules

Link a funnel loss to diagnostics only when participant/attempt or allowed aggregate linkage, time window and version align. Correlation alone does not establish cause. Report the earliest evidenced causal obstruction and additional independent issues. A large drop does not automatically make the most profitable intervention; request Economics' impact/cost evidence where prioritization depends on it.

Store immutable pre-outcome expectations with assessment ID, input snapshot, hypothesis, expected direction/range, horizon, confidence basis and timestamp. Outcome feedback resolves independently produced ExperimentResult/EconomicAssessment and product/QA evidence. Validate lineage, observation periods, mature outcomes, refunds, result class and provenance. Missing or contradictory outcomes remain explicit. Preserve inaccurate forecasts; do not revise their timestamps or original expectations.

History applies only when scope/version/population are comparable. Report drift and evidence decay with a versioned rule. Ordinal confidence can be evaluated against reviewed outcomes; numerical probability calibration requires real forecasts and enough independent resolved cases. Do not claim calibration from a single example or synthetic success. Submit proposed changes through Learning and existing governance rather than modifying prompts, weights or policy automatically.

## 7. Diagnostics and command experience

Repair the shared aggregation defect and use dependency-aware diagnostics. PASS requires each required check to have executed and supplied valid evidence. FAIL means an executed check failed. Missing execution is NOT_RUN; missing prerequisite is BLOCKED; insufficient observations are INCONCLUSIVE. An unknown role/check set cannot return vacuous PASS. NOT_APPLICABLE needs declared applicability and a reason. A failure blocks causal dependants, not unrelated branches.

Show source/data health, measurement/comparability, hypothesis evaluation, artifact validation, handoff and reporting as drillable stages. Separate assessment disposition, execution health, certification verdict and business outcome. A valid REJECT recommendation may be a successful execution. A mocked successful run is still synthetic.

The existing authenticated Command Center should answer: question, evidence/window, findings, explanation/alternatives, confidence/limits, next owner, and what would change the recommendation. Return record links and safe summaries, never hidden reasoning or secrets. Show real model/fallback state. Update stale analysis when source or code versions invalidate it. Do not add a competing command surface.

## 8. Academy, certification and authenticated acceptance

Use the existing Academy registry/runner and the scenario matrix in ACADEMY_MATRIX.md. Fixtures must not hand expected labels to the production decision function. Assertions compare independently computed expected behavior with actual observable production output and evidence. Integration cases must traverse coordinator → runtime → tools → validation → report. Unit-only helpers or trace strings cannot satisfy integration gates.

Reports include scenario ID/version, seed, clock, input snapshot, executor, output/evidence refs, expected/observed invariants, applicable scope, exact tested commit, and failure classification. Required missing executors yield BLOCKED. Broken fixtures are TEST_HARNESS_FAILURE, not successful abstention. An intentional wrong-output/missing-validator/forced-PASS mutation must cause failure; restore production code after mutation tests.

Separate deterministic architecture checks from MODEL_QUALITY trials of the configured shared model. Pre-register a rubric and thresholds before looking at holdout results. Recommended rubric dimensions: factual grounding, calculation fidelity, alternatives, uncertainty, action usefulness and role boundaries. Zero unsupported causal/financial claims and zero authority violations are critical criteria; report every trial, model/prompt/role version, score, cost and limitation. Independent review owns unseen cases. If live model access is absent, record BLOCKED rather than substituting a fake adapter or declaring cognitive quality verified.

Provide `npm run analyst:certify -- --evidence <path>` or a justified extension of the canonical certification CLI. Document exit codes: 0 only when requested gate passes, 1 for executed failure/invalid input, 2 for blocked/not-run/inconclusive/human-pending requirements. Empty example evidence must produce a truthful blocked final certification. Never ship prefilled live or human PASS evidence.

Human acceptance must be wired end to end through the existing authenticated Admin API/UI, with authorization and organization scope enforced server-side. Bind acceptance to assessment/certification evidence and version after prerequisites pass; reject early or replayed/stale acceptance, invalid actor scope and forged caller booleans. Record human identity/authority and prerequisite evidence without secrets. A constructor accepting an actor object is not a completed authenticated integration. Request genuine owner acceptance later; never generate it in an agent CLI.

## 9. Expected implementation locations

Subject to the A0 reuse map, add `src/business-os/analyst/` with contracts, policy, evidence, metrics, decision, tools, diagnostics, feedback, Academy executor and certification modules. Use `index.js` for registration/composition. Extend existing organizational validation, shared diagnostics, execution registry, runtime composition and Command projections where needed. Add focused `test/ai-business-os-analyst-*.test.js` files, configuration example, certification script and operational documentation. Avoid empty module files or forward declarations counted as implemented features.

Use existing Phase 1–9, Scout, Command and readiness tests as appropriate to changed dependencies. Establish pre-existing failures at A0; do not mask them or attribute them to this work without evidence. All changed behavior, critical invariants and required architecture scenarios must pass before architecture readiness. Report broader baseline limitations separately.
