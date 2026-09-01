# Phase 4 Handoff — Free Run Club API Server Hook

## Live evidence
Owner testing on iPhone Safari shows the Free Run Club page renders but board requests return `HTTP 404`.

## Meaning
The browser route exists, but the deployed canonical server does not currently expose the Run Club community API endpoints end-to-end.

## Required production hook
In canonical `server.js`:
1. Import `createFreeRunClubCommunityService` from `src/services/freeRunClubCommunityService.js`.
2. Import `installFreeRunClubCommunityRoutes` from `src/routes/freeRunClubCommunityRoutes.js`.
3. Instantiate one Run Club community service with the canonical `userStore`.
4. Install the authenticated Run Club routes on the canonical Express `app` with canonical `requireAuth` and `userStore`.
5. Ensure the route authorization contract includes the three Run Club route families as authenticated, owner/member scoped, membership-not-required Free Run Club endpoints.
6. Verify frontend/backend origin behavior in deployed Render topology so `/api/me/run-club/*` resolves to the same API authority used by the rest of Pocket PT.

## Endpoints that must resolve
- GET/PUT `/api/me/run-club/profile`
- GET/POST `/api/me/run-club/board`
- GET `/api/me/run-club/diagnostic`

## Required acceptance
- Signed-in profile GET is not 404.
- Text-only board POST returns 201 and then appears in board GET.
- Photo board POST returns 201 after consent and appears in board GET.
- Diagnostic endpoint identifies the earliest failure instead of returning 404.
- No paid Stepping Into Greatness membership is required.

Do not call Free Run Club posting production-complete until this is independently reviewed and live-tested.
