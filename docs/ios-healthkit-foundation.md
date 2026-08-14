# iOS App Foundation + Apple Health integration

## Architecture and safety boundary

The existing Greatness page remains authoritative and is loaded unchanged inside a minimal `WKWebView`. The native container offers an optional message handler; it reads walking/running `HKWorkout` records and routes only after an explicit request. Unavailable HealthKit, denied permission, an empty query, and bridge failures return an empty/status response and do not affect the web page.

The authenticated backend endpoint stores **private evidence**, never an activity. Reconciliation version `healthkit-browser-v1` deterministically matches an existing, non-deleted browser activity when type families agree, start times differ by no more than 120 seconds, and distance differs by no more than the greater of 100 metres or 3%. Zero matches remains `unmatched`; multiple matches remains `ambiguous`. Only one match records a nullable `matchedActivityId`. Exact Apple UUIDs are HMAC-hashed before persistence. Repeating a source hash returns the original evidence record. This code never calls the completion service or gamification event service, so it cannot award XP, achievements, challenges, or create a completed activity.

Persistence is additive at optional `user.healthKitEvidence = { schemaVersion, records }`. Existing activity schema and records are untouched. HealthKit evidence and diagnostics are exposed only through authenticated `/api/me/...` routes with `private, no-store`; public feeds, analytics, activity responses, and browser config do not include it.

## Flags and rollback

Both server flags default to false: `HEALTHKIT_ENABLED` gates the capability and `HEALTHKIT_EVIDENCE_INGESTION_ENABLED` independently gates writes. The iOS build setting `HEALTHKIT_FEATURE_ENABLED` defaults to `NO`. Disable either server flag (and restart) for an immediate 404 fallback; set the app build flag to `NO` to suppress native requests. No migration reversal or evidence deletion is required, and the unchanged web recorder continues normally.

## Physical iPhone test

1. Install XcodeGen, run `xcodegen generate` in `ios/GreatnessHealthKitApp`, and open the generated project.
2. Select the production Apple Developer team, use a unique bundle identifier, and enable the **HealthKit** capability for the App ID/profile. No HealthKit write entitlement is requested.
3. For a controlled test build only, set `HEALTHKIT_FEATURE_ENABLED=YES`. Enable both backend flags and provide a long random `HEALTHKIT_EVIDENCE_HASH_SECRET`.
4. On a physical iPhone (HealthKit is not fully testable in Simulator), open Greatness and confirm the existing sign-in and browser-recorded run path first.
5. Invoke `window.webkit.messageHandlers.healthKit.postMessage({action:'recentWorkouts',days:7})` from an approved debug harness and observe `greatness:healthkit-response`. Test Allow, Don't Allow, no workouts, a walking workout, a running workout, and a workout with/without route permission.
6. Submit evidence through the authenticated private endpoint. Confirm one browser activity remains, the diagnostic count changes, a repeat submission reports `duplicateEvidence`, and XP/achievements are unchanged.
7. Turn off either backend flag and confirm the endpoint returns the capability-disabled 404 while browser recording remains functional.

Apple signing requires an Apple Developer team, a HealthKit-enabled explicit App ID, a provisioning profile carrying the HealthKit entitlement, and the `NSHealthShareUsageDescription` string. Production distribution and App Store submission are intentionally outside this phase.
