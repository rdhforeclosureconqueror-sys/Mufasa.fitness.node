# Pocket PT Extraction OS — V1 Operating Contract

Date: 2026-09-06

## Purpose

Extraction OS exists to prevent valuable internal work from remaining trapped in research, development, or future-scope expansion. It converts the current Pocket PT system into a bounded customer delivery, circulates that delivery, captures Voice-of-the-People evidence, and lets evidence govern the next iteration.

This is not a replacement for Launch Readiness. Launch Readiness answers whether tracked product requirements have implementation/QA evidence. Extraction OS answers a broader operator question: **what exactly are we delivering now, to whom, through what channel, by what deadline, and what evidence will decide the next build?**

## Governing rules

1. The delivery date is fixed; scope is negotiable.
2. A feature may enter Launch 1 only if it is required to deliver the frozen V1 promise.
3. Avatar, Godot, Motion Lab perfection, advanced voice, nutrition, and advanced automatic adaptation are explicitly post-launch for Pocket PT V1.
4. Code presence is not customer value. A customer must be able to enter, receive value, and leave durable evidence of the experience.
5. Marketing is part of delivery. A deployed product with no audience/message/channel/offer/action/measurement plan is not a complete launch cycle.
6. Voice of the People includes behavior as well as comments: reached → visited → registered → onboarded → first workout → returned → paid → referred.
7. Criticism is diagnostic evidence. Find the first point where actual user behavior diverged from the intended journey and fix that boundary before expanding scope.
8. Human-required acceptance remains human authority. Extraction OS must not auto-approve device, UX, movement-quality, or other human-required readiness criteria.

## Pocket PT V1 frozen promise

> Help a member get started, choose or receive a workout, train with supported guidance, record the work, and see progress.

## Launch 1 scope

Ship the existing bounded value:

- Public landing/product story.
- Authentication/member profile.
- Intake, goals, and persistent onboarding evidence.
- Starter workouts and searchable exercise library.
- Supported camera tracking, rep counting, and form guidance for verified movement patterns.
- Workout completion, history, progress dashboard, consistency, and check-ins.
- Pocket PT text coaching for practical fitness/workout/substitution/recovery/mobility questions within existing safety boundaries.
- Push-Up Challenge and leaderboard.
- Existing membership/access path after live configuration/verification.

## Explicit post-launch scope

These remain valuable workstreams but do not block Pocket PT V1:

- Avatar / full live mirror.
- Godot gym / Push-Up Arena world.
- Motion Lab perfection and animation-bank expansion.
- Always-on or advanced voice experience.
- Meal planning, calorie logging, and unverified nutrition flows.
- Advanced automatic performance/program adaptation.

## Three master launch gates

### Product Gate

The promised experience works end to end, the V1 scope is frozen, current Launch Readiness evidence has been reviewed, the primary mobile/browser journey has been verified by the appropriate human, and public claims stay within verified capability/safety boundaries.

### Delivery Gate

A new person can enter, reach first value, complete a workout/challenge, preserve authoritative progress, use the membership/access path, and receive a clear next action when something fails.

### Market Gate

The operator names the first user, one launch message, initial channels, offer, CTA, initial budget, and funnel measurements. This prevents "deployment" from being mistaken for "launch."

## Voice-of-the-People loop

Release → observe → identify first failure → correct → release again.

Capture both qualitative and behavioral evidence. The next version should answer an observed failure or opportunity, not reopen deferred scope simply because it is interesting.

## Admin implementation

`/admin-extraction.html` is an admin/operator workspace linked from the existing Launch Readiness Command Center. The workspace stays visually locked until the existing privileged `/api/admin/launch-readiness` request succeeds. Protected readiness data continues to be enforced by the existing API authorization layer.

The V1 operator checklist, marketing plan, deadline, and Voice-of-the-People notes are intentionally stored in browser localStorage under `pocketpt.extractionOS.v1`. They are operator planning state, not canonical readiness evidence and not human acceptance authority. Cross-device/server persistence can be added after the launch cycle proves which extraction fields are actually useful.

## V1 success condition

Extraction OS V1 succeeds when it causes a bounded Pocket PT release to reach real people and produces actionable evidence for V1.1 without allowing avatar/future-scope work to delay the release.
