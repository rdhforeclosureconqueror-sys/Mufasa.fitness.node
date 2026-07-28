# Stepping Into Greatness Phase 1B

## Runtime and storage

The mobile web recorder exposes live elapsed, moving and paused time, accepted-only distance, smoothed current pace (the last four accepted segments, withheld below 50 metres or 15 seconds), average moving pace, GPS quality and sample counts. Browser background execution is not continuous: interruption recovery always pauses and resets the location baseline.

Accepted coordinates are private by default, bounded to 2,000 uniformly sampled points, and returned only through the authenticated owner-scoped route endpoint. Rejected coordinates, routes, exact start/end locations and coordinates are excluded from feed and weekly-summary payloads. Deleting an activity must delete its embedded route and revoke its contributions; a user-facing deletion flow is deferred. There is no live route sharing or public discovery. The dependency-free canvas preview avoids map credentials and displays a fallback when fewer than two points exist.

User JSON writes use same-directory temporary files and atomic rename. Synchronous in-process calls serialize writes in one Node process. This is **not** transactionally safe across processes; multi-process deployments require a database or coordinated locking layer.

Splits use accepted point cumulative distance and unrounded metre boundaries. The final incomplete split remains visible but is not record-eligible. Elevation is estimated only with at least three usable altitude samples, rejects altitude accuracy above 20 metres and changes above 50 metres, and requires a 3-metre vertical threshold.

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
