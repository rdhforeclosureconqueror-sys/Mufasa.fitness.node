"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_CHECKS = [
  "/",
  "/__version",
  "/health",
  "/api/me",
  "/api/exercises/index",
  "/api/exercises/search",
  "/form-engine.js",
  "/backend-read.js",
  "/session-write.js",
  "/fitness.js"
];

async function checkUrl(baseUrl, route) {
  const startedAt = Date.now();
  try {
    const res = await fetch(new URL(route, baseUrl));
    return {
      route,
      ok: res.ok,
      status: res.status,
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      route,
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      error: error?.message || String(error)
    };
  }
}

function checkShellForCdn(shellPath) {
  const raw = fs.readFileSync(shellPath, "utf8");
  return {
    threeCdnPresent: raw.includes("three@0.158.0/build/three.module.js"),
    gltfLoaderCdnPresent: raw.includes("examples/jsm/loaders/GLTFLoader.js")
  };
}

async function runRouteDiagnostics(options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || "http://127.0.0.1:3000";
  const rootDir = options.rootDir || process.cwd();
  const checks = [];
  for (const route of DEFAULT_CHECKS) {
    checks.push(await checkUrl(baseUrl, route));
  }

  const shellPath = path.join(rootDir, "public", "index.html");
  const cdnCheck = checkShellForCdn(shellPath);
  const avatarUrl = options.avatarUrl || process.env.CURRENT_AVATAR_URL || "";
  let avatarRouteCheck = null;
  if (avatarUrl) {
    avatarRouteCheck = await checkUrl(baseUrl, avatarUrl);
  }

  return {
    baseUrl,
    timestamp: new Date().toISOString(),
    checks,
    cdnCheck,
    avatarRouteCheck,
    passCount: checks.filter((x) => x.ok).length,
    failCount: checks.filter((x) => !x.ok).length
  };
}

module.exports = {
  runRouteDiagnostics,
  DEFAULT_CHECKS
};
