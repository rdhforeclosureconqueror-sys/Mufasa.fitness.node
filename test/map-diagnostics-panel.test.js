const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("map diagnostics is admin/debug gated and redacts credentials", () => {
  const source = fs.readFileSync(path.join(__dirname, "../public/map-diagnostics.js"), "utf8");
  assert.match(source, /ADMIN_ROLES\.has\(role\)\|\|config\.debugMapEnabled===true/);
  assert.match(source, /\[REDACTED\]/);
  assert.match(source, /SECRET_KEY/);
  assert.doesNotMatch(source, /googleMapsBrowserApiKey[^\n]*innerHTML/);
  assert.match(source, /Copy Diagnostics/);
  assert.match(source, /Retry Map Initialization/);
  assert.match(source, /Clear Map Cache/);
  assert.match(source, /DIAGNOSTICS_VERSION = "mobile-map-config-route-20260729"/);
  assert.match(source, /Map diagnostics build:/);
  assert.match(source, /Map Debug/);
});

test("map instrumentation covers configuration, libraries, markers, failures, and timing", () => {
  const diagnostics = fs.readFileSync(path.join(__dirname, "../public/map-diagnostics.js"), "utf8");
  const map = fs.readFileSync(path.join(__dirname, "../public/trail-map.js"), "utf8");
  for (const event of ["browser_config_request_started", "browser_config_http_status", "browser_config_parsed", "browser_key_present", "maps_script_appended", "maps_loader_callback", "maps_namespace_ready", "maps_libraries_ready", "map_created", "markers_created", "map_render_complete"]) assert.match(`${diagnostics}\n${map}`, new RegExp(event));
  for (const timing of ["browserConfig", "scriptLoad", "libraryImport", "mapRender"]) assert.match(diagnostics, new RegExp(timing));
});

test("browser config exposes only the debug boolean alongside the browser key", () => {
  const server = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
  assert.match(server, /debugMapEnabled: String\(process\.env\.DEBUG_MAP/);
  assert.match(server, /RENDER_GIT_COMMIT/);
});

test("greatness page loads diagnostics independently with a cache-busting revision", () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/greatness.html"), "utf8");
  const runtime = fs.readFileSync(path.join(__dirname, "../public/greatness.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../public/greatness.css"), "utf8");
  assert.match(html, /src="map-diagnostics\.js\?v=walking-route-phase2-20260729"/);
  assert.match(html, /src="greatness\.js\?v=goal-builder-20260802"/);
  assert.match(runtime, /trail-map\.js\?v=mobile-map-config-route-20260729/);
  assert.match(runtime, /map-diagnostics\.js\?v=mobile-map-config-route-20260729/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /z-index:2147483001/);
});

test("map configuration resolves against the shared backend origin without credentials or redirects", () => {
  const helper = fs.readFileSync(path.join(__dirname, "../public/backend-origin.js"), "utf8");
  const map = fs.readFileSync(path.join(__dirname, "../public/trail-map.js"), "utf8");
  const diagnostics = fs.readFileSync(path.join(__dirname, "../public/map-diagnostics.js"), "utf8");
  assert.match(helper, /RuntimeState\?\.getBackendOrigin/);
  assert.match(helper, /MAAT_BACKEND_ORIGIN/);
  assert.match(helper, /__MAAT_RUNTIME_CONFIG__/);
  assert.match(helper, /https:\/\/mufasa-fitness-node\.onrender\.com/);
  assert.match(map, /backendUrl\("\/api\/browser-config"\)/);
  assert.match(map, /credentials: "omit", redirect: "error"/);
  assert.doesNotMatch(map, /fetch\("\/api\/browser-config"/);
  assert.match(diagnostics, /backendUrl\("\/api\/browser-config"\)/);
});

test("nearby trail comparison captures matching redacted request and response evidence", () => {
  const diagnostics = fs.readFileSync(path.join(__dirname, "../public/map-diagnostics.js"), "utf8");
  const runtime = fs.readFileSync(path.join(__dirname, "../public/greatness.js"), "utf8");
  for (const field of ["requestId", "requestUrl", "queryParameters", "credentialsMode", "cookiesPresent", "responseStatus", "finalResponseUrl", "redirectOccurred", "contentType", "contentEncoding", "transferEncoding", "cacheControl", "responseLength", "clientBytesReceived", "responseClassification", "parsedSchema", "validationResult"]) assert.match(`${diagnostics}\n${runtime}`, new RegExp(field));
  assert.match(diagnostics, /Desktop vs iPhone differences/);
  assert.match(diagnostics, /Desktop vs Android differences/);
  assert.match(diagnostics, /nearbyTrailsComparison/);
  assert.match(runtime, /\[REDACTED\]/);
  assert.match(runtime, /requestHeaders:Object\.fromEntries/);
  assert.match(runtime, /headers\["X-Request-ID"\]=clientRequestId/);
  assert.match(runtime, /new URL\("\/api\/me\/greatness\/nearby-trails\/search",backendOrigin\(\)\)\.href/);
  assert.match(fs.readFileSync(path.join(__dirname, "../public/backend-origin.js"), "utf8"), /https:\/\/mufasa-fitness-node\.onrender\.com/);
});
