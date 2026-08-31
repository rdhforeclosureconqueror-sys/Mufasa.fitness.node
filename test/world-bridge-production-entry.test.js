"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("production startup uses the PocketPT world bridge server entry", () => {
  const pkg = readJson("package.json");
  assert.equal(pkg.scripts.start, "node world-bridge-server.js");

  const entry = read("world-bridge-server.js");
  assert.match(entry, /createWorldBridge\(/);
  assert.match(entry, /bridge\.register\(app\)/);
});
