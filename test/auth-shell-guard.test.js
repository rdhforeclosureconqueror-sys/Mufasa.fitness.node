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
  assert.match(html, /id="googleLoginDebug"/, "Google fallback status container missing");
  assert.match(html, /google\.accounts\.id\.initialize\(/, "google.accounts.id.initialize missing");
  assert.match(html, /google\.accounts\.id\.renderButton\(/, "google.accounts.id.renderButton missing");
  assert.doesNotMatch(html, /google\.accounts\.id\.prompt\(/, "google.accounts.id.prompt should not be used in renderButton-first flow");
  assert.match(html, /callback:\s*\(response\)\s*=>\s*{/, "Google credential callback missing");
  assert.match(html, /Loading Google sign-in/, "Google loading status text missing");
  assert.match(html, /Ready/, "Google ready status text missing");
  assert.match(html, /Credential received/, "Google credential status text missing");
  assert.match(html, /Contacting backend/, "Google backend contact status text missing");
  assert.match(html, /Signed in/, "Google success status text missing");
  assert.match(html, /Failed:\s*/, "Google failure status text missing");
});

test("auth shell remains isolated from retention/workout/avatar boot paths", () => {
  const html = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");
  const start = html.indexOf("function setGoogleSignInStatus(message) {");
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
