"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

test("Phase 30 landing page renders polished public entry with required CTAs and safety copy", () => {
  const html = read("public/index.html");
  assert.match(html, /id="landingHeadline"/);
  assert.match(html, /AI coaching that makes every rep/);
  assert.match(html, /id="landingChallengeCta"[^>]*href="\/workout\.html#pushupChallengePanel"/);
  assert.match(html, /id="landingWorkoutCta"[^>]*href="\/workout\.html"/);
  assert.match(html, /id="landingLoginCta"[^>]*>Member Login \/ Open App<\/a>/);
  assert.match(html, /id="landingDashboardCta"[^>]*href="\/dashboard\.html"/);
  assert.match(html, /Camera tracks movement/);
  assert.match(html, /AI coach gives guidance/);
  assert.match(html, /Reps and form are scored/);
  assert.match(html, /Progress can be saved/);
  assert.match(html, /Stop if you feel pain or dizziness\./);
  assert.match(html, /This is not medical advice\./);
});

test("Phase 30 workout app remains accessible and normal view removes the empty developer-style left panel", () => {
  const html = read("public/workout.html");
  assert.match(html, /id="appShell" class="app workout-app-shell"/);
  assert.match(html, /workout-stage-pane/);
  assert.match(html, /workout-support-pane/);
  assert.match(html, /grid-template-columns: minmax\(0, 1\.55fr\) minmax\(320px, 0\.8fr\)/);
  assert.doesNotMatch(html, /<!-- LEFT: Live coach \+ video -->/);
  assert.match(html, /Home<\/a>/);
  assert.match(html, /href="\/exercise-library\.html"/);
});

test("Phase 30 diagnostics are hidden by default and available through role/developer toggle", () => {
  const html = read("public/workout.html");
  assert.match(html, /body:not\(\.developer-diagnostics\) \[data-diagnostic-panel\]/);
  assert.match(html, /id="diagnosticsToggleBtn"[^>]*data-diagnostic-control[^>]*hidden/);
  assert.match(html, /window\.__phase30SetDiagnosticsVisible/);
  assert.match(html, /hasDiagnosticsRole/);
  assert.match(html, /\["admin", "super_admin", "operator", "developer"\]/);
  assert.match(html, /id="authPropagationPanel" data-diagnostic-panel/);
  assert.match(html, /id="appActivationPanel" data-diagnostic-panel/);
  assert.match(html, /id="featureActivationPanel" data-diagnostic-panel/);
  assert.match(html, /id="systemBootStatusPanel" data-diagnostic-panel/);
});

test("Phase 30 focus mode keeps essential controls and collapses nonessential panels", () => {
  const html = read("public/workout.html");
  const runtime = read("public/workout-runtime.js");
  assert.match(html, /body\.workout-focus \.workout-support-pane/);
  assert.match(html, /body\.workout-focus \.btn-row > :not\(#startBtn\):not\(#fullscreenCameraBtn\):not\(#listenBtn\):not\(#muteBtn\):not\(#challengeStopBtn\):not\(#diagnosticsToggleBtn\)/);
  assert.match(html, /id="hudChallengeScore"/);
  assert.match(html, /id="hudFormStatus"/);
  assert.match(runtime, /function setWorkoutFocusMode/);
  assert.match(runtime, /setWorkoutFocusMode\(true, 'workout-started'\)/);
  assert.match(runtime, /setWorkoutFocusMode\(true, 'challenge-running'\)/);
  assert.match(runtime, /setWorkoutFocusMode\(false, 'workout-stopped'\)/);
});

test("Phase 30 preserves challenge, request exercise, and coach builder role-gated entry", () => {
  const html = read("public/workout.html");
  assert.match(html, /id="pushupChallengeEntryBtn"[^>]*>Push-Up Challenge<\/button>/);
  assert.match(html, /id="pushupChallengePanel"/);
  assert.match(html, /id="challengeDisplayName"/);
  assert.match(html, /id="challengeConsent"/);
  assert.match(html, /id="challengeStartBtn"/);
  assert.match(html, /id="challengeLeaderboardBody"/);
  assert.match(html, /id="defineExerciseBtn"[^>]*>Request New Exercise<\/button>/);
  assert.match(html, /id="exerciseTemplateDraftBtn"[^>]*hidden/);
  assert.match(html, /id="exerciseTemplateBuilderPanel"[^>]*hidden/);
});
