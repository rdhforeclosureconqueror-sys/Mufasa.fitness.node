const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("map diagnostics is admin/debug gated and redacts credentials", () => {
  const source = fs.readFileSync(path.join(__dirname, "../public/map-diagnostics.js"), "utf8");
  assert.match(source, /ADMIN_ROLES\.has\(role\).*config\.debugMap !== true/);
  assert.match(source, /\[REDACTED\]/);
  assert.match(source, /SECRET_KEY/);
  assert.doesNotMatch(source, /googleMapsBrowserApiKey[^\n]*innerHTML/);
  assert.match(source, /Copy Diagnostics/);
  assert.match(source, /Retry Map Initialization/);
  assert.match(source, /Clear Map Cache/);
});

test("map instrumentation covers configuration, libraries, markers, failures, and timing", () => {
  const diagnostics = fs.readFileSync(path.join(__dirname, "../public/map-diagnostics.js"), "utf8");
  const map = fs.readFileSync(path.join(__dirname, "../public/trail-map.js"), "utf8");
  for (const event of ["browser_config_request_started", "maps_script_loaded", "maps_namespace_ready", "maps_library_loaded", "marker_library_loaded", "map_created", "markers_added", "map_render_complete"]) assert.match(`${diagnostics}\n${map}`, new RegExp(event));
  for (const timing of ["browserConfig", "scriptLoad", "libraryImport", "mapRender"]) assert.match(diagnostics, new RegExp(timing));
});

test("browser config exposes only the debug boolean alongside the browser key", () => {
  const server = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
  assert.match(server, /debugMap: String\(process\.env\.DEBUG_MAP/);
});
