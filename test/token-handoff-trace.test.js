"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("redacted token handoff tracing covers every browser and backend checkpoint", () => {
  const runtime = read("public/auth-state-runtime.js");
  const login = read("public/run-club-login.js");
  const client = read("public/api-client.js");
  const backend = read("src/middleware/auth.js");
  for (const checkpoint of [
    "raw token received from login response", "normalized token before persistence",
    "exact token written to localStorage.maatAuthToken", "exact token read back from localStorage"
  ]) assert.match(login, new RegExp(checkpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const checkpoint of ["token placed into APP_AUTH", "token returned by AuthStateRuntime"]) assert.match(runtime, new RegExp(checkpoint));
  for (const checkpoint of ["token passed into api-client", "token immediately before constructing Authorization"]) assert.match(client, new RegExp(checkpoint));
  assert.match(backend, /backend bearer value after Bearer prefix removal/);
  assert.match(runtime, /signatureSegmentSha256Prefix/);
  assert.match(runtime, /firstMutationCheckpoint/);
  assert.match(runtime, /signatureMutationFirstObservedAt/);
  assert.doesNotMatch(runtime, /console\.info\([^\n]*text/);
  assert.doesNotMatch(backend, /tokenHandoffDiagnostics\([^)]*\).*console/s);
});
