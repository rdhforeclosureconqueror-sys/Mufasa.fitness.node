# Phase 2 Model Gateway and Cognitive Core

**Contract:** `ai-business-os.cognition/1.0.0`  
**Selection policy:** `model-selection/1`  
**Scope:** Phase 2 only

## Canonical boundary

The only supported Business OS provider path is `CognitiveRequest -> constitutional invocation permission -> deterministic model selection -> provider adapter -> bounded invocation -> parse -> schema validation -> invocation/evidence/audit recording -> CognitiveResult`. Provider adapters receive cognition inputs only and expose no authoritative repository mutation interface.

`CognitiveResult.authoritative` is always `false`. A returned `structuredIntentCandidate` is inert proposal data and must enter the Phase 1 Constitutional Kernel before any effect. Model content is recorded as inference evidence, never as observed fact. Model-attributed uncertainty is distinct from system confidence; this phase does not manufacture system confidence.

## Contracts and controls

The versioned contract catalog includes CognitiveRequest, ModelProfile, ModelInvocation, CognitiveResult, ReasoningTraceSummary, PromptTemplate, CognitiveConfigVersion, ProviderError, GatewayResult, and ModelSelectionDecision. Request contracts carry safe references/hashes rather than raw sensitive prompt/context by default. Invocation lineage carries prompt/config fingerprints, provider/model/version, attempts, substitutions, parse/schema outcome, usage, latency, cost metadata, and correlation/causation.

Selection is role-neutral and filters enabled profiles by capability, structured-output support, context/output limits, task tier, budget, latency, and provider health. Stable priority and ID ordering makes selection testable. Fallback traverses the explicit eligible decision and records `substitutionOf`. Only normalized retryable failures are retried, and both retries and timeouts are bounded. Unknown usage and cost remain `null`; estimates require versioned pricing metadata and calculation inputs.

Machine-consumed output must parse and pass its declared schema. Malformed or schema-invalid output is failure. The deterministic adapter is certification-only and tests require no live or paid provider.

## Cognitive primitives and safe reasoning record

The shared core exposes structured extraction, classification, evidence-grounded analysis, recommendation, plan draft, and uncertainty assessment. Every primitive routes through the canonical gateway. The metacognitive states are `SUFFICIENT_EVIDENCE`, `INSUFFICIENT_EVIDENCE`, `CONFLICTING_EVIDENCE`, `OUTSIDE_CAPABILITY`, and `HUMAN_REVIEW_REQUIRED`.

ReasoningTraceSummary stores objective, consulted evidence references, output category, assumptions, limitations, and validation outcome. Hidden chain-of-thought is neither requested nor retained. Reflection is limited to this deterministic expected-schema-versus-validation seam; learning, memory, knowledge, context, agents, tools, economics, and autonomous action remain excluded for Phase 3 or later.

## Diagnostics and gate

The dependency chain is `COGNITIVE_REQUEST -> INVOCATION_AUTHORITY -> MODEL_SELECTION -> PROVIDER_ADAPTER -> PROVIDER_INVOCATION -> RESPONSE_PARSE -> SCHEMA_VALIDATION -> RESULT_RECORDING -> EVIDENCE_AUDIT`. FIRST FAILURE is derived from the earliest failing stage and downstream stages are blocked.

Machine certification covers contracts, selection, permission denial, disabled/unhealthy models, bounded timeout/retry, non-retryable errors, visible fallback, parsing, schema rejection, usage/cost truthfulness, lineage, metacognitive stops, non-authoritative intent candidates, safe telemetry, and diagnostic ordering. Independent human architectural acceptance remains pending and cannot be machine-approved.
