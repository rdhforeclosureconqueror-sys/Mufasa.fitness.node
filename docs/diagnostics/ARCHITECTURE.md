# Launch Health architecture

Launch Health uses deterministic static checks and read-only persistence evidence. Exact frontend and backend identifiers are required; same-date variants are a mismatch. The frontend manifest and backend `/__version` are no-store evidence, and the static shell uses a cache-busting token. Commit IDs are optional and safely truncated; private Render deployment IDs are not exposed.

AI Coach and diagnostic summarizer have separate enablement, provider, model, credential-presence, static-readiness, and external-check results. Provider calls occur only through Safe External Checks. Deterministic diagnostics do not depend on either provider.

Disabled Avatar probes are marked `DISABLED_INTENTIONALLY`; Three.js repair advice is not launch evidence. Camera/form states are `not requested` until their page initializes them, rather than failures.
