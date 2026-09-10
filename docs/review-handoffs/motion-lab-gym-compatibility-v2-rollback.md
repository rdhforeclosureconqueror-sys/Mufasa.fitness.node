# Rollback

Because this slice is additive and does not edit the canonical Motion Lab bootstrap, rollback is feature-local: remove the entry/integration modules (and activation line once added). No runtime lifecycle reconstruction is required. This is intentionally safer than #776's bootstrap replacement approach.
