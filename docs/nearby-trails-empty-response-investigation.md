# Nearby Trails empty-response investigation

The existing browser observation does **not** establish whether the application server wrote a body. An HTTP 200 with no client-visible `Content-Type` or body can be produced before, at, or after the application process. Do not assign a root cause until one request ID appears in both the server and client evidence.

## Capture procedure

1. Deploy the instrumented server and browser assets from the same commit.
2. Run one desktop search and one iPhone Safari search. Preserve the `x-request-id` shown as `requestId` in the browser trail diagnostic snapshot.
3. Find the server `[nearby-trails-response]` records with that exact request ID. The `finish` record is the application byte count; also retain `before_send`, `close`, and any `exception` record.
4. Compare the server `bytesWritten` with the browser `clientBytesReceived` and `cloneTextLength`. Do not compare unrelated desktop and iPhone request IDs.

## Decision rule

* `resJsonExecuted: true`, `resEndExecuted: true`, `bytesWritten > 0`, and `clientBytesReceived: 0` proves that the application handed a non-empty response to Node while the browser exposed an empty body. Investigate the reverse proxy, compression/content transformation, network path, and Safari next.
* `bytesWritten: 0` proves that the application ended this response without a body. Use the associated `before_send`, `exception`, `headersSent`, and early-close fields to isolate the backend path.
* A missing server record, mismatched request IDs, or only a client byte count is insufficient evidence. Repeat the capture rather than inferring a cause.

`bytesWritten` is counted at the Node response calls. A proxy can subsequently compress, replace, or truncate the response, so proxy wire-byte logs remain useful when application bytes and client bytes disagree.

## Three-device correlation requirements

The browser now creates the request ID before `fetch()` and sends it as
`X-Request-ID`; Node echoes the same value. Capture **desktop, iPhone, and
Android** separately. The diagnostics panel does not classify Android as a
desktop capture.

For each ID retain `fetch_resolved`, parser transport fields, and the matching
server `before_send`, `finish`, and `close` records. Server records also identify
the Render service, deployed commit, route/method, application response bytes,
and the response socket-byte delta. Browser-visible `Transfer-Encoding` can be
unavailable by design, so use the Render/proxy record for the wire value.

The reported HTTP 200/missing Content-Type/zero-byte observation alone is still
not production proof of a component-level root cause: it contains no matching
server record. Do not call the incident resolved until all three captures show
non-empty JSON and a rendered interactive map from the same deployed commit.
