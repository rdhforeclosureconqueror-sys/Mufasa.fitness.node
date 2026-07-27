(function initPushUpChallenge(globalScope, factory) {
  'use strict';
  const api = factory(globalScope);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (globalScope) globalScope.PushUpChallenge = api;
})(typeof window !== 'undefined' ? window : globalThis, function challengeFactory(global) {
  'use strict';

  const SESSION_SCHEMA_VERSION = 1;
  const POSE_MODEL = 'MoveNet.SinglePose.Lightning';
  const POSE_MODEL_VERSION = '2.1.3';
  const LANDMARK_NAMES = ['shoulder', 'hip', 'ankle'];
  const SIDES = ['left', 'right'];
  const CONNECTIONS = [['shoulder', 'hip'], ['hip', 'ankle']];

  const clone = value => JSON.parse(JSON.stringify(value));
  const id = () => global.crypto?.randomUUID?.() || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const finite = value => Number.isFinite(Number(value));

  function getPushUpProfile(metadata = global.ExerciseMetadata) {
    const profile = metadata?.getDefaultRegistry?.().resolve('push_up');
    if (!profile || profile.exerciseId !== 'push_up' || !profile.metadataFingerprint) {
      throw new Error('The runtime-authoritative Push-Up profile is unavailable.');
    }
    return profile;
  }

  function sessionVersionMetadata(profile) {
    return Object.freeze({
      exerciseId: profile.exerciseId,
      canonicalProfileFingerprint: profile.metadataFingerprint,
      profileVersion: profile.profileVersion,
      generatorVersion: profile.generatorVersion,
      capabilityRegistryVersion: profile.capabilityRegistryVersion,
      thresholdVersion: profile.rulesVersion,
      poseModel: POSE_MODEL,
      poseModelVersion: POSE_MODEL_VERSION
    });
  }

  function selectSide(keypoints) {
    const byName = new Map((keypoints || []).map(point => [point.name || point.part, point]));
    return SIDES.map(side => ({
      side,
      points: Object.fromEntries(LANDMARK_NAMES.map(name => [name, byName.get(`${side}_${name}`)])),
      score: LANDMARK_NAMES.reduce((sum, name) => sum + Number(byName.get(`${side}_${name}`)?.score || 0), 0)
    })).sort((a, b) => b.score - a.score)[0];
  }

  function normalizeLandmarks(keypoints, width, height) {
    if (!(width > 0) || !(height > 0)) throw new TypeError('Frame dimensions must be positive.');
    const selected = selectSide(keypoints);
    const landmarks = {};
    for (const name of LANDMARK_NAMES) {
      const point = selected.points[name];
      landmarks[name] = point && finite(point.x) && finite(point.y) ? {
        x: Math.max(0, Math.min(1, Number(point.x) / width)),
        y: Math.max(0, Math.min(1, Number(point.y) / height)),
        confidence: Math.max(0, Math.min(1, Number(point.score || 0)))
      } : null;
    }
    return { side: selected.side, landmarks };
  }

  function alignmentDeviation(landmarks) {
    const [a, b, c] = LANDMARK_NAMES.map(name => landmarks[name]);
    if (!a || !b || !c) return null;
    const v1 = { x: a.x - b.x, y: a.y - b.y }, v2 = { x: c.x - b.x, y: c.y - b.y };
    const lengths = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
    if (!lengths) return null;
    const degrees = Math.acos(Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / lengths))) * 180 / Math.PI;
    return Math.abs(180 - degrees);
  }

  class PoseCaptureEngine {
    constructor({ profile, onFrame = () => {}, poseRuntime = global.PoseRuntime } = {}) {
      this.profile = profile; this.onFrame = onFrame; this.poseRuntime = poseRuntime; this.loop = null;
    }
    transform(pose, dimensions, timestamp = Date.now()) {
      const normalized = normalizeLandmarks(pose?.keypoints, dimensions.width, dimensions.height);
      const confidences = LANDMARK_NAMES.map(name => normalized.landmarks[name]?.confidence || 0);
      const frameConfidence = Math.min(...confidences);
      const threshold = this.profile.poseAnalysis.rules[0].minimumLandmarkConfidence;
      return { timestamp, side: normalized.side, landmarks: normalized.landmarks, frameConfidence, usable: confidences.every(score => score >= threshold) };
    }
    async start(video) {
      const detector = await this.poseRuntime.initMoveNetDetector();
      this.loop = this.poseRuntime.startPoseLoop({ detector, video, isRunning: () => Boolean(this.loop), onPoseFrame: ({ pose }) => {
        const frame = this.transform(pose, { width: video.videoWidth, height: video.videoHeight });
        this.onFrame(frame);
      }});
      return this.loop;
    }
    stop() { this.loop?.stop?.(); this.loop = null; }
  }

  class RepetitionEventEngine {
    constructor({ movementThreshold = .045 } = {}) { this.movementThreshold = movementThreshold; this.reset(); }
    reset() { this.baseline = null; this.phase = 'top'; this.count = 0; this.events = []; }
    observe(frame) {
      if (!frame.usable || !frame.landmarks.hip) return null;
      const y = frame.landmarks.hip.y;
      if (this.baseline == null) this.baseline = y;
      this.baseline = Math.min(this.baseline, y);
      if (this.phase === 'top' && y - this.baseline >= this.movementThreshold) this.phase = 'away';
      if (this.phase === 'away' && y - this.baseline <= this.movementThreshold / 2) {
        const event = { index: ++this.count, timestamp: frame.timestamp, type: 'repetition_completed', complete: true };
        this.events.push(event); this.phase = 'top'; return event;
      }
      return null;
    }
  }

  function classifySession(session, profile) {
    const reasons = [];
    const frames = session.normalizedLandmarkFrames || [], usable = frames.filter(frame => frame.usable);
    const usablePercentage = frames.length ? usable.length / frames.length * 100 : 0;
    const overallConfidence = frames.length ? frames.reduce((sum, frame) => sum + Number(frame.frameConfidence || 0), 0) / frames.length : 0;
    const metadata = session.versionMetadata || {};
    if (!session.requiredViewEstablished) reasons.push('required_side_view_not_established');
    if (overallConfidence < profile.poseAnalysis.minimumOverallConfidence) reasons.push('overall_confidence_below_threshold');
    if (usablePercentage < profile.poseAnalysis.minimumUsableFramePercentage) reasons.push('insufficient_usable_frames');
    if (!frames.length || frames.filter(f => LANDMARK_NAMES.every(n => f.landmarks?.[n])).length / Math.max(1, frames.length) < .6) reasons.push('required_landmarks_unavailable');
    const expected = sessionVersionMetadata(profile);
    if (['exerciseId','canonicalProfileFingerprint','profileVersion','generatorVersion','capabilityRegistryVersion','thresholdVersion'].some(key => metadata[key] !== expected[key])) reasons.push('exercise_version_incompatible');
    if (!session.repetitionEvents?.length || session.repetitionEvents.some(event => !event.complete)) reasons.push('repetition_data_incomplete');
    return { valid: reasons.length === 0, invalidationReason: reasons[0] || null, invalidationReasons: reasons, usableFramePercentage: usablePercentage, overallConfidence };
  }

  class PerformanceRecorder {
    constructor({ profile, userId = 'local-user' }) { this.profile = profile; this.userId = userId; this.session = null; }
    start({ mode, requiredViewEstablished }) {
      this.session = { schemaVersion: SESSION_SCHEMA_VERSION, sessionId: id(), userId: this.userId, mode, versionMetadata: sessionVersionMetadata(this.profile), sessionStartedAt: new Date().toISOString(), sessionEndedAt: null, requiredViewEstablished: Boolean(requiredViewEstablished), normalizedLandmarkFrames: [], repetitionEvents: [], supportedAlignmentFindings: [], summary: null, invalidationReason: null };
      return this.session;
    }
    frame(frame) { if (this.session) this.session.normalizedLandmarkFrames.push(clone(frame)); }
    repetition(event) { if (this.session) this.session.repetitionEvents.push(clone(event)); }
    finish() {
      this.session.sessionEndedAt = new Date().toISOString();
      const rule = this.profile.poseAnalysis.rules[0], frames = this.session.normalizedLandmarkFrames;
      const affected = frames.filter(frame => frame.usable && alignmentDeviation(frame.landmarks) > rule.thresholds.maximumDeviationDegrees);
      let runStart = null, longestRunMs = 0;
      for (const frame of frames) {
        const isAffected = frame.usable && alignmentDeviation(frame.landmarks) > rule.thresholds.maximumDeviationDegrees;
        if (isAffected && runStart == null) runStart = frame.timestamp;
        if (isAffected) longestRunMs = Math.max(longestRunMs, frame.timestamp - runStart);
        else runStart = null;
      }
      const affectedFramePercentage = affected.length / Math.max(1, frames.length) * 100;
      if (affectedFramePercentage >= rule.minimumAffectedFramePercentage && longestRunMs >= rule.minimumConsecutiveDurationMs) this.session.supportedAlignmentFindings.push({ measurement: rule.measurement, finding: 'alignment_needs_attention', affectedFramePercentage, consecutiveDurationMs: longestRunMs });
      const classification = classifySession(this.session, this.profile);
      this.session.invalidationReason = classification.invalidationReason;
      this.session.summary = { valid: classification.valid, validRepetitions: this.session.repetitionEvents.filter(e => e.complete).length, completionTimeMs: Date.parse(this.session.sessionEndedAt) - Date.parse(this.session.sessionStartedAt), usableFramePercentage: classification.usableFramePercentage, overallConfidence: classification.overallConfidence };
      return clone(this.session);
    }
    serialize() { return JSON.stringify(this.session); }
  }

  class ComparisonEngine {
    compatible(current, previous) {
      if (!current?.summary?.valid || !previous?.summary?.valid) return { compatible: false, reason: 'session_not_valid' };
      const a = current.versionMetadata, b = previous.versionMetadata;
      const keys = ['exerciseId','canonicalProfileFingerprint','profileVersion','generatorVersion','capabilityRegistryVersion','thresholdVersion','poseModel','poseModelVersion'];
      const mismatch = keys.find(key => a?.[key] !== b?.[key]);
      return mismatch ? { compatible: false, reason: `version_mismatch:${mismatch}` } : { compatible: true, reason: null };
    }
    compare(current, previous) {
      const compatibility = this.compatible(current, previous);
      if (!compatibility.compatible) return compatibility;
      return { ...compatibility, repetitionDelta: current.summary.validRepetitions - previous.summary.validRepetitions, completionTimeDeltaMs: current.summary.completionTimeMs - previous.summary.completionTimeMs };
    }
  }

  class PersonalBestStore {
    constructor(storage = global.localStorage, key = 'mufasa.push-up.sessions.v1') { this.storage = storage; this.key = key; }
    all() { try { return JSON.parse(this.storage?.getItem(this.key) || '[]'); } catch (_) { return []; } }
    save(session) { const sessions = this.all(); sessions.push(clone(session)); this.storage?.setItem(this.key, JSON.stringify(sessions.slice(-10))); }
    best() { return this.all().filter(s => s.summary?.valid).sort((a,b) => b.summary.validRepetitions - a.summary.validRepetitions || a.summary.completionTimeMs - b.summary.completionTimeMs)[0] || null; }
  }

  class GhostRenderer {
    constructor(canvas) { this.canvas = canvas; this.context = canvas?.getContext?.('2d'); }
    frameAt(session, elapsedMs) {
      const frames = session?.normalizedLandmarkFrames || []; if (!frames.length) return null;
      const origin = frames[0].timestamp, duration = Math.max(1, frames[frames.length - 1].timestamp - origin), target = origin + (elapsedMs % (duration + 1));
      return frames.reduce((best, frame) => Math.abs(frame.timestamp - target) < Math.abs(best.timestamp - target) ? frame : best, frames[0]);
    }
    draw(frame, color = 'rgba(255,211,90,.75)') {
      if (!this.context || !frame) return; const ctx = this.context, w = this.canvas.width, h = this.canvas.height;
      ctx.clearRect(0,0,w,h); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 4;
      for (const [from,to] of CONNECTIONS) { const a=frame.landmarks[from], b=frame.landmarks[to]; if(!a||!b)continue; ctx.beginPath();ctx.moveTo(a.x*w,a.y*h);ctx.lineTo(b.x*w,b.y*h);ctx.stroke(); }
      for (const point of Object.values(frame.landmarks)) if(point){ctx.beginPath();ctx.arc(point.x*w,point.y*h,6,0,Math.PI*2);ctx.fill();}
    }
  }

  class ExerciseSessionEngine {
    constructor({ profile, recorder, repetitions }) { this.profile=profile;this.recorder=recorder;this.repetitions=repetitions;this.state='idle';this.mode=null; }
    start(mode, setup={}) { if(!['practice','challenge'].includes(mode))throw new Error('Unsupported mode.');this.state='active';this.mode=mode;this.repetitions.reset();this.recorder.start({mode, requiredViewEstablished:setup.requiredViewEstablished});return this.state; }
    observe(frame) { if(this.state!=='active')return null;this.recorder.frame(frame);const event=this.repetitions.observe(frame);if(event)this.recorder.repetition(event);return event; }
    finish() { if(this.state!=='active')throw new Error('No active session.');this.state='summary';return this.recorder.finish(); }
    reset() { this.state='idle';this.mode=null; }
  }

  return Object.freeze({ SESSION_SCHEMA_VERSION, POSE_MODEL, POSE_MODEL_VERSION, LANDMARK_NAMES, getPushUpProfile, sessionVersionMetadata, normalizeLandmarks, alignmentDeviation, classifySession, PoseCaptureEngine, ExerciseSessionEngine, RepetitionEventEngine, PerformanceRecorder, ComparisonEngine, GhostRenderer, PersonalBestStore });
});
