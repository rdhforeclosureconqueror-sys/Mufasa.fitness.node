"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

test("frontend includes login form and delegates auth submit ownership to auth-core", () => {
  const html = read("public/index.html");
  const authCore = read("public/auth-core.js");
  const authUi = read("public/auth-ui.js");
  assert.match(html, /<script src="\/auth-core\.js" defer><\/script>/, "auth-core runtime must be loaded as the auth form request owner");
  assert.match(html, /<form id="authLoginForm" action="javascript:void\(0\)" method="post"/, "auth login form must force post semantics");
  assert.doesNotMatch(html, /id="authLoginForm"[^>]*onsubmit=/, "auth login form must not use inline onsubmit blocker");
  assert.match(html, /id="authLoginSubmit"/, "auth login submit button must exist");
  assert.match(html, /id="authLoginSubmit" type="submit"/, "auth login submit button must be submit type");
  assert.doesNotMatch(html, /<form[^>]*id="authLoginForm"[^>]*method="get"/i, "auth login form must never use GET");
  assert.doesNotMatch(html, /window\.AuthCore\?\.submitAuthRequest\?\.\(\)/, "inline submit compatibility delegator must be removed");
  assert.doesNotMatch(html, /handleLogin(?:Submit|ButtonClick)|handleCreateAccountToggle|submitAuthRequest/, "inline shell must not define auth submit compatibility delegators");
  assert.doesNotMatch(html, /fetch\(`\$\{NODE_BASE_URL\}\/api\/auth\/(?:login|register)`/, "inline script must not own login/register submit fetches");
  assert.doesNotMatch(authUi, /fetch\(|\/api\/auth\/(?:login|register)/, "auth-ui compatibility shim must not own login/register submit fetches");
  assert.match(authCore, /event\?\.preventDefault\?\.\(\)/, "auth-core submit must prevent browser navigation");
  assert.match(authCore, /event\?\.stopPropagation\?\.\(\)/, "auth-core submit must stop propagation");
  assert.match(authCore, /document\.addEventListener\("DOMContentLoaded", bindAuthLoginForm\)/, "login form binding must happen on DOMContentLoaded in auth-core");
  assert.match(authCore, /window\.addEventListener\("load", bindAuthLoginForm\)/, "login form binding must happen on window load in auth-core");
  assert.match(authCore, /console\.log\("\[AUTH_FORM_RUNTIME\] form found", !!form\)/, "auth-core bindAuthLoginForm should log form detection");
  assert.match(authCore, /console\.log\("\[AUTH_FORM_RUNTIME\] submit handler attached"\)/, "auth-core bindAuthLoginForm should log handler attachment");
  assert.match(authCore, /const NODE_BASE_URL = "https:\/\/mufasa-fitness-node\.onrender\.com"/, "backend base URL missing");
  assert.match(authCore, /fetch\(authUrl, \{\s*method: "POST"/s, "auth-core submit must use fetch POST");
  assert.doesNotMatch(authCore, /location\.search\s*=\s*.*password/i, "password must never be written to URL query string");
  assert.match(authCore, /\/api\/auth\/login/, "login API endpoint path missing");
  assert.match(authCore, /\/api\/auth\/register/, "register API endpoint path missing");
  assert.match(authCore, /\/api\/auth\/me/, "auth me API endpoint path missing");
  assert.match(
    authCore,
    /const user = mePayload\?\.user \|\| mePayload\?\.data\?\.user;/,
    "frontend auth me parser must accept top-level user with legacy data.user fallback"
  );
  assert.match(authCore, /auth-state-runtime pending/, "token persistence should be delegated to auth-state-runtime");
  assert.match(authCore, /\[AUTH_SUBMIT\]/, "auth submit instrumentation missing");
  assert.match(authCore, /\[AUTH_REGISTER\]/, "auth register instrumentation missing");
});

test("frontend has only one auth login form id and auth-core duplicate mitigation", () => {
  const html = read("public/index.html");
  const authCore = read("public/auth-core.js");
  const formIdCount = (html.match(/id="authLoginForm"/g) || []).length;
  assert.equal(formIdCount, 1, "expected exactly one authLoginForm in shell");
  assert.match(authCore, /multiple login forms detected/, "duplicate forms should be logged");
  assert.match(authCore, /data-auth-login-disabled/, "duplicate forms should be explicitly disabled");
});

test("root legacy index is not edited during avatar quarantine", () => {
  const rootHtml = read("index.html");
  const publicHtml = read("public/index.html");
  assert.doesNotMatch(rootHtml, /ENABLE_AVATAR_FEATURE/, "root legacy index.html must remain outside Phase 1 avatar quarantine edits");
  assert.match(publicHtml, /ENABLE_AVATAR_FEATURE/, "public index should own Phase 1 avatar quarantine wiring");
});
