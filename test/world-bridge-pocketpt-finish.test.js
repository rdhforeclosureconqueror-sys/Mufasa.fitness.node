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

test("arena shell uses server-owned return config then exchanges fragment ticket before bootstrap and Godot load", () => {
  const html = read("public/arena-push-up.html");
  const config = html.indexOf("/api/game/config");
  const exchange = html.indexOf("/api/game/session-exchange");
  const bootstrap = html.indexOf("/api/game/bootstrap");
  const godotEntry = html.indexOf("/game/push-up-arena/index.html");
  assert.ok(config >= 0, "server-owned arena config route must be present");
  assert.ok(exchange > config, "ticket exchange must follow arena config");
  assert.ok(bootstrap > exchange, "bootstrap must follow ticket exchange");
  assert.ok(godotEntry > bootstrap, "Godot load must follow authenticated bootstrap");
  assert.match(html, /history\.replaceState/);
  assert.doesNotMatch(html, /new URLSearchParams\(location\.search\).*returnTo/);
});

test("arena exit explicitly revokes the scoped arena session before returning to PocketPT", () => {
  const html = read("public/arena-push-up.html");
  assert.match(html, /data-arena-exit/);
  assert.match(html, /fetch\('\/api\/game\/session',\s*\{\s*method:'DELETE'/);
  assert.match(html, /credentials:'same-origin'/);
  assert.match(html, /location\.assign\(destination \|\| returnTo\)/);
});

test("world bridge owns the canonical PocketPT return URL", () => {
  const source = read("src/world/worldBridge.js");
  assert.match(source, /FRONTEND_PUBLIC_URL/);
  assert.match(source, /\/api\/game\/config/);
  assert.match(source, /returnUrl:\s*canonicalReturnUrl\(\)/);
  assert.doesNotMatch(source, /launchUrl:.*returnTo=/);
});

test("Render starts the bounded world bridge server", () => {
  const render = read("render.yaml");
  assert.match(render, /startCommand:\s*node world-bridge-server\.js/);
  assert.match(render, /FRONTEND_PUBLIC_URL/);
  assert.match(render, /https:\/\/mufasafitsite\.onrender\.com/);
});
