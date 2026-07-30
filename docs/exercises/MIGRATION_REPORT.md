# Exercise migration and compatibility report

## Inventory

The canonical adapter covers the 873+ legacy records once at process initialization. Existing image index records are resolved by normalized canonical ID; no second exercise store or duplicate media record was introduced. Programs store `exerciseId` and exercise content version. Movement metadata and Coach context resolve on the server.

Legacy display-name and punctuation references continue through normalized ID and alias resolution. Deprecated identities remain resolvable internally and member endpoints suppress deprecated content. Unknown IDs produce a safe 404 and must be monitored rather than guessed. Historical program and workout events are not rewritten.

## Known compatibility boundary

Older workout shells may still carry a presentation `name` beside the canonical ID. It is non-authoritative and should be removed only in a separately reviewed migration. Some legacy records have sparse technique or no media; the Hub shows an honest fallback and does not infer instructions.
