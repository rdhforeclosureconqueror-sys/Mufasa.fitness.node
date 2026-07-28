# Production Google Places retest runbook

This is a manual evidence-collection procedure, not a record of a successful
production test. Do not mark Nearby Trails ready until the evidence in the
final section has been collected from the deployed Render service and the
production browser application.

## Before starting

Use the deployed backend origin as `BACKEND_ORIGIN` (with no trailing slash),
the deployed frontend origin as `FRONTEND_ORIGIN`, and a normal test member
account. Never paste the Google API key, bearer token, cookies, or full precise
coordinates into a ticket or chat. The Google key is needed only in the Render
environment; it must not be put in a browser or local shell.

Because the trail cache is in process memory, perform this retest against one
known Render instance, immediately after a deploy/restart where practical. A
cached successful response proves the application route and cache, but does
not by itself prove a fresh Google request. The first search should therefore
use a location/radius not recently tested, or the Render service should be
restarted before the search.

## 1. Verify startup provider initialization

1. In Render, open the production web service, choose **Logs**, and select the
   deployment/restart interval being tested.
2. Search for `[trail-provider]`. Capture the complete structured objects for
   both startup entries, while redacting unrelated secrets if any appear.
3. Require these values (object formatting can differ by Render):

   ```text
   [trail-provider] { provider: 'google_places', event: 'initialization', configured: true, code: 'OK' }
   [trail-provider] { event: 'selection', provider: 'google_places', googleConfigured: true, overpassConfigured: false }
   ```

`configured: true` means a non-empty key was visible to the process; it does
not prove that Google accepts the key. `provider: google_places` in the
selection event proves the explicit provider selection. With the stated
production configuration, `overpassConfigured: false` is expected unless an
Overpass endpoint was separately configured. No API key value should appear.

Stop and investigate if initialization says `TRAIL_PROVIDER_NOT_CONFIGURED`,
if selection is `auto` or `overpass`, or if either startup line is absent. Also
confirm that the log timestamp belongs to the currently deployed instance,
not an older deployment.

## 2. Verify runtime provider selection logs

Provider selection is logged at startup, not once per search. Retain the
selection line from step 1, then perform a fresh search in step 5 while the
Render log stream is open. A real Google attempt must add a response entry:

```text
[trail-provider] { provider: 'google_places', event: 'response', httpStatus: 200, durationMs: <number>, resultCount: <number>, normalizedCount: <number>, normalizationFailures: 0, code: 'OK' }
```

If some returned places cannot be normalized, the response entry has code
`TRAIL_NORMALIZATION_PARTIAL` and a separate warning may be emitted with
`event: normalization`. This is not automatic failure if usable normalized
results remain, but paste both lines for review. A request log showing the
application endpoint is not a substitute for the `[trail-provider]` response
entry.

For a failed Google call, capture the whole response log object. It contains a
stable `code`, `httpStatus` when Google returned one, and `durationMs`. It must
still identify `provider: google_places`; there should be no Overpass response
log when `TRAIL_PROVIDER=google_places`.

## 3. Run the direct live-provider check

Use **Render Shell** for the deployed service so that the command reads the
same server-side secret and timeout as production. From the deployed checkout
directory run exactly:

```bash
npm run test:trails-live
```

The required successful output is:

```text
Provider: google_places
HTTP status category: success
Response duration ms: <number>
Normalized result count: <positive integer>
LIVE GOOGLE PLACES TEST PASSED
```

Also record the command's zero exit status (for example, immediately run
`printf 'exit=%s\n' "$?"`). On failure, do not rerun until the first output is
saved: paste `Response duration ms`, `Error code`, the final FAILED line, and
the non-zero exit status. This script directly contacts Google with a fixed
Washington, DC search; it does not exercise authentication, the HTTP route, or
the browser.

## 4. Make an authenticated provider-health request

Sign into production as the test member. In DevTools on the production app,
open **Console** and run this same-origin request (the application supplies its
stored bearer token):

```js
await fetch("/api/me/greatness/nearby-trails/provider-health", {
  headers: {
    Authorization: `Bearer ${window.AuthStateRuntime?.getAuthToken?.()
      || localStorage.getItem("maat_auth_token")
      || localStorage.getItem("authToken")}`
  },
  cache: "no-store"
}).then(async response => ({
  status: response.status,
  body: await response.json()
}))
```

If frontend and backend use different origins, replace the relative URL with
`${BACKEND_ORIGIN}/api/me/greatness/nearby-trails/provider-health`; production
CORS must allow the frontend origin. Do not print or paste the token.

Require HTTP 200 and an envelope shaped as follows:

```json
{
  "ok": true,
  "data": {
    "provider": "google_places",
    "configured": true,
    "reachable": true,
    "lastSuccessfulRequestTime": "<recent ISO timestamp>",
    "lastFailureCategory": null,
    "responseLatencyMs": 123,
    "cacheStatus": {
      "entries": 1,
      "ttlMs": 1800000,
      "maxEntries": 500
    }
  },
  "error": null,
  "requestId": "<non-empty value>"
}
```

Run health after the direct production browser search in step 5 when assessing
`reachable` and `lastSuccessfulRequestTime`. Before the first in-process
search, `reachable: false`, a null success time, and null latency are expected
initial state and do not prove failure. Health does not make an upstream probe.
`cacheStatus.entries` may be zero or greater; require the configured TTL and
maximum exactly as shown above.

As a negative authentication check, an otherwise identical request without
the `Authorization` header should return HTTP 401 with `ok: false` and error
code `UNAUTHENTICATED`. This confirms the health endpoint was not accidentally
made public.

## 5. Verify Nearby Trails in a production browser

1. Sign into `FRONTEND_ORIGIN` as the test member and open **Your Greatness
   Journey** / the page that loads `greatness.html`.
2. Open DevTools **Network**, enable **Preserve log**, filter for
   `nearby-trails`, and keep the Render log stream open.
3. Permit location access. Select **5 miles** first and click **Find trails near
   me** once. Do not click repeatedly (the endpoint permits 10 searches per
   minute).
4. In Network, open the POST request to
   `/api/me/greatness/nearby-trails/search`. Confirm it went to the intended
   production backend, has HTTP 200, and has a non-empty `requestId`. Save a
   HAR with sensitive headers/cookies removed, or paste a redacted request and
   response.
5. Require `ok: true`, `error: null`, and `data.trails` as a non-empty array.
   Require every displayed result to have a name, finite coordinates and
   `distanceFromUserMeters`, `provider: "Google Places"`, a Google
   `providerUrl`, and `attribution: "Google Places"`. Require nearest-first
   distances in both payload and UI. Optional metadata may legitimately show
   as unavailable.
6. Record `searchedAt`, `cached`, `stale`, and `locationStored`. A fresh proof
   requires `cached: false`, `stale: false`, and `locationStored: false`, plus
   the corresponding Google response log. `cached: true, stale: false` is a
   valid cache hit but not fresh-provider evidence. `stale: true` means Google
   failed and older cached data was served; it is not readiness evidence.
7. Confirm the UI reports `<n> trails found, nearest first`, renders results,
   and **Open directions** / **View details** point to Google URLs. Take a
   screenshot with precise coordinates and authentication data excluded.
8. Repeat with **10 miles** only if 5 miles returns
   `TRAIL_SEARCH_NO_RESULTS`. Do not treat a no-results response as provider
   failure when the provider log is HTTP 200/`OK`.

## Stable diagnostic and API codes

| Code | Where it appears | Meaning and action |
| --- | --- | --- |
| `OK` | Startup or response log | Configuration was found at startup, or that specific Google response was parsed with no normalization loss. Only a response log with HTTP 200 plus successful route evidence proves a live call. |
| `TRAIL_PROVIDER_NOT_CONFIGURED` | Startup/selection log or API error (503) | The key is empty/unavailable to the process, the selected provider is invalid, or no provider is usable. Verify the Render environment is attached to this service and redeploy/restart; never paste the key. |
| `TRAIL_PROVIDER_AUTH_FAILED` | Response log and API error (503) | Google returned 401/403. Check key validity, API restrictions, project/billing status, and that Places API (New) is enabled. API enablement alone does not prove the key is authorized. |
| `TRAIL_PROVIDER_QUOTA_EXCEEDED` | Response log and API error (503) | Google returned 429 with a quota reason. Inspect Google Cloud quota/billing and request metrics. Do not classify this as ordinary throttling. |
| `TRAIL_PROVIDER_RATE_LIMITED` | Response log and API error (503) | Google returned another 429. Slow retries and inspect per-minute/provider limits. This differs from the application's own search limiter, which can return HTTP 429 without this provider code. |
| `TRAIL_PROVIDER_TIMEOUT` | Response log and API error (504) | Fetch aborted or timed out (10,000 ms with the supplied setting). Check `durationMs`, Render egress, and Google latency. A stale cache response can hide this from the browser, so inspect logs and `stale`. |
| `TRAIL_PROVIDER_UNAVAILABLE` | Response log and API error (503) | Network/fetch failure or Google 5xx. Check `httpStatus` (null suggests no HTTP response), provider status, egress/DNS, and retry later. |
| `TRAIL_PROVIDER_BAD_RESPONSE` | Response log and API error (502) | Google returned non-JSON/malformed JSON, an unexpected payload shape, or a non-401/403/429 4xx. Save the status and sanitized diagnostic; verify request/API contract and restrictions. |
| `TRAIL_PROVIDER_CONFIGURATION_ERROR` | API error (503; principally the Overpass implementation) | Provider configuration is structurally invalid. It is not expected from the configured Google branch; its appearance suggests wrong selection/build or an unexpected code path. |
| `TRAIL_NORMALIZATION_PARTIAL` | Response and normalization logs (warning) | Google responded successfully, but one or more places lacked required id/name/coordinates. Compare `resultCount`, `normalizedCount`, and `normalizationFailures`. Accept only if usable results remain and the loss is understood. |

Two stable search-domain codes can reach the same endpoint but are not Google
provider failures:

| Code | Meaning and action |
| --- | --- |
| `TRAIL_SEARCH_INVALID_INPUT` (400) | Coordinates, allowed radius, or limit failed server validation; correct the client request. Allowed radii are 8046.72, 16093.44, 40233.6, and 80467.2 metres; limit is an integer from 1 through 25. |
| `TRAIL_SEARCH_NO_RESULTS` (404) | Google calls succeeded but normalization/deduplication produced no trails. Try the next allowed radius and compare the Google `resultCount` and `normalizedCount`; do not diagnose auth or availability from this code. |

## Evidence to paste back for a readiness decision

Paste all of the following, with timestamps and the tested production origins,
while redacting API keys, bearer tokens, cookies, and precise coordinates:

1. The deployed commit identifier and Render deploy/restart timestamp.
2. Both complete startup log objects: Google initialization and provider
   selection.
3. The complete `npm run test:trails-live` stdout/stderr and exit status.
4. The authenticated health HTTP status and full JSON envelope, captured after
   the browser search, plus the unauthenticated check's status/error code.
5. The browser POST status and redacted JSON envelope, including `requestId`,
   trail count, providers/attributions, `searchedAt`, `cached`, `stale`, and
   `locationStored`.
6. The matching complete Render `[trail-provider]` response log object(s),
   correlated by timestamp, including HTTP status, duration, result counts,
   normalization failures, and code. Provider logs do not contain the route
   `requestId`, so correlation is by a narrow timestamp window.
7. A production UI screenshot showing the success message and rendered trail
   cards, with private location/authentication information excluded.
8. Every failure/warning line encountered, including the first stable code and
   whether a stale cache response was served. Do not paste only the final retry.

The system is ready only if startup selects configured Google Places, the live
script passes, a fresh authenticated browser request returns usable Google
results, the matching provider log reports a successful Google response, and
post-search health records a recent success with the configured cache values.
Until that live evidence is pasted back, production success is **not proven**.
