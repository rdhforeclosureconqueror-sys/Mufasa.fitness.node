# Independent Review Handoff — Free Run Club Phase 3

## Goal
Verify the Free Run Club can clearly confirm text posts and allow a member to select a real phone/computer photo instead of pasting an image URL.

## Base
Current main at branch creation: `766a28285ab9e5c7ffba558ac5cb4eba62e1fe59` (merged PR #611).

## Review
Inspect every changed file. Confirm:
- image picker accepts JPEG/PNG/WebP;
- client resizes before sending and bounds encoded size;
- service rejects unsupported/oversize media;
- photo consent remains required;
- board renders the selected photo, not arbitrary HTML;
- text-only posting still works;
- empty posts fail;
- success gives a visible `Posted ✓` confirmation;
- failures give visible `Not posted: ...` feedback;
- posts still expire after 24 hours;
- debug includes media-bound validation;
- no raw GPS/home location is exposed.

## Critical backend audit
Current-main code search did not find the final `server.js` hookup for `createFreeRunClubCommunityService` / `installFreeRunClubCommunityRoutes`. Independently verify this. If absent, classify it as a production-blocking integration gap: the UI may render while profile/board POST APIs fail.

The preferred final integration is to instantiate the service with canonical `userStore` and install the existing authenticated route module in canonical server startup. Do not build parallel auth or a second user store.

## Storage boundary
Phase 3 stores resized image data inside the short-lived board post record. This is intentionally bounded for the early Run Club: client downscales to max 1280px, encoded post image is capped around 1.9M characters, and the board prunes posts after 24 hours. Reviewer should decide whether this is acceptable for the pilot or whether durable object storage should replace it before scale.

## Verdict
Return exactly one:
- `APPROVE PHASE 3 FOR OWNER TESTING`
- `CHANGES REQUIRED`

Do not merge solely from static review. Test text-only post, photo-only post, text+photo post, missing photo consent, unsupported file type, and a clean new-account Run Club flow.
