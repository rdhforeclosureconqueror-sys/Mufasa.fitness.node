# UI Acceptance

The dashboard now provides one understandable member navigation hierarchy and active Home state. Major launch capabilities no longer require undocumented URLs. The Yoga page provides loading, empty, error/retry, completion, mobile, focus, reduced-motion, and camera-optional disclosure states; it sends only derived pose completion records.

Outstanding manual/browser checks: visual loading and network errors for every critical page; touch targets; focus order after dynamic updates; high zoom/no overflow; asset/link integrity; exact dashboard post-completion refresh; celebration persistence across refresh; camera permission denial; and desktop/mobile/tablet screenshots. No feature is marked Ready based solely on structural inspection.

Playwright installation was attempted with `npx --yes playwright@1.55.0 install chromium`, but the configured package registry returned HTTP 403. No screenshot or browser result is claimed; the limitation remains a launch blocker.
