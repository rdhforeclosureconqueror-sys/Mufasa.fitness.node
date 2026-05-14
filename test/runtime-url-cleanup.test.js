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


test("dashboard page receives split-deployment backend runtime config before dashboard scripts", () => {
  const source = fs.readFileSync(path.join(repoRoot, "public/dashboard.html"), "utf8");
  const configIndex = source.indexOf('backendOrigin: "https://mufasa-fitness-node.onrender.com"');
  const runtimeStateIndex = source.indexOf('<script src="/runtime-state.js');
  const backendReadIndex = source.indexOf('<script src="/backend-read.js"');
  const dashboardRuntimeIndex = source.indexOf('<script src="/dashboard-runtime.js');
  const dashboardJsIndex = source.indexOf('<script src="/dashboard.js');

  assert.notEqual(configIndex, -1, "public/dashboard.html must configure the split-deployment backend origin");
  assert.notEqual(runtimeStateIndex, -1, "public/dashboard.html must load runtime-state.js");
  assert.notEqual(backendReadIndex, -1, "public/dashboard.html must load backend-read.js");
  assert.notEqual(dashboardRuntimeIndex, -1, "public/dashboard.html must load dashboard-runtime.js");
  assert.notEqual(dashboardJsIndex, -1, "public/dashboard.html must load dashboard.js");
  assert.ok(configIndex < runtimeStateIndex, "dashboard backend origin config must run before runtime-state.js");
  assert.ok(runtimeStateIndex < backendReadIndex, "runtime-state.js must load before backend-read.js on dashboard");
  assert.ok(backendReadIndex < dashboardRuntimeIndex, "backend-read.js must load before dashboard-runtime.js");
  assert.ok(dashboardRuntimeIndex < dashboardJsIndex, "dashboard-runtime.js must load before dashboard.js");
});

test("dashboard history and diagnostics routes are built from backend origin", () => {
  const dashboard = fs.readFileSync(path.join(repoRoot, "public/dashboard.js"), "utf8");
  const dashboardRuntime = fs.readFileSync(path.join(repoRoot, "public/dashboard-runtime.js"), "utf8");

  assert.match(dashboard, /const nodeBaseUrl = \(window\.RuntimeState\?\.getBackendOrigin\?\.\(\)/, "dashboard.js must prefer RuntimeState backend origin");
  assert.match(dashboard, /fetch\(backendUrl\("\/__version"\)/, "dashboard __version check must use backendUrl()");
  assert.match(dashboard, /fetch\(backendUrl\("\/__diagnostic-smoke"\)/, "dashboard smoke check must use backendUrl()");
  assert.match(dashboard, /fetch\(backendUrl\("\/api\/admin\/diagnostics\/report"\)/, "dashboard diagnostics report must use backendUrl()");
  assert.match(dashboardRuntime, /fetch\(`\$\{getBaseUrl\(\)\}\$\{path\}`/, "dashboard runtime requests must use getBaseUrl()");
  assert.match(dashboardRuntime, /`\/api\/me\/history\?limit=\$\{encodeURIComponent\(limit\)\}`/, "dashboard history must request /api/me/history with the requested limit");
});

test("index page guards missing calendarApplyBtn references", () => {
  const source = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");
  assert.match(source, /function getCalendarApplyButton\(\) \{[\s\S]*return document\.getElementById\("calendarApplyBtn"\);[\s\S]*\}/, "index should resolve the optional calendar button through document.getElementById");
  assert.match(source, /const calendarApplyBtn = getCalendarApplyButton\(\);/, "index should define calendarApplyBtn before optional handler checks use it");
  assert.match(source, /calendar: typeof calendarApplyBtn\?\.onclick === "function"/, "calendar handler checks should remain optional");
});

test("camera activation path delegates click handling to connectCamera and getUserMedia", () => {
  const buttonRuntime = fs.readFileSync(path.join(repoRoot, "public/button-runtime.js"), "utf8");
  const workoutRuntime = fs.readFileSync(path.join(repoRoot, "public/workout-runtime.js"), "utf8");
  const index = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");

  assert.match(buttonRuntime, /refs\.connectBtn\) refs\.connectBtn\.onclick = async \(\) => \{[\s\S]*return globalScope\.connectCamera\(\);[\s\S]*\};/, "camera button should invoke global connectCamera from a user click");
  assert.match(index, /if \(typeof connectCamera === "function"\) window\.connectCamera = connectCamera;/, "index should expose connectCamera after activation wiring");
  assert.match(workoutRuntime, /global\.navigator\?\.mediaDevices\?\.getUserMedia/, "WorkoutRuntime should check getUserMedia support");
  assert.match(workoutRuntime, /global\.navigator\.mediaDevices\.getUserMedia\(\{ video: true, audio: false \}\)/, "WorkoutRuntime should request the camera stream");
  assert.match(workoutRuntime, /const video = getVideoElement\(\);[\s\S]*video\.srcObject = stream;[\s\S]*await video\.play\(\);/, "WorkoutRuntime should attach the stream to a video element and play it");
});

test("index defines toSafeUserId before hydration config uses it", () => {
  const source = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");
  const helperIndex = source.indexOf("function toSafeUserId(value)");
  const configureIndex = source.indexOf("window.AppHydrationRuntime?.configure");
  const depIndex = source.indexOf("toSafeUserId,", configureIndex);

  assert.notEqual(helperIndex, -1, "index should define a local toSafeUserId fallback helper");
  assert.notEqual(configureIndex, -1, "index should configure AppHydrationRuntime");
  assert.notEqual(depIndex, -1, "AppHydrationRuntime should receive toSafeUserId explicitly");
  assert.ok(helperIndex < depIndex, "toSafeUserId must be defined before hydration config uses the shorthand dependency");
  assert.match(source, /window\.toSafeUserId = window\.toSafeUserId \|\| toSafeUserId;/, "toSafeUserId should also be exposed for runtime diagnostics/fallbacks");
});

test("app runtime primary button gating leaves navigation enabled and documents blocked workout controls", () => {
  const runtime = fs.readFileSync(path.join(repoRoot, "public/app-runtime.js"), "utf8");

  assert.match(runtime, /function supportsCamera\(\)\{ return Boolean\(globalScope\.navigator\?\.mediaDevices\?\.getUserMedia\); \}/, "camera support must be detected via navigator.mediaDevices.getUserMedia");
  assert.match(runtime, /setButtonEnabled\(globalScope\.document\.getElementById\('dashboardBtn'\), true, reasons\.dashboard\);/, "authenticated dashboard navigation should remain enabled");
  assert.match(runtime, /setButtonEnabled\(globalScope\.document\.getElementById\('exerciseLibraryBtn'\), true, reasons\.library\);/, "authenticated exercise library navigation should remain enabled");
  assert.match(runtime, /setButtonEnabled\(globalScope\.document\.getElementById\('connectBtn'\), supportsCamera\(\), reasons\.camera\);/, "camera button should be enabled only when browser camera support exists");
  assert.match(runtime, /Connect camera before starting a workout/, "start workout disabled state should explain the camera/workout prerequisite");
  assert.match(runtime, /Connect camera before expanding the camera preview/, "expand camera disabled state should explain the camera prerequisite");
  assert.match(runtime, /Connect camera before starting the overhead squat assessment/, "assessment disabled state should explain the camera prerequisite");
  assert.match(runtime, /start workout disabled reason:/, "feature panel should surface the start workout disabled reason");
});

test("primary button destinations remain dashboard and exercise library pages", () => {
  const buttonRuntime = fs.readFileSync(path.join(repoRoot, "public/button-runtime.js"), "utf8");

  assert.match(buttonRuntime, /globalScope\.location\.href = "\/dashboard\.html";/, "My Dashboard should navigate to /dashboard.html");
  assert.match(buttonRuntime, /globalScope\.location\.href = "\/exercise-library\.html";/, "Exercise Library should navigate to /exercise-library.html");
});
