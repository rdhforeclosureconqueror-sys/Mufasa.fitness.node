# Yoga client experience audit

## Content and relationship discovered

Yoga is file-backed, not stored in a relational database or CMS. `data/yoga/sessions.v1.json` is the session/sequence source of truth and `data/yoga/poses.v1.json` is the pose source of truth. A session owns an ordered `poses` array. Each entry references a pose by `poseId` and supplies `holdSeconds`, `restSeconds`, `transition`, and `cameraSupported`. The referenced pose supplies `displayName`, `description`, category, difficulty, safety notes, movement-analysis rules, regressions, progressions, and prerequisites.

`Beginner Full-Body Flow` has stable ID `beginner-flow` and six ordered references: Mountain, Chair, Warrior II, Downward Dog, Cobra, and Bridge. Every referenced pose has a member description; each sequence entry has a hold, rest, transition, and camera flag. There are no image, video, breathing-cue, repetition, or dedicated introduction fields in either canonical Yoga JSON resource. Consequently the detail API returns `media: null` rather than fabricating assets or cues.

Completion records are persisted per canonical user in the user store's `yogaSessions` array. They contain a generated `recordId`, `sessionId`, `startedAt`, `completedAt`, ordered derived pose results, summary, detector/rule versions, and progression. Multiple practice events are allowed; an idempotency key prevents retry duplication. After persistence, `yoga.session.completed` is recorded by the gamification event service and projections are replayed.

## Pipeline failure and repair

Previously `GET /api/yoga/catalogue` returned both complete session pose references and the public pose catalogue. The active `/yoga.html` client retained each session in a map but rendered only card metadata. Its sole button immediately synthesized results for every pose and posted completion. There was no active detail route. An older `/yoga/` prototype contained a dialog player but used retired token keys and a relative `fetch`, did not render the sequence, and was not suitable to reconnect.

The repair adds protected `GET /api/yoga/sessions/:sessionId`. The service joins the session's ordered references to canonical pose content and serializes explicit ordered steps. The member client requests the encoded ID using `MaatApiClient` after `AuthStateRuntime.whenReady()`, renders one step at a time, exposes previous/next navigation, and shows completion only on the final step. Opening a detail performs no write. Completion now also validates that every expected pose is supplied in published order.

## Media and remaining debt

No canonical launch pose or session currently has a media field or approved image/video reference. The UI supports a future `media.url` and accessible alt text but correctly renders no empty or broken image today. The legacy Yoga research inventory explicitly has unresolved licensing/provenance and is not runtime authority, so those images were not promoted. Content owners still need to add reviewed media, richer pose-specific instruction steps, explicit breathing cues, and dedicated introductions through the versioned content process. Real-device iPhone Safari verification and production-origin media verification remain deployment acceptance work because this repository environment cannot perform them.
