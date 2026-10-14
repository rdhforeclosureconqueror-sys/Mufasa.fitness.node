# Community rotating backgrounds — rollback and operations

## Scope
Only the eight explicitly opted-in Community Wellness pages load the shared assets. The ordinary PocketPT private-sessions page is excluded unless `?source=community` is present. The booking, authentication, trial, request storage and email APIs are unchanged.

## Image library
The manifest is `public/community-backgrounds.manifest.js`. Initial images reuse existing repository assets (waterfall, run club, yoga, poolside, fitness, and three greatness photographs) without duplicating them. To grow the library, upload optimized licensed JPEG/WebP images to `public/images/community-backgrounds/`, then add their paths to the manifest in a PR. A directory alone does not auto-enroll files. Prefer 1600–2000 px width, <350 KiB, and avoid text embedded in imagery.

## Failure protection
An image must load successfully before the background layer is activated. Missing images leave the page's original solid background. Images are same-origin and path-validated. Rotation avoids immediate repeats within a browser tab/session when at least two images exist. Reduced-motion visitors do not receive background animation.

## Rollback policy
1. **Trigger:** text readability degradation, broken mobile layout, repeated missing-image errors, page load regression, or booking funnel failure.
2. **Immediate rollback:** Revert the merge commit for this PR on `main` and redeploy both Render services that serve these public assets. Do not revert PRs #1001–#1004 (booking, email, and trial funnel).
3. **Smaller rollback:** Remove the shared CSS/manifest/engine tags from the affected page only; other pages continue normally. For a single bad image, remove just its manifest entry.
4. **Verification:** Check NFC Quick Connect, signed-in private request, email arrival, seven-day trial accept/decline, and Community Hub; confirm old solid backgrounds return on rollback.
5. **Release gate:** Merge only after code review and checks; test iPhone Safari and desktop after deployment. Keep the original backgrounds as automatic fallback.
