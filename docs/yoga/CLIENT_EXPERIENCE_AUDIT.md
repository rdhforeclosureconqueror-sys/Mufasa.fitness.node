# Yoga client experience audit

## Content and relationship discovered

Yoga is file-backed, not stored in a relational database or CMS. `data/yoga/sessions.v1.json` is the session/sequence source of truth and `data/yoga/poses.v1.json` is the pose source of truth. A session owns an ordered `poses` array. Each entry references a pose by `poseId` and supplies `holdSeconds`, `restSeconds`, `transition`, and `cameraSupported`. The referenced pose supplies `displayName`, `description`, category, difficulty, safety notes, movement-analysis rules, regressions, progressions, and prerequisites.

`Beginner Full-Body Flow` has stable ID `beginner-flow` and six ordered references: Mountain, Chair, Warrior II, Downward Dog, Cobra, and Bridge. Every referenced pose has a member description; each sequence entry has a hold, rest, transition, and camera flag. There are no image, video, breathing-cue, repetition, or dedicated introduction fields in either canonical Yoga JSON resource. Consequently the detail API returns `media: null` rather than fabricating assets or cues.

Completion records are persisted per canonical user in the user store's `yogaSessions` array. They contain a generated `recordId`, `sessionId`, `startedAt`, `completedAt`, ordered derived pose results, summary, detector/rule versions, and progression. Multiple practice events are allowed; an idempotency key prevents retry duplication. After persistence, `yoga.session.completed` is recorded by the gamification event service and projections are replayed.

## Pipeline failure and repair

Previously `GET /api/yoga/catalogue` returned both complete session pose references and the public pose catalogue. The active `/yoga.html` client retained each session in a map but rendered only card metadata. Its sole button immediately synthesized results for every pose and posted completion. There was no active detail route. An older `/yoga/` prototype contained a dialog player but used retired token keys and a relative `fetch`, did not render the sequence, and was not suitable to reconnect.

The repair adds protected `GET /api/yoga/sessions/:sessionId`. The service joins the session's ordered references to canonical pose content and serializes explicit ordered steps. The member client requests the encoded ID using `MaatApiClient` after `AuthStateRuntime.whenReady()`, renders the ordered pose preview, and delegates Start Session to Train. Opening a detail performs no write. The Train executor shows completion only on the final pose, and the completion contract validates that every expected pose is supplied in published order.

## Media and remaining debt

No canonical launch pose or session currently has a media field or approved image/video reference. The UI supports a future `media.url` and accessible alt text but correctly renders no empty or broken image today. The legacy Yoga research inventory explicitly has unresolved licensing/provenance and is not runtime authority, so those images were not promoted. Content owners still need to add reviewed media, richer pose-specific instruction steps, explicit breathing cues, and dedicated introductions through the versioned content process. Real-device iPhone Safari verification and production-origin media verification remain deployment acceptance work because this repository environment cannot perform them.

## Shared Train execution audit

`/yoga.html` is the canonical browse, preview, and selection route. Its Start Session action persists the versioned active-workout envelope and navigates to `/workout.html?yogaSession=<canonical-id>`. `/workout.html` is the only production movement executor: it restores that state after refresh, resolves the canonical session from the Yoga API, and uses the existing camera and `pose-runtime:frame` stream rather than opening another media stream or detector. Selecting a Yoga flow in Train invokes the same loader and state shape.

| Capability | Runtime exists | Frontend visible | Shared implementation |
| --- | --- | --- | --- |
| Camera | yes | yes | Train Connect Camera and video surface |
| Skeleton overlay | yes | yes | Train pose canvas |
| Form status | yes | yes | Yoga execution panel and form-rule status |
| Corrective feedback | yes | yes | Primary and secondary live cue fields |
| Hold timer | yes | yes | Progress bar and elapsed/target seconds |
| Avatar target | yes | yes | Canonical TargetBodyFrame adapter preview; movement-change event also supplies the shared avatar payload |
| Movement rule status | yes | yes | Shared form-rule status panel |
| Keypoint confidence | yes | yes | Yoga execution panel and shared form-rule status |
| Warning joints | yes | yes | Named, outlined warning badges supplement the skeleton color |
| Voice/guided coach | yes | yes | Corrections enter the existing workout-coach/coach delivery APIs |

Fitness retains its phase, repetition, set, and completion path. Yoga adds a static-hold controller around the same pose frames: acceptable form advances the canonical hold tracker; sustained deviation pauses/resets according to the movement definition; without camera the manual guided clock advances. Only the final Train pose exposes completion, which calls the existing Yoga completion contract, emits the gamification refresh event, and clears active state after the write succeeds.

The initial camera-evaluated acceptance slice is Warrior II because it has the approved canonical movement definition, target BodyFrame, avatar adapter data, knee/arm rules, and temporal policy. Other Yoga poses remain instruction-led/manual until canonical movement definitions are approved; the runtime does not fabricate duplicate geometry.
