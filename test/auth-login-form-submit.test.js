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
  assert.match(html, /id="authLoginForm"/, "auth login form must exist");
  assert.match(html, /id="authLoginSubmit"/, "auth login submit button must exist");
  assert.match(html, /event\.preventDefault\(\)/, "login submit must prevent browser navigation");
  assert.match(html, /const NODE_BASE_URL = \"https:\/\/mufasa-fitness-node\.onrender\.com\"/, "backend base URL missing");
  assert.match(html, /\/api\/auth\/login/, "login API endpoint path missing");
  assert.match(html, /\/api\/auth\/me/, "auth me API endpoint path missing");
  assert.match(html, /localStorage\.setItem\(\"maatAuthToken\", token\)/, "token should be stored under maatAuthToken");
});

test("root index and public index stay in sync for builder shell", () => {
  const rootHtml = read("index.html");
  const publicHtml = read("public/index.html");
  assert.equal(rootHtml, publicHtml, "root index.html must mirror public/index.html");
  assert.match(rootHtml, /BUILDER MODE — FULL ACCESS — SECURITY DISABLED/, "builder banner text missing");
});
