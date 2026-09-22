# ADR-0006: Human authority and non-self-promotion

- **Status:** Accepted for Phase 0 gate
- **Date:** 2026-09-22

## Context

An AI or machine can generate technical evidence but must not use its own claims to acquire authority or satisfy criteria reserved for accountable human judgment.

## Decision

Machine-verifiable evidence and human-authority acceptance remain distinct. Machines may attach evidence and request review. They may not assert human/device/visual/UX acceptance, approve their own authority or policy changes, expand financial power, promote models/capabilities when human review is required, or use self-authored evidence to raise autonomy. Human acceptance is recorded only through authenticated authorized Admin UI/API paths.

## Consequences

Human-required gates can remain pending after all automated checks pass. Phase 1 includes privilege-escalation and evidence-forgery negative tests. The Phase 0 architectural acceptance remains human-required and is not self-approved.
