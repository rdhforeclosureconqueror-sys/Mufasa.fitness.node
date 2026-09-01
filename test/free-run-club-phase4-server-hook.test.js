"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("production world-bridge entrypoint installs Free Run Club APIs", () => {
  const source = read("world-bridge-server.js");
  assert.match(source, /createFreeRunClubCommunityService/);
  assert.match(source, /installFreeRunClubCommunityRoutes/);
  assert.match(source, /installFreeRunClub\(app, options\)/);
  assert.match(source, /pocketPTFreeRunClub/);
});

test("Run Club service uses canonical userStore loadUser instead of nonexistent getUser", () => {
  const source = read("src/services/freeRunClubCommunityService.js");
  assert.match(source, /userStore\.loadUser/);
  assert.doesNotMatch(source, /userStore\.getUser/);
});

test("Run Club route module registers profile board and diagnostic endpoints", () => {
  const source = read("src/routes/freeRunClubCommunityRoutes.js");
  for (const route of [
    '/api/me/run-club/profile',
    '/api/me/run-club/board',
    '/api/me/run-club/diagnostic'
  ]) assert.ok(source.includes(route), `missing ${route}`);
});
