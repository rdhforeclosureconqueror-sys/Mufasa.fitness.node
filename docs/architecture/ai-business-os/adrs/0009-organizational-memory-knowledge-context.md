# ADR 0009 — Organizational Memory, Governed Knowledge, and Bounded Context

**Status:** Accepted for Phase 3 certification  
**Date:** 2026-09-22

## Decision

The AI Business OS separates canonical storage, organizational memory, governed knowledge, derived retrieval indexes, and task context. Durable memory is owned by an organization. Roles may receive permission-aware projections; they may not own hidden durable truth stores.

`MemoryRecord` represents typed experience: bounded/expiring working memory, append-oriented episodes, semantic references, versioned procedures, safe decision summaries, and explicit domain extension records. Durable writes require source, evidence, or provenance. Procedures convey practice, never authority. Decision records reject chain-of-thought fields.

`KnowledgeClaim` is a separate versioned contract. Claims begin as `CANDIDATE`; evidence association, contradiction preservation, a named validation rule, and authority are required before `VALIDATED`. Model output can only remain an unaccepted proposal. Knowledge does not become policy.

The in-memory repository is the canonical certification store. Its reference index is derived, rebuildable, and returns clones. It cannot mutate canonical records. Phase 3 makes no production persistence or vector-database claim.

The Context Engine applies permission filtering before ranking or cognitive handoff, then freshness filtering, explicit deterministic ranking, and a hard item budget. Every included item carries selection reasons and provenance references. Redactions and budget omissions expose IDs and safe reasons, never denied payloads. Context reaches models only by constructing the canonical Phase 2 `CognitiveRequest`.

## Consequences

- Contradictions, corrections, and supersessions remain reconstructable rather than overwriting history.
- Freshness is selected per record/class; there is no global TTL.
- Archive and tombstone states support deliberate forgetting while preserving safe lineage.
- Context is a narrow projection, not a memory dump.
- Phase 4 tools, capabilities, planning, and execution remain excluded.

## Limitations

Certification is deterministic, single-process, and in-memory. It proves contracts and controls, not distributed durability, encryption, production privacy erasure, semantic retrieval quality, or statistical process capability. Independent human architectural acceptance remains required.
