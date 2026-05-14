const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const activeFrontendFiles = [
  "public/runtime-state.js",
  "public/index.html",
  "public/diagnostics-client.js",
  "public/dashboard.js",
  "public/backend-read.js",
  "public/session-write.js",
  "public/app-runtime.js",
  "public/dashboard-runtime.js",
  "public/auth-core.js",
  "public/auth-state-runtime.js",
  "public/boot-core.js",
  "public/landing-diagnostics.js",
  "public/profile-write-runtime.js",
  "public/retention-flow.js",
  "public/exercise-library.js",
  "public/fitness.js"
];

test("Phase 5B/5C active frontend files do not pin app-owned Render backend origins outside static runtime config", () => {
  for (const rel of activeFrontendFiles.filter((file) => file !== "public/index.html")) {
    const source = fs.readFileSync(path.join(repoRoot, rel), "utf8");
    assert.doesNotMatch(source, /https:\/\/mufasa-fitness-node\.onrender\.com/, `${rel} must use the runtime backend resolver instead of the Render backend origin`);
  }
});

test("static frontend config sets backend origin before runtime auth scripts load", () => {
  const source = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");
  const configIndex = source.indexOf('backendOrigin: "https://mufasa-fitness-node.onrender.com"');
  const runtimeStateIndex = source.indexOf('<script src="/runtime-state.js');
  const authCoreIndex = source.indexOf('<script src="/auth-core.js"');

  assert.notEqual(configIndex, -1, "public/index.html must configure the split-deployment backend origin");
  assert.notEqual(runtimeStateIndex, -1, "public/index.html must load runtime-state.js");
  assert.notEqual(authCoreIndex, -1, "public/index.html must load auth-core.js");
  assert.ok(configIndex < runtimeStateIndex, "backend origin config must run before runtime-state.js");
  assert.ok(configIndex < authCoreIndex, "backend origin config must run before auth-core.js");
});

test("runtime-state exposes a same-origin default backend resolver", () => {
  const source = fs.readFileSync(path.join(repoRoot, "public/runtime-state.js"), "utf8");
  assert.match(source, /function getBackendOrigin\(\)/, "RuntimeState should expose getBackendOrigin()");
  assert.match(source, /global\.location\?\.origin/, "getBackendOrigin() should fall back to window.location.origin");
  assert.match(source, /nodeBaseUrl = configuredOrigin \|\| locationOrigin/, "configured origins may override the same-origin default");
});
