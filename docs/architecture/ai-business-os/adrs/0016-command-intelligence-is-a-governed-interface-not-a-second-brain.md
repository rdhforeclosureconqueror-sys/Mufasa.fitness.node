# ADR 0016 — Command Intelligence Is a Governed Interface, Not a Second Brain

**Status:** Accepted  
**Date:** 2026-09-23

## Decision

Command Intelligence is a versioned presentation and retrieval interface over the existing AI Business OS. It may assemble permission-scoped context, invoke registered read capabilities, and ask the Phase 2 Model Gateway for a grounded explanation. It is not an independent agent runtime, authority store, memory system, or provider integration.

The browser never calls a model provider. Server-side credentials, provider selection, retry, validation, telemetry, and evidence attribution remain responsibilities of the canonical Model Gateway. A deterministic, visibly limited summary is used when no gateway is configured; it does not simulate model output.

Recommendations and prepared action cards are non-authoritative. Consequential operations remain behind authenticated Constitution/Airlock routes and require explicit human interaction. “Do it” only prepares an authorization request. It cannot press an approval control, alter a kill switch, authorize Test A, or promote a statement into knowledge.

## Consequences

* Every answer lists the governed tools that grounded it and carries request telemetry without hidden chain-of-thought.
* Screen context is a bounded reference, not permission escalation.
* Durable learning continues through the Phase 3 promotion rules; conversation state remains session/UI scoped.
* Unknown or unavailable source state remains `UNKNOWN`; the interface does not fill gaps with plausible claims.
* Test A remains unexecuted and its existing authorization workflow remains authoritative.
