# Proposed Archive Manifest

No files are deleted by this sprint. The machine-readable register is the canonical item-level manifest; filter records with `Archive Only`, `Superseded`, or `Reject` for the proposed archive/rejection set.

## Policy

* **Archive Only:** retain provenance/history, checksum, and owner context; exclude from runtime and content builds.
* **Superseded:** retain the replacement decision and link to the authoritative schema/module.
* **Reject:** never import, execute, expose, or grant authority. Later deletion requires an owner-approved retention/security process.
* Research CSVs and media remain quarantined rather than “archived as valid” until provenance and technical gates resolve.

Current generated totals are 5 Archive Only, 1 Superseded, and 20 Reject. Archive-only examples are the three research Python scripts plus provenance documents. The invalid pose pseudo-schema is superseded. Alternate routers, deployment files, client/config stubs, empty artifacts, and repository metadata are rejected. Reasons, checksums, risks, and actions are preserved per record in `data/reconciliation/legacy-knowledge-register.v1.json`.

