# Phase 3 Cross-Repository Verification & Engineering Handoff

**Program:** AI Business OS
**Headquarters:** Mufasa.fitness.node
**Phase:** 3 — Memory, Knowledge, and Context
**Prepared after Phase 2 merge:** 2026-09-22

## Purpose
This artifact completes cross-repository reconnaissance and fixes the architecture boundary for Phase 3. Phase 3 gives the Business OS governed organizational memory, evidence-derived knowledge, and permission-aware context assembly. It does **not** create business agents or autonomous learning.

## Existing foundation that Phase 3 must preserve
Phase 1 already established Actor, Work/WorkItem, EvidenceRecord, ProvenanceLink, AuditEvent, authority/policy/state, and FIRST FAILURE. Phase 2 established CognitiveRequest, ModelInvocation, CognitiveResult, model lineage, metacognitive stop states, and a canonical Model Gateway.

Phase 3 extends these foundations. Do not create competing evidence, actor, audit, cognition, or readiness truth stores.

## Verified Garvey predecessor findings

### Adaptive V2 runtime migration architecture
Actual source inspected: `docs/adaptive-v2/runtime-migration-plan.md`.

Verified reusable patterns:
- event-level history rather than only final scores;
- session/attempt/checkpoint/progress-snapshot separation;
- evidence bands rather than permanent identity labels;
- recency window + confidence weight derived from repeated evidence;
- explicit rule that one event/session does not constitute proof;
- time decay for stale evidence;
- minimum evidence threshold before stronger interpretation;
- parent consent/version and retention-policy concepts;
- data minimization and avoidance of raw sensitive free text;
- parent-facing current projection separated from event history.

**Classification:** GENERALIZE SEMANTICS ONLY. Do not import education-specific mastery or child-scoring rules.

### Skill graph / knowledge map
Actual source inspected: `public/gamehub/content/curriculum-source/phase-1b/grade1-math-skill-graph.md`.

Verified reusable pattern: stable nodes plus explicit prerequisite/dependency edges are treated as a knowledge network, not a flat content list.

**Classification:** GENERALIZE GRAPH PATTERN ONLY.

For Business OS, this informs KnowledgeClaim relationships and dependency/context retrieval, but educational skill/mastery fields are not generic knowledge semantics.

### Assessment/evidence surfaces
Repository inspection also confirms persistent assessment sessions, responses/results, recommendations, exposure, assessment version, consent/attribution, and skill-evidence patterns.

**Classification:** EVIDENCE/PROJECTION PRECURSOR.

General lesson: durable event/evidence history should remain distinct from current projections and recommendations.

## Core architecture law

**Storage is not memory.**
**Memory is not knowledge.**
**Knowledge is not context.**

Storage persists bytes/records.
Memory preserves retrievable organizational experience.
Knowledge is a governed claim/generalization supported by evidence.
Context is the permission-aware slice selected for a specific cognitive task.

A vector database or embedding index is a retrieval aid, not the source of truth.

## Organizational ownership law

Durable memory belongs to the organization, not to an individual future agent.

Agents may later have bounded temporary working memory, but no role may create a private hidden durable truth store that other governed components cannot inspect/audit.

## Required memory classes

Phase 3 should implement contracts/services for these categories without overbuilding future agent behavior:

### WorkingMemory
Temporary task-scoped material. Bounded by work/request/session, permission, size/time policy, and expiry. It is not durable organizational truth by default.

### EpisodicMemory
What happened in a specific episode:
- actors;
- work/request;
- time;
- context refs;
- actions/observations;
- outcome;
- evidence/audit refs;
- correlation/causation.
Episode history is immutable/append-oriented; corrections are linked rather than destructive rewrites.

### Semantic / Knowledge memory
Governed KnowledgeClaims derived from evidence. Claims need scope, provenance, support/contradiction links, status, freshness/validity, version, and confidence only where a defined method supports it.

### ProceduralMemory
Versioned procedures/SOPs/playbooks describing how approved work is performed. Procedures are not authority. A procedure cannot bypass Phase 1 policy/authority/state or Phase 4 tool governance.

### DecisionMemory
Records what was decided, alternatives/high-level rationale, evidence consulted, assumptions, actor/authority/policy refs, expected outcome, and later actual outcome link. Never store hidden chain-of-thought.

### Domain / Relationship memory
Phase 3 must provide extension seams for future Customer/Relationship, Experiment, Economics, Capability, Fitness, Real Estate, Education, etc. Do not implement those CRMs/domains now.

## MemoryRecord contract
Create a versioned domain-neutral MemoryRecord or equivalent with semantics such as:
- ID;
- memory type;
- organizational owner/scope;
- subject/entity/work refs;
- source/evidence/provenance refs;
- created/observed time;
- validity interval where meaningful;
- freshness/expiry policy;
- retention classification;
- sensitivity/permission tags;
- status: active/stale/superseded/disputed/expired/archived/deleted-marker as appropriate;
- content payload or safe reference/hash;
- contradiction/supersession links;
- version/schema version.

Do not force confidence onto raw observations. Confidence belongs only where semantics/method justify it.

## KnowledgeClaim contract
Knowledge is not a renamed MemoryRecord.

A KnowledgeClaim should preserve:
- claim ID and stable subject/scope;
- proposition/structured claim;
- claim type;
- supporting EvidenceRecord/Memory refs;
- contradicting refs;
- derivation/provenance;
- confidence method/version if used;
- confidence value if justified;
- status such as CANDIDATE/SUPPORTED/VALIDATED/DISPUTED/STALE/SUPERSEDED;
- valid-from/valid-to/freshness;
- created/updated/version metadata;
- policy/domain scope;
- permissions/sensitivity.

A model statement alone cannot create VALIDATED knowledge.

## Knowledge promotion pipeline
Implement a governed promotion seam:

Observation/Episode
-> Candidate Claim
-> Evidence Association
-> Contradiction Check
-> Validation Rule
-> Knowledge Status

Reflection/model reasoning may propose a candidate claim. It cannot silently promote its own inference to operational truth.

Operational policy adoption remains a separate future/governed action.

## Contradiction and supersession
Never silently overwrite contradictory evidence/claims.

Support explicit relationships:
- SUPPORTS;
- CONTRADICTS;
- SUPERSEDES;
- DERIVED_FROM;
- CORRECTS;
- DUPLICATE_OF where safe.

Resolve meaning through time/scope/source/version, not deletion of inconvenient history.

Example: “website broken on Monday” and “website working Tuesday” can both be true in different validity windows.

## Freshness, expiry, and forgetting
Forgetting is a feature.

Implement configurable retention/freshness semantics:
- stable facts may have long/indefinite validity;
- volatile observations expire quickly;
- preferences can change;
- stale knowledge remains historical but should not automatically enter active context;
- deletion/retention policy must be representable;
- sensitive/raw content can be minimized or removed while preserving safe audit tombstone/lineage where required.

Do not hard-code one TTL for all memory.

## Retrieval architecture
Build a Memory/Knowledge retrieval interface capable of deterministic filtering by:
- actor/permission;
- subject/entity;
- Work;
- memory type;
- time/freshness;
- domain/scope;
- evidence/knowledge status;
- relationship/provenance;
- tags;
- semantic similarity via an optional derived index interface.

Phase 3 certification must work without an external vector database.

If embeddings/indexes are implemented, they are derived/rebuildable indexes. Canonical records remain authoritative.

## Context Engine
Create the canonical Context Engine.

Input should be equivalent to a ContextRequest containing:
- requesting Actor;
- cognitive purpose/task;
- Work/request/subject refs;
- domain/scope;
- authority/policy context;
- token/size budget;
- freshness requirements;
- requested memory/knowledge classes;
- correlation/causation.

Output should be a ContextPackage containing:
- identity/mission/request metadata;
- relevant Work/state refs;
- selected evidence;
- selected episodic memories;
- selected knowledge claims;
- relevant procedures/decision history where permitted;
- policy/authority refs;
- omissions/redactions;
- contradictions;
- stale/uncertain flags;
- provenance explaining why each item was included;
- retrieval/config version;
- deterministic ordering/ranking metadata.

Context must retrieve narrowly. Never dump all memory into the model.

## Permission-aware retrieval
Every retrieval path must enforce visibility/sensitivity rules before context assembly.

Test that an actor cannot retrieve a memory simply because semantic similarity ranks it highly.

Permission filtering happens before or as part of retrieval—not after sensitive text has already been handed to the model.

## Context ranking
Implement deterministic baseline ranking using explicit factors such as:
- direct subject/work match;
- evidence/knowledge status;
- freshness;
- relationship/provenance distance;
- task relevance;
- configured priority.

Semantic similarity may be an optional factor later. Do not make opaque embedding score the sole ranking rule.

Context truncation must be deterministic and report omitted items/reason when a budget is hit.

## Memory write discipline
Not every model thought becomes durable memory.

Create explicit write/promotion rules:
- raw transient reasoning stays transient;
- accepted episode/result may create episodic memory;
- durable organizational facts require evidence/provenance;
- candidate lessons/claims remain candidates until validated;
- procedure changes require governed versioning;
- decision records preserve decision metadata, not chain-of-thought.

## Phase 2 integration
The Context Engine should be able to produce safe context references/packages for CognitiveRequest.

Do not change the rule that provider/model output is non-authoritative.

CognitiveResult may propose:
- a candidate memory;
- candidate KnowledgeClaim;
- candidate StructuredIntent.

None become authoritative merely because the model emitted them.

## Diagnostics / FIRST FAILURE
Extend canonical Mufasa diagnostics/readiness only.

Suggested Phase 3 chain:
MEMORY_WRITE
-> PROVENANCE_VALIDATION
-> PERMISSION_CLASSIFICATION
-> INDEX_UPDATE
-> RETRIEVAL_REQUEST
-> PERMISSION_FILTER
-> FRESHNESS_FILTER
-> CONTRADICTION_ANALYSIS
-> CONTEXT_RANKING
-> CONTEXT_BUDGET
-> CONTEXT_PACKAGE
-> COGNITIVE_HANDOFF

Use PASS/FAIL/BLOCKED/NOT_RUN/PENDING/NOT_APPLICABLE. FIRST FAILURE is dependency-derived.

## Phase 3 certification matrix
Use deterministic fixtures. Prove at least:
- episodic memory round-trip;
- working memory expires/is task-scoped;
- procedural memory is versioned but grants no authority;
- decision memory stores safe summary, not chain-of-thought;
- observation does not become knowledge automatically;
- candidate claim promotion requires evidence/validation path;
- contradictory evidence is preserved;
- superseded claim remains historically reconstructable;
- stale memory excluded when fresh context required;
- volatile vs stable freshness policies differ;
- retention/archive/delete-marker behavior is explicit;
- unauthorized memory retrieval returns no sensitive payload;
- permission filter precedes cognitive handoff;
- subject/work retrieval works;
- deterministic ranking works;
- deterministic budget truncation works;
- omitted/redacted items are reported safely;
- optional index can be rebuilt from canonical records;
- vector/semantic index cannot overwrite canonical memory;
- duplicate identity/reference does not silently merge;
- ContextPackage preserves provenance for included items;
- Context Engine can feed Phase 2 CognitiveRequest safely;
- CognitiveResult cannot self-promote memory/knowledge;
- FIRST FAILURE truthful for missing provenance, denied retrieval, stale-only result, contradiction handling, and context failure.

## CTQs
Acceptance targets:
- unauthorized sensitive memory exposed = 0;
- model self-promoted validated knowledge = 0;
- destructive contradiction overwrite = 0;
- stale item silently treated as current when freshness required = 0;
- hidden durable agent-private truth stores = 0;
- canonical truth sourced solely from vector index = 0;
- context items without provenance/selection reason = 0;
- chain-of-thought persisted = 0;
- FIRST FAILURE misclassification = 0;
- required Phase 3 tests = 100% PASS;
- readiness validation = PASS.

## Explicit exclusions
Do not build:
- business agents;
- Agent Runtime;
- full Tool/Capability Registry;
- autonomous learning;
- Reflection engine;
- Experiment/Economics engines;
- CRM;
- identity fuzzy auto-merge;
- production vector database requirement;
- domain migrations;
- self-modifying prompts/policies/procedures;
- Brain Academy beyond Phase 3 deterministic certification.

## Phase 3 gate
GO only when organizational memory types are explicit; evidence and knowledge remain distinct; contradictions/supersession are reconstructable; retention/freshness exists; permission-aware retrieval is proven; Context Engine returns bounded/provenanced packages; optional indexes are derived only; Phase 2 integration preserves non-authoritative cognition; diagnostics/FIRST FAILURE are truthful; readiness validates; human acceptance remains separate; Phase 4+ was not smuggled in.

Otherwise CONDITIONAL GO or NO-GO with exact FIRST FAILURE.

## Codex instruction
Implement Phase 3 only on a dedicated branch and Draft PR. Read root `AGENTS.md`, `MASTER_HANDOFF.md`, Phase 0/1/2 architecture and ADRs, and this handoff. Start with contract/spec + certification matrix. Build the smallest domain-neutral Memory/Knowledge/Context implementation that proves the architecture with deterministic in-memory fixtures. Do not require a production vector DB or live model calls. Extend canonical readiness. Run focused Phase 1+2+3 tests, lint/relevant checks, and `npm run readiness:validate`. Do not merge. Return the Draft PR for independent review.
