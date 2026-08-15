"use strict";

const { GPS_DEFAULTS } = require("./domain");

function haversineMeters(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

function createGpsProcessor(activityType, options = {}) {
  const config = { ...GPS_DEFAULTS, ...options, maximumSpeedMetersPerSecond: { ...GPS_DEFAULTS.maximumSpeedMetersPerSecond, ...(options.maximumSpeedMetersPerSecond || {}) } };
  let baseline = null;
  // Distance uses a separate anchor. Advancing the validation baseline on every
  // good fix while dropping sub-threshold segments permanently lost normal
  // movement when Safari delivered frequent fixes less than 3 m apart.
  let distanceAnchor = null;
  let lastTimestamp = null;
  let distanceMeters = 0;
  let suspiciousMovementDetected = false;
  let baselineResetCount = 0;
  const excludedMetersByReason = {};
  const samples = [];

  function reject(raw, reason) { const sample = { ...raw, accepted: false, rejectionReason: reason }; samples.push(sample); return sample; }
  function add(raw, { paused = false, nowMs = Date.now() } = {}) {
    const sample = { latitude: Number(raw?.latitude), longitude: Number(raw?.longitude), capturedAtMs: Number(raw?.capturedAtMs), accuracyMeters: raw?.accuracyMeters, altitudeMeters: raw?.altitudeMeters, altitudeAccuracyMeters: raw?.altitudeAccuracyMeters, headingDegrees: raw?.headingDegrees, reportedSpeedMetersPerSecond: raw?.reportedSpeedMetersPerSecond };
    if (!Number.isFinite(sample.latitude) || !Number.isFinite(sample.longitude) || Math.abs(sample.latitude) > 90 || Math.abs(sample.longitude) > 180) return reject(sample, "missing_coordinates");
    if (!Number.isFinite(sample.capturedAtMs)) return reject(sample, "stale_timestamp");
    if (lastTimestamp !== null && sample.capturedAtMs === lastTimestamp) return reject(sample, "duplicate_timestamp");
    if ((lastTimestamp !== null && sample.capturedAtMs < lastTimestamp) || nowMs - sample.capturedAtMs > config.staleAfterMs) return reject(sample, "stale_timestamp");
    lastTimestamp = sample.capturedAtMs;
    if (Number.isFinite(sample.accuracyMeters) && sample.accuracyMeters > config.maximumAccuracyMeters) return reject(sample, "poor_accuracy");
    if (paused) { baseline = null; return reject(sample, "session_paused"); }
    if (baseline) {
      const segment = haversineMeters(baseline, sample);
      const seconds = (sample.capturedAtMs - baseline.capturedAtMs) / 1000;
      const speed = seconds > 0 ? segment / seconds : Infinity;
      if (segment >= config.jumpDistanceMeters) { suspiciousMovementDetected = true; baseline = null; distanceAnchor = null; baselineResetCount++; excludedMetersByReason.gps_jump=(excludedMetersByReason.gps_jump||0)+segment; return reject(sample, "gps_jump"); }
      if (speed > config.maximumSpeedMetersPerSecond[activityType]) { suspiciousMovementDetected = true; excludedMetersByReason.impossible_speed=(excludedMetersByReason.impossible_speed||0)+segment; return reject(sample, "impossible_speed"); }
    }
    if (distanceAnchor) {
      const accumulatedSegment = haversineMeters(distanceAnchor, sample);
      if (accumulatedSegment >= config.minimumSegmentMeters) { distanceMeters += accumulatedSegment; distanceAnchor = sample; }
    } else distanceAnchor = sample;
    sample.accepted = true; samples.push(sample); baseline = sample; return sample;
  }
  function resetBaseline() { baseline = null; distanceAnchor = null; baselineResetCount++; }
  function summary() {
    const accepted = samples.filter((s) => s.accepted);
    const accuracies = accepted.map((s) => s.accuracyMeters).filter(Number.isFinite);
    const averageAccuracyMeters = accuracies.length ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length : undefined;
    const ratio = samples.length ? accepted.length / samples.length : 0;
    const rating = !samples.length ? "unavailable" : ratio >= .9 && (averageAccuracyMeters ?? 0) <= 15 ? "excellent" : ratio >= .75 ? "good" : ratio >= .5 ? "fair" : "poor";
    return { distanceMeters, samples: samples.slice(), diagnostics:{rawSampleCount:samples.length,acceptedSampleCount:accepted.length,rejectedSampleCount:samples.length-accepted.length,accumulatedAcceptedSegmentMeters:distanceMeters,excludedMetersByReason:{...excludedMetersByReason},baselineResetCount,finalUnroundedDistanceMeters:distanceMeters,unitConversionPath:"browser_geolocation coordinates -> Haversine meters -> kilometers / 1000"}, gpsQuality: { rating, acceptedSamples: accepted.length, rejectedSamples: samples.length - accepted.length, averageAccuracyMeters, suspiciousMovementDetected } };
  }
  return { add, resetBaseline, summary };
}

module.exports = { haversineMeters, createGpsProcessor };
