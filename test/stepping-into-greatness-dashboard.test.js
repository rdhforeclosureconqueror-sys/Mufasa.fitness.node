"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const publicDir = path.join(__dirname, "..", "public");
const dashboard = fs.readFileSync(path.join(publicDir, "dashboard.html"), "utf8");
const greatnessPage = fs.readFileSync(path.join(publicDir, "greatness.html"), "utf8");
const greatnessRuntime = fs.readFileSync(path.join(publicDir, "greatness.js"), "utf8");

function link(id) {
  const match = dashboard.match(new RegExp(`<a\\s+id="${id}"[^>]*href="([^"]+)"[^>]*>([^<]+)</a>`));
  assert.ok(match, `${id} must be a semantic dashboard link`);
  return { href: match[1], label: match[2].trim() };
}

test("dashboard renders the Stepping Into Greatness member action at the real page route", () => {
  const action = link("steppingIntoGreatnessLink");
  assert.deepEqual(action, { href: "/greatness.html", label: "Stepping Into Greatness" });
  assert.doesNotMatch(action.href, /^\/api\//);
  assert.match(greatnessPage, /<title>Stepping Into Greatness<\/title>/);
});

test("existing dashboard actions remain available beside Stepping Into Greatness", () => {
  assert.deepEqual(link("pushUpChallengeLink"), { href: "/push-up-challenge.html", label: "Push-Up Challenge" });
  assert.deepEqual(link("nutritionJournalLink"), { href: "/nutrition.html", label: "Nutrition Journal" });
  assert.deepEqual(link("backToAppLink"), { href: "/", label: "Back to App" });
  assert.match(dashboard, /id="resetBtn"[^>]*>Reset Local Data<\/button>/);
});

test("member navigation retains the shared authentication runtime and protected API flow", () => {
  assert.match(greatnessPage, /<script src="auth-state-runtime\.js\?v=20260813-authorization-header-canonicalization-v1"><\/script>/);
  assert.match(greatnessRuntime, /AuthStateRuntime\?\.getAuthToken/);
  assert.match(greatnessPage, /<script src="api-client\.js\?v=20260813-authorization-header-canonicalization-v1"><\/script>/);
  assert.match(greatnessRuntime, /await runtime\.whenReady\(\)/);
  assert.match(greatnessRuntime, /client\.request\(path/);
  assert.doesNotMatch(link("steppingIntoGreatnessLink").href, /login|sign-?in/i);
});

test("dashboard action markup is unique, focus-visible, and mobile-safe", () => {
  const ids = [...dashboard.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, "dashboard markup must not contain duplicate IDs");
  assert.match(dashboard, /\.btn:focus-visible\{outline:/);
  assert.match(dashboard, /\.dashboard-actions\{[\s\S]*grid-template-columns:repeat\(auto-fit/);
  assert.match(dashboard, /@media\(max-width:600px\)[\s\S]*\.dashboard-actions\{width:100%;grid-template-columns:1fr\}/);
  assert.match(dashboard, /\.dashboard-actions \.btn\{[\s\S]*min-height:44px|\.btn\{[\s\S]*min-height:44px/);
});
