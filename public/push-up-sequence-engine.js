(function installPushUpSequenceEngine(globalScope, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (globalScope) globalScope.PushUpSequenceEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function pushUpSequenceEngineFactory() {
  'use strict';

  const SEQUENCE_LANDMARKS = Object.freeze(['shoulder', 'elbow', 'wrist', 'hip', 'ankle']);
  const FEATURE_WEIGHTS = Object.freeze({ bodyAlignment: .2, elbowAngle: .35, relativePosition: .25, movementDirection: .2 });
  const PUSH_UP_SEQUENCE_DEFINITION = Object.freeze({
    sequenceId: 'push_up_standard_v1', exerciseId: 'push_up', sequenceVersion: 1,
    capabilityVersion: 'push_up.sequence.phase.v1-proposed', templateVersion: 1,
    templateFingerprint: 'sha256:badc1b814829b0b30ea82bf10f08182904db85ba63038ae9aaa9a8c4a458f66b',
    reviewState: 'trainer_review_required', featureWeights: FEATURE_WEIGHTS,
    landmarks: SEQUENCE_LANDMARKS,
    phases: Object.freeze([
      Object.freeze({ phaseId: 'top', type: 'position' }),
      Object.freeze({ phaseId: 'lowering', type: 'transition' }),
      Object.freeze({ phaseId: 'bottom', type: 'position' }),
      Object.freeze({ phaseId: 'rising', type: 'transition' }),
      Object.freeze({ phaseId: 'top_complete', type: 'completion' })
    ])
  });

  const angle = (a, b, c) => {
    if (!a || !b || !c) return null;
    const ab = { x: a.x - b.x, y: a.y - b.y }, cb = { x: c.x - b.x, y: c.y - b.y };
    const denominator = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
    return denominator ? Math.acos(Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y) / denominator))) * 180 / Math.PI : null;
  };
  const alignmentDeviation = landmarks => {
    const value = angle(landmarks.shoulder, landmarks.hip, landmarks.ankle);
    return value == null ? null : Math.abs(180 - value);
  };

  function normalizeSequencePose(landmarks, { minimumConfidence = .75 } = {}) {
    const missing = SEQUENCE_LANDMARKS.filter(name => !landmarks?.[name] || landmarks[name].displayOnly || landmarks[name].cached || Number(landmarks[name].confidence) < minimumConfidence);
    if (missing.length) return { usable: false, unscorableReason: `required_landmarks_unavailable:${missing.join(',')}`, missingLandmarks: missing };
    const shoulder = landmarks.shoulder, hip = landmarks.hip;
    const torsoLength = Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y);
    if (!(torsoLength > 0)) return { usable: false, unscorableReason: 'invalid_torso_reference' };
    // Translation, body size and horizontal mirroring are removed. Screen axes are
    // retained only for the explicitly directional floor movement signal.
    const points = Object.fromEntries(SEQUENCE_LANDMARKS.map(name => [name, {
      x: Math.abs((landmarks[name].x - hip.x) / torsoLength),
      y: (landmarks[name].y - hip.y) / torsoLength,
      confidence: Number(landmarks[name].confidence)
    }]));
    return {
      usable: true, points, torsoLength,
      elbowAngle: angle(landmarks.shoulder, landmarks.elbow, landmarks.wrist),
      bodyAlignmentDeviation: alignmentDeviation(landmarks),
      shoulderVertical: shoulder.y / torsoLength,
      confidence: Math.min(...SEQUENCE_LANDMARKS.map(name => Number(landmarks[name].confidence)))
    };
  }

  function result(phaseId, matched, featureScores, confidence, unscorableReason = null) {
    const entries = Object.entries(FEATURE_WEIGHTS);
    const score = entries.reduce((sum, [name, weight]) => sum + Number(featureScores[name] || 0) * weight, 0);
    return { phaseId, matched, score, requiredFeaturesPassed: matched, featureScores, confidence, unscorableReason };
  }

  class PushUpSequenceMatcher {
    constructor({ persistenceFrames = 3, transitionFrames = 2, minimumElbowChangeDegrees = 4, bottomElbowReductionDegrees = 25, minimumShoulderTravel = .08 } = {}) {
      Object.assign(this, { persistenceFrames, transitionFrames, minimumElbowChangeDegrees, bottomElbowReductionDegrees, minimumShoulderTravel });
      this.reset();
    }
    reset() {
      this.state = 'TOP'; this.repetitions = 0; this.streak = 0; this.transitionStreak = 0; this.previous = null;
      this.topReference = null; this.phaseEvents = []; this.transitionEvents = []; this.interruptedTransitions = 0; this.unscorableDurationMs = 0; this.lastTimestamp = null; this.safeFrames = 0; this.needsSafeRecovery = false;
    }
    expected() { return this.state; }
    pause(frame, reason) {
      if (this.lastTimestamp != null) this.unscorableDurationMs += Math.max(0, Number(frame.timestamp) - this.lastTimestamp);
      this.lastTimestamp = Number(frame.timestamp);
      if (this.transitionStreak) this.interruptedTransitions++;
      this.transitionStreak = 0; this.streak = 0; this.previous = null; this.safeFrames = 0; this.needsSafeRecovery = true;
      return { phaseMatched: false, transitionMatched: false, repetitionCompleted: false, similarity: result(this.state.toLowerCase(), false, {}, 0, reason), formFindings: [], formScore: null };
    }
    observe(frame) {
      const tracking = frame?.trackingState;
      if (tracking !== 'LOCKED' || !frame.analysisUsable || frame.recoveredThisFrame) return this.pause(frame || {}, tracking === 'RECOVERING' || frame?.recoveredThisFrame ? 'tracking_recovering' : 'tracking_not_locked');
      if (Object.values(frame.sequenceLandmarks || frame.landmarks || {}).some(point => point?.displayOnly || point?.cached)) return this.pause(frame, 'display_only_landmarks');
      if (this.needsSafeRecovery) {
        this.safeFrames++;
        if (this.safeFrames < 2) return { phaseMatched: false, transitionMatched: false, repetitionCompleted: false, similarity: result(this.state.toLowerCase(), false, {}, 0, 'safe_reestablishment_required'), formFindings: [], formScore: null };
        this.needsSafeRecovery = false;
      }
      const pose = normalizeSequencePose(frame.sequenceLandmarks || frame.landmarks);
      this.lastTimestamp = Number(frame.timestamp);
      if (!pose.usable) return this.pause(frame, pose.unscorableReason);
      const previous = this.previous;
      const elbowDelta = previous ? pose.elbowAngle - previous.elbowAngle : 0;
      const shoulderDelta = previous ? pose.shoulderVertical - previous.shoulderVertical : 0;
      const downward = shoulderDelta > .008 && elbowDelta < -this.minimumElbowChangeDegrees;
      const upward = shoulderDelta < -.008 && elbowDelta > this.minimumElbowChangeDegrees;
      let matched = false, transitionMatched = false, repetitionCompleted = false;
      let features = { bodyAlignment: pose.bodyAlignmentDeviation == null ? 0 : Math.max(0, 1 - pose.bodyAlignmentDeviation / 45), elbowAngle: 0, relativePosition: 0, movementDirection: 0 };
      if (this.state === 'TOP') {
        const candidate = pose.elbowAngle >= 145; // provisional sequence-only threshold; not form feedback.
        features.elbowAngle = Math.min(1, pose.elbowAngle / 170); features.relativePosition = 1;
        this.streak = candidate ? this.streak + 1 : 0;
        if (this.streak >= this.persistenceFrames) { matched = true; this.topReference = { elbowAngle: pose.elbowAngle, shoulderVertical: pose.shoulderVertical }; this.advance('LOWERING', frame.timestamp, 'top'); }
      } else if (this.state === 'LOWERING') {
        features.elbowAngle = elbowDelta < 0 ? 1 : 0; features.relativePosition = shoulderDelta > 0 ? 1 : 0; features.movementDirection = downward ? 1 : 0;
        this.transitionStreak = downward ? this.transitionStreak + 1 : 0;
        if (this.transitionStreak >= this.transitionFrames) { transitionMatched = true; this.advance('BOTTOM', frame.timestamp, 'lowering', true); }
      } else if (this.state === 'BOTTOM') {
        const reduction = this.topReference.elbowAngle - pose.elbowAngle;
        const travel = pose.shoulderVertical - this.topReference.shoulderVertical;
        const candidate = reduction >= this.bottomElbowReductionDegrees && travel >= this.minimumShoulderTravel;
        features.elbowAngle = Math.min(1, Math.max(0, reduction / this.bottomElbowReductionDegrees)); features.relativePosition = Math.min(1, Math.max(0, travel / this.minimumShoulderTravel));
        this.streak = candidate ? this.streak + 1 : 0;
        if (this.streak >= this.persistenceFrames) { matched = true; this.advance('RISING', frame.timestamp, 'bottom'); }
      } else if (this.state === 'RISING') {
        features.elbowAngle = elbowDelta > 0 ? 1 : 0; features.relativePosition = shoulderDelta < 0 ? 1 : 0; features.movementDirection = upward ? 1 : 0;
        this.transitionStreak = upward ? this.transitionStreak + 1 : 0;
        if (this.transitionStreak >= this.transitionFrames) { transitionMatched = true; this.advance('TOP_COMPLETE', frame.timestamp, 'rising', true); }
      } else if (this.state === 'TOP_COMPLETE') {
        const candidate = pose.elbowAngle >= this.topReference.elbowAngle - 15 && pose.shoulderVertical <= this.topReference.shoulderVertical + this.minimumShoulderTravel;
        features.elbowAngle = candidate ? 1 : 0; features.relativePosition = candidate ? 1 : 0;
        this.streak = candidate ? this.streak + 1 : 0;
        if (this.streak >= this.persistenceFrames) { matched = true; repetitionCompleted = true; this.repetitions++; this.advance('TOP', frame.timestamp, 'top_complete'); }
      }
      this.previous = pose;
      return { phaseMatched: matched, transitionMatched, repetitionCompleted, similarity: result(this.state.toLowerCase(), matched || transitionMatched, features, pose.confidence), formFindings: [], formScore: null };
    }
    advance(next, timestamp, phaseId, transition = false) {
      const event = { phaseId, timestamp: Number(timestamp), matched: true };
      (transition ? this.transitionEvents : this.phaseEvents).push(event);
      this.state = next; this.streak = 0; this.transitionStreak = 0;
    }
    diagnostics() { return { sequenceId: PUSH_UP_SEQUENCE_DEFINITION.sequenceId, sequenceVersion: 1, templateFingerprint: PUSH_UP_SEQUENCE_DEFINITION.templateFingerprint, phaseEvents: this.phaseEvents.slice(), transitionEvents: this.transitionEvents.slice(), completedSequenceRepetitions: this.repetitions, interruptedTransitions: this.interruptedTransitions, unscorableDurationMs: this.unscorableDurationMs }; }
  }

  return Object.freeze({ SEQUENCE_LANDMARKS, FEATURE_WEIGHTS, PUSH_UP_SEQUENCE_DEFINITION, normalizeSequencePose, PushUpSequenceMatcher });
});
