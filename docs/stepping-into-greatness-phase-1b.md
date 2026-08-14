# Stepping Into Greatness Phase 1B

## Runtime and storage

The mobile web recorder exposes live elapsed, moving and paused time, accepted-only distance, smoothed current pace (the last four accepted segments, withheld below 50 metres or 15 seconds), average moving pace, GPS quality and sample counts. Browser background execution is not continuous: interruption recovery always pauses and resets the location baseline.

Accepted coordinates are private by default, bounded to 2,000 uniformly sampled points, and returned only through the authenticated owner-scoped route endpoint. Rejected coordinates, routes, exact start/end locations and coordinates are excluded from feed and weekly-summary payloads. Phase 1C uses audit-safe **soft deletion**. A deleted activity retains its identifier, deletion timestamp and revocation trail, while its embedded route points are erased. Deleted activities are excluded from Journey, feed, challenges, records, lifetime totals and summaries. There is no live route sharing or public discovery. The dependency-free canvas preview avoids map credentials and displays a fallback when fewer than two points exist.

User JSON writes use same-directory temporary files and atomic rename. Synchronous in-process calls serialize writes in one Node process. This is **not** transactionally safe across processes; multi-process deployments require a database or coordinated locking layer.

Splits use accepted point cumulative distance and unrounded metre boundaries. The final incomplete split remains visible but is not record-eligible. Elevation is estimated only with at least three usable altitude samples, rejects altitude accuracy above 20 metres and changes above 50 metres, and requires a 3-metre vertical threshold.

## Suspicious-movement verification policy (deployment `2026.08.14-suspicious-movement-policy-v2`)

The old rule failed verification whenever the browser's `suspiciousMovementDetected` boolean was true. Because the GPS filter sets that boolean after the first rejected `gps_jump` or `impossible_speed` sample, one outlier invalidated the entire activity.

The server now derives and persists movement evidence from the submitted sample sequence. Accepted-point filtering is unchanged: rejected points remain excluded from distance, route, split, elevation, and pace calculations. A completion receives `suspicious_movement` only when at least one deterministic pattern is present:

* movement-related rejections are at least 50% of at least 20 total samples;
* at least 3 movement-related rejections are consecutive;
* at least 3 `impossible_speed` rejections are consecutive (sustained impossible speed);
* at least 3 `gps_jump` rejections occur (repeated large jumps); or
* adjacent raw coordinates show an extreme teleport of at least 1,000 metres.

Paused samples do not break a movement sequence, but poor-accuracy, stale, or other non-movement rejections do. The existing minimum of 2 accepted samples and the existing `poor`/`unavailable` GPS-rating, invalid-distance, authentication, idempotency, and eligibility rules remain enforced. Isolated ordinary spikes and the observed 1,239 accepted / 228 rejected ratio therefore do not independently make a good-quality activity suspicious. The admin diagnostic trace remains active and now records the evaluated patterns, evidence, and thresholds.

Streaks use UTC calendar days. A valid verified GPS activity makes its UTC completion day active; multiple activities on one day count once. A streak begins on the first active day and breaks after a missing UTC day. Existing activity timestamps are not reinterpreted if the member changes timezone. Four-Week Momentum remains disabled until a product rule is approved. Step achievements and verified step challenges remain disabled pending a trusted provider.

Weekly community summaries use a rolling seven-day UTC window and aggregate verified metrics only. Feed results are limited to 50 newest events. Provider connections remain unavailable.

## Real Mobile Walking Test

1. Deploy the branch to an HTTPS environment accessible from a real mobile device.
2. Open the page on an iPhone or Android phone.
3. Record the device model, operating system, browser, and browser version.
4. Join The Greatness Movement.
5. Select Walk.
6. Press Start.
7. Grant precise location access.
8. Remain stationary outdoors for at least one minute.
9. Confirm distance does not inflate materially while stationary.
10. Walk at least 0.25 miles or 400 meters.
11. Confirm distance and pace update during the walk.
12. Pause the activity.
13. Move at least 50 meters while paused.
14. Confirm paused movement is not added.
15. Resume.
16. Confirm the resumed route does not bridge the pause gap.
17. Walk farther.
18. Finish the activity.
19. Confirm GPS tracking stops.
20. Confirm the activity summary appears.
21. Confirm the activity appears in Your Greatness Journey.
22. Confirm splits are reasonable.
23. Confirm eligible Greatness Marks and personal records appear.
24. Confirm challenge progress updates once.
25. Confirm the Movement Feed contains only privacy-safe information.
26. Confirm the route is private.
27. Confirm another user cannot retrieve the route.
28. Refresh and confirm the activity remains available.
29. Retry completion and confirm no duplicate activity, badge, record, contribution, or feed event is created.
30. Record approximate known distance, application-recorded distance, GPS-quality rating, and defects.

Status: **Not performed. A human must complete this test on a physical device; do not mark it complete from automated simulation.**


## Phase 1C mobile validation additions

31. Delete the completed activity and confirm it disappears from Journey and the Movement Feed.
32. Confirm challenge and lifetime-distance totals decrease.
33. Confirm personal records fall back to the best eligible remaining activity.
34. Edit every community privacy setting and confirm hidden fields disappear from feed responses.
35. Leave and rejoin; confirm Journey remains and membership/feed records are not duplicated.
36. Simulate a failed save, retry with the same `clientSessionId`, and confirm no duplicate activity, mark, record, contribution, or feed event.

The persistence model serializes synchronous writes within one Node.js process and uses same-directory temporary-file replacement. It is not transactionally safe across multiple processes. Weekly summaries use a rolling seven-day window ending at request time; active-day and streak boundaries are UTC calendar days.
