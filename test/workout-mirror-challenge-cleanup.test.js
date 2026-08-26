const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("workout avatar modes follow the server-rendered production feature flag", () => {
  const html = read("public/workout.html");
  const server = read("server.js");
  assert.match(html, /window\.ENABLE_AVATAR_FEATURE = "__ENABLE_AVATAR_FEATURE__" === "true"/);
  assert.match(server, /const MEMBER_AVATAR_PILOT_ENABLED = true;/);
  assert.match(server, /return MEMBER_AVATAR_PILOT_ENABLED;/);
  assert.match(html, /<option value="camera">Camera<\/option>/);
  assert.match(html, /<option value="avatar_overlay" data-avatar-feature>Avatar Overlay<\/option>/);
  assert.match(html, /<option value="avatar_only" data-avatar-feature>Avatar Only<\/option>/);
});

test("workout no longer owns the legacy Push-Up Challenge product workflow", () => {
  const html = read("public/workout.html");
  const runtime = read("public/workout-runtime.js");
  for (const legacy of [
    "pushupChallengePanel", "challengeDisplayName", "challengeTeam", "challengeEmail",
    "challengePhone", "challengeConsent", "challengeConnectCameraBtn", "challengeStartBtn",
    "challengeStopBtn", "Start 60s Challenge"
  ]) assert.doesNotMatch(html, new RegExp(legacy));
  assert.doesNotMatch(runtime, /PushupChallengeRuntime|installPushupChallengeRuntime|startChallenge\s*\(/);
  assert.match(html, /id="pushupChallengeEntryBtn"[^>]*href="\/push-up-challenge\.html"/);
});

test("shared camera and pose infrastructure remains on workout while dedicated challenge remains intact", () => {
  const html = read("public/workout.html");
  assert.match(html, /id="connectBtn"/);
  assert.match(html, /src="\/pose-runtime\.js/);
  assert.match(html, /MoveNet|movenet/i);
  for (const file of [
    "public/push-up-challenge.html", "public/push-up-challenge-page.js",
    "public/push-up-challenge.js", "public/guided-exercise-sequence.js",
    "public/push-up-sequence-engine.js"
  ]) assert.ok(fs.existsSync(path.join(root, file)), file);
});

test("mirror ownership and authentication boundaries remain present", () => {
  const mirror = read("public/motion/live-avatar-mirror.js");
  const labTest = read("test/motion-lab.test.js");
  const server = read("server.js");
  assert.doesNotMatch(mirror, /new\s+WebGLRenderer|requestAnimationFrame\s*\(|getUserMedia|createDetector/);
  assert.match(labTest, /launch bridge rejects anonymous and ordinary members/);
  assert.match(server, /app\.get\("\/motion\/assets\/exercises\/push-up\/avaturn-push-up-avatar\.glb", requireAuth/);
  assert.match(server, /app\.get\("\/dev\/live-avatar-mirror", motionLabGate/);
});
