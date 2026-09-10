# Replacement PR scope lock

This branch is based on current main after #779. It supersedes the unsafe #776 bootstrap rewrite.

Changed implementation surface is intentionally additive: isolated integration module + idempotent entry module. Tests protect dependency order, FIRST FAILURE, current Thriller catalog preservation, and lifecycle ownership. No existing Motion Lab runtime/bootstrap source is rewritten in this PR.

Review gate: this PR is safe as an architecture/reorganization slice, but live-page activation remains a separately visible one-line `motion-lab/index.html` change. Do not describe the panel as live until that activation line is merged.
