"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createTrailResponseDiagnostics, logTrailResponseException } = require("../src/middleware/trailResponseDiagnostics");

function harness() {
  const entries = [];
  const logger = { info: (...args) => entries.push(args), error: (...args) => entries.push(args) };
  const req = { path: "/api/me/greatness/nearby-trails/search", requestId: "trail-request-42", auth: { userId: "member-7" }, hostname: "fitness.example", get: name => ({ "user-agent": "Mobile Safari", host: "fitness.example" })[name] };
  const res = new EventEmitter();
  res.headersSent = false; res.statusCode = 200; res.headers = {};
  res.getHeader = name => res.headers[name];
  res.setHeader = (name, value) => { res.headers[name.toLowerCase()] = value; };
  res.write = () => true;
  res.end = () => { res.headersSent = true; };
  res.send = body => { res.setHeader("content-type", "application/json; charset=utf-8"); res.setHeader("content-length", Buffer.byteLength(body)); return res.end(body); };
  res.json = body => res.send(JSON.stringify(body));
  createTrailResponseDiagnostics({ logger })(req, res, () => {});
  return { req, res, entries, logger };
}

test("nearby trail response diagnostics correlate identity, headers, and exact bytes", () => {
  const { res, entries } = harness();
  const body = { ok: true, data: { trails: [{ id: "one" }] } };
  const expectedBytes = Buffer.byteLength(JSON.stringify(body));
  res.json(body); res.emit("finish"); res.emit("close");
  const before = entries.find(([, value]) => value.event === "before_send")[1];
  const finish = entries.find(([, value]) => value.event === "finish")[1];
  assert.equal(before.requestId, "trail-request-42");
  assert.equal(before.userId, "member-7");
  assert.equal(before.userAgent, "Mobile Safari");
  assert.equal(before.preparedBodyBytes, expectedBytes);
  assert.equal(finish.bytesWritten, expectedBytes);
  assert.equal(finish.resJsonExecuted, true);
  assert.equal(finish.resEndExecuted, true);
  assert.equal(finish.contentLength, expectedBytes);
  assert.equal(finish.compressionEnabled, false);
  assert.equal(finish.responseStreamClosedEarly, false);
});

test("nearby trail response diagnostics report early close and post-header exceptions", () => {
  const { req, res, entries, logger } = harness();
  res.headersSent = true;
  res.emit("close");
  logTrailResponseException(req, res, new Error("stream failed"), logger);
  assert.equal(entries.find(([, value]) => value.event === "close")[1].responseStreamClosedEarly, true);
  const exception = entries.find(([, value]) => value.event === "exception")[1];
  assert.equal(exception.exceptionAfterHeadersSent, true);
  assert.equal(exception.errorMessage, "stream failed");
});
