"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ApiError } = require("../lib/apiResponse");

const STATUSES = Object.freeze(["draft", "demo_recorded", "phase_review", "testing", "approved", "active", "rejected"]);
const MOVEMENT_PATTERNS = Object.freeze(["squat", "push", "pull", "lunge", "hinge", "curl", "core", "carry", "rotation", "other"]);
const DEMO_SLOTS = Object.freeze(["front_view", "side_view", "optional_extra_view"]);
const POSITION_PRESETS = Object.freeze(["start", "bottom", "top", "extension", "contraction", "finish", "standing"]);
const REQUIRED_APPROVAL_STATUSES = Object.freeze(["approved", "active"]);

function nowIso() { return new Date().toISOString(); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function safeString(value, fallback = "") { return String(value ?? fallback).trim(); }
function average(values) {
  const nums = values.map(Number).filter((v) => Number.isFinite(v));
  return nums.length ? nums.reduce((sum, v) => sum + v, 0) / nums.length : null;
}
function scoreOf(kp) { return Number(kp?.score ?? kp?.confidence ?? 0); }
function keypointName(kp) { return kp?.name || kp?.part || kp?.id || null; }
function pointsByName(keypoints = []) {
  const out = new Map();
  for (const kp of Array.isArray(keypoints) ? keypoints : []) {
    const name = keypointName(kp);
    if (name) out.set(name, kp);
  }
  return out;
}
function angle(a, b, c) {
  if (!a || !b || !c) return null;
  const ab = { x: Number(a.x) - Number(b.x), y: Number(a.y) - Number(b.y) };
  const cb = { x: Number(c.x) - Number(b.x), y: Number(c.y) - Number(b.y) };
  const magAB = Math.hypot(ab.x, ab.y);
  const magCB = Math.hypot(cb.x, cb.y);
  if (!magAB || !magCB) return null;
  const cos = Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y) / (magAB * magCB)));
  return Number((Math.acos(cos) * 180 / Math.PI).toFixed(1));
}
function segmentAngle(a, b) {
  if (!a || !b) return null;
  return Number((Math.atan2(Number(b.y) - Number(a.y), Number(b.x) - Number(a.x)) * 180 / Math.PI).toFixed(1));
}
function midPoint(a, b) {
  if (!a || !b) return null;
  return { x: (Number(a.x) + Number(b.x)) / 2, y: (Number(a.y) + Number(b.y)) / 2 };
}
function deriveMeasurements(keypoints = []) {
  const p = pointsByName(keypoints);
  const leftShoulder = p.get("left_shoulder");
  const rightShoulder = p.get("right_shoulder");
  const leftHip = p.get("left_hip");
  const rightHip = p.get("right_hip");
  const leftKnee = p.get("left_knee");
  const rightKnee = p.get("right_knee");
  const leftAnkle = p.get("left_ankle");
  const rightAnkle = p.get("right_ankle");
  const midShoulder = midPoint(leftShoulder, rightShoulder);
  const midHip = midPoint(leftHip, rightHip);
  const midKnee = midPoint(leftKnee, rightKnee);
  const midAnkle = midPoint(leftAnkle, rightAnkle);
  const elbowAngles = [angle(p.get("left_shoulder"), p.get("left_elbow"), p.get("left_wrist")), angle(p.get("right_shoulder"), p.get("right_elbow"), p.get("right_wrist"))].filter(Number.isFinite);
  const kneeAngles = [angle(leftHip, leftKnee, leftAnkle), angle(rightHip, rightKnee, rightAnkle)].filter(Number.isFinite);
  const hipAngles = [angle(leftShoulder, leftHip, leftKnee), angle(rightShoulder, rightHip, rightKnee)].filter(Number.isFinite);
  const shoulderHipAlignment = midShoulder && midHip ? Math.abs(Number(midShoulder.x) - Number(midHip.x)) : null;
  const shoulderHipAnkleAlignment = midShoulder && midHip && midAnkle ? Math.max(Math.abs(midShoulder.x - midHip.x), Math.abs(midHip.x - midAnkle.x)) : null;
  const torsoAngle = segmentAngle(midHip, midShoulder);
  const hipToKneeVerticalPosition = midHip && midKnee ? Number((midHip.y - midKnee.y).toFixed(1)) : null;
  return {
    elbowAngle: average(elbowAngles) == null ? null : Number(average(elbowAngles).toFixed(1)),
    kneeAngle: average(kneeAngles) == null ? null : Number(average(kneeAngles).toFixed(1)),
    hipAngle: average(hipAngles) == null ? null : Number(average(hipAngles).toFixed(1)),
    shoulderToHipAlignment: shoulderHipAlignment == null ? null : Number(shoulderHipAlignment.toFixed(1)),
    shoulderHipAnkleAlignment: shoulderHipAnkleAlignment == null ? null : Number(shoulderHipAnkleAlignment.toFixed(1)),
    torsoAngle,
    hipToKneeVerticalPosition
  };
}
function detectedAlignment(measurements) {
  return {
    torso: measurements.torsoAngle == null ? "unknown" : (Math.abs(measurements.torsoAngle) > 70 ? "upright_or_vertical" : "inclined_or_horizontal"),
    shoulderHip: measurements.shoulderToHipAlignment == null ? "unknown" : (measurements.shoulderToHipAlignment <= 30 ? "stacked" : "offset"),
    shoulderHipAnkle: measurements.shoulderHipAnkleAlignment == null ? "unknown" : (measurements.shoulderHipAnkleAlignment <= 45 ? "aligned" : "offset")
  };
}
function normalizeFrame(frame = {}, index = 0) {
  const keypoints = (Array.isArray(frame.keypoints) ? frame.keypoints : []).map((kp) => ({
    name: safeString(keypointName(kp)),
    x: Number(kp.x),
    y: Number(kp.y),
    score: Number(scoreOf(kp).toFixed(4))
  })).filter((kp) => kp.name && Number.isFinite(kp.x) && Number.isFinite(kp.y));
  const scores = keypoints.map(scoreOf);
  const visibleKeypointCount = keypoints.filter((kp) => scoreOf(kp) >= 0.3).length;
  const derivedAngles = { ...deriveMeasurements(keypoints), ...(frame.derivedAngles && typeof frame.derivedAngles === "object" ? frame.derivedAngles : {}) };
  return {
    timestamp: Number.isFinite(Number(frame.timestamp)) ? Number(frame.timestamp) : index,
    keypoints,
    visibleKeypointCount,
    confidence: {
      min: scores.length ? Number(Math.min(...scores).toFixed(4)) : 0,
      max: scores.length ? Number(Math.max(...scores).toFixed(4)) : 0,
      average: scores.length ? Number(average(scores).toFixed(4)) : 0
    },
    derivedAngles,
    detectedBodyAlignment: detectedAlignment(derivedAngles)
  };
}
function sanitizeDemoCapture(input = {}) {
  const frames = (Array.isArray(input.frames) ? input.frames : []).map(normalizeFrame);
  if (!frames.length) throw new ApiError("VALIDATION_ERROR", "Demo capture frames with MoveNet keypoints are required", 400);
  const slot = DEMO_SLOTS.includes(input.slot) ? input.slot : null;
  if (!slot) throw new ApiError("VALIDATION_ERROR", "Demo capture slot must be front_view, side_view, or optional_extra_view", 400);
  const avgConfidence = average(frames.map((f) => f.confidence.average)) || 0;
  const avgVisible = average(frames.map((f) => f.visibleKeypointCount)) || 0;
  return {
    id: crypto.randomUUID(),
    slot,
    capturedAt: nowIso(),
    durationMs: Number.isFinite(Number(input.durationMs)) ? Number(input.durationMs) : null,
    frameCount: frames.length,
    quality: {
      averageConfidence: Number(avgConfidence.toFixed(4)),
      averageVisibleKeypointCount: Number(avgVisible.toFixed(1)),
      ok: avgConfidence >= 0.35 && avgVisible >= 8
    },
    frames
  };
}
function suggestPhasesFromCaptures(demoCaptures = []) {
  const frames = demoCaptures.flatMap((capture) => capture.frames || []);
  if (!frames.length) return [];
  const metric = frames.some((f) => Number.isFinite(Number(f.derivedAngles?.elbowAngle))) ? "elbowAngle" : "kneeAngle";
  const values = frames.map((f, index) => ({ index, value: Number(f.derivedAngles?.[metric]) })).filter((v) => Number.isFinite(v.value));
  if (!values.length) return [{ name: "start", order: 1, keyFrame: 0, suggested: true }, { name: "finish", order: 2, keyFrame: frames.length - 1, suggested: true }];
  const min = values.reduce((a, b) => a.value <= b.value ? a : b);
  const max = values.reduce((a, b) => a.value >= b.value ? a : b);
  return [
    { name: "start", order: 1, keyFrame: 0, suggested: true, metric },
    { name: min.index < max.index ? "contraction" : "bottom", order: 2, keyFrame: min.index, suggested: true, metric },
    { name: "finish", order: 3, keyFrame: frames.length - 1, suggested: true, metric }
  ];
}
function sanitizeTemplateForPublic(template) {
  const copy = clone(template);
  copy.demoCaptures = (copy.demoCaptures || []).map((capture) => ({
    id: capture.id,
    slot: capture.slot,
    capturedAt: capture.capturedAt,
    durationMs: capture.durationMs,
    frameCount: capture.frameCount,
    quality: capture.quality,
    frames: capture.frames
  }));
  return copy;
}
function createExerciseTemplateService({ filePath }) {
  if (!filePath) throw new Error("exercise template filePath required");
  function ensureDir() { fs.mkdirSync(path.dirname(filePath), { recursive: true }); }
  function readStore() {
    ensureDir();
    if (!fs.existsSync(filePath)) return { templates: [] };
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8") || "{}");
      return { templates: Array.isArray(parsed.templates) ? parsed.templates : [] };
    } catch (_) { return { templates: [] }; }
  }
  function writeStore(store) { ensureDir(); fs.writeFileSync(filePath, JSON.stringify(store, null, 2)); }
  function find(templateId) {
    const store = readStore();
    const template = store.templates.find((item) => item.id === templateId);
    if (!template) throw new ApiError("NOT_FOUND", "Exercise template not found", 404);
    return { store, template };
  }
  function createDraft(input = {}, actor = {}) {
    const exerciseName = safeString(input.exerciseName);
    if (!exerciseName) throw new ApiError("VALIDATION_ERROR", "exerciseName is required", 400);
    const movementPattern = MOVEMENT_PATTERNS.includes(input.movementPattern) ? input.movementPattern : "other";
    const at = nowIso();
    const template = {
      id: crypto.randomUUID(),
      exerciseName,
      movementPattern,
      description: safeString(input.description),
      equipment: safeString(input.equipment),
      difficulty: safeString(input.difficulty, "unspecified"),
      createdBy: actor.userId || safeString(input.createdBy, "unknown"),
      status: "draft",
      createdAt: at,
      updatedAt: at,
      demoSlots: DEMO_SLOTS.map((slot) => ({ slot, required: slot !== "optional_extra_view" })),
      demoCaptures: [],
      positions: Array.isArray(input.positions) ? input.positions.map((p, i) => ({ name: safeString(p.name || p), order: Number(p.order || i + 1) })).filter((p) => p.name) : [],
      positionPresets: [...POSITION_PRESETS],
      phases: [],
      requiredKeypoints: [],
      measurementRules: [],
      repCycle: [],
      feedbackRules: [],
      testRuns: [],
      approvedBy: null,
      approvedAt: null
    };
    const store = readStore();
    store.templates.push(template);
    writeStore(store);
    return sanitizeTemplateForPublic(template);
  }
  function listTemplates() { return readStore().templates.map(sanitizeTemplateForPublic); }
  function getTemplate(id) { return sanitizeTemplateForPublic(find(id).template); }
  function updateTemplate(id, patch = {}) {
    const { store, template } = find(id);
    if (patch.status && !STATUSES.includes(patch.status)) throw new ApiError("VALIDATION_ERROR", "Invalid template status", 400);
    const allowed = ["exerciseName", "movementPattern", "description", "equipment", "difficulty", "positions", "phases", "requiredKeypoints", "measurementRules", "repCycle", "feedbackRules", "status"];
    for (const key of allowed) {
      if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
      if (key === "movementPattern") template[key] = MOVEMENT_PATTERNS.includes(patch[key]) ? patch[key] : "other";
      else if (key === "status") template[key] = patch[key];
      else if (Array.isArray(template[key]) || ["positions", "phases", "requiredKeypoints", "measurementRules", "repCycle", "feedbackRules"].includes(key)) template[key] = Array.isArray(patch[key]) ? clone(patch[key]) : [];
      else template[key] = safeString(patch[key]);
    }
    if (Array.isArray(patch.phases) && patch.phases.length) template.status = "phase_review";
    template.updatedAt = nowIso();
    writeStore(store);
    return sanitizeTemplateForPublic(template);
  }
  function addDemoCapture(id, input = {}) {
    const { store, template } = find(id);
    const capture = sanitizeDemoCapture(input);
    template.demoCaptures = [...(template.demoCaptures || []).filter((item) => item.slot !== capture.slot), capture];
    template.phases = template.phases?.length ? template.phases : suggestPhasesFromCaptures(template.demoCaptures);
    template.status = "demo_recorded";
    template.updatedAt = nowIso();
    writeStore(store);
    return { template: sanitizeTemplateForPublic(template), capture: clone(capture), suggestedPhases: clone(template.phases) };
  }
  function addTestRun(id, input = {}) {
    const { store, template } = find(id);
    const hasRequiredCaptures = DEMO_SLOTS.filter((slot) => slot !== "optional_extra_view").every((slot) => (template.demoCaptures || []).some((capture) => capture.slot === slot));
    if (!hasRequiredCaptures) throw new ApiError("VALIDATION_ERROR", "front_view and side_view demo captures are required before test mode", 400);
    if (!Array.isArray(template.phases) || !template.phases.length || template.status !== "phase_review") throw new ApiError("VALIDATION_ERROR", "Coach phase review is required before test mode", 400);
    const frames = (Array.isArray(input.frames) ? input.frames : []).map(normalizeFrame);
    if (!frames.length) throw new ApiError("VALIDATION_ERROR", "Test run frames are required", 400);
    const avgConfidence = average(frames.map((f) => f.confidence.average)) || 0;
    const rejectedReasons = [];
    if (avgConfidence < 0.35) rejectedReasons.push("low_keypoint_confidence");
    if (frames.length < 2) rejectedReasons.push("not_enough_frames");
    const testRun = {
      id: crypto.randomUUID(),
      capturedAt: nowIso(),
      frameCount: frames.length,
      wouldCountRep: rejectedReasons.length === 0,
      rejectedReasons,
      frames
    };
    template.testRuns = [...(template.testRuns || []), testRun];
    template.status = "testing";
    template.updatedAt = nowIso();
    writeStore(store);
    return { template: sanitizeTemplateForPublic(template), testRun: clone(testRun) };
  }
  function approveTemplate(id, actor = {}, options = {}) {
    const { store, template } = find(id);
    const hasRequiredCaptures = DEMO_SLOTS.filter((slot) => slot !== "optional_extra_view").every((slot) => (template.demoCaptures || []).some((capture) => capture.slot === slot));
    if (!hasRequiredCaptures) throw new ApiError("VALIDATION_ERROR", "Demo clips must be captured before approval", 400);
    if (!Array.isArray(template.phases) || !template.phases.length) throw new ApiError("VALIDATION_ERROR", "Phases must be reviewed before approval", 400);
    const passedTest = (template.testRuns || []).some((run) => run.wouldCountRep === true);
    if (!passedTest) throw new ApiError("VALIDATION_ERROR", "A passing test mode run is required before approval", 400);
    template.status = options.activate === true ? "active" : "approved";
    template.approvedBy = actor.userId || "unknown";
    template.approvedAt = nowIso();
    template.updatedAt = template.approvedAt;
    writeStore(store);
    return sanitizeTemplateForPublic(template);
  }
  function getActiveScoringTemplates() { return readStore().templates.filter((template) => template.status === "active").map(sanitizeTemplateForPublic); }
  return { STATUSES, MOVEMENT_PATTERNS, DEMO_SLOTS, POSITION_PRESETS, createDraft, listTemplates, getTemplate, updateTemplate, addDemoCapture, addTestRun, approveTemplate, getActiveScoringTemplates, deriveMeasurements };
}

module.exports = { createExerciseTemplateService, STATUSES, MOVEMENT_PATTERNS, DEMO_SLOTS, POSITION_PRESETS, REQUIRED_APPROVAL_STATUSES, deriveMeasurements };
