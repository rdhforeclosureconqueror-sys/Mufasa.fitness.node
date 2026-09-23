# Phase 4 — Tool/Capability Intelligence and Planning/Execution

**Contract:** `ai-business-os.execution/1.0.0`  
**Scope:** Phase 4 only  
**Machine gate:** `CONDITIONAL_GO` when deterministic certification and readiness validation pass; independent human architectural acceptance remains required.

## Critical-to-quality requirements

Phase 4 is acceptable only when no unregistered or unauthorized tool executes, organization-owned registry data cannot cross tenant boundaries, failed or ambiguous activity cannot become verified success, every attempt and substitution is attributable, and dependency-aware diagnostics report the earliest check that actually failed. These are deterministic certification claims, not statistical process-capability claims.

## Canonical sequence

The common controller preserves distinct records for:

`Goal -> ContextPackage -> explicit Plan -> capability resolution -> tool resolution -> plan validation -> constitutional authorization -> ToolInvocation -> ToolResult -> Observation -> VerificationResult -> EvidenceRecord -> state/next-action decision`.

A plan is advisory data, not authority. Before every attempt—including a substituted tool—the controller calls the Phase 1 constitutional kernel with a structured intent, grant, policy, organization resource scope, human approval where required, and kill-switch evaluation. Planning consumes the Phase 3 Context Engine when configured. A future cognitive planner must enter through the Phase 2 Cognitive Core; its candidate plan receives no privileged treatment and is deterministically validated against the registries.

## Tool and capability registries

A **Tool** is a versioned executable mechanism: contract schemas, cost, risk, timeout/retry/idempotency, authority and policy requirements, side-effect and reversibility properties, credentials, verification, reliability, supported capabilities, autonomy, availability, limitations, and kill-switch applicability.

A **Capability** is an organization-owned claim about what can reliably be accomplished: inputs and deliverables, required/optional registered tools, procedure and QA references, validation and reliability evidence, limitations, risk/cost/duration/capacity, autonomy and human steps, governance references, lifecycle, and evidence.

Capability existence is registry-backed. Model feasibility opinions cannot create it. Organization equality is checked before permission tags, so matching labels cannot disclose another organization's records.

## Execution truth and recovery

`ToolResult`, `Observation`, and `VerificationResult` are separate contracts. A returned payload records only that a response was observed. Completion requires `VERIFIED_SUCCESS` from the configured verifier. `VERIFIED_FAILURE`, `UNVERIFIED`, `AMBIGUOUS`, and `PARTIAL` never complete a step.

Retries are bounded by explicit policy and retryability. Substitution is limited to an available registered tool supporting the same capability with compatible contracts, permitted cost/risk/autonomy, followed by a fresh constitutional check. The replan ledger records the source tool, replacement, and reason. Exhaustion selects an explicit `REPLAN`, `ESCALATE`, or `STOP`; continuing indefinitely is not a default.

Invocation, failure/response observation, and verification generate Phase 1 evidence with provenance and audit lineage. When Phase 3 memory is configured, execution writes an episodic record containing evidence references and the exact tool and verification classifications. It does not create or validate a knowledge claim.

## Diagnostics and certification

The diagnostic chain is:

`GOAL -> CONTEXT -> PLAN_GENERATION -> PLAN_VALIDATION -> CAPABILITY_RESOLUTION -> TOOL_RESOLUTION -> INPUT_VALIDATION -> AUTHORITY -> POLICY -> KILL_SWITCH -> COST_RISK -> EXECUTION -> TOOL_RESULT -> OBSERVATION -> VERIFICATION -> EVIDENCE_RECORDING -> STATE_UPDATE -> NEXT_STEP_DECISION`.

Only the first executed failing check is `FAIL`; dependent checks are `BLOCKED`, and unattempted independent checks remain `NOT_RUN`. FIRST FAILURE is a causal starting point, not a root-cause assertion.

The certification suite injects success, retryable/permanent failure, timeout, malformed output, cost/risk/human boundaries, failed/ambiguous/partial verification, dependency failure, idempotent replay, governed substitution, unauthorized substitution, adversarial model proposals, and cross-organization access.

## Limitations and Phase 5 boundary

This increment is in-memory, single-process certification infrastructure using synthetic adapters. It does not prove distributed locking, durable queues, production credentials, external delivery, real-world business outcomes, or statistical reliability. Browser, production, commercial, and physical-device QA do not apply. Human architectural acceptance remains authenticated-admin-owned.

Phase 5 may assemble the complete shared Agent Runtime from the certified Phase 1–4 seams. Phase 4 does **not** implement roles, a Production Engine, commercial tools, the Economics Engine, autonomous learning, or a business workflow.
