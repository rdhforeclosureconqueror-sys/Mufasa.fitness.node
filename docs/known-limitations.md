# Known limitations

These are current MVP constraints, not defects silently accepted for future releases.

## Persistence and process model

* Persistence is file-based JSON/NDJSON. It has no relational constraints, general transactions, online schema migrations, indexed queries, or uniform atomic writes.
* The runtime assumes one Node process and one local writer. Application rate limits are also per-process. Multiple replicas/workers can lose writes and produce inconsistent limits.
* Whole-user aggregates are synchronously read/written and will become a latency/event-loop bottleneck as records and traffic grow.
* A persistent volume and quiesced, externally retained backups are operational requirements; ephemeral deployments can lose all member state.

## Acceptance and operations

* Full browser acceptance across Chrome, Edge, Firefox, and Safari is still pending and must be recorded before production release.
* Dedicated screen-reader verification is pending; automated or keyboard checks do not replace assistive-technology testing.
* Mobile device/camera/pose behavior varies and needs explicit iOS Safari and Android Chrome acceptance.
* Production deployment and rollback are manual. There is no repository-provided automated deployment, database migration, or zero-downtime multi-replica procedure.
* External provider availability and configuration affect billing, nutrition lookup, TTS, identity bridge, and optional diagnostic summarization.

## Future persistence migration

SQLite may provide a transactional single-node transition; PostgreSQL is the likely multi-process target. Migration requires schema/version design, repository adapters, an idempotent importer, referential/count reconciliation, staged read comparison, backup/restore rehearsal, a quiesced cutover, and rollback compatibility. No migration has been implemented. See [storage](architecture/storage.md).

## Release posture

The MVP can be operated only within these constraints. Any decision to add replicas, use ephemeral storage, skip backup verification, or waive browser/screen-reader acceptance is a documented risk acceptance—not a supported architecture.
