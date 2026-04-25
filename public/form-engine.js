(function (globalScope) {
  const BODY_VISIBILITY = Object.freeze({
    NO_PERSON: "NO_PERSON",
    HEAD_SHOULDERS: "HEAD_SHOULDERS",
    UPPER_BODY: "UPPER_BODY",
    TORSO_VISIBLE: "TORSO_VISIBLE",
    FULL_BODY: "FULL_BODY"
  });

  const FORM_STATUS = Object.freeze({
    GOOD: "GOOD",
    WARNING: "WARNING",
    BAD: "BAD",
    UNKNOWN: "UNKNOWN",
    NOT_VISIBLE: "NOT_VISIBLE"
  });

  const MOVEMENT_FAMILY = Object.freeze({
    SQUAT: "SQUAT",
    LUNGE: "LUNGE",
    HINGE: "HINGE",
    PUSH_UP: "PUSH_UP",
    PLANK: "PLANK",
    PRESS: "PRESS",
    ROW: "ROW",
    CORE_ROTATION: "CORE_ROTATION",
    BALANCE: "BALANCE",
    CARDIO: "CARDIO",
    UNKNOWN: "UNKNOWN"
  });

  const MOVEMENT_PHASE = Object.freeze({
    START: "START",
    LOWERING: "LOWERING",
    BOTTOM: "BOTTOM",
    RISING: "RISING",
    TOP: "TOP",
    HOLD: "HOLD",
    UNKNOWN: "UNKNOWN"
  });

  const REGION_KEYS = ["knees", "hips", "back", "shoulders", "elbows", "wrists", "ankles", "core"];

  const KEYPOINT_INDEX_BY_NAME = Object.freeze({
    nose: 0,
    left_eye: 1,
    right_eye: 2,
    left_ear: 3,
    right_ear: 4,
    left_shoulder: 5,
    right_shoulder: 6,
    left_elbow: 7,
    right_elbow: 8,
    left_wrist: 9,
    right_wrist: 10,
    left_hip: 11,
    right_hip: 12,
    left_knee: 13,
    right_knee: 14,
    left_ankle: 15,
    right_ankle: 16
  });

  function clamp(min, value, max) { return Math.max(min, Math.min(max, value)); }
  function bothSidesVisible(left, right, threshold = 0.35) { return keypointConfidence(left, threshold) && keypointConfidence(right, threshold); }
  function keypointConfidence(kp, threshold = 0.35) { return Boolean(kp && Number(kp.score || 0) >= threshold); }
  function distance(a, b) { return (!a || !b) ? null : Math.hypot(b.x - a.x, b.y - a.y); }
  function horizontalDifference(a, b) { return (!a || !b) ? null : b.x - a.x; }
  function verticalDifference(a, b) { return (!a || !b) ? null : b.y - a.y; }
  function midpoint(a, b) { return (!a || !b) ? null : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, score: Math.min(a.score || 0, b.score || 0) }; }

  function jointAngle(a, b, c) {
    if (!a || !b || !c) return null;
    const abx = a.x - b.x;
    const aby = a.y - b.y;
    const cbx = c.x - b.x;
    const cby = c.y - b.y;
    const magAB = Math.hypot(abx, aby);
    const magCB = Math.hypot(cbx, cby);
    if (!magAB || !magCB) return null;
    const cos = clamp(-1, (abx * cbx + aby * cby) / (magAB * magCB), 1);
    return (Math.acos(cos) * 180) / Math.PI;
  }

  function getKeypointByName(source, name) {
    if (!source) return null;
    const keypoints = Array.isArray(source) ? source : source.keypoints;
    if (!Array.isArray(keypoints)) return null;
    const canonical = String(name || "").toLowerCase();
    const byName = keypoints.find((kp) => (kp?.name || kp?.part || "").toLowerCase() === canonical);
    if (byName) return byName;
    const index = KEYPOINT_INDEX_BY_NAME[canonical];
    return Number.isInteger(index) ? keypoints[index] || null : null;
  }

  function getPoseScore(source, name, threshold = 0.35) {
    const kp = getKeypointByName(source, name);
    return keypointConfidence(kp, threshold);
  }

  function classifyBodyVisibility(source) {
    const shouldersVisible = getPoseScore(source, "left_shoulder") && getPoseScore(source, "right_shoulder");
    const headVisible = ["nose", "left_eye", "right_eye", "left_ear", "right_ear"].some((n) => getPoseScore(source, n, 0.25));
    const elbowsOrWristsVisible = (
      (getPoseScore(source, "left_elbow") && getPoseScore(source, "right_elbow"))
      || (getPoseScore(source, "left_wrist") && getPoseScore(source, "right_wrist"))
    );
    const hipsVisible = getPoseScore(source, "left_hip") && getPoseScore(source, "right_hip");
    const kneesOrAnklesVisible = (
      (getPoseScore(source, "left_knee") && getPoseScore(source, "right_knee"))
      || (getPoseScore(source, "left_ankle") && getPoseScore(source, "right_ankle"))
    );

    if (shouldersVisible && hipsVisible && kneesOrAnklesVisible) return BODY_VISIBILITY.FULL_BODY;
    if (shouldersVisible && hipsVisible) return BODY_VISIBILITY.TORSO_VISIBLE;
    if (shouldersVisible && elbowsOrWristsVisible) return BODY_VISIBILITY.UPPER_BODY;
    if (headVisible && shouldersVisible) return BODY_VISIBILITY.HEAD_SHOULDERS;
    return BODY_VISIBILITY.NO_PERSON;
  }

  function emptyRegions(status = FORM_STATUS.UNKNOWN) {
    return REGION_KEYS.reduce((acc, key) => { acc[key] = status; return acc; }, {});
  }

  function normalizeExerciseText(exercise) {
    return `${exercise?.exerciseId || ""} ${exercise?.name || ""} ${(exercise?.tags || []).join(" ")} ${exercise?.category || ""} ${exercise?.type || ""}`.toLowerCase();
  }

  function mapExerciseToMovementFamily(exercise = {}) {
    if (exercise?.movementFamily && MOVEMENT_FAMILY[exercise.movementFamily]) return exercise.movementFamily;
    const text = normalizeExerciseText(exercise);
    if (/squat/.test(text)) return MOVEMENT_FAMILY.SQUAT;
    if (/lunge|split squat/.test(text)) return MOVEMENT_FAMILY.LUNGE;
    if (/deadlift|hinge|rdl|good morning/.test(text)) return MOVEMENT_FAMILY.HINGE;
    if (/push.?up/.test(text)) return MOVEMENT_FAMILY.PUSH_UP;
    if (/plank/.test(text)) return MOVEMENT_FAMILY.PLANK;
    if (/press/.test(text)) return MOVEMENT_FAMILY.PRESS;
    if (/row/.test(text)) return MOVEMENT_FAMILY.ROW;
    if (/rotation|twist/.test(text)) return MOVEMENT_FAMILY.CORE_ROTATION;
    if (/balance|single leg/.test(text)) return MOVEMENT_FAMILY.BALANCE;
    if (/run|jump|burpee|cardio/.test(text)) return MOVEMENT_FAMILY.CARDIO;
    return MOVEMENT_FAMILY.UNKNOWN;
  }

  function detectMovementPhase(movementFamily, metrics = {}, previousState = {}) {
    if (movementFamily === MOVEMENT_FAMILY.PLANK) return MOVEMENT_PHASE.HOLD;
    const depth = Number(metrics.depth || 0);
    const prevDepth = Number(previousState.depth || depth);
    const delta = depth - prevDepth;
    if (movementFamily === MOVEMENT_FAMILY.SQUAT || movementFamily === MOVEMENT_FAMILY.LUNGE || movementFamily === MOVEMENT_FAMILY.PUSH_UP || movementFamily === MOVEMENT_FAMILY.HINGE) {
      if (depth > 0.72) return MOVEMENT_PHASE.BOTTOM;
      if (depth < 0.18) return MOVEMENT_PHASE.TOP;
      if (Math.abs(delta) < 0.02) return MOVEMENT_PHASE.HOLD;
      return delta > 0 ? MOVEMENT_PHASE.LOWERING : MOVEMENT_PHASE.RISING;
    }
    return MOVEMENT_PHASE.UNKNOWN;
  }

  function computeCommonMetrics(source) {
    const leftHip = getKeypointByName(source, "left_hip");
    const rightHip = getKeypointByName(source, "right_hip");
    const leftKnee = getKeypointByName(source, "left_knee");
    const rightKnee = getKeypointByName(source, "right_knee");
    const leftAnkle = getKeypointByName(source, "left_ankle");
    const rightAnkle = getKeypointByName(source, "right_ankle");
    const leftShoulder = getKeypointByName(source, "left_shoulder");
    const rightShoulder = getKeypointByName(source, "right_shoulder");
    const kneeAngleLeft = jointAngle(leftHip, leftKnee, leftAnkle);
    const kneeAngleRight = jointAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = ((kneeAngleLeft || 180) + (kneeAngleRight || 180)) / 2;
    const depth = clamp(0, (180 - avgKneeAngle) / 90, 1);
    const torsoAngleLeft = jointAngle(leftShoulder, leftHip, leftAnkle);
    const torsoAngleRight = jointAngle(rightShoulder, rightHip, rightAnkle);
    const torsoAngle = ((torsoAngleLeft || 90) + (torsoAngleRight || 90)) / 2;
    const hipWidth = Math.abs((rightHip?.x || 0) - (leftHip?.x || 0));
    const kneeWidth = Math.abs((rightKnee?.x || 0) - (leftKnee?.x || 0));
    const kneeValgus = hipWidth > 0 ? (hipWidth - kneeWidth) / hipWidth : 0;
    const shoulderCenter = midpoint(leftShoulder, rightShoulder);
    const hipCenter = midpoint(leftHip, rightHip);
    const lineDx = horizontalDifference(hipCenter, shoulderCenter) || 0;
    const lineDy = verticalDifference(hipCenter, shoulderCenter) || 0;
    const bodyLineDeviation = Math.abs(lineDx / Math.max(1, Math.abs(lineDy)));
    return {
      depth,
      avgKneeAngle,
      torsoAngle,
      kneeValgus,
      bodyLineDeviation,
      keypointConfidence: {
        shoulders: Math.min(leftShoulder?.score || 0, rightShoulder?.score || 0),
        hips: Math.min(leftHip?.score || 0, rightHip?.score || 0),
        knees: Math.min(leftKnee?.score || 0, rightKnee?.score || 0),
        ankles: Math.min(leftAnkle?.score || 0, rightAnkle?.score || 0)
      }
    };
  }

  function buildUnknownResult(exerciseId, movementFamily, confidence = 0) {
    return {
      exerciseId,
      movementFamily,
      phase: MOVEMENT_PHASE.UNKNOWN,
      overallStatus: FORM_STATUS.UNKNOWN,
      overallScore: 0,
      regions: emptyRegions(FORM_STATUS.UNKNOWN),
      corrections: [],
      confidence,
      repValid: false
    };
  }

  function evaluateFamily(movementFamily, metrics, visibility) {
    const result = { regions: emptyRegions(FORM_STATUS.UNKNOWN), corrections: [], repValid: false };
    const visible = visibility === BODY_VISIBILITY.FULL_BODY || visibility === BODY_VISIBILITY.TORSO_VISIBLE;
    if (!visible) {
      result.regions.knees = FORM_STATUS.NOT_VISIBLE;
      result.regions.ankles = FORM_STATUS.NOT_VISIBLE;
      result.regions.hips = FORM_STATUS.NOT_VISIBLE;
      return result;
    }

    if (movementFamily === MOVEMENT_FAMILY.SQUAT) {
      result.regions.knees = metrics.kneeValgus > 0.22 ? FORM_STATUS.BAD : FORM_STATUS.GOOD;
      result.regions.hips = metrics.depth > 0.55 ? FORM_STATUS.GOOD : FORM_STATUS.WARNING;
      result.regions.back = metrics.torsoAngle > 58 ? FORM_STATUS.GOOD : FORM_STATUS.WARNING;
      result.regions.core = metrics.torsoAngle > 58 ? FORM_STATUS.GOOD : FORM_STATUS.WARNING;
      result.repValid = metrics.depth > 0.55 && metrics.kneeValgus < 0.22;
      if (result.regions.knees === FORM_STATUS.BAD) result.corrections.push({ priority: 1, text: "Push knees outward to track over toes." });
      if (result.regions.hips !== FORM_STATUS.GOOD) result.corrections.push({ priority: 3, text: "Go slightly deeper while keeping control." });
    } else if (movementFamily === MOVEMENT_FAMILY.PUSH_UP) {
      result.regions.hips = metrics.bodyLineDeviation > 0.22 ? FORM_STATUS.BAD : FORM_STATUS.GOOD;
      result.regions.core = result.regions.hips;
      result.regions.shoulders = FORM_STATUS.GOOD;
      result.regions.elbows = metrics.depth > 0.35 ? FORM_STATUS.GOOD : FORM_STATUS.WARNING;
      result.repValid = result.regions.hips === FORM_STATUS.GOOD && metrics.depth > 0.35;
      if (result.regions.hips === FORM_STATUS.BAD) result.corrections.push({ priority: 1, text: "Keep hips in line with shoulders and heels." });
      if (result.regions.elbows !== FORM_STATUS.GOOD) result.corrections.push({ priority: 2, text: "Lower with control to improve depth." });
    } else if (movementFamily === MOVEMENT_FAMILY.HINGE) {
      result.regions.back = metrics.torsoAngle > 45 ? FORM_STATUS.GOOD : FORM_STATUS.BAD;
      result.regions.hips = metrics.depth > 0.2 ? FORM_STATUS.GOOD : FORM_STATUS.WARNING;
      result.regions.knees = metrics.avgKneeAngle < 175 ? FORM_STATUS.GOOD : FORM_STATUS.WARNING;
      if (result.regions.back === FORM_STATUS.BAD) result.corrections.push({ priority: 1, text: "Hinge from hips and keep a neutral back." });
    } else if (movementFamily === MOVEMENT_FAMILY.PLANK) {
      result.regions.core = metrics.bodyLineDeviation > 0.18 ? FORM_STATUS.BAD : FORM_STATUS.GOOD;
      result.regions.hips = result.regions.core;
      result.regions.shoulders = FORM_STATUS.GOOD;
      if (result.regions.core === FORM_STATUS.BAD) result.corrections.push({ priority: 1, text: "Lift hips slightly to keep a straight body line." });
    } else if (movementFamily === MOVEMENT_FAMILY.LUNGE) {
      result.regions.knees = metrics.kneeValgus > 0.22 ? FORM_STATUS.BAD : FORM_STATUS.GOOD;
      result.regions.hips = metrics.depth > 0.35 ? FORM_STATUS.GOOD : FORM_STATUS.WARNING;
      result.regions.back = metrics.torsoAngle > 55 ? FORM_STATUS.GOOD : FORM_STATUS.WARNING;
      if (result.regions.knees === FORM_STATUS.BAD) result.corrections.push({ priority: 1, text: "Keep front knee aligned over mid-foot." });
    }

    result.corrections.sort((a, b) => a.priority - b.priority);
    return result;
  }

  function summarizeOverall(regions) {
    const values = Object.values(regions || {});
    if (values.includes(FORM_STATUS.BAD)) return FORM_STATUS.BAD;
    if (values.includes(FORM_STATUS.WARNING)) return FORM_STATUS.WARNING;
    if (values.includes(FORM_STATUS.GOOD)) return FORM_STATUS.GOOD;
    if (values.includes(FORM_STATUS.NOT_VISIBLE)) return FORM_STATUS.NOT_VISIBLE;
    return FORM_STATUS.UNKNOWN;
  }

  function evaluateExerciseForm(input = {}, state = {}) {
    const keypoints = input.keypoints || input.pose?.keypoints || [];
    const exerciseId = input.exerciseId || "unknown_exercise";
    const movementFamily = input.movementFamily || mapExerciseToMovementFamily(input.exercise || { exerciseId, name: input.exerciseName });
    const visibility = classifyBodyVisibility(keypoints);
    const confidence = Number((keypoints.reduce((acc, kp) => acc + Number(kp?.score || 0), 0) / Math.max(1, keypoints.length)).toFixed(3));
    if (!Array.isArray(keypoints) || keypoints.length === 0 || confidence < 0.15) {
      return {
        ...buildUnknownResult(exerciseId, movementFamily, confidence),
        overallStatus: FORM_STATUS.UNKNOWN,
        regions: emptyRegions(FORM_STATUS.NOT_VISIBLE),
        phase: MOVEMENT_PHASE.UNKNOWN
      };
    }
    if (movementFamily === MOVEMENT_FAMILY.UNKNOWN) {
      return buildUnknownResult(exerciseId, movementFamily, confidence);
    }

    const metrics = computeCommonMetrics(keypoints);
    const phase = detectMovementPhase(movementFamily, metrics, state.previousMetrics || {});
    const familyEval = evaluateFamily(movementFamily, metrics, visibility);
    const overallStatus = summarizeOverall(familyEval.regions);
    const overallScore = Number((Object.values(familyEval.regions).reduce((score, status) => {
      if (status === FORM_STATUS.GOOD) return score + 1;
      if (status === FORM_STATUS.WARNING) return score + 0.5;
      if (status === FORM_STATUS.BAD) return score;
      return score + 0.25;
    }, 0) / REGION_KEYS.length).toFixed(3));

    return {
      exerciseId,
      movementFamily,
      phase,
      overallStatus,
      overallScore,
      regions: familyEval.regions,
      corrections: familyEval.corrections,
      confidence,
      repValid: Boolean(familyEval.repValid && phase !== MOVEMENT_PHASE.UNKNOWN),
      metrics
    };
  }

  function mapRegionFeedbackToColor(status) {
    if (status === FORM_STATUS.GOOD) return "#22c55e";
    if (status === FORM_STATUS.WARNING) return "#f59e0b";
    if (status === FORM_STATUS.BAD) return "#ef4444";
    return "#9ca3af";
  }

  const api = {
    BODY_VISIBILITY,
    FORM_STATUS,
    MOVEMENT_FAMILY,
    MOVEMENT_PHASE,
    jointAngle,
    distance,
    horizontalDifference,
    verticalDifference,
    midpoint,
    keypointConfidence,
    bothSidesVisible,
    getKeypointByName,
    classifyBodyVisibility,
    mapExerciseToMovementFamily,
    detectMovementPhase,
    evaluateExerciseForm,
    mapRegionFeedbackToColor
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.__MUFASA_FORM_ENGINE = api;
})(typeof window !== "undefined" ? window : globalThis);
