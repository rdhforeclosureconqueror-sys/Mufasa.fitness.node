"use strict";

const MOVENET_NAMES = Object.freeze(["nose","left_eye","right_eye","left_ear","right_ear","left_shoulder","right_shoulder","left_elbow","right_elbow","left_wrist","right_wrist","left_hip","right_hip","left_knee","right_knee","left_ankle","right_ankle"]);

function adaptMoveNet(keypoints, { timestamp = Date.now(), detector = "movenet", mirrored = false } = {}) {
  if (!Array.isArray(keypoints)) return { landmarks: [], timestamp, detector, normalization: { coordinateSpace: "viewport_normalized", mirrored } };
  const landmarks = keypoints.slice(0, 17).map((point, index) => ({
    index, name: point.name || MOVENET_NAMES[index], x: Number(point.x), y: Number(point.y),
    ...(Number.isFinite(point.z) ? { z: point.z } : {}), confidence: Number(point.score ?? point.confidence ?? 0),
    ...(Number.isFinite(point.visibility) ? { visibility: point.visibility } : {}), timestamp, detector
  }));
  return { landmarks, timestamp, detector, normalization: { coordinateSpace: "viewport_normalized", mirrored } };
}

function normalizePacket(packet, { width = 1, height = 1 } = {}) {
  if (!packet || !Array.isArray(packet.landmarks) || width <= 0 || height <= 0) throw new TypeError("A landmark packet and positive dimensions are required");
  const alreadyNormalized = packet.normalization?.coordinateSpace === "viewport_normalized";
  return { ...packet, landmarks: packet.landmarks.map((p) => ({ ...p, x: alreadyNormalized ? p.x : p.x / width, y: alreadyNormalized ? p.y : p.y / height })), normalization: { ...packet.normalization, coordinateSpace: "viewport_normalized", sourceWidth: width, sourceHeight: height } };
}

function validateLandmarks(packet, required = [], minimumConfidence = 0.45) {
  const byName = new Map((packet?.landmarks || []).map((p) => [p.name, p]));
  const missing = required.filter((name) => { const p = byName.get(name); return !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.confidence < minimumConfidence; });
  const visible = (packet?.landmarks || []).filter((p) => p.confidence >= minimumConfidence && p.x >= -0.1 && p.x <= 1.1 && p.y >= -0.1 && p.y <= 1.1);
  let guidance = null;
  if (missing.length) guidance = visible.length < 10 ? "Include your full body and move farther from the camera." : "Improve lighting or reposition the camera.";
  return { valid: missing.length === 0, missing, visibilityRatio: required.length ? (required.length - missing.length) / required.length : 1, guidance };
}

function angle(a, b, c) {
  if (![a,b,c].every((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y))) return null;
  const ab = Math.atan2(a.y - b.y, a.x - b.x), cb = Math.atan2(c.y - b.y, c.x - b.x);
  let degrees = Math.abs((ab - cb) * 180 / Math.PI) % 360;
  if (degrees > 180) degrees = 360 - degrees;
  return Math.round(degrees * 10) / 10;
}

function measurements(packet) {
  const p = Object.fromEntries(packet.landmarks.map((item) => [item.name, item]));
  return {
    leftElbow: angle(p.left_shoulder,p.left_elbow,p.left_wrist), rightElbow: angle(p.right_shoulder,p.right_elbow,p.right_wrist),
    leftShoulder: angle(p.left_elbow,p.left_shoulder,p.left_hip), rightShoulder: angle(p.right_elbow,p.right_shoulder,p.right_hip),
    leftHip: angle(p.left_shoulder,p.left_hip,p.left_knee), rightHip: angle(p.right_shoulder,p.right_hip,p.right_knee),
    leftKnee: angle(p.left_hip,p.left_knee,p.left_ankle), rightKnee: angle(p.right_hip,p.right_knee,p.right_ankle)
  };
}

function deviation(value, range) { return value == null ? 1 : value < range[0] ? (range[0] - value) / Math.max(20, range[1]-range[0]) : value > range[1] ? (value-range[1]) / Math.max(20, range[1]-range[0]) : 0; }
function evaluatePose(definition, packet, { holdMs = 0, stability = 1 } = {}) {
  const validation = validateLandmarks(packet, definition.requiredLandmarks, definition.minimumConfidence);
  if (!validation.valid) return { state: "insufficient_visibility", poseId: null, score: null, confidence: "low", guidance: validation.guidance, faults: [], cues: [] };
  const values = measurements(packet); let weightedError = 0, totalWeight = 0; const faults=[];
  for (const rule of definition.expectedAngles) {
    const error = Math.min(1, deviation(values[rule.measurement], rule.range)); totalWeight += rule.weight; weightedError += error * rule.weight;
    if (error > (rule.faultThreshold ?? .25)) faults.push({ ...definition.commonFaults.find((f) => f.id === rule.faultId), error });
  }
  const geometry = Math.max(0, 1 - weightedError / Math.max(1,totalWeight));
  const confidence = definition.requiredLandmarks.reduce((sum,n) => sum + packet.landmarks.find((p)=>p.name===n).confidence,0) / definition.requiredLandmarks.length;
  const hold = Math.min(1, holdMs / definition.holdTimeMs); const criticalPenalty = faults.some((f)=>f.safety==="stop") ? 20 : 0;
  const score = Math.max(0, Math.round(100*(.15*confidence+.65*geometry+.1*Math.max(0,Math.min(1,stability))+.1*hold)-criticalPenalty));
  const identified = geometry >= definition.identificationThreshold;
  const ranked = faults.sort((a,b)=>(b.priority||0)-(a.priority||0)||b.error-a.error);
  return { state: identified ? "recognized" : "unknown_pose", poseId: identified ? definition.id : null, score: identified ? score : null, confidence: confidence>=.8?"high":confidence>=.6?"medium":"low", measurements: values, stability: stability>=.8?"good":stability>=.55?"developing":"unstable", faults: identified?ranked:[], cues: identified?ranked.slice(0,2).map((f)=>f.cue):[], ruleVersion: definition.contentVersion };
}

function identifyPose(definitions, packet, options={}) {
  const candidates = definitions.map((definition)=>evaluatePose(definition,packet,options)).filter((r)=>r.state==="recognized").sort((a,b)=>b.score-a.score||a.poseId.localeCompare(b.poseId));
  if (!candidates.length) return definitions.map((d)=>evaluatePose(d,packet,options)).find((r)=>r.state==="insufficient_visibility") || { state:"unknown_pose",poseId:null,score:null,cues:[],faults:[] };
  if (candidates[1] && candidates[0].score-candidates[1].score < 4) return { state:"ambiguous",poseId:null,score:null,candidates:candidates.slice(0,2).map((c)=>c.poseId),cues:[],faults:[] };
  return candidates[0];
}

function createStabilityWindow({ framesRequired=8, cueFrames=4 }={}) { const frames=[]; return { push(result) { frames.push(result); if(frames.length>framesRequired)frames.shift(); const recognized=frames.filter((r)=>r.state==="recognized"); const stable=recognized.length===framesRequired&&new Set(recognized.map((r)=>r.poseId)).size===1; const cueCounts=new Map(); recognized.flatMap((r)=>r.faults||[]).forEach((f)=>cueCounts.set(f.id,(cueCounts.get(f.id)||0)+1)); return { ...result, stable, cues:(result.faults||[]).filter((f)=>cueCounts.get(f.id)>=cueFrames).slice(0,2).map((f)=>f.cue) }; }, reset(){frames.length=0;} }; }

module.exports={ MOVENET_NAMES,adaptMoveNet,normalizePacket,validateLandmarks,angle,measurements,evaluatePose,identifyPose,createStabilityWindow };
