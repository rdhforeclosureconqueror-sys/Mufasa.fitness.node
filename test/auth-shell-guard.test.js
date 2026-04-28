const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

test("pilot shell boots as authenticated super-admin without login UI", () => {
  const html = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");
  assert.match(html, /PRIVATE PILOT MODE — LOGIN DISABLED/, "pilot banner text missing");
  assert.match(html, /window\.APP_AUTH\s*=\s*\{\s*isAuthenticated:\s*true,\s*token:\s*null,/, "APP_AUTH must be forced authenticated");
  assert.match(html, /role:\s*"super_admin"/, "APP_AUTH user must be super_admin");
  assert.match(html, /roles:\s*\[\s*"admin",\s*"operator",\s*"super_admin"\s*\]/, "APP_AUTH user roles must include super-admin controls");
  assert.match(html, /window\.pilotSuperAdminActive = true/, "pilot super-admin activation missing");
  assert.match(html, /window\.__pilotMode = \{ loginDisabledForPilot: true, authGateDisabled: true, pilotSuperAdminActive: true \}/, "pilot diagnostics flags missing");
});

test("legacy login and auth blockers are absent from frontend shell", () => {
  const html = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");
  assert.doesNotMatch(html, /id="authScreen"/, "auth screen should be removed");
  assert.doesNotMatch(html, /id="authLoginForm"/, "auth login form should be removed");
  assert.doesNotMatch(html, /id="loginOverlay"/, "legacy login overlay should not exist");
  assert.doesNotMatch(html, /\/api\/auth\/login/, "frontend must not call /api/auth/login");
  assert.doesNotMatch(html, /\/api\/auth\/pilot-login/, "frontend must not call /api/auth/pilot-login");
  assert.doesNotMatch(html, /\/api\/auth\/bridge/, "frontend must not call /api/auth/bridge");
  assert.doesNotMatch(html, /accounts\.google\.com\/gsi\/client/, "Google GIS script should not exist");
  assert.doesNotMatch(html, /google\.accounts\.id\./, "Google GIS API references should not exist");
  assert.doesNotMatch(html, /pilotEmail|pilot_email|pilotLoginBtn|pilot-session/i, "pilot email dependencies should not exist in shell");
});

test("pilot bypass activates immediate shell render path", () => {
  const html = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");
  assert.match(html, /app shell missing/, "missing app-shell failure reason");
  assert.match(html, /function activatePilotBypassImmediate\(\)/, "missing immediate pilot activation flow");
  assert.match(html, /renderAuthShell\(\);/, "boot must render app shell directly");
});
