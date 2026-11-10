# Community ID Card — Release 1 implementation handoff (2026-11-10)

Tracking: #1237. **Scope: a mobile-first, saved member Community ID Card with a personalized avatar and compatible simple animation.** Multiplayer/3D lobby, locomotion, compatibility matching, and full Game Hub are deferred. The November 14 event is a release target, not a substitute for acceptance evidence.

## Verified main-branch inventory

| Boundary | Observed source | Decision |
| --- | --- | --- |
| Event entry | `public/quick-connect.html` | Preserve NFC/event entry; link to card onboarding only once authenticated/trial gating is verified. |
| Community | `public/community-hub.html` | Add Community Entrance CTA after auth and trial checks; do not overwrite existing member event functionality. |
| Trial | `public/community-trial-offer.js`, `public/wellness-claim.js` | Free community membership remains available when the optional seven-day fitness trial is declined; preserve both accept/skip paths and verify first-signin/hub return. |
| Auth | `public/auth-state-runtime.js`; `src/middleware/auth.js`; `/api/auth/me` | Canonical account identity; do not create a separate member database. |
| Member avatar | `public/avatar-runtime.js`, `public/avatar-upload-contract.js`, `profile-write-runtime.js`, server owner-gated `/api/me/avatar/assets/:assetId` | Reuse selection/asset ownership/upload contracts. Confirm avatar creator availability vs GLB upload before wording the UI. |
| Avatar scene/motion | `public/motion/product-motion-preview.js`, `public/motion/disposable-motion-session.js`, `public/motion/avatar-profiles.js` | Extract a card-sized viewer adapter; do not add a second render loop. Existing push-up pairing is **not** evidence for arbitrary custom-avatar idle animation. |
| Push-up display | `public/push-up-challenge.html` (`#motionPreviewContainer`) | Reuse concept/component with a new card container, not exercise camera/controllers or rep counting. |
| Godot arena | `public/arena-push-up.html`; `docs/POCKETPT_GODOT_WORLD_BRIDGE.md` | Keep working arena and game export unchanged; 3D social area remains roadmap-only. |
| Existing community profile precedent | `src/routes/freeRunClubCommunityRoutes.js` and `src/services/freeRunClubCommunityService.js` | Reuse canonical user-store pattern and auth/rate-limiting; do not expose runner private fields or conflate run-club opt-in. |

## Sequence of focused implementation PRs

1. **Card foundation**: New `public/community-entrance.html` and scoped assets with editable display name, interests, goals, preview, explicit visibility controls; authenticated canonical `GET/PUT /api/me/community-card` API and safe public projection route when authenticated; server-side field validation and ownership. Prefer canonical userStore persistence and versioned migration; no client-only persistence.
2. **Personal avatar + animation**: Reuse saved user-owned avatar descriptor, asset URL and existing Three.js motion infrastructure. Add one compatible *idle/wave* clip only after a rig-binding test; otherwise display a static avatar and truthful reason. Include pause/reduced-motion/WebGL fallbacks, one RAF, cleanup on navigation.
3. **Media and assessments**: Separate image upload paths for card photo/background with MIME, dimensions, size limits and safe re-encoding, and server-owned references. Love/Loyalty archetype summaries need a verified authenticated cross-origin linking strategy; until then offer manual opt-in badges or disabled integration with explicit status, not untrusted URL result import.
4. **Entry integration and acceptance**: Wire from Community Hub after free-community registration, whether the optional fitness trial was accepted or skipped. Validate sign-up → (trial accept OR skip) → card → save → reload → other member visibility, iPhone Safari, cross-user isolation, expired auth, no-WebGL, missing avatar and reduced-motion cases.

Each scope is a **separate PR** for review. Do not merge automatically. Review → fix → explicit approval → merge → deploy → verify live → report.

## Release 1 functional contract

Member fields: `displayName`, `bioShort` (optional), `interests` (allowlist), `goals` (allowlist), `photoAssetId` (optional), `backgroundAssetId` (optional), `avatarSelection` (canonical reference), `archetypeBadges` (optional and privacy-controlled), and `visibility` with **private defaults**. Display a clear preview of what others see, and allow hiding/disabling the card entirely. Only read-only projection is visible to other authenticated community members when consented to; never expose email, telephone, raw assessment answers, intake, health history, fitness records or raw asset storage paths.

The first-run flow must be fully possible on a phone. Safe fallback permits card creation even if animation fails or WebGL is unsupported; do not block membership on a 3D GPU feature.

## Acceptance gates and first failures

1. **Profile API**: Authenticated GET/PUT persists and restores after a new session; unauthenticated 401; another user's write/read of private data denied; image and text inputs validated.
2. **Avatar**: selected saved avatar shown under correct member; wrong account cannot access asset; no stale load after sign-out; idle/wave clip actually binds to the particular loaded rig; unsupported rig shows static fallback with first failure.
3. **Privacy**: Love/Loyalty optional and OFF by default; public projection contains only user-approved fields; disabled card vanishes from directory.
4. **Mobile/UI**: touch targets, card layout, uploads, save feedback and reduced-motion are tested on iPhone Safari or equivalent browser, then physically verified by owner.
5. **Onboarding**: Quick Connect and both optional seven-day trial acceptance and skip remain intact; existing exercise pages and arena tests remain passing.
6. **Release**: CI pass, independent PR review, accepted fixes, owner approval, controlled merge, Render deployment and live round-trip.

## Risks/unknowns before build

- Current personalized Avaturn registry entry is marked `developmentOnly` in `public/motion/avatar-profiles.js`; do not assume production access merely because GLBs exist.
- `docs/push-up-product-motion-preview-architecture.md` documents a **specific** 40/40 bound push-up fixture and cautions that its coupling is not general avatar support.
- Godot export is a *different* runtime, unnecessary for Release 1 card. Reusing it prematurely increases integration and mobile load risks.
- Need to verify the actual creation provider UI (as opposed to uploading a GLB), canonical avatar assignment API, storage durability, and the Love/Loyalty assessment service's cross-site account correlation before promising those flows. The `public/avatar-upload-contract.js` contract establishes GLB upload only, not a working self-service creator.
- Do not treat the optional fitness trial as a mandatory gate for free Community ID access: `public/community-trial-offer.js` routes both `skip` and `accept` to the community hub. Preserve any separate paid fitness feature gates and never disclose private member fields.

## Decision / next best move

Begin implementation with the server-authoritative community card data contract and a mobile preview page in an isolated PR. Run focused tests against the canonical user store before adding animation. This narrows failure diagnosis, prevents accidental avatar/3D coupling, and yields a usable preview even on devices with no WebGL.
