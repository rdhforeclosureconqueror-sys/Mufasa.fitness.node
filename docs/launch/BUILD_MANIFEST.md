# Launch Build Manifest

The canonical artifact is `data/launch/launch-build-manifest.v1.json`. It records the audited source commit/branch, 200+ normalized runtime authorization records, safe configuration booleans, feature flags, navigation destinations, catalog/policy versions, environment requirements, and migration status. Secret values are never serialized.

The audit environment is not production. `AUTH_TOKEN_SECRET`, pilot login configuration, and `OPENAI_API_KEY` were absent when generated. The manifest therefore proves repository composition, not deployment readiness. At deployment, operators must regenerate or compare route/flag/config state and record the deployed immutable commit externally; a file cannot safely embed the hash of the commit that contains itself.

