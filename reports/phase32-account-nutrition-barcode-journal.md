# Phase 32 — Account-Based Nutrition Journal and Barcode Food Logging Foundation

## Architecture

Phase 32 adds a complete authenticated nutrition-journal foundation without changing the workout-start requirement or broad-refactoring existing workout, challenge, dashboard, auth, or template-builder systems. The flow is split into:

- `public/nutrition.html` and `public/nutrition-runtime.js` for the browser UI.
- `src/services/nutritionService.js` for journal persistence, provider normalization, nutrient calculation, saved meals, recent foods, natural-language draft contracts, and educational summaries.
- `server.js` route registrations for authenticated provider proxy routes and user-owned journal routes.

The journal stores nutrition data inside the existing per-user JSON record managed by `createUserStore`, under `user.nutrition`. No nutrition record stores authentication tokens.

## Routes

### Authenticated provider proxy routes

- `GET /api/nutrition/barcodes/:barcode`
  - Requires auth.
  - Validates barcode format.
  - Queries Open Food Facts through the backend.
  - Normalizes packaged-food data.

- `GET /api/nutrition/foods/search?q=...`
  - Requires auth.
  - Sanitizes and limits search query/count.
  - Queries USDA FoodData Central through the backend.

- `GET /api/nutrition/foods/:fdcId`
  - Requires auth.
  - Validates numeric FDC ID.
  - Fetches normalized USDA detail data.

- `POST /api/nutrition/drafts/natural-language`
  - Requires auth.
  - Creates a reviewable natural-language draft; does not save invented nutrient numbers.

### Authenticated user-owned journal routes

- `GET /api/me/nutrition/entries?date=YYYY-MM-DD`
- `POST /api/me/nutrition/entries`
- `PUT /api/me/nutrition/entries/:entryId`
- `DELETE /api/me/nutrition/entries/:entryId`
- `GET /api/me/nutrition/summary?date=YYYY-MM-DD`
- `GET /api/me/nutrition/recent`
- `POST /api/me/nutrition/meals`
- `GET /api/me/nutrition/meals`
- `POST /api/me/nutrition/meals/:mealId/log`
- `GET /api/me/nutrition/education?date=YYYY-MM-DD`

All journal records are scoped to `req.auth.userId`.

## Schema

Nutrition entries store:

- `entryId`
- `userId`
- `loggedAt`
- `localDate`
- `mealType`
- `foodName`
- `brand`
- `source`
- `sourceId`
- `barcode`
- `amount`
- `unit`
- `servingQuantity`
- `servingUnit`
- `servingsConsumed`
- `calories`
- `proteinGrams`
- `carbohydrateGrams`
- `fatGrams`
- `fiberGrams`
- `sodiumMilligrams`
- `nutrients` normalized basis when available
- `ingredients`
- `allergens`
- `isEstimated`
- `estimateReason`
- `notes`
- `createdAt`
- `updatedAt`

## Provider integrations

### Open Food Facts

The barcode route calls the Open Food Facts product API with selected fields only. A descriptive User-Agent is used. The service normalizes product name, brand, serving data, per-100g nutrients, per-serving nutrients, ingredients, allergens, source metadata, and the product-not-found result.

Open Food Facts data is treated as potentially incomplete. The UI shows: “Product information may be incomplete. Review before saving.”

### USDA FoodData Central

The USDA routes use `USDA_FDC_API_KEY` only on the backend. Search and detail responses are normalized to common names, portions, serving units, calories, protein, carbohydrates, fat, fiber, sodium, and source metadata.

## Scanner compatibility strategy

The nutrition page supports:

- Native `BarcodeDetector` feature detection.
- Common UPC/EAN formats: UPC-A, UPC-E, EAN-8, EAN-13.
- Maintained browser-compatible fallback through `@zxing/browser` loaded dynamically in browsers that do not support native `BarcodeDetector`.
- Manual barcode entry fallback.
- Duplicate rapid-scan prevention with recent barcode/time tracking.
- Stopping camera tracks on scanner close, page hide, and successful scan.

Camera access requires browser media permissions and HTTPS in production.

## Authentication and user scoping

The nutrition page checks `/api/auth/me` with the active bearer token before rendering private journal data. If no valid account session exists, the user sees the auth wall and a login link instead of journal content.

Backend reads/writes use `requireAuth`, and all persistence uses `req.auth.userId`; users cannot read or mutate another user's journal entries.

## Nutrition calculation behavior

The service keeps provider nutrient bases where possible:

- per 100 grams
- per serving

When serving or unit data is incomplete, values are marked estimated with an `estimateReason`. Ounces are deterministically converted to grams. Unknown cups/pieces/other serving conversions use the closest available basis and remain estimated. The language model is not used to invent nutrients.

## Natural-language review flow

The text box creates a draft containing candidate food phrases, quantity hints, USDA search queries, and focused clarification questions such as serving size, oil/butter use, or banana size. Phase 32 requires user review and confirmation before saving. Remaining Phase 33 work can improve parsing accuracy and multi-food USDA matching.

## Tests

Focused tests cover:

- Auth requirement on nutrition routes.
- User scoping.
- Barcode validation.
- Open Food Facts normalization and product-not-found behavior.
- USDA normalization and backend-only API key behavior.
- Entry create/read/update/delete.
- Daily totals.
- Serving recalculation/estimated labels.
- Recent foods.
- Saved meal logging.
- Provider failure shaping without key exposure.
- Frontend scanner feature detection, fallback path, manual entry, review, custom food, natural-language draft, recent meals, edit/delete, daily summary, estimated labels, and mobile layout structure.

Regression coverage remains in the existing workout, push-up challenge, dashboard, builder, and landing tests.

## Known limitations

- Natural-language logging is a reviewable draft contract, not a full nutrient parser.
- Cups and pieces require manual review because generic conversions are food-specific.
- The fallback scanner loads from a CDN; deployments that block CDN access still have manual barcode entry.
- USDA search requires `USDA_FDC_API_KEY`; without it, USDA routes return provider configuration unavailable.
- The cache is in-memory and process-local.

## Privacy risks and mitigations

- Journals are private and scoped by `req.auth.userId`.
- No nutrition data is added to public leaderboards.
- No authentication tokens are stored in nutrition entries.
- Trainer access is not introduced in Phase 32; future trainer visibility should require explicit user controls.

## Rollback notes

To roll back Phase 32:

1. Remove nutrition routes from `server.js`.
2. Remove `src/services/nutritionService.js`.
3. Remove `public/nutrition.html` and `public/nutrition-runtime.js`.
4. Revert landing/dashboard/workout navigation copy.
5. Remove Phase 32 env docs and tests.
6. Existing user files can keep unused `nutrition` fields safely, or the field can be removed by a migration if desired.

## Remaining Phase 33 opportunities

- Stronger natural-language multi-food parsing and confirmation UX.
- Food-specific cup/piece conversion tables.
- Favorite foods UI separate from recent foods.
- Explicit trainer-sharing permissions.
- Nutrition goal-setting flow with validated user-provided targets.
- Offline scanner bundle instead of CDN fallback.
- More provider search ranking and branded-food disambiguation.
