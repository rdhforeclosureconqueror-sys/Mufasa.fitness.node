# Phase 2 Cross-Repository Verification & Engineering Handoff

**Program:** AI Business OS
**Headquarters:** Mufasa.fitness.node
**Phase:** 2 — Model Gateway + Cognitive Core
**Prepared after Phase 1 merge:** 2026-09-22

## Purpose
Cross-repository reconnaissance and architecture boundary for Phase 2. Phase 2 introduces intelligence behind the Phase 1 Constitution. It does not create autonomous business agents.

## Verified predecessor findings

### Mufasa headquarters
Repository search found no existing general-purpose model gateway/provider abstraction suitable for direct reuse. Create the canonical Business OS gateway under the domain-neutral Business OS boundary. Phase 1 remains authoritative for action:
Actor -> StructuredIntent -> Authority -> Policy -> State -> Controlled Execution -> Observation -> Evidence -> Audit -> Event/Outbox -> Diagnostics.
Phase 2 must not bypass or replace it.

### Universal Pilot — AIModelAdapter
Actual source inspected: `ai/diamond_ai_model_adapter.py`.
Verified: provider/model/version metadata; OpenAI/local provider dispatch; system + user messages; deterministic local stub; unsupported-provider failure.
Classification: **REIMPLEMENT FROM PROVEN PATTERN**.
Do not directly reuse because it lacks a generic request/response contract, structured-output validation, bounded retry/timeout, usage/cost accounting, capability metadata, governed selection, prompt/config versioning, provider health/substitution semantics, and evidence classification. Preserve the provider-adapter idea.

### Universal Pilot — governed AI dry run
Actual source inspected: `api/routes/ai.py`.
Verified: PolicyAuthorizer before call; Case existence/consent; policy AI-disable; adapter routing; SHA-256 prompt hash; provider/model/version/policy/confidence activity logging; audit; advisory dry-run output rather than direct DB mutation.
Classification: **GENERALIZE + REUSE SEMANTICS**.
Preserve governance before invocation, fingerprints, model lineage, advisory semantics, and invocation audit/evidence. Do not inherit Case/Real Estate assumptions.

### Universal Pilot — AIActivityLog
Actual source inspected: `app/models/ai_activity_logs.py`.
Verified metadata: policy version, AI role, provider/name/version, prompt hash, policy rule, confidence, human override, incident/admin-review, timestamp.
Classification: **GENERALIZE + REUSE SEMANTICS**.
Business OS ModelInvocation should additionally capture request/config fingerprint, attempt, latency, usage when available, versioned cost estimate when configured, result/schema status, finish reason, normalized error, correlation/causation, and constitutional/evidence refs. Never log secrets or raw sensitive prompts by default.

### Universal Pilot — advisory doctrine
Actual source inspected: `ai/council_prompt.py` and `ai/operations_brain.py`.
Verified principle: AI is advisory and does not bypass service controls, audit, idempotency, or verification.
Classification: **PRINCIPLE ONLY**.
Do not copy domain doctrine. Reusable law: reasoning may propose/analyze/classify or produce a StructuredIntent candidate; it cannot authorize or execute itself.

## Phase 2 architecture decision
Create one canonical **Model Gateway** as the only supported Business OS path to model providers. Do not scatter direct provider SDK calls through future roles.

Boundary:
Cognitive Request -> constitutional invocation permission / kill-switch -> model-selection policy -> provider adapter -> bounded invocation -> normalized raw response -> structured-output/schema validation -> invocation evidence/audit -> Cognitive Result.

A Cognitive Result is non-authoritative. Any proposed action becomes a StructuredIntent candidate and must enter Phase 1 before side effects.

## Required contracts
Implement/version equivalents of:

**CognitiveRequest** — ID, actor/requester, purpose/task type, prompt/config version refs, safe input/context refs or hashes, required output schema, model requirements, budget/latency constraints where applicable, correlation/causation, constitutional scope/authority ref.

**ModelProfile** — provider/model/version/revision, capabilities, structured-output support, configured context/output limits, pricing metadata source/version, enabled state, risk/tier metadata. Do not hard-code roles to one provider/model.

**ModelInvocation** — invocation ID, request ref, provider/model/version, prompt/config fingerprints, attempt, start/end/latency, status, usage/tokens if available, cost estimate + pricing version/source if configured, schema-validation result, finish reason, normalized error, correlation/causation, evidence/audit refs.

**CognitiveResult** — result ID, request/invocation refs, result type, structured content, attributed model uncertainty only, system confidence only if a validated method supplies it, evidence refs, limitations, created time, explicit non-authoritative marker.

**ReasoningTraceSummary** — never hidden chain-of-thought. Store safe decision metadata only: objective, evidence consulted, output category, assumptions, uncertainty/limitations, high-level alternatives where useful, validation/escalation result.

**PromptTemplate / CognitiveConfigVersion** — stable identity, semantic version, purpose, template/config hash, output schema version, lifecycle/change lineage. Business policy must not live only in prompts.

**ProviderError / GatewayResult** — normalize TIMEOUT, RATE_LIMIT, AUTHENTICATION, PROVIDER_UNAVAILABLE, INVALID_REQUEST, CONTEXT_LIMIT, CONTENT_OR_SAFETY_REFUSAL where relevant, SCHEMA_INVALID, MALFORMED_RESPONSE, BUDGET_EXCEEDED, KILL_SWITCH_ACTIVE, MODEL_DISABLED, UNKNOWN_PROVIDER_ERROR.

## Model selection
Provide a deterministic/testable selection-policy interface considering configured required capabilities, enabled models, task tier, budget/latency ceiling, context/output requirements, structured-output requirement, and health/failure state. Do not build Economics intelligence.

## Provider adapters
Implement a deterministic fake/stub adapter for certification and a provider interface for future real adapters. A live adapter is optional only if safe config already exists; tests must never require paid/live calls. Provider SDK objects must not leak across gateway boundary.

## Structured output
For machine-consumed tasks, schema-bound output is required. Distinguish provider response, parse success, schema success, and accepted CognitiveResult. Schema-invalid output is not success. Any repair/retry is bounded and recorded as a separate attempt.

## Retry, timeout, fallback
Retry only classified retryable errors. Bound attempts and timeout. Never indefinitely retry policy/authority/kill-switch/budget/schema errors. Fallback/substitution must be explicit/versioned and visible in invocation lineage. Failure must never become fabricated response.

## Usage/cost
Capture provider-reported usage when available. Estimated cost must record pricing source/version/config, currency, estimated flag, and calculation inputs. Unknown usage/cost stays unknown. This is telemetry, not the Economics Engine.

## Cognitive core minimum primitives
Create reusable governed operations for structured extraction/classification, evidence-grounded analysis, recommendation/proposal, plan draft, and uncertainty/insufficient-evidence response. All route through the gateway and return CognitiveResult. None may mutate Work, money, customer, policy, authority, or external systems.

## Metacognition foundation
Support explicit states equivalent to SUFFICIENT_EVIDENCE, INSUFFICIENT_EVIDENCE, CONFLICTING_EVIDENCE, OUTSIDE_CAPABILITY, HUMAN_REVIEW_REQUIRED. This is a structured stop/escalation contract, not self-aware autonomy. The model cannot expand its own authority.

## Reflection foundation
Define the seam for later reflection and deterministic comparison of expected structured output vs validation outcome. Do not build later learning/reflection organism behavior.

## Constitutional integration
The Model Gateway is a governed capability. Invocation respects AI/model kill switches and the Phase 1 authority/policy seam. Provider adapters never receive direct authoritative repository mutation access. Proposed action returns a StructuredIntent candidate; execution still uses Phase 1.

## Evidence/provenance
Accepted results must be attributable:
CognitiveRequest -> Prompt/Config Version -> Model Selection -> ModelInvocation(s) -> Provider Response/Validation -> CognitiveResult.
Preserve source EvidenceRecord refs. Model output is not OBSERVED_FACT merely because the model said it; classify as inference/hypothesis/decision candidate according to semantics.

## Privacy/security
Secrets only from approved server-side config. Never expose API keys in browser assets, audit, diagnostics, hashes, or errors. Default logs use safe hashes/refs, not sensitive raw prompt/context. Response retention is explicit/configurable. Prompt content is untrusted input, not policy; model output is untrusted until validated.

## Diagnostics / FIRST FAILURE
Extend canonical Mufasa readiness only. Phase 2 diagnostic chain:
COGNITIVE_REQUEST -> INVOCATION_AUTHORITY -> MODEL_SELECTION -> PROVIDER_ADAPTER -> PROVIDER_INVOCATION -> RESPONSE_PARSE -> SCHEMA_VALIDATION -> RESULT_RECORDING -> EVIDENCE_AUDIT.
Upstream failure blocks dependents.

## Certification matrix
Use deterministic fake adapters to prove normal structured success; unsupported provider; disabled model; model kill switch; missing invocation authority; policy deny; timeout; retryable failure then success; non-retryable failure; retry exhaustion; explicit fallback with lineage; malformed response; schema-invalid response; bounded schema repair if configured; usage capture; versioned cost estimate; unknown usage remains unknown; provider/model/version lineage; stable prompt/config hashes; no secrets in diagnostics/audit; result cannot mutate authoritative state; StructuredIntent candidate still requires Phase 1; insufficient/conflicting evidence stop/escalation; truthful FIRST FAILURE.

## Phase 2 CTQs
- direct provider calls outside canonical gateway in new Business OS code = 0;
- direct authoritative mutation from CognitiveResult = 0;
- unauthorized model invocations = 0;
- hidden provider substitutions = 0;
- fabricated success after provider failure = 0;
- schema-invalid accepted results = 0;
- secrets exposed in diagnostic/audit fixtures = 0;
- FIRST FAILURE misclassification = 0;
- required Phase 2 tests = 100% PASS;
- canonical readiness validation = PASS.

These are acceptance targets, not statistical process-capability claims.

## Exclusions
Do not build Memory Engine, Knowledge Engine, full Context Engine, Tool/Capability Registry, shared Agent Runtime, Scout/Analyst/Sales/Production/QA/Learning/Manager roles, Experiment/Economics engines, autonomous web research, autonomous business action, Customer CRM, domain migrations, full Brain Academy, or hidden chain-of-thought storage.

## Phase 2 gate
GO only when one canonical gateway exists; contracts/versioning documented; fake adapter certifies behavior; errors normalized; bounded retry/timeout/fallback proven; structured output validation proven; usage/cost telemetry truthful; lineage reconstructable; Constitution preserved; CognitiveResult cannot execute directly; diagnostics truthful; readiness validation passes; human architectural acceptance remains separate; Phase 3+ was not smuggled in.

Otherwise CONDITIONAL GO or NO-GO with exact FIRST FAILURE.

## Codex instruction
Implement Phase 2 only on a dedicated branch and PR. Read repository-root `AGENTS.md`, `MASTER_HANDOFF.md`, Phase 0 artifacts/ADRs, `PHASE_1_CONSTITUTIONAL_KERNEL.md`, ADR-0007, and this handoff. Start with contract/spec + certification matrix, then implement the smallest canonical gateway/cognitive primitives satisfying this handoff. Extend canonical readiness. Run focused tests, lint/relevant repository checks, and `npm run readiness:validate`. Do not merge. Return PR for independent review.
