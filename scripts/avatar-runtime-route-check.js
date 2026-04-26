#!/usr/bin/env node
"use strict";

const https = require("https");

const LIVE_BASE_URL = (process.env.LIVE_BASE_URL || "https://mufasa-fitness-node.onrender.com").replace(/\/+$/g, "");
const BUILD_VERSION = process.env.EXPECT_BUILD_VERSION || "2026-04-25T00:00:00Z-avatar-runtime-bootstrap1";
const CACHE_BUST = process.env.EXPECT_CACHE_BUST || "20260425";

function fetchUrl(url, method = "GET") {
  return new Promise((resolve) => {
    const req = https.request(url, { method, timeout: 15000 }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        resolve({ ok: true, status: res.statusCode || 0, headers: res.headers || {}, body: Buffer.concat(chunks).toString("utf8") });
      });
    });
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", (error) => {
      resolve({ ok: false, status: 0, headers: {}, body: "", error: String(error?.message || error || "unknown") });
    });
    req.end();
  });
}

function printResult(label, result, acceptedStatuses = [200]) {
  const pass = result.ok && acceptedStatuses.includes(result.status);
  const statusText = result.ok ? `HTTP ${result.status}` : `ERROR ${result.error}`;
  const icon = pass ? "✅" : "❌";
  console.log(`${icon} ${label}: ${statusText}`);
  return pass;
}

(async () => {
  let failed = false;

  const routes = [
    { path: `/`, statuses: [200, 302, 307, 308] },
    { path: `/__version`, statuses: [200] },
    { path: `/health`, statuses: [200] },
    { path: `/api/me`, statuses: [200, 401] },
    { path: `/api/exercises/index`, statuses: [200] },
    { path: `/api/exercises/search`, statuses: [200, 400] },
    { path: `/api/avatar/upload`, statuses: [404, 405, 415] },
    { path: `/form-engine.js`, statuses: [200] },
    { path: `/backend-read.js`, statuses: [200] },
    { path: `/session-write.js`, statuses: [200] },
    { path: `/fitness.js`, statuses: [200] }
  ];

  for (const route of routes) {
    const result = await fetchUrl(`${LIVE_BASE_URL}${route.path}`);
    const pass = printResult(`${LIVE_BASE_URL}${route.path}`, result, route.statuses);
    if (!pass) failed = true;
  }

  const shell = await fetchUrl(`${LIVE_BASE_URL}/?v=${CACHE_BUST}`);
  if (!printResult(`shell served ${LIVE_BASE_URL}/?v=${CACHE_BUST}`, shell, [200])) failed = true;

  const version = await fetchUrl(`${LIVE_BASE_URL}/__version`);
  let liveBuild = null;
  if (version.ok && version.status === 200) {
    try {
      liveBuild = JSON.parse(version.body || "{}").build || null;
    } catch (_) {}
  }
  const buildMatch = liveBuild === BUILD_VERSION;
  console.log(`${buildMatch ? "✅" : "❌"} live build version: ${liveBuild || "unavailable"} (expected ${BUILD_VERSION})`);
  if (!buildMatch) failed = true;

  if (shell.ok && shell.status === 200) {
    const html = shell.body || "";
    const markers = [
      "window.APP_BUILD_VERSION",
      "window.__avatarRuntimeStatus",
      "window.__retryAvatarRuntime",
      "/form-engine.js",
      "three.module.js",
      "GLTFLoader.js"
    ];
    for (const marker of markers) {
      const present = html.includes(marker);
      console.log(`${present ? "✅" : "❌"} shell contains marker: ${marker}`);
      if (!present) failed = true;
    }
  } else {
    failed = true;
    console.log("❌ shell marker checks skipped: shell unavailable");
  }

  const cdnChecks = [
    "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js",
    "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js"
  ];
  for (const cdnUrl of cdnChecks) {
    const result = await fetchUrl(cdnUrl);
    const pass = printResult(cdnUrl, result, [200]);
    if (!pass) failed = true;
  }

  if (failed) process.exit(1);
})();
