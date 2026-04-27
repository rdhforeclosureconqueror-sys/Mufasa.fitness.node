#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const indexPath = path.join(repoRoot, "public", "index.html");
const fitnessPath = path.join(repoRoot, "public", "fitness.js");
const exerciseLibraryPath = path.join(repoRoot, "public", "exercise-library.js");

const indexHtml = fs.readFileSync(indexPath, "utf8");
const fitnessJs = fs.readFileSync(fitnessPath, "utf8");
const exerciseLibraryJs = fs.readFileSync(exerciseLibraryPath, "utf8");

const warnings = [];
const checks = [];

function check(label, ok, detail) {
  checks.push({ label, ok, detail });
  if (!ok) warnings.push(`${label}: ${detail}`);
}

check(
  "TensorFlow lazy-loaded",
  !/<script[^>]+src="https:\/\/cdn\.jsdelivr\.net\/npm\/@tensorflow\/tfjs/i.test(indexHtml),
  "Detected TensorFlow CDN script tag in initial HTML."
);

check(
  "MoveNet lazy-loaded",
  !/<script[^>]+src="https:\/\/cdn\.jsdelivr\.net\/npm\/@tensorflow-models\/pose-detection/i.test(indexHtml),
  "Detected MoveNet script tag in initial HTML."
);

check(
  "Three.js module lazy-loaded",
  !/type="module">[\s\S]*import\('\/vendor\/three\/build\/three\.module\.js'\)/i.test(indexHtml),
  "Detected eager Three module import block in HTML."
);

check(
  "GLTFLoader module lazy-loaded",
  !/type="module">[\s\S]*GLTFLoader\.js/i.test(indexHtml),
  "Detected eager GLTFLoader import block in HTML."
);

check(
  "No eager GLB load at startup",
  !/initializeAvatarRuntimeBootstrap\("app_load"\)/.test(indexHtml),
  "Avatar runtime bootstrap still runs on initial page load."
);

check(
  "Exercise DB lazy-loaded",
  !/window\.addEventListener\("load",\s*async\s*\(\)\s*=>\s*\{[\s\S]{0,300}loadExerciseIndex\(/.test(fitnessJs),
  "Exercise DB index loads during page load."
);

check(
  "Exercise library images are lazy",
  /img\.loading\s*=\s*["']lazy["']/.test(exerciseLibraryJs),
  "Exercise cards are missing img.loading='lazy'."
);

check(
  "Login path is not blocked by avatar load",
  !/await\s+loadAvatarAssetForCurrentUser\("(login_profile|backend_profile|local_cache)"\)/.test(indexHtml),
  "Auth/login flow still awaits avatar loading."
);

check(
  "Diagnostics/retention extras do not block login",
  !/await\s+ensureRetentionFlowLoaded\(/.test(indexHtml),
  "Login flow awaits retention-flow bootstrap."
);

for (const entry of checks) {
  const icon = entry.ok ? "✅" : "⚠️";
  console.log(`${icon} ${entry.label}${entry.ok ? "" : ` — ${entry.detail}`}`);
}

if (warnings.length > 0) {
  console.log("\nPerformance audit warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
  process.exit(1);
}

console.log("\n✅ Performance audit passed.");
