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

test("Phase 5B/5C active frontend files do not pin app-owned Render backend origins", () => {
  for (const rel of activeFrontendFiles) {
    const source = fs.readFileSync(path.join(repoRoot, rel), "utf8");
    assert.doesNotMatch(source, /https:\/\/mufasa-fitness-node\.onrender\.com/, `${rel} must use the runtime backend resolver instead of the old Render backend origin`);
  }
});

test("runtime-state exposes a same-origin default backend resolver", () => {
  const source = fs.readFileSync(path.join(repoRoot, "public/runtime-state.js"), "utf8");
  assert.match(source, /function getBackendOrigin\(\)/, "RuntimeState should expose getBackendOrigin()");
  assert.match(source, /global\.location\?\.origin/, "getBackendOrigin() should fall back to window.location.origin");
  assert.match(source, /nodeBaseUrl = configuredOrigin \|\| locationOrigin/, "configured origins may override the same-origin default");
});
