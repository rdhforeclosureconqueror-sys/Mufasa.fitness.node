# iOS App Foundation + Apple Health physical-device runbook

## Fixed scope and safety boundary

The project definition is `ios/GreatnessHealthKitApp/project.yml`; XcodeGen creates
`ios/GreatnessHealthKitApp/GreatnessHealthKitApp.xcodeproj` (there is no workspace).
The target is `GreatnessHealthKitApp`, its configured bundle identifier is
`com.mufasafitness.greatness`, and its deployment target is iOS 16.0.

The existing production Greatness URL remains the authoritative, unchanged web UI in
the `WKWebView`. HealthKit is read-only. The diagnostic never displays route
coordinates and does not send or ingest evidence. It cannot create or verify a
Greatness activity and does not call activity completion, XP, achievement, free/paid,
or upgrade-continuity code. Apple Watch support is not present.

The target has `com.apple.developer.healthkit = true`, references the entitlement file
through `CODE_SIGN_ENTITLEMENTS`, and asks only to read workouts and workout routes.
It has no HealthKit write entitlement and requests no share types.

## Values needed for the phone test

* App build flag: set `HEALTHKIT_FEATURE_ENABLED` to `YES` for the test configuration.
  It defaults to `NO`; when off, the native test button and message-handler response
  are unavailable.
* Info.plist read description, exactly:
  `Greatness reads walking and running workouts so you can privately compare them with activities you already recorded.`
* No `NSHealthUpdateUsageDescription` is required because the app does not write.
* Backend flags: **none are required for the permission/diagnostic test**. Leave
  `HEALTHKIT_ENABLED=false` and `HEALTHKIT_EVIDENCE_INGESTION_ENABLED=false` on Render
  to guarantee that this test cannot persist evidence. If a later evidence-only test
  is separately approved, both must be `true`.
* Evidence hashing secret (not needed or transmitted by this diagnostic):
  `HEALTHKIT_EVIDENCE_HASH_SECRET`. For any later ingestion test it must be a stable,
  long random server-only value, for example one generated with
  `openssl rand -hex 32`; never place it in Xcode or the app.

The current Render backend can serve the unchanged web page during this test with no
production-behavior change. Keeping the two server flags false closes both private
HealthKit endpoints. The native diagnostic reads HealthKit locally and does not
depend on those endpoints.

## Signing and installation

A paid Apple Developer Program membership is required for this target's HealthKit
capability on a physical device; a free Personal Team cannot provision this
entitlement. In the Apple Developer portal, the Account Holder or Admin must:

1. Register the explicit App ID `com.mufasafitness.greatness` (or first change the
   project bundle identifier to a unique reverse-DNS ID owned by the team).
2. Enable **HealthKit** for that App ID. Do not enable Clinical Health Records.
3. Create an iOS Development certificate and a development provisioning profile for
   that App ID and registered iPhone, or allow Xcode automatic signing to create them.

Exact Xcode steps:

1. Install XcodeGen, then run `cd ios/GreatnessHealthKitApp && xcodegen generate`.
2. Open `ios/GreatnessHealthKitApp/GreatnessHealthKitApp.xcodeproj` in Xcode.
3. Connect and unlock the iPhone, tap **Trust** if prompted, enable Developer Mode in
   **Settings > Privacy & Security > Developer Mode**, and restart when requested.
4. Select the blue project, select target **GreatnessHealthKitApp**, then open
   **Signing & Capabilities**. Check **Automatically manage signing**, choose the paid
   **Team**, and confirm the bundle identifier and HealthKit capability have no errors.
5. In **Build Settings**, search for `HEALTHKIT_FEATURE_ENABLED`, select the Run/Debug
   value, and change it from `NO` to `YES`. Do not change the Release value.
6. In the scheme/device picker, select the connected iPhone (not “Any iOS Device”),
   choose **Product > Run**, and accept the developer certificate on the phone if iOS
   requests it.

## Exact physical-iPhone diagnostic flow

1. Before installing, create or retain at least one walking/running workout in Apple
   Fitness/Health; a route is optional. Keep Render's two HealthKit flags false.
2. Run the app from Xcode and confirm the existing sign-in and browser-recorded
   activity path still behaves normally. Do not submit HealthKit evidence.
3. Tap the small native **HealthKit Test** button, then **Request Permission & Check**.
4. At the iOS Health prompt, allow Workouts and Workout Routes. The private sheet must
   show availability, whether authorization was requested, the authorization result,
   count, newest start time, duration, distance, and route availability only. It must
   show no coordinates.
5. Repeat after removing Health access in **Settings > Privacy & Security > Health >
   Greatness**, and repeat with no recent walking/running workout. Apple deliberately
   does not disclose read denial to apps; an empty query therefore displays
   `NO_WORKOUTS_FOUND` with `REQUEST_COMPLETED_READ_STATUS_PRIVATE`, while an explicit
   HealthKit authorization error displays `PERMISSION_DENIED`.
6. Confirm controlled messages for unavailable HealthKit, permission error, no
   workouts, or bridge failure. The backend returns distinct closed errors
   `HEALTHKIT_CAPABILITY_DISABLED` and `HEALTHKIT_INGESTION_DISABLED` when those
   respective private evidence controls are off.
7. Close the sheet and reconfirm the browser activity, GPS verification, XP,
   achievements, entitlement/free-paid, and upgrade-continuity behavior is unchanged.

For an optional bridge-only check, invoke
`window.webkit.messageHandlers.healthKit.postMessage({action:'diagnostic',days:7})`.
The `greatness:healthkit-response` event contains the same redacted diagnostic fields.
