(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTArenaPoseCalibration = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  // Side-view push-up setup needs one trustworthy kinetic chain, not every
  // bilateral landmark. The camera adapter selects the stronger visible side.
  const CORE_NAMES = ['shoulder', 'elbow', 'wrist', 'hip'];
  const SUPPORT_NAMES = ['ankle'];
  const NAMES = [...CORE_NAMES, ...SUPPORT_NAMES];
  const MIN_SAMPLES = 4;
  // Calibration is a quick setup snapshot, not the competition judge. A member
  // should not have to hold a tiring plank for several seconds just to enter the
  // challenge. Official rep scoring keeps its own stricter rules downstream.
  const STABLE_MS = 700;
  const MAX_GAP_MS = 400;
  // READY starts capture immediately, while the spoken 3-2-1 cue is feedback.
  // Give a floor transition enough room for speech latency + settling + the
  // required stable hold; 4.5s caused valid BOTTOM attempts to time out just
  // as the member reached depth on physical phones.
  const PHASE_TIMEOUT_MS = 9000;
  const MAX_AGE_MS = 2000;
  const TRACE_LIMIT = 80;
  const MAX_STABILITY_DEGREES = 12;
  const MIN_POSE_SEPARATION_DEGREES = 14;
  // Calibration learns the member's repeatable BOTTOM; authoritative scoring
  // owns the strict depth rule. Keep this permissive enough to capture a
  // clearly distinct bent-arm reference on a phone without certifying a rep.
  const MAX_BOTTOM_ELBOW_DEGREES = 125;

  // Temporary calibration grace while we collect real-device evidence. These
  // values only decide whether TOP/BOTTOM references can be captured; they do
  // not award official repetitions.
  const TOP_ELBOW_MIN_DEGREES = 150;
  const TOP_SHOULDER_TARGET_DEGREES = 90;
  const TOP_SHOULDER_GRACE_DEGREES = 20;
  const BODY_ALIGNMENT_GRACE_DEGREES = 15;

  function angle(a, b, c) {
    const ab = {x: a.x - b.x, y: a.y - b.y}, cb = {x: c.x - b.x, y: c.y - b.y};
    const denominator = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
    if (!Number.isFinite(denominator) || denominator <= 0) return null;
    const cosine = Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y) / denominator));
    return Math.acos(cosine) * 180 / Math.PI;
  }
  function frameEligible(frame) {
    return frame?.calibrationUsable === true || (frame?.analysisUsable === true && frame.trackingState === 'LOCKED');
  }
  function requiredPointStatus(frame, minimumConfidence) {
    const points = frame?.sequenceLandmarks || {};
    return Object.fromEntries(NAMES.map(name => {
      const point = points[name];
      const visible = Boolean(point && !point.cached && !point.displayOnly && Number.isFinite(point.x) && Number.isFinite(point.y) &&
        point.x > 0 && point.x < 1 && point.y > 0 && point.y < 1 && Number.isFinite(point.confidence) &&
        point.confidence >= minimumConfidence && point.confidence <= 1);
      return [name, {visible, confidence: Number.isFinite(point?.confidence) ? Number(point.confidence) : 0}];
    }));
  }
  function signature(frame, minimumConfidence, {manual = false} = {}) {
    if (!Number.isFinite(minimumConfidence) || minimumConfidence <= 0 || minimumConfidence > 1 || (!manual && !frameEligible(frame))) return null;
    const {sourceWidth: width, sourceHeight: height} = frame;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    const status = requiredPointStatus(frame, minimumConfidence);
    if (!CORE_NAMES.every(name => status[name].visible)) return null;
    const points = frame.sequenceLandmarks || {};
    const p = Object.fromEntries(CORE_NAMES.map(name => [name, {x: points[name].x * width, y: points[name].y * height}]));
    // Personal pose matching deliberately uses the upper-body chain only.
    // An ankle that leaves the phone frame must not erase a valid TOP/BOTTOM
    // reference. Official scoring remains owned by the stricter rep judge.
    const vector = [angle(p.wrist, p.elbow, p.shoulder), angle(p.elbow, p.shoulder, p.hip)];
    return vector.every(Number.isFinite) ? vector : null;
  }
  function distance(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return Infinity;
    return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0) / a.length);
  }
  function mean(vectors) {
    return vectors[0].map((_, index) => vectors.reduce((sum, vector) => sum + vector[index], 0) / vectors.length);
  }
  function stable(samples) {
    if (samples.length < MIN_SAMPLES || samples.at(-1).at - samples[0].at < STABLE_MS) return null;
    const center = mean(samples.map(sample => sample.vector));
    const spread = Math.max(...samples.map(sample => distance(sample.vector, center)));
    return spread <= MAX_STABILITY_DEGREES ? {center, spread} : null;
  }
  function formFromVector(vector, stage) {
    if (!Array.isArray(vector) || vector.length !== 2 || !vector.every(Number.isFinite)) return null;
    const [elbowAngle, shoulderAngle] = vector;
    const bodyAngle = null, bodyDeviation = null;
    // Body-line enforcement belongs to authoritative scoring. Calibration only
    // learns the athlete's own repeatable TOP and BOTTOM signal gates.
    const bodyLine = true;
    if (stage === 'CAPTURE_BOTTOM') {
      const checks = {elbowDepth: elbowAngle <= MAX_BOTTOM_ELBOW_DEGREES, bodyLine};
      return {angles: {elbow: elbowAngle, shoulder: shoulderAngle, body: bodyAngle, bodyDeviation}, checks,
        allPass: Object.values(checks).every(Boolean)};
    }
    const checks = {
      elbowExtension: elbowAngle >= TOP_ELBOW_MIN_DEGREES,
      shoulderStack: Math.abs(shoulderAngle - TOP_SHOULDER_TARGET_DEGREES) <= TOP_SHOULDER_GRACE_DEGREES,
      bodyLine
    };
    return {angles: {elbow: elbowAngle, shoulder: shoulderAngle, body: bodyAngle, bodyDeviation}, checks,
      allPass: Object.values(checks).every(Boolean)};
  }
  function evaluateFrame(frame, minimumConfidence, stage = 'CAPTURE_TOP') {
    const confidence = Number(minimumConfidence);
    const status = Number.isFinite(confidence) && confidence > 0 && confidence <= 1 ? requiredPointStatus(frame, confidence) : {};
    const vector = signature(frame, confidence);
    if (!vector) {
      return {
        usable: false,
        stage,
        side: frame?.side || null,
        missing: CORE_NAMES.filter(name => !status[name]?.visible),
        checks: {}, angles: null, allPass: false
      };
    }
    const form = formFromVector(vector, stage) || {checks: {}, angles: null, allPass: false};
    return {usable: true, stage, side: frame?.side || null, missing: [], ...form};
  }

  function create({now = () => Date.now(), onChange = () => {}, setTimer = setTimeout, clearTimer = clearTimeout} = {}) {
    let stage = 'IDLE', samples = [], top = null, bottom = null, tolerance = null;
    let source = null, lastTimestamp = null, reason = null, failedStage = null, deadline = null, timer = null, generation = 0;
    let calibrationFrameCount = 0, captureAttemptCount = 0;
    let captureRejectReason = null, stablePoseDurationMs = 0, selectedSide = null, usableCoreJoints = [], missingCoreJoints = CORE_NAMES.slice(), supportMissing = SUPPORT_NAMES.slice();
    let attemptTrace = [], trackingInterruptedAt = null;
    function snapshot() {return {stage, reason, failedStage, topCaptured: Boolean(top), bottomCaptured: Boolean(bottom), calibrated: stage === 'CALIBRATED'};}
    function diagnostics() {return {...snapshot(),
      calibrationFrameCount, selectedSide, usableCoreJoints:usableCoreJoints.slice(), missingCoreJoints:missingCoreJoints.slice(), supportMissing:supportMissing.slice(),
      captureAttemptCount, captureRejectReason, stablePoseDurationMs, topReferenceStored:Boolean(top),
      attemptTrace:attemptTrace.map(item => ({...item}))};}
    function recordEvent(event, detail = null) {
      const entry = {event:String(event || 'UNKNOWN'), at:now()};
      if (detail != null && detail !== '') entry.detail = String(detail);
      const previous = attemptTrace.at(-1);
      if (previous?.event === entry.event && previous?.detail === entry.detail) return entry;
      attemptTrace.push(entry);
      if (attemptTrace.length > TRACE_LIMIT) attemptTrace.splice(0, attemptTrace.length - TRACE_LIMIT);
      return entry;
    }
    function emit() {onChange(snapshot());}
    function clearDeadline() {clearTimer(timer); timer = null; deadline = null; generation++;}
    function erase() {samples = []; top = bottom = tolerance = source = lastTimestamp = null; clearDeadline();}
    function clearAttemptOnly() {samples = []; clearDeadline();}
    function reset() {erase(); stage = 'IDLE'; reason = failedStage = captureRejectReason = null; calibrationFrameCount = captureAttemptCount = stablePoseDurationMs = 0; selectedSide = null; usableCoreJoints = []; missingCoreJoints = CORE_NAMES.slice(); supportMissing = SUPPORT_NAMES.slice(); trackingInterruptedAt = null; recordEvent('CALIBRATION_RESET'); emit();}
    function invalidate(code = 'SOURCE_CHANGED') {
      if (stage === 'IDLE' || stage === 'NEEDS_RETRY' || stage.startsWith('WAIT_')) return;
      failedStage = stage;
      const preserveCapturedReferences = ['TIMEOUT','TRACKING_LOST'].includes(code) && ['CAPTURE_BOTTOM','CONFIRM_TOP'].includes(stage);
      if (preserveCapturedReferences) clearAttemptOnly(); else erase();
      reason = ['SOURCE_CHANGED','TIMEOUT','TRACKING_LOST'].includes(code) ? code : 'SOURCE_CHANGED';
      stage = 'NEEDS_RETRY'; emit();
    }
    function advance(next) {
      clearDeadline(); stage = next; samples = [];
      if (next !== 'CALIBRATED') {
        deadline = now() + PHASE_TIMEOUT_MS; const current = generation;
        timer = setTimer(() => {if (generation === current) invalidate('TIMEOUT');}, PHASE_TIMEOUT_MS);
        timer?.unref?.();
      }
      emit();
    }
    function waitForReady(target = 'TOP') {
      clearAttemptOnly(); reason = failedStage = null;
      const normalized = String(target || 'TOP').toUpperCase();
      stage = normalized === 'BOTTOM' ? 'WAIT_BOTTOM_READY' : normalized === 'CONFIRM_TOP' ? 'WAIT_TOP_CONFIRM_READY' : 'WAIT_TOP_READY';
      emit(); return true;
    }
    function beginReadyCapture() {
      const next = stage === 'WAIT_BOTTOM_READY' ? 'CAPTURE_BOTTOM' : stage === 'WAIT_TOP_CONFIRM_READY' ? 'CONFIRM_TOP' : stage === 'WAIT_TOP_READY' ? 'CAPTURE_TOP' : null;
      captureAttemptCount++;
      if (!next) {captureRejectReason = `NOT_WAITING_${stage}`; recordEvent('READY_REJECTED', captureRejectReason); emit(); return false;}
      captureRejectReason = null;
      recordEvent(next === 'CAPTURE_TOP' ? 'TOP_READY_RECEIVED' : next === 'CAPTURE_BOTTOM' ? 'BOTTOM_READY_RECEIVED' : 'TOP_CONFIRM_READY_RECEIVED');
      recordEvent(`${next}_STARTED`);
      advance(next); return true;
    }
    function start() {erase(); reason = failedStage = null; waitForReady('TOP');}
    function retry() {
      if (stage !== 'NEEDS_RETRY') return false;
      let next = failedStage;
      if (next === 'CAPTURE_BOTTOM' && !top) next = 'CAPTURE_TOP';
      if (next === 'CONFIRM_TOP' && (!top || !bottom)) next = top ? 'CAPTURE_BOTTOM' : 'CAPTURE_TOP';
      if (!['CAPTURE_TOP','CAPTURE_BOTTOM','CONFIRM_TOP'].includes(next)) next = 'CAPTURE_TOP';
      reason = failedStage = null;
      waitForReady(next === 'CAPTURE_BOTTOM' ? 'BOTTOM' : next === 'CONFIRM_TOP' ? 'CONFIRM_TOP' : 'TOP');
      return true;
    }
    function fresh(frame) {return Number.isFinite(frame?.timestamp) && frame.timestamp >= 0 && now() - frame.timestamp <= MAX_AGE_MS && frame.timestamp - now() <= 250;}
    // Side is a calibration identity, not a camera/source identity. A competing
    // side may briefly win MoveNet confidence during a floor transition. Reject
    // that frame and wait for the established side; only dimensions identify a
    // real source replacement that invalidates stored references.
    function sameCameraSource(frame) {return !source || (frame.sourceWidth === source.width && frame.sourceHeight === source.height);}
    function sameCalibrationSide(frame) {return !source || frame.side === source.side;}
    function evaluate(frame, minimumConfidence) {
      const evaluationStage = stage === 'CAPTURE_BOTTOM' ? 'CAPTURE_BOTTOM' : (stage === 'CONFIRM_TOP' ? 'CONFIRM_TOP' : 'CAPTURE_TOP');
      return evaluateFrame(frame, minimumConfidence, evaluationStage);
    }
    function observe(frame, minimumConfidence) {
      if (!['CAPTURE_TOP', 'CAPTURE_BOTTOM', 'CONFIRM_TOP', 'CALIBRATED'].includes(stage)) return false;
      calibrationFrameCount++;
      const pointStatus = requiredPointStatus(frame, minimumConfidence);
      selectedSide = frame?.side || null;
      usableCoreJoints = CORE_NAMES.filter(name => pointStatus[name]?.visible);
      missingCoreJoints = CORE_NAMES.filter(name => !pointStatus[name]?.visible);
      supportMissing = SUPPORT_NAMES.filter(name => !pointStatus[name]?.visible);
      if (deadline !== null && now() >= deadline) {invalidate('TIMEOUT'); return false;}
      const vector = fresh(frame) && ['left','right'].includes(frame.side) ? signature(frame, minimumConfidence) : null;
      if (!vector) {
        captureRejectReason = !fresh(frame) ? 'NO_FRESH_POSE' : missingCoreJoints.length ? `MISSING_CORE_${missingCoreJoints.join('_').toUpperCase()}` : 'FRAME_NOT_CALIBRATION_USABLE';
        recordEvent(stage === 'CAPTURE_BOTTOM' ? 'BOTTOM_FRAME_REJECTED' : stage === 'CONFIRM_TOP' ? 'TOP_CONFIRM_FRAME_REJECTED' : 'TOP_FRAME_REJECTED', captureRejectReason);
        stablePoseDurationMs = 0;
        samples = [];
        trackingInterruptedAt ??= now();
        return false;
      }
      if (!sameCameraSource(frame)) {captureRejectReason = 'SOURCE_CHANGED'; recordEvent('SOURCE_CHANGED'); invalidate('SOURCE_CHANGED'); return false;}
      if (!sameCalibrationSide(frame)) {
        captureRejectReason = `CALIBRATION_SIDE_LOCKED_${source.side.toUpperCase()}`;
        recordEvent('BOTTOM_FRAME_REJECTED', captureRejectReason);
        samples = []; stablePoseDurationMs = 0; trackingInterruptedAt ??= now();
        return false;
      }
      if (lastTimestamp !== null && frame.timestamp <= lastTimestamp) {samples = []; stablePoseDurationMs = 0; captureRejectReason = 'NON_MONOTONIC_FRAME'; return false;}
      if (trackingInterruptedAt !== null) {recordEvent('TRACKING_REACQUIRED', `${Math.max(0, now() - trackingInterruptedAt)}ms`); trackingInterruptedAt = null;}
      source ||= {side: frame.side, width: frame.sourceWidth, height: frame.sourceHeight};
      if (lastTimestamp !== null && frame.timestamp - lastTimestamp > MAX_GAP_MS) samples = [];
      lastTimestamp = frame.timestamp;
      if (stage === 'CALIBRATED') return false;
      if (samples.length && frame.timestamp - samples.at(-1).at < 16) return false;
      samples.push({at: frame.timestamp, vector});
      while (samples.length > 2 && samples[1].at <= frame.timestamp - STABLE_MS) samples.shift();
      stablePoseDurationMs = samples.length ? frame.timestamp - samples[0].at : 0;
      const candidate = stable(samples);
      if (!candidate) {captureRejectReason = stablePoseDurationMs < STABLE_MS ? 'STABLE_HOLD_PENDING' : 'POSE_UNSTABLE'; return false;}
      const form = formFromVector(candidate.center, stage);
      if (!form?.allPass) {captureRejectReason = Object.entries(form?.checks || {}).find(([,pass]) => !pass)?.[0]?.replace(/[A-Z]/g, value => `_${value}`).toUpperCase() || 'FORM_REJECTED'; recordEvent(stage === 'CAPTURE_BOTTOM' ? 'BOTTOM_FRAME_REJECTED' : 'TOP_FRAME_REJECTED', captureRejectReason); return false;}
      captureRejectReason = null;
      if (stage === 'CAPTURE_TOP') {top = candidate; recordEvent('TOP_CAPTURED'); waitForReady('BOTTOM'); return true;}
      if (stage === 'CAPTURE_BOTTOM') {
        if (distance(candidate.center, top.center) < Math.max(MIN_POSE_SEPARATION_DEGREES, top.spread * 2)) {captureRejectReason = 'BOTTOM_TOO_SIMILAR'; recordEvent('BOTTOM_FRAME_REJECTED', captureRejectReason); return false;}
        bottom = candidate;
        const separation = distance(top.center, bottom.center);
        tolerance = Math.max(10, Math.min(separation * .4, Math.max(top.spread, bottom.spread) * 3 + 10));
        recordEvent('BOTTOM_CAPTURED'); waitForReady('CONFIRM_TOP'); return true;
      }
      const topDistance = distance(candidate.center, top.center), bottomDistance = distance(candidate.center, bottom.center);
      if (topDistance <= tolerance && topDistance < bottomDistance) {advance('CALIBRATED'); return true;}
      captureRejectReason = 'TOP_CONFIRM_DOES_NOT_MATCH';
      return false;
    }
    function manualCapture(frame, minimumConfidence, requested = '') {
      const target = String(requested || '').toUpperCase();
      if (!['TOP','BOTTOM'].includes(target)) return {ok:false, reason:'UNKNOWN_CAPTURE'};
      if (!fresh(frame) || !['left','right'].includes(frame?.side)) return {ok:false, reason:'NO_FRESH_POSE'};
      const vector = signature(frame, minimumConfidence, {manual:true});
      if (!vector) return {ok:false, reason:'REQUIRED_JOINTS_MISSING'};
      if (source && !sameCameraSource(frame)) return {ok:false, reason:'SOURCE_CHANGED'};
      if (source && !sameCalibrationSide(frame)) return {ok:false, reason:`CALIBRATION_SIDE_LOCKED_${source.side.toUpperCase()}`};
      source ||= {side:frame.side,width:frame.sourceWidth,height:frame.sourceHeight};
      const candidate = {center:vector, spread:0, manual:true};
      if (target === 'TOP') {
        if (['WAIT_TOP_CONFIRM_READY','CONFIRM_TOP'].includes(stage) && top && bottom) {
          const separation = distance(top.center, bottom.center);
          tolerance ||= Math.max(10, Math.min(separation * .4, 18));
          if (distance(candidate.center, top.center) > Math.max(tolerance, 18)) return {ok:false, reason:'TOP_DOES_NOT_MATCH'};
          clearDeadline(); stage='CALIBRATED'; samples=[]; reason=failedStage=null; emit();
          return {ok:true, captured:'TOP_CONFIRM', stage};
        }
        erase(); reason=failedStage=null; top=candidate; source={side:frame.side,width:frame.sourceWidth,height:frame.sourceHeight};
        waitForReady('BOTTOM');
        return {ok:true, captured:'TOP', stage};
      }
      if (!top) return {ok:false, reason:'TOP_REQUIRED'};
      if (!sameCameraSource(frame)) return {ok:false, reason:'SOURCE_CHANGED'};
      if (!sameCalibrationSide(frame)) return {ok:false, reason:`CALIBRATION_SIDE_LOCKED_${source.side.toUpperCase()}`};
      if (distance(candidate.center, top.center) < MIN_POSE_SEPARATION_DEGREES) return {ok:false, reason:'BOTTOM_TOO_SIMILAR'};
      bottom=candidate;
      const separation=distance(top.center,bottom.center);
      tolerance=Math.max(10,Math.min(separation*.4,18));
      waitForReady('CONFIRM_TOP');
      return {ok:true, captured:'BOTTOM', stage};
    }
    function classify(frame, minimumConfidence) {
      if (stage !== 'CALIBRATED') return 'UNAVAILABLE';
      const vector = fresh(frame) && sameCameraSource(frame) && sameCalibrationSide(frame) ? signature(frame, minimumConfidence) : null;
      if (!vector) return 'UNUSABLE';
      const topDistance = distance(vector, top.center), bottomDistance = distance(vector, bottom.center);
      if (topDistance <= tolerance && topDistance < bottomDistance) return 'TOP';
      if (bottomDistance <= tolerance && bottomDistance < topDistance) return 'BOTTOM';
      return 'BETWEEN';
    }
    return {start, waitForReady, beginReadyCapture, retry, reset, invalidate, observe, manualCapture, classify, evaluate, snapshot, diagnostics, recordEvent};
  }
  return Object.freeze({create, signature, distance, evaluateFrame, formFromVector, CORE_NAMES, SUPPORT_NAMES, STABLE_MS, PHASE_TIMEOUT_MS, MAX_BOTTOM_ELBOW_DEGREES,
    TOP_ELBOW_MIN_DEGREES, TOP_SHOULDER_TARGET_DEGREES, TOP_SHOULDER_GRACE_DEGREES, BODY_ALIGNMENT_GRACE_DEGREES});
});
