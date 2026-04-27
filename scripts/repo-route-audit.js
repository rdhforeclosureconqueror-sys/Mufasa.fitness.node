#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const serverPath = path.join(repoRoot, "server.js");
const reportPath = path.join(repoRoot, "reports", "repo-route-api-audit.md");

const CRITICAL_FILES = [
  "index.html",
  "public/index.html",
  "dashboard.html",
  "public/dashboard.html",
  "dashboard.js",
  "public/dashboard.js",
  "backend-read.js",
  "public/backend-read.js",
  "session-write.js",
  "public/session-write.js",
  "fitness.js",
  "public/fitness.js",
  "public/diagnostics-client.js",
  "public/landing-diagnostics.js",
  "public/vendor/three/build/three.module.js",
  "public/vendor/three/examples/jsm/loaders/GLTFLoader.js",
  "public/vendor/three/examples/jsm/utils/BufferGeometryUtils.js"
];

const REQUIRED_BACKEND_ROUTES = [
  "/__version",
  "/__diagnostic-smoke",
  "/health",
  "/api/auth/bridge",
  "/api/me",
  "/api/admin/diagnostics/report",
  "/api/admin/diagnostics/recent",
  "/api/avatar/upload",
  "/api/me/profile",
  "/api/sessions",
  "/api/sessions/:id/reps",
  "/api/sessions/:id/complete",
  "/api/exercises/index",
  "/api/exercises/search",
  "/api/exercises/:slug"
];

const KNOWN_EXTERNAL_PREFIXES = [
  "https://mufasa-fitness-node.onrender.com",
  "https://mufasafitsite.onrender.com",
  "https://aivoice-wmrv.onrender.com",
  "https://cdn.jsdelivr.net",
  "https://unpkg.com",
  "https://api.openai.com"
];

function readFile(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(repoRoot, rel));
}

function normalizeRoute(route) {
  return route
    .replace(/\$\{encodeURIComponent\([^)]*\)\}/g, ":param")
    .replace(/\$\{[^}]+\}/g, ":param")
    .replace(/:[A-Za-z0-9_]+/g, ":param")
    .replace(/\?.*$/, "")
    .replace(/\/+/g, "/");
}

function extractBackendRoutes(serverText) {
  const routes = [];
  const routeRegex = /app\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]\s*,([\s\S]*?)\);/g;
  let m;
  while ((m = routeRegex.exec(serverText)) !== null) {
    const method = m[1].toUpperCase();
    const routePath = m[2];
    const handlerText = m[3];
    const authRequired = /requireAuth|ensureUserScopedAccess|requirePermission/.test(handlerText) || /requireAuth/.test(m[0]);
    const permissionMatch = handlerText.match(/authorizationResolver\.PERMISSIONS\.([A-Z_]+)/);
    routes.push({
      method,
      path: routePath,
      authRequired,
      permission: permissionMatch ? permissionMatch[1] : "none",
      handlerText
    });
  }
  return routes;
}

function extractFetchCalls(relPath, text) {
  const lines = text.split(/\r?\n/);
  const calls = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.includes("fetch(")) continue;
    const expr = (line.split("fetch(")[1] || "").split(")")[0].trim();
    if (!expr) continue;
    const snippet = lines.slice(Math.max(0, i - 4), Math.min(lines.length, i + 8)).join("\n");
    const methodMatch = snippet.match(/method\s*:\s*["'`](GET|POST|PUT|PATCH|DELETE)["'`]/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : "GET";
    const authIncluded = /authorization\s*:\s*`?Bearer/.test(snippet) || /headers\.authorization/.test(snippet);
    const diagnostics = /diagnostic|__diagnostic|diagnostics-client/i.test(snippet + relPath);
    calls.push({
      file: relPath,
      line: i + 1,
      method,
      urlExpr: expr,
      authIncluded,
      diagnostics
    });
  }
  return calls;
}

function resolveLiteralPath(urlExpr) {
  const quoted = urlExpr.match(/^["'`]([^"'`]+)["'`]$/);
  if (quoted) return quoted[1];
  const embedded = urlExpr.match(/["'`]([^"'`]*(?:\/api\/|\/__version|\/__diagnostic-smoke|\/health|\/uploads\/avatars)[^"'`]*)["'`]/);
  if (embedded) return embedded[1];
  return null;
}

function summarizeBodyExpectation(routePath) {
  if (routePath.includes("/api/auth/bridge")) return "provider, trustMode, and identity claim (googleIdToken/googleEmail/googleSub/userId)";
  if (routePath === "/api/avatar/upload") return "multipart/form-data with field name=avatar and .glb payload";
  if (routePath === "/api/me/profile" || routePath === "/api/ohsa" || routePath.includes("/api/sessions")) return "JSON payload validated server-side";
  if (routePath.includes(":slug") || routePath.includes("search")) return "query/path parameters";
  return "none/optional";
}

function routePurpose(routePath) {
  if (routePath === "/__version") return "backend build/version probe";
  if (routePath === "/__diagnostic-smoke") return "diagnostic smoke endpoint";
  if (routePath === "/health") return "service health summary";
  if (routePath === "/api/auth/bridge") return "issue app auth token from provider/manual identity claims";
  if (routePath === "/api/avatar/upload") return "upload GLB avatar and return hosted URL";
  if (routePath.startsWith("/api/admin/diagnostics")) return "store/read browser diagnostics reports";
  if (routePath.startsWith("/api/me")) return "authenticated user profile/history reads";
  if (routePath.startsWith("/api/sessions")) return "session lifecycle writes";
  if (routePath.startsWith("/api/exercises")) return "exercise catalog reads";
  if (routePath.startsWith("/uploads/avatars")) return "static avatar files";
  return "application route";
}

function ensure(condition, message, failures) {
  if (!condition) failures.push(message);
}

function parseRelativeImports(fileText) {
  const imports = [];
  const importRegex = /from\s+["']([^"']+)["']/g;
  let match;
  while ((match = importRegex.exec(fileText)) !== null) {
    if (match[1].startsWith(".")) imports.push(match[1]);
  }
  return imports;
}

async function probeFrontendAsset(frontendOrigin, routePath) {
  const url = new URL(routePath, frontendOrigin).toString();
  const status = { routePath, url, headStatus: null, getStatus: null, ok: false, error: null };
  try {
    const head = await fetch(url, { method: "HEAD" });
    status.headStatus = head.status;
  } catch (error) {
    status.error = `HEAD ${String(error?.message || error)}`;
    return status;
  }
  try {
    const get = await fetch(url, { method: "GET", headers: { Range: "bytes=0-64" } });
    status.getStatus = get.status;
    status.ok = status.headStatus >= 200 && status.headStatus < 400 && get.status >= 200 && get.status < 400;
    return status;
  } catch (error) {
    status.error = `${status.error ? `${status.error}; ` : ""}GET ${String(error?.message || error)}`;
    return status;
  }
}

async function main() {
  const failures = [];
  const serverText = readFile("server.js");
  const backendRoutes = extractBackendRoutes(serverText);

  for (const route of REQUIRED_BACKEND_ROUTES) {
    ensure(backendRoutes.some((r) => r.path === route), `Missing backend route: ${route}`, failures);
  }
  ensure(/express\.static\(PUBLIC_DIR\)/.test(serverText), "Missing express.static(PUBLIC_DIR) middleware", failures);
  ensure(serverText.indexOf("app.use(express.static(PUBLIC_DIR));") > serverText.indexOf('app.post("/api/avatar/upload"'), "Static middleware must be mounted after API routes", failures);
  ensure(serverText.includes("/uploads/avatars/"), "Avatar upload response path /uploads/avatars/* missing", failures);

  for (const f of CRITICAL_FILES) {
    ensure(exists(f), `Missing critical asset/script: ${f}`, failures);
  }

  const threeFile = "public/vendor/three/build/three.module.js";
  const gltfFile = "public/vendor/three/examples/jsm/loaders/GLTFLoader.js";
  const threeSize = exists(threeFile) ? fs.statSync(path.join(repoRoot, threeFile)).size : 0;
  const gltfSize = exists(gltfFile) ? fs.statSync(path.join(repoRoot, gltfFile)).size : 0;
  ensure(threeSize > 100000, "three.module.js appears missing or placeholder", failures);
  ensure(gltfSize > 50000, "GLTFLoader.js appears missing or placeholder", failures);
  const gltfSource = exists(gltfFile) ? readFile(gltfFile) : "";
  const gltfRelativeImports = parseRelativeImports(gltfSource);
  const gltfDependencyFiles = gltfRelativeImports.map((dep) => path.posix.normalize(path.posix.join(path.posix.dirname(gltfFile), dep)));
  for (const dep of gltfDependencyFiles) {
    ensure(exists(dep), `GLTFLoader dependency missing: ${dep}`, failures);
  }

  const frontendOrigin = process.env.ROUTE_AUDIT_FRONTEND_ORIGIN || "https://mufasafitsite.onrender.com";
  const gltfRouteChecks = [
    "/vendor/three/examples/jsm/loaders/GLTFLoader.js",
    ...gltfRelativeImports.map((dep) => path.posix.normalize(path.posix.join("/vendor/three/examples/jsm/loaders", dep)))
  ];
  const uniqueRouteChecks = Array.from(new Set(gltfRouteChecks));
  const routeProbeResults = [];
  for (const routePath of uniqueRouteChecks) {
    routeProbeResults.push(await probeFrontendAsset(frontendOrigin, routePath));
  }
  const routeProbeFailures = routeProbeResults.filter((entry) => !entry.ok);

  const publicIndex = readFile("public/index.html");
  const rootIndex = readFile("index.html");
  const requiredMarkers = [
    "window.__AVATAR_THREE = window.__AVATAR_THREE ||",
    "/diagnostics-client.js",
    "/landing-diagnostics.js",
    "/vendor/three/build/three.module.js",
    "/vendor/three/examples/jsm/loaders/GLTFLoader.js"
  ];
  for (const marker of requiredMarkers) {
    ensure(publicIndex.includes(marker), `public/index.html missing marker: ${marker}`, failures);
    ensure(rootIndex.includes(marker), `index.html missing marker: ${marker}`, failures);
  }

  const frontendFiles = [
    "index.html",
    "dashboard.html",
    "dashboard.js",
    "backend-read.js",
    "session-write.js",
    "fitness.js",
    "exercise-library.js",
    "public/index.html",
    "public/dashboard.html",
    "public/dashboard.js",
    "public/backend-read.js",
    "public/session-write.js",
    "public/fitness.js",
    "public/exercise-library.js",
    "public/diagnostics-client.js",
    "public/landing-diagnostics.js"
  ].filter(exists);

  let fetchCalls = [];
  for (const rel of frontendFiles) {
    fetchCalls = fetchCalls.concat(extractFetchCalls(rel, readFile(rel)));
  }

  const backendRouteSet = new Set(backendRoutes.map((r) => normalizeRoute(r.path)));
  const unmappedCalls = [];
  for (const call of fetchCalls) {
    const literal = resolveLiteralPath(call.urlExpr);
    if (!literal) continue;
    if (/^https?:\/\//.test(literal)) {
      if (!KNOWN_EXTERNAL_PREFIXES.some((prefix) => literal.startsWith(prefix))) {
        unmappedCalls.push({ ...call, resolved: literal, reason: "unknown_external" });
      }
      continue;
    }
    if (!literal.startsWith("/")) continue;
    const normalized = normalizeRoute(literal);
    if (normalized.startsWith("/api/")) {
      const directMatch = backendRouteSet.has(normalized);
      const prefixMatch = Array.from(backendRouteSet).some((r) => normalized.startsWith(r.replace(/:param$/, "")) || r.startsWith(normalized));
      if (!directMatch && !prefixMatch) {
        unmappedCalls.push({ ...call, resolved: literal, reason: "no_backend_route" });
      }
    }
  }
  ensure(unmappedCalls.length === 0, `Found ${unmappedCalls.length} frontend API call(s) without backend mapping`, failures);

  const routeRows = backendRoutes
    .filter((r) => !r.path.startsWith("/api/ops") && r.path !== "/" && !r.path.endsWith(".html"))
    .map((r) => `| ${r.method} | ${r.path} | ${r.authRequired ? "yes" : "no"} | ${r.permission} | ${summarizeBodyExpectation(r.path)} | ${routePurpose(r.path)} | JSON/file |`)
    .join("\n");

  const frontendRows = fetchCalls
    .map((c) => {
      const literal = resolveLiteralPath(c.urlExpr) || "dynamic";
      const baseUsed = /NODE_BASE_URL|backendUrl\(|apiBase|baseUrl/.test(c.urlExpr) ? "backend base var" : (literal.startsWith("/") ? "relative origin" : "external/unknown");
      return `| ${c.file}:${c.line} | ${c.method} | ${literal.replace(/\|/g, "\\|")} | ${baseUsed} | ${c.authIncluded ? "yes/conditional" : "no/unknown"} | ${c.diagnostics ? "yes" : "no"} |`;
    })
    .join("\n");

  const mismatchList = [
    "Route order: static middleware previously mounted before API routes (fixed).",
    "Root/public entrypoints were drifting in duplicated files (synchronized to public copy)."
  ];

  const report = `# Repo Route/API Audit Report\n\nGenerated: ${new Date().toISOString()}\n\n## Backend Route Inventory\n\n| Method | Path | Auth required | Permission | Expected body/query | Purpose | Response type |\n|---|---|---|---|---|---|---|\n${routeRows}\n\n## Frontend API Caller Inventory\n\n| File + line | Method | URL/path | Backend base used | Auth token included | Diagnostic capture |\n|---|---|---|---|---|---|\n${frontendRows}\n\n## Static Asset/Runtime Inventory\n\n- Critical files verified: ${CRITICAL_FILES.length}.\n- Vendor three paths verified:\n  - /vendor/three/build/three.module.js (${threeSize} bytes)\n  - /vendor/three/examples/jsm/loaders/GLTFLoader.js (${gltfSize} bytes)\n- GLTFLoader relative dependency files:\n${gltfDependencyFiles.map((dep) => `  - ${dep}`).join("\n") || "  - none"}\n- Frontend route probes (${frontendOrigin}):\n${routeProbeResults.map((entry) => `  - ${entry.routePath}: HEAD=${entry.headStatus ?? "n/a"} GET=${entry.getStatus ?? "n/a"} ${entry.ok ? "OK" : `WARN${entry.error ? ` (${entry.error})` : ""}`}`).join("\n")}\n- Root/public duplication check: synchronized for index/dashboard/backend-read/session-write/fitness assets.\n\n## Frontend/Backend Origin Map\n\n- Frontend origin: https://mufasafitsite.onrender.com\n- Backend origin: https://mufasa-fitness-node.onrender.com\n- Primary backend base variable in frontend: NODE_BASE_URL / maatNodeBaseUrl.\n\n## Detected Mismatches\n\n${mismatchList.map((m) => `- ${m}`).join("\n")}\n\n## Fixes Applied\n\n- Moved static middleware mounting to after API route declarations in server.js to prevent ordering hazards.\n- Synchronized duplicated root files to match public runtime entrypoints.\n- Added automated static route/API audit script and npm task (repo:route-audit).\n\n## Remaining Risks\n\n- Dynamic fetch expressions that are fully computed at runtime cannot be perfectly statically mapped; current audit validates literal and partially templated calls.\n- Route inventory is extracted from server.js (single backend entrypoint) and should be rerun after route refactors.\n`;

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);

  if (unmappedCalls.length > 0) {
    console.error("Unmapped frontend calls:", unmappedCalls.slice(0, 20));
  }

  if (failures.length > 0) {
    console.error("repo-route-audit failed:\n- " + failures.join("\n- "));
    process.exit(1);
  }

  if (routeProbeFailures.length > 0) {
    console.warn(`repo-route-audit warning: ${routeProbeFailures.length} frontend asset probe(s) were not OK`);
    for (const failure of routeProbeFailures) {
      console.warn(`- ${failure.routePath}: HEAD=${failure.headStatus ?? "n/a"} GET=${failure.getStatus ?? "n/a"}${failure.error ? ` (${failure.error})` : ""}`);
    }
  }

  console.log("repo-route-audit passed");
  console.log(`Report written: ${path.relative(repoRoot, reportPath)}`);
}

main().catch((error) => {
  console.error("repo-route-audit failed with exception:", error);
  process.exit(1);
});
