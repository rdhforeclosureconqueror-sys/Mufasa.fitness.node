# Residential wellness intake — repository audit (2026-10-02)

## Scope
Review existing account/Free Run Club infrastructure before adding a separate residential wellness intake. No image integration in this PR.

## Confirmed existing implementation
- `public/apartment-wellness.html`: universal landing page, with free Run Club CTAs.
- `public/run-club-login.html`: redirect shim to canonical `/login.html`, preserves safe `returnTo` and `mode=register`.
- `public/login.html`, `public/login.js`, `public/auth-navigation.js`: canonical account creation/sign-in and return destination handling.
- `public/free-run-club.html`, `public/free-run-club.js`: run-specific questionnaire, explicit profile-use consent, separate photo-sharing consent, 24-hour community board and first-failure debugger.
- `src/routes/freeRunClubCommunityRoutes.js`: authenticated GET/PUT profile, GET/POST board and diagnostic; write rate limiting.
- `src/services/freeRunClubCommunityService.js`: canonical user-store backed profile, consent, board retention.

## First failure identified and corrected
Landing page previously linked to the sign-in shim without a return destination. Canonical registration in `login.js` redirected new users to `/trial.html` regardless of requested destination. Consequently a resident clicking free Run Club could be sent into an unrelated trial funnel. This PR:
1. Adds `mode=register&returnTo=%2Ffree-run-club.html` to all landing page Run Club entry CTAs.
2. Honors that exact safe Free Run Club return destination after account creation while retaining existing `/trial.html` default for other registration journeys. Existing sign-in retains canonical safe return behavior.

## Remaining product gap — not yet implemented
- Resident wellness interests (run/walk, yoga, sound bath, personal training, general wellness) are not captured by the run-specific questionnaire.
- No campaign/referral attribution ingestion, consent, persistence, or admin reporting is established for this page.
- No apartment-specific identifiers should appear in visible public page copy. Campaign codes should be opaque and allowlisted, with no inferred official partnership.
- No resident confirmation / optional community invitation journey established for all wellness interests.
- Paid-service cards remain informational, not transactional.
- Image placeholders remain intentionally unchanged.

## Next bounded implementation
1. Define a resident-wellness intake schema on canonical authenticated user profile (interests, communication consent, optional campaign attribution, timestamps), with strict validation and explicit consent.
2. Build a short mobile-first intake page reached after canonical login/registration; reuse Free Run Club profile only when user opts into Run Club, rather than requiring running-specific answers from yoga/sound-bath leads.
3. Provide authenticated idempotent read/write endpoints and safe first-failure diagnostics.
4. Add QR campaign ingestion using opaque allowlisted campaign codes and server-side attribution; never trust an arbitrary apartment name from the query string.
5. Add success state and optional community invitation, followed by mobile acceptance and auth/consent/privacy regression testing.

## Verification limits
Static source audit only. This PR has not been browser-tested, end-to-end registered against production, or run through CI in this session. Do not claim a fully functional residential intake until those checks pass.
