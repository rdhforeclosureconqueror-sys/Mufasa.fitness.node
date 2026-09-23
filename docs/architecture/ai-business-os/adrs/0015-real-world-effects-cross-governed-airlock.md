# ADR 0015 — Real-world effects cross a governed airlock

**Status:** Accepted for Phase 9A  
**Decision:** No external effect may be inferred from model text or executed directly by a role. A versioned, narrow adapter must receive an immutable request through the real-world Airlock after current authority, policy, approval, scope, monetary limit, kill-switch, payload, expiration, and idempotency checks.

## Context

The Phase 8 World authoritatively simulated consequences. Real providers are instead authoritative for provider state, while customer, payment, and delivery outcomes require separately correlated external evidence. Provider acceptance is not a verified business outcome. Inbound content is untrusted data, not constitutional instruction.

## Consequences

* Observation and action permissions are independent.
* Approval is an auditable scoped record, never a boolean. It can expire, be revoked, and be single-use.
* Phase 9A supports only the canonical dry-run adapter. It records the exact intended request, returns a marked `DRY_RUN` receipt, and performs no side effect.
* Class 3 preauthorization is represented but disabled. Live adapters must be narrow and satisfy the metadata contract; unrestricted browser automation is not canonical.
* Ambiguous execution remains `EXECUTION_UNKNOWN`; it is neither success nor failure and a non-idempotent effect is not retried automatically.
* Raw credentials do not enter requests, evidence, memory, logs, or prompts. The Airlock redacts recognized secret material; future adapters obtain credentials from the approved secret boundary.
* Phase 9B requires authenticated human approval bound to the exact live-test plan/version. Machine readiness cannot provide it.

## Rejected alternatives

Direct role-to-provider calls, approval booleans, model-declared outcomes, treating checkout creation as revenue, and generic browser automation were rejected because they bypass constitutional control or make reality unverifiable.
