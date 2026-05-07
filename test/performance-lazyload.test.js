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
  assert.match(html, /requireCoachRuntime\(\)\.toggleListening\(\)/, "listen button should delegate mic lifecycle to coach runtime directly");
  assert.doesNotMatch(html, /new\s+(?:window\.)?(?:SpeechRecognition|webkitSpeechRecognition)\(/, "inline shell must not construct browser speech recognition");
});


test("coach runtime owns browser speech recognition lifecycle", () => {
  const runtime = read("public/coach-runtime.js");
  assert.match(runtime, /\[VOICE_RECOGNITION\]/, "voice recognition instrumentation tag should live in coach runtime");
  assert.match(runtime, /\[MIC_RUNTIME\]/, "mic runtime instrumentation tag should live in coach runtime");
  assert.match(runtime, /\[COACH_COMMAND\]/, "coach command instrumentation tag should live in coach runtime");
  assert.match(runtime, /function startListening\(/, "coach runtime should expose mic start lifecycle");
  assert.match(runtime, /function stopListening\(/, "coach runtime should expose mic stop lifecycle");
  assert.match(runtime, /function toggleListening\([\s\S]*state\.listening \? stopListening\(\) : startListening\(\)/, "coach runtime should expose the mic toggle lifecycle");
  assert.match(runtime, /global\.SpeechRecognition \|\| global\.webkitSpeechRecognition/, "coach runtime should own browser speech recognition setup");
  assert.match(runtime, /recognition\.onresult = handleRecognitionResult/, "coach runtime should own transcript handling");
  assert.match(runtime, /recognition\.onerror =/, "coach runtime should own mic error handling");
});


test("remaining inline dangerous sections are explicitly marked", () => {
  const html = read("public/index.html");
  for (const marker of [
    "[INLINE_REMAINING] auth/profile shell",
    "[INLINE_REMAINING] boot diagnostics",
    "[INLINE_REMAINING] hydration ordering",
    "[INLINE_REMAINING] workout/OHSA glue",
    "[INLINE_REMAINING] pose/camera loop",
    "[INLINE_REMAINING] avatar render pipeline"
  ]) {
    assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${marker} should remain visible in the inline shell`);
  }
});
