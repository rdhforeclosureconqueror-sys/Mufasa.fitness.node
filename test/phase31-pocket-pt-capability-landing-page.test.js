"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

function visibleText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

test("Phase 31 landing copy uses Pocket PT identity and does not lead with technology-first language", () => {
  const html = read("public/index.html");
  const publicText = visibleText(html);

  assert.match(html, /<title>Pocket PT \| Digital Training System<\/title>/);
  assert.match(html, /id="landingHeadline"/);
  assert.match(publicText, /Training That Learns Your Routine, Tracks Your Progress, and Keeps You Moving\./);
  assert.match(publicText, /Pocket PT helps you know what to do, tracks what you complete/);
  assert.doesNotMatch(publicText, /\bAI\b/);
  assert.doesNotMatch(publicText, /artificial intelligence/i);
  assert.doesNotMatch(publicText, /AI coach|AI trainer|AI fitness system/i);
});

test("Phase 31 hero CTA hierarchy preserves public pathways and Phase 30 route split", () => {
  const html = read("public/index.html");
  const server = read("server.js");

  assert.match(html, /id="landingWorkoutCta"[^>]*href="\/workout\.html"[^>]*>Start With Pocket PT<\/a>/);
  assert.match(html, /id="landingChallengeCta"[^>]*href="\/workout\.html#pushupChallengePanel"[^>]*>Try the Push-Up Challenge<\/a>/);
  assert.match(html, /id="landingLoginCta"[^>]*href="\/workout\.html"[^>]*>Member Login<\/a>/);
  assert.match(html, /id="landingDashboardCta"[^>]*href="\/dashboard\.html"[^>]*>Open My Dashboard<\/a>/);
  assert.match(html, /New user/);
  assert.match(html, /Returning user/);
  assert.match(html, /Event participant/);
  assert.match(server, /app\.get\("\/",/);
  assert.match(server, /CANONICAL_SHELL_PATH = path\.join\(PUBLIC_DIR, "index\.html"\)/);
  assert.match(server, /app\.get\("\/dashboard\.html"/);
});

test("Phase 31 capability-led sections and cards render verified active capabilities", () => {
  const html = read("public/index.html");
  const publicText = visibleText(html);

  assert.match(html, /id="problemsTitle"/);
  assert.match(html, /id="capabilitiesTitle"/);
  assert.match(html, /id="capabilityCards"/);
  assert.match(html, /id="howUseTitle"/);
  assert.match(html, /id="questionsTitle"/);
  assert.match(html, /id="accountabilityTitle"/);
  assert.match(html, /id="personalizationTitle"/);
  assert.match(publicText, /Personalized Training Path/);
  assert.match(publicText, /Movement and Form Feedback/);
  assert.match(publicText, /Rep and Workout Tracking/);
  assert.match(publicText, /Progress History/);
  assert.match(publicText, /Goals and Check-Ins/);
  assert.match(publicText, /Exercise Library/);
  assert.match(publicText, /Challenges and Leaderboards/);
  assert.match(publicText, /Ask Pocket PT/);
  assert.match(publicText, /Coach and Trainer Tools/);
  assert.match(publicText, /Available now/);
  assert.match(publicText, /Role gated/);
});

test("Phase 31 unsupported nutrition and medical claims are handled safely", () => {
  const html = read("public/index.html");
  const publicText = visibleText(html);

  assert.match(publicText, /Meal tracking and nutrition planning are being developed/);
  assert.match(publicText, /Coming soon/);
  assert.doesNotMatch(publicText, /diet-plan creation is available/i);
  assert.doesNotMatch(publicText, /active calorie calculation/i);
  assert.doesNotMatch(publicText, /diagnose pain/i);
  assert.doesNotMatch(publicText, /treat injuries/i);
  assert.match(publicText, /For pain, injury, medical conditions, or urgent concerns, consult a qualified healthcare professional\./);
  assert.match(publicText, /does not diagnose injuries, replace a doctor, replace a physical therapist, or replace a registered dietitian\./);
});

test("Phase 31 responsive and accessible landing structure remains present without diagnostics clutter", () => {
  const html = read("public/index.html");

  assert.match(html, /<main class="landing-shell">/);
  assert.match(html, /aria-label="Public navigation"/);
  assert.match(html, /aria-label="Primary actions"/);
  assert.match(html, /@media \(max-width: 980px\)/);
  assert.match(html, /@media \(max-width: 640px\)/);
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(html, /data-diagnostic-panel/);
  assert.doesNotMatch(html, /landingDiagnosticResult/);
  assert.doesNotMatch(html, /avatar-runtime\.js/);
});

test("Phase 31 workout app, dashboard, challenge, diagnostics gating, and trainer builder remain preserved", () => {
  const workout = read("public/workout.html");
  const dashboard = read("public/dashboard.html");

  assert.match(workout, /id="appShell" class="app workout-app-shell"/);
  assert.match(workout, /id="pushupChallengePanel"/);
  assert.match(workout, /id="challengeLeaderboardBody"/);
  assert.match(workout, /id="dashboardBtn"/);
  assert.match(workout, /id="exerciseLibraryBtn"/);
  assert.match(workout, /id="defineExerciseBtn"[^>]*>Request New Exercise<\/button>/);
  assert.match(workout, /id="exerciseTemplateDraftBtn"[^>]*hidden/);
  assert.match(workout, /id="exerciseTemplateBuilderPanel"[^>]*hidden/);
  assert.match(workout, /body:not\(\.developer-diagnostics\) \[data-diagnostic-panel\]/);
  assert.match(workout, /id="diagnosticsToggleBtn"[^>]*data-diagnostic-control[^>]*hidden/);
  assert.match(dashboard, /id="historyList"/);
  assert.match(dashboard, /id="kpiConsistency"/);
});
