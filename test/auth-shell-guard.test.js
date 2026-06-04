const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

function readShell() {
  return fs.readFileSync(path.join(repoRoot, "public/workout.html"), "utf8");
}

test("canonical auth shell keeps authLoginForm and does not force builder auth", () => {
  const html = readShell();
  assert.match(html, /<form id="authLoginForm" action="javascript:void\(0\)" method="post"/, "canonical auth form should remain present");
  assert.match(html, /<script src="\/auth-core\.js" defer><\/script>/, "auth-core must own login submit handling");
  assert.match(html, /const BUILDER_MODE_FULL_ACCESS = false/, "builder full-access mode must be disabled in product shell");
  assert.match(html, /let DISABLE_LOGIN_FOR_PILOT = false/, "frontend pilot bypass flag must default off");
  assert.match(html, /window\.pilotSuperAdminActive = false/, "pilot super-admin flag must default off");
  assert.doesNotMatch(html, /BUILDER MODE — FULL ACCESS — SECURITY DISABLED/, "builder bypass banner should not ship in canonical auth shell");
  assert.doesNotMatch(html, /forceBuilderFullAccessAuthState/, "forced builder auth helper must not ship in canonical auth shell");
  assert.doesNotMatch(html, /window\.APP_AUTH\s*=\s*\{\s*isAuthenticated:\s*true,\s*token:\s*null,/, "shell must not force tokenless authenticated APP_AUTH");
});

test("legacy auth blockers remain absent while canonical login form is preserved", () => {
  const html = readShell();
  assert.doesNotMatch(html, /id="authScreen"/, "legacy auth screen should be removed");
  assert.doesNotMatch(html, /id="loginOverlay"/, "legacy login overlay should not exist");
  assert.doesNotMatch(html, /\/api\/auth\/bridge/, "frontend shell must not call /api/auth/bridge");
  assert.doesNotMatch(html, /\/api\/auth\/pilot-login/, "frontend shell must not call /api/auth/pilot-login");
  assert.doesNotMatch(html, /accounts\.google\.com\/gsi\/client/, "Google GIS script should not exist");
  assert.doesNotMatch(html, /google\.accounts\.id\./, "Google GIS API references should not exist");
  assert.doesNotMatch(html, /pilotEmail|pilot_email|pilotLoginBtn|pilot-session/i, "pilot email dependencies should not exist in shell");
});

test("canonical boot uses initializeAuth and keeps handler diagnostics", () => {
  const html = readShell();
  assert.match(html, /await initializeAuth\(\);/, "boot must use canonical auth restore path");
  assert.doesNotMatch(html, /if \(BUILDER_MODE_FULL_ACCESS \|\| DISABLE_LOGIN_FOR_PILOT\)/, "boot must not choose pilot bypass before canonical auth");
  assert.match(html, /const finalHandlerChecks = \{[\s\S]*dashboard:[\s\S]*camera:[\s\S]*workoutLibrary:/, "final handler checks for dashboard/camera/workout library missing");
  assert.match(html, /updateAppBootStatus\("dashboard handler attached"/, "dashboard handler boot status missing");
  assert.match(html, /updateAppBootStatus\("camera handler attached"/, "camera handler boot status missing");
  assert.match(html, /updateAppBootStatus\("workout library handler attached"/, "workout library handler boot status missing");
});
