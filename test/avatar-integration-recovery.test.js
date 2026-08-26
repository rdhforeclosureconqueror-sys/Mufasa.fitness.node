"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createApp } = require("../server");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("direct workout shell receives the enabled avatar flag and exposes provisioning modes", async (t) => {
  const app = createApp({ env: { ...process.env, NODE_ENV: "test", ENABLE_AVATAR_FEATURE: "true" }, dataDir: fs.mkdtempSync(path.join(os.tmpdir(), "pt-avatar-recovery-")) });
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/workout.html`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /window\.ENABLE_AVATAR_FEATURE = "true" === "true"/);
  assert.doesNotMatch(html, /__ENABLE_AVATAR_FEATURE__/);
  assert.match(html, /id="avatarCreateBtn"[^>]*>[^<]*Create Avatar/);
  assert.match(html, /value="avatar_overlay"[^>]*>Avatar Overlay/);
  assert.match(html, /value="avatar_only"[^>]*>Avatar Only/);
});

test("auth completion does not misreport a valid signed-out state as propagation failure", () => {
  const orchestrator = read("public/runtime-orchestrator.js");
  assert.doesNotMatch(orchestrator, /CRITICAL: AUTH NOT PROPAGATED/);
  assert.match(orchestrator, /authenticatedAtReady/);
});

test("Motion Lab readiness handshake survives the new-window listener race without weakening origin checks", () => {
  const launch = read("motion-lab/motion-lab-launch.js");
  assert.match(launch, /setInterval\(announceReady, 250\)/);
  assert.match(launch, /readyAttempts >= 20/);
  assert.match(launch, /event\.origin !== FRONTEND_ORIGIN/);
  assert.match(launch, /event\.source !== window\.opener/);
  assert.doesNotMatch(launch, /postMessage\([^;]+, "\*"\)/);
});
