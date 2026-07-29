const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { distanceMeters, classifyRoute, parseGeoJSON, parseGpx } = require("../src/trails/geometry");
const { createTrailRouteStore } = require("../src/repositories/trailRouteStore");

test("geometry distance and loop classification use ordered coordinates", () => {
  const line = [{ latitude: 32.9, longitude: -96.8 }, { latitude: 32.901, longitude: -96.8 }];
  assert.ok(distanceMeters(line) > 110 && distanceMeters(line) < 112);
  assert.equal(classifyRoute([...line, { latitude: 32.9001, longitude: -96.8 }]), "loop");
  assert.equal(classifyRoute(line), "point_to_point");
});

test("GPX and GeoJSON accept valid lines and reject invalid geometry", () => {
  assert.equal(parseGpx('<gpx><trk><trkseg><trkpt lat="1" lon="2"></trkpt><trkpt lat="1.1" lon="2.1"></trkpt></trkseg></trk></gpx>').length, 2);
  assert.equal(parseGeoJSON({ type: "LineString", coordinates: [[2, 1], [2.1, 1.1]] }).length, 2);
  assert.throws(() => parseGeoJSON({ type: "Point", coordinates: [2, 1] }), /LineString/);
  assert.throws(() => parseGpx("<gpx></gpx>"), /2–100,000/);
});

test("route persistence requires attribution and geometry before admin verification", () => {
  const filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "trails-")), "routes.json"), store = createTrailRouteStore({ filePath, now: () => new Date("2026-07-28T00:00:00Z") });
  assert.throws(() => store.save({ canonicalName: "Northaven Trail", sourceType: "manual", verificationStatus: "admin_verified" }), /attribution/);
  assert.throws(() => store.save({ canonicalName: "Northaven Trail", sourceType: "manual", sourceIdentifier: "admin survey", verificationStatus: "admin_verified" }), /geometry/);
  const route = store.save({ googlePlaceId: "place-1", canonicalName: "Northaven Trail", aliases: ["Northaven"], routeType: "unknown", sourceType: "municipal_gis", sourceUrl: "https://city.example/trails/1", verificationStatus: "admin_verified", geometry: [[-96.8, 32.9], [-96.8, 32.901]] });
  assert.equal(route.distanceMeters > 110, true); assert.equal(route.sourceIdentifier, "https://city.example/trails/1"); assert.equal(store.findByPlaceId("place-1").id, route.id);
});

test("browser map helpers number markers and calculate bounds", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../public/trail-map.js"), "utf8").replace(/export /g, "");
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(`${source}\nexport {createMapPayload,payloadBounds,markerLabel}`).toString("base64")}`;
  const { createMapPayload, payloadBounds, markerLabel } = await import(moduleUrl);
  const payload = createMapPayload({ latitude: 1, longitude: 2 }, [{ id: "a", name: "A", latitude: 3, longitude: 4 }, { id: "b", name: "B", latitude: -1, longitude: 5 }]);
  assert.deepEqual(payload.markers.map(marker => marker.number), [1, 2]); assert.equal(markerLabel(2), "2"); assert.deepEqual(payloadBounds(payload), { north: 3, south: -1, east: 5, west: 2 });
});

test("trail UI separates internal details, directions, missing geometry, privacy, and mobile layout", () => {
  const js = fs.readFileSync(path.join(__dirname, "../public/greatness.js"), "utf8"), mapJs = fs.readFileSync(path.join(__dirname, "../public/trail-map.js"), "utf8"), html = fs.readFileSync(path.join(__dirname, "../public/greatness.html"), "utf8"), css = fs.readFileSync(path.join(__dirname, "../public/greatness.css"), "utf8"), env = fs.readFileSync(path.join(__dirname, "../.env.example"), "utf8");
  assert.match(js, /View trail/); assert.match(js, /Directions to trailhead/); assert.match(js, /Trail route not yet verified/); assert.match(js, /showTrailDetails/); assert.match(js, /map_render_failure/); assert.doesNotMatch(js, /trailDiagnostic\([^\n]*(?:position\.coords|latitude|longitude)/); assert.match(mapJs, /browser_config_http_status/); assert.match(mapJs, /maps_loader_callback/); assert.match(mapJs, /map_render_complete/); assert.doesNotMatch(mapJs, /\.at\(-1\)/); assert.match(html, /trailMap/); assert.match(css, /@media\(max-width:650px\)/); assert.match(env, /VITE_GOOGLE_MAPS_BROWSER_API_KEY/); assert.match(env, /GOOGLE_MAPS_API_KEY/);
});
