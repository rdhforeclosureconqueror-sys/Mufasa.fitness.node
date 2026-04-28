const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");

test("frontend shell keeps pilot email login wiring and removes Google GIS dependency", () => {
  const html = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");
  assert.match(html, /id="pilotEmail"/, "Pilot email input missing");
  assert.match(html, /id="pilotLoginBtn"/, "Pilot login button missing");
  assert.match(html, /id="pilotLoginDebug"/, "Pilot login debug/status container missing");
  assert.match(html, /NODE_PILOT_LOGIN_URL/, "Pilot login endpoint constant missing");
  assert.match(html, /pilotLoginBtn\.onclick = async \(\) => {/, "Pilot login click handler missing");
  assert.match(html, /fetch\(NODE_PILOT_LOGIN_URL/, "Pilot login request to backend route missing");
  assert.doesNotMatch(html, /accounts\.google\.com\/gsi\/client/, "Google GIS script should be removed");
  assert.doesNotMatch(html, /google\.accounts\.id\./, "Google GIS API usage should be removed");
});

test("auth shell remains isolated from retention/workout/avatar boot paths", () => {
  const html = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");
  const start = html.indexOf("function setPilotLoginStatus(message) {");
  const end = html.indexOf("signOutBtn.onclick =", start);
  assert.ok(start > 0 && end > start, "Unable to locate auth shell block in index");
  const authShell = html.slice(start, end);
  assert.doesNotMatch(authShell, /retention-flow|ensureRetentionFlowLoaded/i, "Auth shell references retention-flow bootstrap");
  assert.doesNotMatch(authShell, /workout/i, "Auth shell references workout bootstrapping");
  assert.doesNotMatch(authShell, /avatar/i, "Auth shell references avatar bootstrapping");
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
