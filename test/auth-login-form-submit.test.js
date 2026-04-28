"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

test("password login form is JS-handled and does not use GET query submission", () => {
  const html = read("public/index.html");

  assert.match(html, /id="authLoginForm"/, "auth login form missing");
  assert.match(html, /id="authLoginSubmit" type="button"/, "login button should be explicit button to avoid implicit GET submit");
  assert.match(html, /authLoginFormEl\?\.\s*addEventListener\("submit",\s*handlePasswordLogin\)/, "submit should route to shared login handler");
  assert.match(html, /authLoginSubmitEl\?\.\s*addEventListener\("click",\s*handlePasswordLogin\)/, "click should route to shared login handler");
  assert.match(html, /if\s*\(event\?\.preventDefault\)\s*event\.preventDefault\(\)/, "handler must call preventDefault");
  assert.doesNotMatch(html, /method\s*=\s*"get"/i, "login flow should never use GET");
  assert.doesNotMatch(html, /location\.(href|assign|replace)\s*=\s*[^;\n]*password/i, "password must never be placed in URL");
});

test("frontend posts login payload to backend /api/auth/login", () => {
  const html = read("public/index.html");
  assert.match(
    html,
    /fetch\("https:\/\/mufasa-fitness-node\.onrender\.com\/api\/auth\/login",\s*\{\s*method:\s*"POST"/,
    "frontend must POST to backend login route"
  );
  assert.match(html, /body:\s*JSON\.stringify\(\{\s*email,\s*password\s*\}\)/, "frontend must POST email/password JSON body");
});

test("index.html no longer owns password auth form (public/index.html is source of truth)", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /id="authLoginForm"/, "root index should not contain duplicate password auth form");
});
