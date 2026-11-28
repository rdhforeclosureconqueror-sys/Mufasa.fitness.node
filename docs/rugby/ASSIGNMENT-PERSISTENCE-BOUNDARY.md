# Assignment persistence boundary

The canonical program persistence delegates to `src/repositories/userStore.js`. Its synchronous read/update/rename protects against partial file replacement, not concurrent writers across processes. Existing program service also reads before saving. Do not treat this as transactional compare-and-set.

The transaction plan is offline only. Before activation: establish a shared transactional store or enforce a verified single-writer boundary for all assignment writers; validate exact program and trusted review; recheck readiness inside transaction; atomically record intent, prior assignment and new assignment; verify idempotency and rollback against subsequent session updates; test real persistence and dashboard readback. Owner policy remains inactive. No migration or activation authorized by this document.
