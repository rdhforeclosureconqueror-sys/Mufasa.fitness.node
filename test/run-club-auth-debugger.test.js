"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("public/run-club-login.html", "utf8");
const js = fs.readFileSync("public/run-club-login.js", "utf8");

test("failed-login debugger is permanently present and copyable", () => {
  assert.match(html, /id="authDebugger"/);
  assert.match(html, /Copy Redacted Auth Trace/);
  assert.match(js, /preserveTokenOn401: true/);
  assert.ok(js.indexOf("const beforeCleanup") < js.indexOf("clearCanonicalAuthState"));
  assert.ok(js.indexOf("const capturedTrace") < js.indexOf("clearCanonicalAuthState"));
  assert.ok(js.indexOf("clearCanonicalAuthState") < js.indexOf('capturedTrace["token state immediately after cleanup"]'));
});

test("redacted trace contains required production-safe auth fields", () => {
  for (const field of ["frontend build/version", "backend resolved URL", "token fingerprint SHA-256 prefix", "Authorization header attached", "backend authentication reason code", "same backend instance/build", "signer/verifier fingerprints match", "token state immediately before cleanup", "token state immediately after cleanup"]) assert.match(js, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const renderedFields = js.slice(js.indexOf("renderAuthTrace({"), js.indexOf("});", js.indexOf("renderAuthTrace({")));
  assert.doesNotMatch(renderedFields, /password|authorization value|account identity/i);
});
