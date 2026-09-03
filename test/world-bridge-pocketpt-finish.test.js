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

test("launch-side bridge debug board reports the first sanitized failure", () => {
  const source = read("public/world-bridge-launch.js");
  for (const stage of ["PUSHUP_PAGE", "AUTH_READY", "BACKEND_RESOLVED", "SESSION_CREATE", "ARENA_NAVIGATION"]) {
    assert.match(source, new RegExp(stage));
  }
  assert.match(source, /FIRST FAILURE/);
  assert.match(source, /Copy Debug Report/);
  assert.match(source, /Bearer \[REDACTED\]/);
  assert.match(source, /ticket=\[REDACTED\]/);
});

test("arena shell uses server-owned return config then exchanges fragment ticket before bootstrap and Godot load", () => {
  const html = read("public/arena-push-up.html");
  assert.match(html, /arena-push-up\.js/);
  const source = read("public/arena-push-up.js");
  const config = source.indexOf("/api/game/config");
  const exchange = source.indexOf("/api/game/session-exchange");
  const bootstrap = source.indexOf("/api/game/bootstrap");
  const godotEntry = source.indexOf("/game/push-up-arena/index.html");
  assert.ok(config >= 0, "server-owned arena config route must be present");
  assert.ok(exchange > config, "ticket exchange must follow arena config");
  assert.ok(bootstrap > exchange, "bootstrap must follow ticket exchange");
  assert.ok(godotEntry > bootstrap, "Godot load must follow authenticated bootstrap");
  assert.match(source, /history\.replaceState/);
  assert.doesNotMatch(source, /new URLSearchParams\(location\.search\).*returnTo/);
});

test("arena debug command board traces every bridge boundary through Godot handshake", () => {
  const html = read("public/arena-push-up.html");
  const source = read("public/arena-push-up.js");
  const diagnostics = read("public/arena-diagnostics.js");
  for (const stage of ["ARENA_SHELL", "CONFIG", "TICKET_PRESENT", "SESSION_EXCHANGE", "FRAGMENT_SCRUB", "BOOTSTRAP", "IDENTITY", "BUILD_PROBE", "IFRAME_LOAD", "GODOT_HANDSHAKE", "EXIT_REVOKE"]) {
    assert.match(diagnostics, new RegExp(stage));
  }
  assert.match(html, /Arena Diagnostics/);
  assert.match(html, /arena-diagnostics\.js/);
  assert.match(diagnostics, /FIRST FAILURE/);
  assert.match(diagnostics, /Copy Debug Report/);
  assert.match(source, /POCKETPT_GODOT_BRIDGE/);
  assert.match(source, /data\.event === 'READY'/);
  assert.match(source, /data\.event === 'ERROR'/);
  assert.match(diagnostics, /event\.origin === origin/);
  assert.match(diagnostics, /event\.source === frame\.contentWindow/);
});

test("arena exit explicitly revokes the scoped arena session before returning to PocketPT", () => {
  const html = read("public/arena-push-up.html");
  const source = read("public/arena-push-up.js");
  assert.match(html, /data-arena-exit/);
  assert.match(source, /jsonFetch\('\/api\/game\/session',\s*\{method: 'DELETE'/);
  assert.match(source, /credentials: 'same-origin'/);
  assert.match(source, /location\.assign\(destination \|\| returnTo\)/);
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
