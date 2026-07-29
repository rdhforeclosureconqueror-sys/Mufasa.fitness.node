const EARTH_RADIUS_METERS = 6371000;
const ROUTE_TYPES = new Set(["loop", "out_and_back", "point_to_point", "network", "unknown"]);
const SOURCE_TYPES = new Set(["openstreetmap", "gpx", "geojson", "manual", "municipal_gis"]);

function haversineMeters(a, b) {
  const radians = value => value * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function validateCoordinates(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2 || coordinates.length > 100000) throw new Error("Route geometry must contain 2–100,000 ordered coordinates");
  return coordinates.map((point, index) => {
    const latitude = Number(point?.latitude ?? point?.[1]);
    const longitude = Number(point?.longitude ?? point?.[0]);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error(`Invalid coordinate at index ${index}`);
    return { latitude, longitude };
  });
}

function distanceMeters(coordinates) {
  const points = validateCoordinates(coordinates);
  return points.slice(1).reduce((sum, point, index) => sum + haversineMeters(points[index], point), 0);
}

function classifyRoute(coordinates, thresholdMeters = 35) {
  const points = validateCoordinates(coordinates);
  return haversineMeters(points[0], points.at(-1)) <= thresholdMeters ? "loop" : "point_to_point";
}

function parseGeoJSON(input) {
  const document = typeof input === "string" ? JSON.parse(input) : input;
  const geometry = document?.type === "Feature" ? document.geometry : document?.type === "FeatureCollection" ? document.features?.[0]?.geometry : document;
  if (geometry?.type !== "LineString") throw new Error("GeoJSON must contain a LineString");
  return validateCoordinates(geometry.coordinates);
}

function parseGpx(xml) {
  if (typeof xml !== "string" || !/<gpx[\s>]/i.test(xml)) throw new Error("GPX document is required");
  const coordinates = [];
  const pattern = /<(?:trkpt|rtept)\b[^>]*\blat=["']([^"']+)["'][^>]*\blon=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = pattern.exec(xml))) coordinates.push({ latitude: Number(match[1]), longitude: Number(match[2]) });
  return validateCoordinates(coordinates);
}

module.exports = { ROUTE_TYPES, SOURCE_TYPES, haversineMeters, validateCoordinates, distanceMeters, classifyRoute, parseGeoJSON, parseGpx };
