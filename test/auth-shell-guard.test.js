const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");

test("frontend shell keeps Google identity script/init/button wiring", () => {
  const html = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");
  assert.match(html, /https:\/\/accounts\.google\.com\/gsi\/client/, "GIS script reference missing");
  assert.match(html, /id="googleBtn"/, "Google button container missing");
  assert.match(html, /id="googleSignInMount"/, "GIS mount container missing");
  assert.match(html, /google\.accounts\.id\.initialize\(/, "google.accounts.id.initialize missing");
  assert.match(html, /google\.accounts\.id\.renderButton\(/, "google.accounts.id.renderButton missing");
});

test("retention-flow bootstrap does not throw when containers are absent", () => {
  const script = fs.readFileSync(path.join(repoRoot, "public/retention-flow.js"), "utf8");
  const context = vm.createContext({
    window: { addEventListener: () => {}, location: { origin: "http://localhost" } },
    document: { getElementById: () => null },
    localStorage: { getItem: () => null, setItem: () => {} },
    fetch: async () => ({ ok: true, json: async () => ({ ok: true, data: {} }) }),
    console
  });
  assert.doesNotThrow(() => vm.runInContext(script, context), "retention-flow bootstrap threw globally");
});
