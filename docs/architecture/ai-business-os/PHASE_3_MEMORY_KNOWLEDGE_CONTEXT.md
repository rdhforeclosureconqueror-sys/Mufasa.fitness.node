# Phase 3 — Memory, Knowledge, and Context

**Contract:** `ai-business-os.memory-context/1.0.0`  
**Retrieval:** `context-retrieval/1`  
**Scope:** Phase 3 only

## Contract catalog

| Contract/service | Meaning and invariant |
|---|---|
| `MemoryRecord` | Organization-owned typed experience with scope, references, time, freshness, retention, sensitivity, permissions, lifecycle, links, content, and schema version. |
| `WorkingMemory` profile | Task-isolated, byte-bounded, expiring, permission-aware, and not automatically durable knowledge. |
| `EpisodicMemory` profile | Append-oriented account of what happened; corrections are linked records. |
| `SemanticMemory` profile | Memory reference seam; governed truth is represented separately as `KnowledgeClaim`. |
| `ProceduralMemory` profile | Versioned description of current practice. It contains no authority grant. |
| `DecisionMemory` profile | Safe decision, alternatives, evidence, assumptions, and outcome references; forbidden reasoning fields are removed. |
| `DomainMemory` profile | Domain-neutral extension seam without a Phase 3 CRM or domain model. |
| `KnowledgeClaim` | Versioned proposition with support, contradiction, derivation, confidence-method, validity, sensitivity, permission, and status semantics. |
| `MemoryRelation` | `SUPPORTS`, `CONTRADICTS`, `SUPERSEDES`, `DERIVED_FROM`, `CORRECTS`, or safe `DUPLICATE_OF` lineage. |
| `ContextRequest` | Actor, purpose, work/subject/domain scope, authority/policy references, requested classes, freshness, budget, and correlation. |
| `ContextPackage` | Permitted ranked records, claims, contradictions, stale markers, redactions, omissions, ranking metadata, and item-level selection provenance. |

## Write and promotion law

Working memory requires a task, maximum serialized payload size, and expiry. Other durable memory requires a source, Phase 1 `EvidenceRecord`, or `ProvenanceLink` reference and an explicit permission classification. Agent-private durable stores are rejected.

An observation remains memory. A claim must be explicitly proposed as `CANDIDATE`. Promotion requires associated evidence or memory; `VALIDATED` additionally requires a validation rule and authority reference. A Phase 2 `CognitiveResult` is always advisory and its candidate memory/claim is returned as pending governed acceptance, never persisted by the proposal seam.

## Retrieval and context

Canonical map records are filtered by permissions before payloads can enter context. Subject, Work, type, scope, task, tag, freshness, expiry, lifecycle, and knowledge status filters are deterministic. Ranking uses direct subject match, direct Work match, status, freshness, configured priority, then stable ID tie-breaking. The item budget truncates deterministically and emits payload-free omission metadata.

The derived reference index is optional, rebuildable from canonical records, and returns clones. No external vector database or live model is needed. Context handoff produces reference-only Phase 2 `CognitiveRequest.inputRefs` and evidence references; it never invokes a provider directly.

## Certification matrix

| Area | Deterministic attacks |
|---|---|
| Memory types | Episode round-trip; working task isolation/size/expiry; procedure versions without authority; safe decision summary; domain seam. |
| Knowledge | Observation isolation; candidate evidence requirement; no self-validation; contradiction preservation; historical supersession. |
| Forgetting | Class-specific freshness; fresh-only exclusion; archive/history opt-in; payload-free tombstone. |
| Retrieval | Permission denial before exposure; subject/Work/type/tag filters; no identity auto-merge. |
| Context | Explicit ranking; deterministic budget; safe omissions/redactions; contradiction links; item provenance. |
| Index | Rebuild from canonical records; returned index data cannot mutate canonical truth. |
| Cognition | Canonical `CognitiveRequest` handoff; no direct model call; no result self-promotion. |
| Diagnostics | Missing provenance, denied retrieval, stale-only context, invalid context construction, and dependency-derived FIRST FAILURE. |

The required Phase 3 suite contains 20 deterministic tests. Passing this sample is architectural certification evidence only, not a statistical process-capability claim.

## Diagnostic chain and gate

`MEMORY_WRITE -> PROVENANCE_VALIDATION -> PERMISSION_CLASSIFICATION -> INDEX_UPDATE -> RETRIEVAL_REQUEST -> PERMISSION_FILTER -> FRESHNESS_FILTER -> CONTRADICTION_ANALYSIS -> CONTEXT_RANKING -> CONTEXT_BUDGET -> CONTEXT_PACKAGE -> COGNITIVE_HANDOFF`

The earliest failed check is FIRST FAILURE; downstream checks become `BLOCKED`. All machine requirements may produce only `CONDITIONAL_GO` while authenticated-admin human architectural acceptance is pending. Phase 4 is explicitly excluded and is not allowed to start before independent review accepts this gate.
