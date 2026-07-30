# Exercise Intelligence Architecture

## Decision

Exercise Intelligence is the authoritative, read-only knowledge layer. `exerciseCatalog` adapts every legacy record to a canonical ID without creating a second database. Schema and content versions travel with every record. Classification, search, filters, relationships, progressions, substitutions, movement support, AI context, and derived analytics are isolated modules behind `exerciseService`.

## Consumers

The Program Engine stores `exerciseId` and the catalog content version; display names are presentation only. Movement Intelligence reads detector and landmark capabilities. AI Coach receives reference context with an `explain_only` policy and cannot modify programming. Yoga and future running, mobility, corrective exercise, gymnastics, nutrition, trail, analytics, and wearable adapters can add typed knowledge without changing identity.

## Performance and persistence

The immutable catalog and ID map are built once at module load and shared by consumers. Searches and filters are deterministic and derived, not persisted. Only catalog content, relationship content, schema version, and content version are authoritative persistence concerns. Analytics are reduced from events and never duplicate source events.

## Security and accessibility

The service exports no mutation method. Future edits require authenticated administrative authorization, schema validation, version-integrity checks, and audit events. UI consumers must render text safely, use headings and semantic lists for relationship paths, label filter controls, support keyboard operation and reduced motion, and announce result counts.
