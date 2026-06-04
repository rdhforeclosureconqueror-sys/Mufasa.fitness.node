const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

test("login shell loads without TensorFlow/Three script tags", () => {
  const html = read("public/workout.html");
  assert.doesNotMatch(html, /<script[^>]+src="https:\/\/cdn\.jsdelivr\.net\/npm\/@tensorflow\/tfjs/i, "TensorFlow CDN script should not be eager-loaded");
  assert.doesNotMatch(html, /<script[^>]+src="https:\/\/cdn\.jsdelivr\.net\/npm\/@tensorflow-models\/pose-detection/i, "MoveNet script should not be eager-loaded");
  assert.doesNotMatch(html, /<script type="module">[\s\S]*Three ESM import started/, "Three bootstrap module should not run eagerly");
});

test("retention/avatar loading does not block auth flow", () => {
  const html = read("public/workout.html");
  assert.doesNotMatch(html, /await\s+loadAvatarAssetForCurrentUser\("login_profile"\)/);
  assert.doesNotMatch(html, /await\s+loadAvatarAssetForCurrentUser\("backend_profile"\)/);
  assert.doesNotMatch(html, /await\s+loadAvatarAssetForCurrentUser\("local_cache"\)/);
});

test("camera start triggers lazy pose runtime load", () => {
  const html = read("public/workout.html");
  assert.match(html, /async function initDetector\([\s\S]*await window\.__ensurePoseRuntime\(\)/, "initDetector should lazy-load pose runtime");
});

test("avatar mode path triggers lazy three runtime", () => {
  const html = read("public/workout.html");
  assert.match(html, /initializeAvatarRuntimeBootstrap\("render_mode_selection"\)/, "Avatar render mode should trigger lazy runtime init");
});

test("progress scan boot metric is tracked from OHSA start", () => {
  const html = read("public/workout.html");
  assert.match(html, /function startOhsa\([\s\S]*markPerfMetric\("progressScanBootMs"/, "OHSA start should track progress scan boot metric");
});


test("workout runtime preserves video-playing milestone after downstream detector failures", () => {
  const runtime = read("public/workout-runtime.js");
  assert.match(runtime, /let videoPlayingMarked = false;/, "workout runtime should track when video playback already passed");
  assert.match(runtime, /markLiveBreakpoint\('video-playing', 'pass',[\s\S]*videoPlayingMarked = true;[\s\S]*await getFn\('afterConnectCamera'\)/, "video-playing should be finalized before downstream camera handoff hooks run");
  assert.match(runtime, /if \(!videoPlayingMarked\) \{[\s\S]*markLiveBreakpoint\(cameraFailName, 'fail'/, "downstream detector errors should not overwrite a passed video-playing milestone");
});


test("coach voice controls call coach runtime directly", () => {
  const html = read("public/workout.html");
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


test("coach runtime exposes ready/speaking/listening/unavailable Ma’at status transitions", () => {
  const runtime = read("public/coach-runtime.js");
  assert.match(runtime, /function setReady[\s\S]*Ma’at 2\.0: ready/, "ready state should update Ma’at chip text");
  assert.match(runtime, /function setSpeaking[\s\S]*Ma’at 2\.0: speaking/, "speaking state should update Ma’at chip text");
  assert.match(runtime, /function startListening[\s\S]*setCoachStatus\("Listening", \{ mode: "ok", chipText: "Ma’at 2\.0: listening", source: "speech-recognition" \}\)/, "listening state should update the visible Ma’at status");
  assert.match(runtime, /function stopListening[\s\S]*setReady\("speech-recognition-stopped"\)/, "stopping mic should return Ma’at to ready");
  assert.match(runtime, /function setVoiceUnavailable[\s\S]*Ma’at 2\.0: voice unavailable/, "voice unavailable/error state should update Ma’at chip text");
  assert.match(runtime, /function setMicFailure[\s\S]*Ma’at 2\.0: mic error/, "mic error state should update Ma’at chip text");
});


test("remaining inline dangerous sections are explicitly marked", () => {
  const html = read("public/workout.html");
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

test("workout start auto-selects a live default when no workout is selected", () => {
  const runtime = read("public/workout-progression-runtime.js");
  assert.match(runtime, /function createDefaultLiveWorkoutSelection\(\)[\s\S]*exerciseId: 'bodyweight_squat'/, "workout runtime should provide a safe live default exercise");
  assert.match(runtime, /function prepareWorkoutStart\(\) \{\n\s*const plan = hydrateActiveWorkoutPlan\(\{ allowDefault: true \}\);/, "start should hydrate a default plan instead of blocking session creation when no selection exists");
});
test("missing profile save button cannot crash activation handler checks", () => {
  const html = read("public/workout.html");
  assert.match(html, /function getProfileSaveButton\(\)[\s\S]*document\.getElementById\("saveProfileFormBtn"\)/, "profile save button lookup should be DOM-safe");
  assert.match(html, /function isProfileSaveHandlerReady\(\)[\s\S]*ProfileWriteRuntime\?\.saveProfileToNode/, "profile handler readiness should fall back to ProfileWriteRuntime");
  assert.match(html, /saveProfileFormBtn:\s*getProfileSaveButton\(\)/, "post-login refs should pass a safe profile save lookup result");
  assert.doesNotMatch(html, /typeof\s+saveProfileFormBtn\b/, "bare saveProfileFormBtn typeof checks can throw with optional chaining and must not return");
  assert.doesNotMatch(html, /[,{]\s*saveProfileFormBtn\s*[,}]/, "saveProfileFormBtn must not be used as an object shorthand/bare variable");
});

test("coach backend tracing logs exact request body and validation errors", () => {
  const runtime = read("public/coach-runtime.js");
  const server = read("server.js");
  assert.match(runtime, /\[COACH_BACKEND_TRACE\] \/ask request[\s\S]*body: requestBody/, "coach chat should log the exact /ask request body");
  assert.match(runtime, /\[COACH_BACKEND_TRACE\] \/ask validation error[\s\S]*response: payload/, "coach chat should log /ask validation response payloads");
  assert.match(runtime, /\[COACH_BACKEND_TRACE\] \/api\/speak request[\s\S]*body: requestBody/, "coach voice should log the exact /api/speak request body");
  assert.match(runtime, /\[COACH_BACKEND_TRACE\] \/api\/speak validation error[\s\S]*response: errTxt/, "coach voice should log /api/speak validation responses");
  assert.match(server, /\[tts\] incoming request[\s\S]*body: incomingSpeakBody/, "server /api/speak should log incoming body");
  assert.match(server, /\[tts\] upstream validation error[\s\S]*body: upstreamSpeakBody[\s\S]*response: msg/, "server /api/speak should log upstream validation errors");
});

test("avatar create button binding is clickable and reports missing DOM", () => {
  const runtime = read("public/avatar-runtime.js");
  assert.match(runtime, /refs\.avatarCreateBtn\.onclick = openModal/, "avatar create button should bind directly to openModal");
  assert.match(runtime, /refs\.avatarCreateBtn\.style\.pointerEvents = 'auto'/, "avatar create button should be made clickable during binding");
  assert.match(runtime, /avatar_create_button_missing/, "missing avatar create button should have an explicit error reason");
  assert.match(runtime, /Avatar create button missing\. Refresh the page and retry\./, "missing avatar create button should produce a visible error");
});
