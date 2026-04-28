"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

test("frontend removes blocking login form and opens shell by default", () => {
  const html = read("public/index.html");
  assert.doesNotMatch(html, /id="authLoginForm"/, "auth login form must be removed");
  assert.doesNotMatch(html, /id="authLoginSubmit"/, "auth login submit button must be removed");
  assert.match(html, /id="appShell" class="app"/, "app shell must be visible immediately");
  assert.match(html, /id="userInfo"/, "user info bar should be present");
});

test("root index and public index stay in sync for pilot shell", () => {
  const rootHtml = read("index.html");
  const publicHtml = read("public/index.html");
  assert.equal(rootHtml, publicHtml, "root index.html must mirror public/index.html");
  assert.match(rootHtml, /PRIVATE PILOT MODE — LOGIN DISABLED/, "pilot banner text missing");
});
