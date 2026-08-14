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

* App build flags: none. The local diagnostic is continuously compiled into the iOS
  target and is entered from the authenticated Admin / Run Club Diagnostics page.
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
production-behavior change. Keeping the two server HealthKit flags false closes the private
evidence routes. The only backend call made by the local diagnostic is the existing
JWT/authorization-role protected, read-only
`GET /api/admin/diagnostics/healthkit/authorize` gate; it stores nothing.

The browser performs that authorization check before posting to the native bridge,
and the native bridge independently calls the same endpoint with the canonical bearer
token before touching `HKHealthStore`. The endpoint uses the existing
`ops.read_observability` permission resolved only for authoritative `admin` and
`super_admin` roles. A hidden button is not the security boundary: missing tokens are
401, ordinary members are 403, and HealthKit is not accessed unless the native check
receives 200.

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
5. Do not add or change any HealthKit application or Render feature flag.
6. In the scheme/device picker, select the connected iPhone (not “Any iOS Device”),
   choose **Product > Run**, and accept the developer certificate on the phone if iOS
   requests it.

## Exact physical-iPhone diagnostic flow

1. Before installing, create or retain at least one walking/running workout in Apple
   Fitness/Health; a route is optional. Keep Render's two HealthKit flags false.
2. Run the app from Xcode, sign in as an account authoritatively assigned `admin` or
   `super_admin`, and open **Admin / Run Club Diagnostics**. Confirm the existing
   browser-recorded activity path still behaves normally. Do not submit evidence.
3. Tap **Open HealthKit Test**. The page and native bridge each verify the session
   against the protected backend authorization endpoint before HealthKit is touched.
4. At the iOS Health prompt, allow Workouts and Workout Routes. The private sheet must
   show availability, whether the authorization request completed,
   count, newest start time, duration, distance, and route availability only. It must
   show no coordinates.
5. Repeat after removing Health access in **Settings > Privacy & Security > Health >
   Greatness**, and repeat with no recent walking/running workout. Apple deliberately
   does not disclose read denial to apps; an empty query therefore displays
   `NO_WORKOUTS_FOUND`, while an explicit HealthKit authorization error displays
   `PERMISSION_DENIED`.
6. Confirm controlled messages for unavailable HealthKit, permission error, no
   workouts, or bridge failure. The backend returns distinct closed errors
   `HEALTHKIT_CAPABILITY_DISABLED` and `HEALTHKIT_INGESTION_DISABLED` when those
   respective private evidence controls are off.
7. Close the sheet and reconfirm the browser activity, GPS verification, XP,
   achievements, entitlement/free-paid, and upgrade-continuity behavior is unchanged.

A normal member cannot bypass the page by invoking the message handler: the bridge
requires a canonical token and independently obtains a 200 admin authorization
response. A member token receives 403 and produces no HealthKit request.
