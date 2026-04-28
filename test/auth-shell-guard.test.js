const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

test("login screen appears and boot validates stored token via /api/auth/me", () => {
  const html = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");
  assert.match(html, /id="authScreen"/, "auth screen container missing");
  assert.match(html, /id="authLoginForm"/, "auth form missing");
  assert.match(html, /\/api\/auth\/me/, "boot auth me route missing");
  assert.match(html, /popa_auth_token/, "auth token storage key missing");
  assert.match(html, /popa_auth_user/, "auth user storage key missing");
  assert.match(html, /window\.APP_AUTH\s*=\s*window\.APP_AUTH\s*\|\|\s*\{\s*isAuthenticated:\s*false,\s*token:\s*null,\s*user:\s*null\s*\}/, "APP_AUTH bootstrap missing");
  assert.match(html, /Pilot no-login bypass active/, "pilot bypass banner text missing");
  assert.match(html, /const PILOT_VERSION_URL = "https:\/\/mufasa-fitness-node\.onrender\.com\/__version"/, "pilot version URL must target backend");
});

test("legacy login overlay, Google GIS, and pilot email dependencies are absent", () => {
  const html = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");
  assert.doesNotMatch(html, /id="loginOverlay"/, "legacy login overlay should not exist");
  assert.doesNotMatch(html, /accounts\.google\.com\/gsi\/client/, "Google GIS script should not exist");
  assert.doesNotMatch(html, /google\.accounts\.id\./, "Google GIS API references should not exist");
  assert.doesNotMatch(html, /pilotEmail|pilot_email|pilotLoginBtn|pilot-session|auth\/bridge/i, "pilot email / legacy bridge dependencies should not exist in shell");
});

test("logout path clears frontend auth state and returns to login shell", () => {
  const html = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");
  assert.match(html, /localStorage\.removeItem\(AUTH_TOKEN_STORAGE_KEY\)/, "logout must clear auth token key");
  assert.match(html, /localStorage\.removeItem\(AUTH_USER_STORAGE_KEY\)/, "logout must clear auth user key");
  assert.match(html, /window\.APP_AUTH\s*=\s*\{\s*isAuthenticated:\s*false,\s*token:\s*null,\s*user:\s*null\s*\}/, "logout must reset APP_AUTH");
  assert.match(html, /window\.pilotSuperAdminActive = false/, "logout must clear pilot super-admin activation");
  assert.match(html, /renderAuthShell\(false\)/, "logout should route back to login shell");
});

test("pilot bypass exposes explicit bootstrap failure reasons and immediate shell activation checks", () => {
  const html = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");
  assert.match(html, /backend version not reachable/, "missing backend reachability failure reason");
  assert.match(html, /flag false/, "missing disabled-flag failure reason");
  assert.match(html, /app shell missing/, "missing app-shell failure reason");
  assert.match(html, /overlay hide failed/, "missing auth-screen hide failure reason");
  assert.match(html, /function activatePilotBypassImmediate\(\)/, "missing immediate pilot activation flow");
});
