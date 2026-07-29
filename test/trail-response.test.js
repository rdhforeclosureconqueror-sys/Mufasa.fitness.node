"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

async function subject() {
  const source = fs.readFileSync(path.join(__dirname, "../public/trail-response.js"), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}
const response = (body, status = 200) => new Response(body, { status, headers: { "content-type": "application/json" } });

test("accepts current and rollout-era trail response envelopes", async () => {
  const { parseTrailSearchResponse } = await subject(); const trails = [{ id: "trail-1", trailRouteId: null }];
  assert.deepEqual(await parseTrailSearchResponse(response(JSON.stringify({ ok: true, data: { trails, searchedAt: "now", cached: false, stale: false }, error: null, requestId: "sanitized" }))), { trails, searchedAt: "now", cached: false, stale: false });
  assert.deepEqual((await parseTrailSearchResponse(response(JSON.stringify({ trails })))).trails, trails);
  assert.deepEqual((await parseTrailSearchResponse(response(JSON.stringify(trails)))).trails, trails);
  assert.deepEqual((await parseTrailSearchResponse(response(JSON.stringify({ data: { trails } })))).trails, trails);
});

test("rejects HTML, empty, malformed JSON, and an invalid successful contract", async () => {
  const { parseTrailSearchResponse } = await subject();
  for (const body of ["<html>old deployment</html>", "", "{"]) await assert.rejects(parseTrailSearchResponse(response(body)), error => error.code === "MALFORMED_RESPONSE" && error.parseSucceeded === false);
  await assert.rejects(parseTrailSearchResponse(response(JSON.stringify({ ok: true, data: { results: [] } }))), error => error.code === "MALFORMED_RESPONSE" && error.httpStatus === 200);
});

test("reports the exact parser evidence and validation rule", async () => {
  const { parseTrailSearchResponse } = await subject();
  const events = [];
  const html = "<!doctype html><html><body>login required</body></html>";
  await assert.rejects(parseTrailSearchResponse(new Response(html, { status: 200, headers: { "content-type": "text/html" } }), { logger: (stage, details) => events.push({ stage, details }) }), error => {
    assert.equal(error.name, "TrailResponseError");
    assert.match(error.message, /SyntaxError/);
    assert.equal(error.validationStep, "JSON required; HTML response received");
    assert.equal(error.diagnostic.rawResponseBody, html);
    assert.equal(error.diagnostic.responseKind, "HTML");
    assert.equal(error.diagnostic.contentType, "text/html");
    return true;
  });
  assert.equal(events[0].stage, "response_received_before_validation");
  assert.equal(events[0].details.httpStatus, 200);

  await assert.rejects(parseTrailSearchResponse(response(JSON.stringify({ success: true, trailsFound: [] }))), error => {
    assert.deepEqual(error.diagnostic.parsedObjectKeys, ["success", "trailsFound"]);
    assert.match(error.diagnostic.receivedSchema, /success: boolean/);
    assert.equal(error.validationStep, "successful response envelope must contain a trails array");
    return true;
  });
});

test("truncates raw diagnostic bodies to 500 characters", async () => {
  const { parseTrailSearchResponse } = await subject();
  await assert.rejects(parseTrailSearchResponse(new Response("x".repeat(700), { headers: { "content-type": "text/plain" } })), error => error.diagnostic.rawResponseBody.length === 500 && error.diagnostic.rawResponseTruncated === true);
});

test("classifies authentication and provider HTTP failures before contract validation", async () => {
  const { parseTrailSearchResponse } = await subject();
  await assert.rejects(parseTrailSearchResponse(response(JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED", message: "Sign in" } }), 401)), error => error.code === "AUTH_REQUIRED" && error.httpStatus === 401);
  await assert.rejects(parseTrailSearchResponse(response(JSON.stringify({ ok: false, error: { code: "TRAIL_PROVIDER_UNAVAILABLE", message: "Unavailable" } }), 503)), error => error.code === "TRAIL_PROVIDER_UNAVAILABLE" && error.httpStatus === 503);
});

test("map failure remains isolated from valid trail results and missing geometry stays explicit", () => {
  const js = fs.readFileSync(path.join(__dirname, "../public/greatness.js"), "utf8");
  assert.match(js, /Interactive map unavailable\. Trail results remain available\./);
  assert.match(js, /Trail route not yet verified/);
  assert.match(js, /const mapAvailable=await renderNearbyTrails/);
  assert.match(js, /return true;}catch\(error\).*map_render_failure.*return false;/);
});
