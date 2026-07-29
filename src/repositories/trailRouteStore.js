const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ROUTE_TYPES, SOURCE_TYPES, validateCoordinates, distanceMeters, classifyRoute } = require("../trails/geometry");

const VERIFICATION_STATUSES = new Set(["unverified", "system_matched", "admin_verified"]);
function cleanText(value, max = 500) { const text = String(value || "").trim(); return text ? text.slice(0, max) : null; }

function createTrailRouteStore({ filePath, now = () => new Date() }) {
  function read() { try { const data = JSON.parse(fs.readFileSync(filePath, "utf8")); return Array.isArray(data.routes) ? data : { schemaVersion: 1, routes: [] }; } catch (error) { if (error.code === "ENOENT") return { schemaVersion: 1, routes: [] }; throw error; } }
  function write(data) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); const temporary = `${filePath}.${process.pid}.tmp`; fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 }); fs.renameSync(temporary, filePath); }
  function list() { return read().routes.filter(route => !route.disabledAt); }
  function get(id) { return list().find(route => route.id === id) || null; }
  function findByPlaceId(googlePlaceId) { return list().find(route => route.googlePlaceId && route.googlePlaceId === googlePlaceId) || null; }
  function save(input) {
    const data = read(), existing = input.id ? data.routes.find(route => route.id === input.id) : null;
    const canonicalName = cleanText(input.canonicalName, 200); if (!canonicalName) throw new Error("Canonical name is required");
    const routeType = input.routeType || "unknown"; if (!ROUTE_TYPES.has(routeType)) throw new Error("Invalid route type");
    const sourceType = cleanText(input.sourceType, 50); if (!SOURCE_TYPES.has(sourceType)) throw new Error("A supported route source is required");
    const sourceIdentifier = cleanText(input.sourceUrl || input.sourceIdentifier, 1000); if (!sourceIdentifier) throw new Error("Traceable source attribution is required");
    const geometry = input.geometry?.length ? validateCoordinates(input.geometry) : [];
    if (geometry.length && input.startLatitude != null && input.startLongitude != null) geometry[0] = validateCoordinates([[input.startLongitude, input.startLatitude], [geometry[1].longitude, geometry[1].latitude]])[0];
    if (geometry.length && input.endLatitude != null && input.endLongitude != null) geometry[geometry.length - 1] = validateCoordinates([[geometry.at(-2).longitude, geometry.at(-2).latitude], [input.endLongitude, input.endLatitude]])[1];
    const verificationStatus = input.verificationStatus || "unverified"; if (!VERIFICATION_STATUSES.has(verificationStatus)) throw new Error("Invalid verification status");
    if (verificationStatus === "admin_verified" && geometry.length < 2) throw new Error("Verified routes require imported geometry");
    const timestamp = now().toISOString(), id = existing?.id || crypto.randomUUID();
    const record = { id, googlePlaceId: cleanText(input.googlePlaceId, 300), canonicalName, aliases: Array.from(new Set((input.aliases || []).map(value => cleanText(value, 200)).filter(Boolean))), routeType: geometry.length && routeType === "unknown" ? classifyRoute(geometry) : routeType, startLatitude: geometry[0]?.latitude ?? (Number(input.startLatitude) || null), startLongitude: geometry[0]?.longitude ?? (Number(input.startLongitude) || null), endLatitude: geometry.at(-1)?.latitude ?? (Number(input.endLatitude) || null), endLongitude: geometry.at(-1)?.longitude ?? (Number(input.endLongitude) || null), geometry, distanceMeters: geometry.length ? distanceMeters(geometry) : null, sourceType, sourceUrl: /^https:\/\//.test(sourceIdentifier) ? sourceIdentifier : null, sourceIdentifier, verificationStatus, lastVerifiedAt: verificationStatus === "admin_verified" ? timestamp : existing?.lastVerifiedAt || null, disabledAt: input.disabled ? timestamp : null, createdAt: existing?.createdAt || timestamp, updatedAt: timestamp };
    if (existing) data.routes[data.routes.indexOf(existing)] = record; else data.routes.push(record); write(data); return record;
  }
  function disable(id) { const data = read(), record = data.routes.find(route => route.id === id); if (!record) return null; record.disabledAt = now().toISOString(); record.updatedAt = record.disabledAt; write(data); return record; }
  return { list, get, findByPlaceId, save, disable };
}
module.exports = { createTrailRouteStore };
