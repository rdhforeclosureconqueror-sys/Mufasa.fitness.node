"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("canonical Push-Up Challenge loads the PocketPT world launch helper", () => {
  const html = read("public/push-up-challenge.html");
  assert.match(html, /world-bridge-launch\.js/);
  assert.match(html, /auth-state-runtime\.js/);
});

test("world launch helper creates only the fixed push-up arena experience", () => {
  const source = read("public/world-bridge-launch.js");
  assert.match(source, /experienceType:\s*"PUSH_UP_ARENA"/);
  assert.match(source, /challengeId:\s*"push_up"/);
  assert.match(source, /\/api\/game\/sessions/);
  assert.match(source, /AuthStateRuntime\?\.whenReady/);
  assert.doesNotMatch(source, /[?&](token|access_token)=/i);
});

test("arena shell exchanges fragment ticket before bootstrap and Godot load", () => {
  const html = read("public/arena-push-up.html");
  const exchange = html.indexOf("/api/game/session-exchange");
  const bootstrap = html.indexOf("/api/game/bootstrap");
  const godotEntry = html.indexOf("/game/push-up-arena/index.html");
  assert.ok(exchange >= 0, "arena exchange route must be present");
  assert.ok(bootstrap > exchange, "bootstrap must follow ticket exchange");
  assert.ok(godotEntry > bootstrap, "Godot load must follow authenticated bootstrap");
  assert.match(html, /history\.replaceState/);
});

test("Render starts the bounded world bridge server", () => {
  const render = read("render.yaml");
  assert.match(render, /startCommand:\s*node world-bridge-server\.js/);
});
