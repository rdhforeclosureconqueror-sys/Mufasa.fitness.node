"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

test("frontend includes login form that submits with preventDefault and auth API calls", () => {
  const html = read("public/index.html");
  assert.match(html, /<form id="authLoginForm" action="javascript:void\(0\)" method="post"/, "auth login form must force post semantics");
  assert.doesNotMatch(html, /id="authLoginForm"[^>]*onsubmit=/, "auth login form must not use inline onsubmit blocker");
  assert.match(html, /id="authLoginSubmit"/, "auth login submit button must exist");
  assert.match(html, /id="authLoginSubmit" type="submit"/, "auth login submit button must be submit type");
  assert.doesNotMatch(html, /<form[^>]*id="authLoginForm"[^>]*method="get"/i, "auth login form must never use GET");
  assert.match(html, /event\.preventDefault\(\)/, "login submit must prevent browser navigation");
  assert.match(html, /event\.stopPropagation\(\)/, "login submit must stop propagation");
  assert.match(html, /document\.addEventListener\("DOMContentLoaded", bindAuthLoginForm\)/, "login form binding must happen on DOMContentLoaded");
  assert.match(html, /window\.addEventListener\("load", bindAuthLoginForm\)/, "login form binding must happen on window load");
  assert.match(html, /console\.log\("\[AUTH_LOGIN\] form found", !!form\)/, "bindAuthLoginForm should log form detection");
  assert.match(html, /console\.log\("\[AUTH_LOGIN\] submit handler attached"\)/, "bindAuthLoginForm should log handler attachment");
  assert.match(html, /const NODE_BASE_URL = "https:\/\/mufasa-fitness-node\.onrender\.com"/, "backend base URL missing");
  assert.match(html, /fetch\(\`\$\{NODE_BASE_URL\}\/api\/auth\/login\`, \{\s*method: "POST"/s, "login submit must use fetch POST");
  assert.doesNotMatch(html, /location\.search\s*=\s*.*password/i, "password must never be written to URL query string");
  assert.match(html, /\/api\/auth\/login/, "login API endpoint path missing");
  assert.match(html, /\/api\/auth\/me/, "auth me API endpoint path missing");
  assert.match(
    html,
    /const user = mePayload\?\.user \|\| mePayload\?\.data\?\.user;/,
    "frontend auth me parser must accept top-level user with legacy data.user fallback"
  );
  assert.match(html, /localStorage\.setItem\("maatAuthToken", token\)/, "token should be stored under maatAuthToken");
});

test("frontend has only one auth login form id and duplicate mitigation", () => {
  const html = read("public/index.html");
  const formIdCount = (html.match(/id="authLoginForm"/g) || []).length;
  assert.equal(formIdCount, 1, "expected exactly one authLoginForm in shell");
  assert.match(html, /multiple login forms detected/, "duplicate forms should be logged");
  assert.match(html, /data-auth-login-disabled/, "duplicate forms should be explicitly disabled");
});

test("root index and public index stay in sync", () => {
  const rootHtml = read("index.html");
  const publicHtml = read("public/index.html");
  assert.equal(rootHtml, publicHtml, "root index.html must mirror public/index.html");
});
