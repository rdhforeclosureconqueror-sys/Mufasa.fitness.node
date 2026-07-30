# Exercise projection schema

Canonical records require `exerciseId`, `schemaVersion`, `contentVersion`, name/aliases, description, classification, coaching, relationships, Movement compatibility, Coach context, search keywords, and deprecation state. IDs are lowercase immutable slugs. Display names are presentation only.

Member summaries expose ID/version, `name`, purpose, classification, camera flag, quality state, and validated media. Details additionally expose approved coaching, guidance, requirements, safety and a reduced camera capability. Internal scoring, unsafe notes, unpublished drafts, reviewer credentials, and raw landmark implementation are excluded.

Public quality values are honest completeness labels: `canonical`, `classified`, `curated`, `technique-reviewed`, `movement-reviewed`, `launch-approved`, or `deprecated`. Automated classification never implies expert review.
