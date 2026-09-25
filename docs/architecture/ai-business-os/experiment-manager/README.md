# Experiment Manager architecture

The Experiment Manager is the existing `EXPERIMENT_MANAGER` organizational role, running through the canonical coordinator. It turns evidence-backed Analyst input into versioned experiment proposals, requires human approval and a bounded budget before any run, records measurements without converting missing values to zero, and emits canonical results for the existing Economics and Learning roles.

This implementation is deliberately internal-only. Live launch, prospect contact, publication, spending, Test A, and autonomous scaling are unavailable. Academy runs provide architecture evidence only and cannot certify live behavior or human acceptance.

## Phases

* **E0:** extend the shared role registry; never create a second agent runtime.
* **E1:** add immutable, versioned proposal and lifecycle contracts.
* **E2:** enforce human, scope, version, and budget approval.
* **E3:** record attributable measurements with explicit missing/present state.
* **E4:** classify results without inferring success from execution.
* **E5:** make run creation idempotent and result publication singular.
* **E6:** prove canonical coordinator authority and attribution.
* **E7:** fail closed on false success and reserved live actions.
* **E8:** expose truthful readiness; architecture readiness is not live certification.

See [the implementation contract](IMPLEMENTATION_CONTRACT.md) and [Codex handoff](CODEX_HANDOFF.md).
