"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("push-up arena launcher uses canonical auth navigation before world launch", () => {
  const page = read("public/push-up-challenge.html");
  const authNavigationIndex = page.indexOf("/auth-navigation.js");
  const launcherIndex = page.indexOf("/world-bridge-launch.js");
  assert.ok(authNavigationIndex >= 0, "push-up page must load auth-navigation.js");
  assert.ok(launcherIndex > authNavigationIndex, "auth navigation must load before the world launcher");

  const launcher = read("public/world-bridge-launch.js");
  assert.match(launcher, /AuthNavigation\?\.requireUser/);
  assert.match(launcher, /returnTo:\s*currentReturnTo\(\)/);
  assert.match(launcher, /AUTH_REDIRECT/);
  assert.match(launcher, /MaatApiClient\?\.origin\?\.\(\)/);
  assert.match(launcher, /\/api\/game\/sessions/);
});

test("unauthenticated device flow does not invent or expose a credential", () => {
  const launcher = read("public/world-bridge-launch.js");
  assert.doesNotMatch(launcher, /localStorage\s*\.\s*getItem\s*\(\s*["']maatAuthToken/);
  assert.doesNotMatch(launcher, /sessionStorage\s*\.\s*getItem\s*\(\s*["']maatAuthToken/);
  assert.doesNotMatch(launcher, /ticket=.*token/i);
  assert.match(launcher, /authorization:\s*`Bearer \$\{token\}`/);
});
