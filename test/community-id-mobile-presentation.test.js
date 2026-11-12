"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("Community ID mobile card keeps privacy metadata below member chips", () => {
  const html = read("public/community-entrance.html");
  assert.match(html, /\.id-card\{display:flex;flex-direction:column\}/);
  assert.match(html, /\.card-bottom\{position:static;margin-top:auto;padding-top:18px\}/);
});

test("Community Avatar Studio mounts the canonical 3D avatar instead of showing a pawn", () => {
  const html = read("public/push-up-release.html");
  const source = read("public/push-up-release.js");
  assert.match(html, /motion\/shared3d-loader\.js/);
  assert.match(html, /community-avatar\.js/);
  assert.doesNotMatch(html, /releaseAvatarPlaceholder[^>]*>♟/);
  assert.match(source, /mountCommunityAvatarPreview/);
  assert.match(source, /MileleCommunityAvatar\.create/);
  assert.match(source, /mountCommunityAvatarPreview\(\);/);
});

test("World bridge debug control stays hidden from normal member pages", () => {
  const source = read("public/world-bridge-launch.js");
  assert.match(source, /bridgeDebug=1/);
  assert.match(source, /get\("bridgeDebug"\) !== "1"\) return/);
});
