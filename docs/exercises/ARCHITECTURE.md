# Exercise Hub architecture

## Authority

`exerciseCatalog` adapts the existing source catalog to immutable canonical IDs and builds shared lookup maps once. `exerciseService` owns ranking, classification, relationships, substitutions, progressions, Movement Engine capability and AI Coach context. The browser receives member-safe projections; it performs URL navigation and rendering only.

## Member contracts

* `GET /api/me/exercises` accepts `query`, `muscle`, `equipment`, `movementPattern`, `goal`, `difficulty`, `bodyRegion`, `movementPlane`, `mechanic`, `laterality`, `cameraSupport`, `mobility`, `offset`, and `limit` (maximum 100).
* `GET /api/me/exercises/:exerciseId` returns technique, equipment, media, honest review state, and privacy-safe camera capability.
* `GET .../relationships` returns approved canonical relationships and competency labels.
* `GET .../program-context` resolves the authenticated member's program without a client-supplied user ID.
* Preference routes support favorite/unfavorite, bounded recent history, and clear history. They never affect programming.

Search normalization folds casing and punctuation. Ranking is canonical ID (100), exact alias (90), display-name prefix (75), then partial name/alias/keyword/muscle/equipment/pattern (50); ties use canonical ID. Filters combine with AND across dimensions and OR within comma-separated values. Results are bounded and deterministically ordered.

## Integrations and caching

Catalog and media maps are initialized once. Immutable projections may be cached by content version; program context and preferences must never enter a shared cache. Program assignments retain canonical IDs and version references. Camera projection omits raw landmark rules and states that raw video is not stored. Coach entry points must send only canonical ID; the server resolves facts with `explain_only` policy.

## Accessibility, privacy and observability

The Hub uses semantic search, labelled controls, live result counts, focus-visible styling, an Escape-close detail dialog, lazy images, explicit text labels, responsive layouts, and reduced-motion handling. Operators should derive no-result searches, views, favorites, filter use, progression views, substitutions, camera interest, unknown IDs, and version mismatches from bounded events without private notes or limitation detail.
