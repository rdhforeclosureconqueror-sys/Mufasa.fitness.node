"use strict";

const { haversineMeters } = require("./gpsEngine");
const { MILE_METERS, KILOMETER_METERS } = require("./domain");

function acceptedPoints(samples = [], limit = 2000) {
  const points = samples.filter((p) => p?.accepted !== false && Number.isFinite(Number(p?.latitude)) && Number.isFinite(Number(p?.longitude)))
    .map((p) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude), capturedAtMs: Number(p.capturedAtMs), accuracyMeters: Number.isFinite(Number(p.accuracyMeters)) ? Number(p.accuracyMeters) : undefined, altitudeMeters: Number.isFinite(Number(p.altitudeMeters)) ? Number(p.altitudeMeters) : undefined, altitudeAccuracyMeters: Number.isFinite(Number(p.altitudeAccuracyMeters)) ? Number(p.altitudeAccuracyMeters) : undefined }));
  if (points.length <= limit) return points;
  const stride = Math.ceil(points.length / limit);
  const bounded = points.filter((_, index) => index % stride === 0);
  if (bounded.at(-1) !== points.at(-1)) bounded.push(points.at(-1));
  return bounded.slice(0, limit);
}

function interpolateTime(a, b, fraction) { return a.capturedAtMs + ((b.capturedAtMs - a.capturedAtMs) * fraction); }
function generateSplits(samples = [], splitMeters) {
  const points = acceptedPoints(samples, Number.MAX_SAFE_INTEGER);
  if (points.length < 2) return [];
  const splits = []; let cumulative = 0, boundary = splitMeters, splitStartedAt = points[0].capturedAtMs;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (!Number.isFinite(a.capturedAtMs) || !Number.isFinite(b.capturedAtMs) || b.capturedAtMs <= a.capturedAtMs) continue;
    const segment = haversineMeters(a, b); if (segment <= 0) continue;
    const before = cumulative; cumulative += segment;
    while (cumulative + 0.01 >= boundary) {
      const fraction = Math.max(0, Math.min(1, (boundary - before) / segment));
      const endedAt = interpolateTime(a, b, fraction);
      splits.push({ index: splits.length + 1, distanceMeters: splitMeters, durationMs: Math.max(0, endedAt - splitStartedAt), complete: true });
      splitStartedAt = endedAt; boundary += splitMeters;
    }
  }
  const remainder = cumulative - ((boundary - splitMeters));
  if (remainder > 0.5) splits.push({ index: splits.length + 1, distanceMeters: remainder, durationMs: Math.max(0, points.at(-1).capturedAtMs - splitStartedAt), complete: false });
  return splits;
}

function calculateElevationGain(samples = []) {
  const points = acceptedPoints(samples, Number.MAX_SAFE_INTEGER).filter((p) => Number.isFinite(p.altitudeMeters) && (!Number.isFinite(p.altitudeAccuracyMeters) || p.altitudeAccuracyMeters <= 20));
  if (points.length < 3) return undefined;
  let gain = 0, anchor = points[0].altitudeMeters;
  for (const point of points.slice(1)) { const delta = point.altitudeMeters - anchor; if (Math.abs(delta) >= 3 && Math.abs(delta) <= 50) { if (delta > 0) gain += delta; anchor = point.altitudeMeters; } }
  return { meters: Math.round(gain * 10) / 10, estimated: true, usableSampleCount: points.length };
}

function activityMetrics(samples) { return { mileSplits: generateSplits(samples, MILE_METERS), kilometerSplits: generateSplits(samples, KILOMETER_METERS), elevation: calculateElevationGain(samples) }; }
module.exports = { acceptedPoints, generateSplits, calculateElevationGain, activityMetrics };
