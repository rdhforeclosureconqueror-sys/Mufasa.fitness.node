#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = process.cwd();
let failed = false;

function check(label, condition, details = "") {
  if (condition) {
    console.log(`✅ ${label}`);
    return;
  }
  failed = true;
  console.error(`❌ ${label}${details ? ` (${details})` : ""}`);
}

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

function runScript(command, args) {
  const run = spawnSync(command, args, { cwd: repoRoot, stdio: "inherit" });
  return run.status === 0;
}

check("public/index.html exists", exists("public/index.html"));
check("public/session-write.js exists", exists("public/session-write.js"));
check("public/backend-read.js exists", exists("public/backend-read.js"));
check("exercise DB index exists", exists("public/exercise-db/index.json"));

const serverPath = path.join(repoRoot, "server.js");
const serverSource = fs.existsSync(serverPath) ? fs.readFileSync(serverPath, "utf8") : "";
const avatarFeatureEnabled = process.env.ENABLE_AVATAR_FEATURE === "true";
check("avatar upload route exists", serverSource.includes('app.post("/api/avatar/upload"'));
check("avatar upload is feature-gated", serverSource.includes("ENABLE_AVATAR_FEATURE") && serverSource.includes("FEATURE_DISABLED"));
check("session routes exist", serverSource.includes('app.post("/api/sessions"') && serverSource.includes('app.post("/api/sessions/:id/reps"') && serverSource.includes('app.post("/api/sessions/:id/complete"'));
check("profile routes exist", serverSource.includes('app.get("/api/me/profile"') && serverSource.includes('app.put("/api/me/profile"'));

const indexPath = path.join(repoRoot, "public", "index.html");
const indexSource = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
const gltfLoaderImportRefs = (indexSource.match(/examples\/jsm\/loaders\/GLTFLoader\.js/g) || []).length;
const threeModuleImportRefs = (indexSource.match(/build\/three\.module\.js/g) || []).length;
const legacyLoaderRefs = (indexSource.match(/examples\/js\/loaders\/GLTFLoader\.js/g) || []).length;
if (avatarFeatureEnabled) {
  check(
    "Three.js runtime references are present and modern",
    gltfLoaderImportRefs >= 1 && threeModuleImportRefs >= 1 && legacyLoaderRefs === 0,
    `GLTFLoader imports: ${gltfLoaderImportRefs}, Three imports: ${threeModuleImportRefs}, legacy loader refs: ${legacyLoaderRefs}`
  );
} else {
  check(
    "Three.js runtime markers may be absent when avatar is disabled",
    legacyLoaderRefs === 0,
    `avatar disabled intentionally; GLTFLoader imports: ${gltfLoaderImportRefs}, Three imports: ${threeModuleImportRefs}, legacy loader refs: ${legacyLoaderRefs}`
  );
}

check("lint passes", runScript("npm", ["run", "lint"]));
check("tests pass", runScript("npm", ["test"]));

if (failed) process.exit(1);
console.log("✅ pilot non-security checks passed");
