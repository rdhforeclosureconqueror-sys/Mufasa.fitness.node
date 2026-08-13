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
  const server = read("server.js");
  for (const checkpoint of [
    "login response token", "token immediately after login normalization",
    "exact token read back from localStorage.maatAuthToken"
  ]) assert.match(login, new RegExp(checkpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const checkpoint of ["token passed into canonical persistence", "token assigned to APP_AUTH", "token returned by AuthStateRuntime"]) assert.match(runtime, new RegExp(checkpoint));
  for (const checkpoint of ["token received by canonical API client", "token immediately before Authorization header construction"]) assert.match(client, new RegExp(checkpoint));
  assert.match(backend, /token extracted by backend middleware immediately after removing Bearer/);
  assert.match(runtime, /signatureSegmentSha256Prefix/);
  assert.match(runtime, /firstMutationCheckpoint/);
  assert.match(runtime, /signatureMutationFirstObservedAt/);
  for (const field of ["compactLength", "headerLength", "payloadLength", "signatureLength", "quoteCharactersPresent", "percentEncodingIndicatorsPresent", "signatureCharacterFlags", "transformationSincePreviousCheckpoint", "firstMutatedSegment", "previousCheckpointSignatureFingerprint", "currentCheckpointSignatureFingerprint", "mutationTransitionSource"]) assert.match(runtime, new RegExp(field));
  assert.match(login, /TOKEN HANDOFF MUTATION CHECKPOINTS/);
  assert.match(login, /all 9 checkpoints present/);
  assert.match(server, /tokenHandoff: details\.tokenHandoff/);
  assert.doesNotMatch(runtime, /console\.info\([^\n]*text/);
  assert.doesNotMatch(backend, /tokenHandoffDiagnostics\([^)]*\).*console/s);
});
