"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

test("frontend code has no stale calls to retired auth routes", () => {
  const indexHtml = read("public/index.html");
  const backendRead = read("public/backend-read.js");
  const sessionWrite = read("public/session-write.js");
  const combined = `${indexHtml}\n${backendRead}\n${sessionWrite}`;

  assert.doesNotMatch(combined, /\/api\/auth\/bridge/, "stale /api/auth/bridge call found in frontend code");
  assert.doesNotMatch(combined, /\/api\/auth\/login/, "stale /api/auth/login call found in frontend code");
  assert.doesNotMatch(combined, /\/api\/auth\/pilot-login/, "stale /api/auth/pilot-login call found in frontend code");
  assert.doesNotMatch(combined, /\/api\/auth\/pilot-session/, "stale /api/auth/pilot-session call found in frontend code");
});

test("session-write keeps shared APP_AUTH getter wiring for pilot mode", () => {
  const indexHtml = read("public/index.html");
  const sessionWrite = read("public/session-write.js");

  assert.match(indexHtml, /getAuthToken:\s*\(\)\s*=>\s*getAuthToken\(\)/, "session-write client wiring does not use shared APP_AUTH getter");
  assert.match(indexHtml, /getAuthTokenInfo:\s*\(\)\s*=>\s*getAuthTokenInfo\(\)/, "session-write client wiring does not expose source-aware auth getter");
  assert.match(sessionWrite, /function resolveAuthTokenInfo\(\)/, "session-write client does not resolve the injected source-aware token getter");
  assert.match(sessionWrite, /normalizeAuthTokenInfo\(getAuthToken\?\.\(\)\)/, "session-write client does not keep injected getAuthToken fallback");
});
