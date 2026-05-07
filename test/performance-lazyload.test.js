const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

test("login shell loads without TensorFlow/Three script tags", () => {
  const html = read("public/index.html");
  assert.doesNotMatch(html, /<script[^>]+src="https:\/\/cdn\.jsdelivr\.net\/npm\/@tensorflow\/tfjs/i, "TensorFlow CDN script should not be eager-loaded");
  assert.doesNotMatch(html, /<script[^>]+src="https:\/\/cdn\.jsdelivr\.net\/npm\/@tensorflow-models\/pose-detection/i, "MoveNet script should not be eager-loaded");
  assert.doesNotMatch(html, /<script type="module">[\s\S]*Three ESM import started/, "Three bootstrap module should not run eagerly");
});

test("retention/avatar loading does not block auth flow", () => {
  const html = read("public/index.html");
  assert.doesNotMatch(html, /await\s+loadAvatarAssetForCurrentUser\("login_profile"\)/);
  assert.doesNotMatch(html, /await\s+loadAvatarAssetForCurrentUser\("backend_profile"\)/);
  assert.doesNotMatch(html, /await\s+loadAvatarAssetForCurrentUser\("local_cache"\)/);
});

test("camera start triggers lazy pose runtime load", () => {
  const html = read("public/index.html");
  assert.match(html, /async function initDetector\([\s\S]*await window\.__ensurePoseRuntime\(\)/, "initDetector should lazy-load pose runtime");
});

test("avatar mode path triggers lazy three runtime", () => {
  const html = read("public/index.html");
  assert.match(html, /initializeAvatarRuntimeBootstrap\("render_mode_selection"\)/, "Avatar render mode should trigger lazy runtime init");
});

test("progress scan boot metric is tracked from OHSA start", () => {
  const html = read("public/index.html");
  assert.match(html, /function startOhsa\([\s\S]*markPerfMetric\("progressScanBootMs"/, "OHSA start should track progress scan boot metric");
});


test("coach voice controls call coach runtime directly", () => {
  const html = read("public/index.html");
  assert.doesNotMatch(html, /async function speak\(|async function unlockAudioOnce\(|function stopAllSpeech\(/, "inline coach voice compatibility delegators should be removed");
  assert.match(html, /requireCoachRuntime\(\)\.unlockAudioOnce\(\)/, "listen button should unlock audio through coach runtime directly");
  assert.match(html, /requireCoachRuntime\(\)\.speak\("Voice is on\.", "rep"\)/, "listen button voice prime should use coach runtime directly");
  assert.match(html, /requireCoachRuntime\(\)\.stopAllSpeech\(\)/, "speech recognition should stop speech through coach runtime directly");
});
