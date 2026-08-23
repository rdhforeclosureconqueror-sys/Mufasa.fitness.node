(function initQualifiedRepRuntime(root, factory) {
  'use strict';
  const api = factory(root.KettlebellCheckpoints || (typeof require === 'function' ? require('./kettlebell-checkpoints') : null));
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.QualifiedRepRuntime = api;
})(typeof window !== 'undefined' ? window : globalThis, function qualifiedRepFactory(checkpoints) {
  'use strict';

  const SCHEMA_VERSION = 1;
  const QUALIFIABLE_EVALUATORS = new Set(['form_engine_squat', 'form_engine_hinge', 'form_engine_lunge']);
  const NON_ADVANCING = new Set(['uncertain', 'insufficient_keypoints', 'unsupported_orientation', 'camera_unavailable']);

  function parseTempo(value) {
    const source = String(value || '').trim();
    const match = source.match(/^(\d+)\s*[–-]\s*(\d+)\s*[–-]\s*(\d+)\s*[–-]\s*(\d+)$/);
    if (!match) return { source: source || null, status: source ? 'insufficient_tempo_data' : 'not_applicable', expectedSeconds: null };
    const seconds = match.slice(1).map(Number);
    return { source, status: 'interpretable', seconds, expectedSeconds: seconds.reduce((sum, part) => sum + part, 0) };
  }

  function tempoMetrics(target, startedAt, completedAt) {
    if (!target?.expectedSeconds) return { observedSeconds: null, expectedSeconds: null, status: target?.status === 'not_applicable' ? 'not_applicable' : 'insufficient_timing_data' };
    const observedSeconds = (completedAt - startedAt) / 1000;
    if (!(observedSeconds > 0)) return { observedSeconds: null, expectedSeconds: target.expectedSeconds, status: 'insufficient_timing_data' };
    const ratio = observedSeconds / target.expectedSeconds;
    return { observedSeconds: Number(observedSeconds.toFixed(2)), expectedSeconds: target.expectedSeconds, status: ratio < .8 ? 'faster_than_target' : ratio > 1.2 ? 'slower_than_target' : 'on_tempo' };
  }

  function supported(definition) {
    return Boolean(definition && definition.cycleType === 'rep_cycle' && QUALIFIABLE_EVALUATORS.has(definition.evaluator));
  }

  class CandidateStateMachine {
    constructor(options = {}) {
      this.now = options.now || Date.now;
      this.uncertaintyTimeoutMs = options.uncertaintyTimeoutMs || 1500;
      this.candidateTimeoutMs = options.candidateTimeoutMs || 12000;
      this.onCandidate = options.onCandidate || null;
      this.onGuidance = options.onGuidance || null;
      this.count = 0;
      this.sequence = 0;
      this.exerciseId = null;
      this.reset('initialized');
    }

    configure(exercise = {}) {
      const nextId = String(exercise.exerciseId || '');
      if (nextId !== this.exerciseId) {
        this.exerciseId = nextId;
        this.definition = checkpoints?.resolve(nextId) || null;
        this.tempoTarget = parseTempo(exercise.tempo);
        this.count = 0;
        this.reset('canonical_exercise_changed');
      } else if (exercise.tempo !== undefined) this.tempoTarget = parseTempo(exercise.tempo);
      return this.snapshot();
    }

    reset(reason = 'manual_reset') {
      this.state = 'awaiting_start';
      this.observed = [];
      this.skipped = 0;
      this.startedAt = null;
      this.lastUsableAt = null;
      this.lastCheckpoint = null;
      this.stableCheckpoint = null;
      this.stableFrames = 0;
      this.terminalLatched = false;
      this.lastReason = reason;
      this.side = 'unknown';
      this.orientation = 'unknown';
      this.confidences = [];
      return this.snapshot();
    }

    reject(reason) {
      this.reset(reason);
      this.state = 'rejected';
      return this.snapshot();
    }

    process(observation, canonicalExercise) {
      if (canonicalExercise) this.configure(canonicalExercise);
      const now = Number(observation?.timestamp || this.now());
      if (!supported(this.definition)) {
        this.state = 'unsupported_exercise';
        this.lastReason = this.definition?.cycleType === 'sustained' ? 'sustained_movement_not_rep_cycle' : 'evaluator_not_supported';
        return this.snapshot(observation);
      }
      if (this.startedAt && now - this.startedAt > this.candidateTimeoutMs) return this.reject('candidate_timeout');
      if (NON_ADVANCING.has(observation?.status)) {
        this.state = observation.status === 'camera_unavailable' ? 'camera_unavailable' : 'uncertain_hold';
        if (this.lastUsableAt && now - this.lastUsableAt > this.uncertaintyTimeoutMs) return this.reject(`${observation.status}_timeout`);
        return this.snapshot(observation);
      }
      if (observation?.status !== 'observed' || !observation.checkpointId) return this.reject(observation?.status || 'invalid_observation');
      this.lastUsableAt = now;
      this.side = observation.side || 'unknown';
      this.orientation = observation.orientation || 'unknown';

      if (observation.checkpointId === this.stableCheckpoint) this.stableFrames += 1;
      else { this.stableCheckpoint = observation.checkpointId; this.stableFrames = 1; }
      const requiredFrames = this.definition.confidence.persistenceFrames || 2;
      if (this.stableFrames < requiredFrames) return this.snapshot(observation);
      if (this.lastCheckpoint === observation.checkpointId) return this.snapshot(observation);

      const ids = this.definition.checkpoints.map((checkpoint) => checkpoint.id);
      const first = ids[0], terminal = ids.at(-1);
      if (!this.startedAt) {
        if (observation.checkpointId !== first) return this.snapshot(observation);
        this.terminalLatched = false;
        this.startedAt = now; this.state = 'progressing'; this.lastCheckpoint = first;
        this.observed.push({ checkpointId: first, timestamp: now, confidence: observation.confidence });
        this.confidences.push(Number(observation.confidence));
        return this.snapshot(observation);
      }

      const transition = checkpoints.transition(this.definition, this.lastCheckpoint, observation.checkpointId, { status: observation.status, maxSkipped: this.skipped ? 0 : 1 });
      if (transition === checkpoints.TRANSITION.INVALID || transition === checkpoints.TRANSITION.RESET) return this.reject(`invalid_transition:${this.lastCheckpoint}->${observation.checkpointId}`);
      if (transition === checkpoints.TRANSITION.MISSED) {
        if (this.skipped || ids.indexOf(observation.checkpointId) - ids.indexOf(this.lastCheckpoint) !== 2) return this.reject('excessive_skipped_observations');
        this.skipped = 1;
      } else if (transition !== checkpoints.TRANSITION.VALID) return this.snapshot(observation);
      this.lastCheckpoint = observation.checkpointId;
      this.observed.push({ checkpointId: observation.checkpointId, timestamp: now, confidence: observation.confidence });
      this.confidences.push(Number(observation.confidence));
      if (observation.checkpointId !== terminal) return this.snapshot(observation);

      const confidence = Math.min(...this.confidences.filter(Number.isFinite));
      if (!(confidence >= this.definition.confidence.minimumCheckpoint)) return this.reject('candidate_confidence_below_threshold');
      const metrics = tempoMetrics(this.tempoTarget, this.startedAt, now);
      const candidate = this.snapshot(observation, { state: 'qualified', qualificationStatus: 'qualified', completedAt: now, candidateConfidence: Number(confidence.toFixed(3)), tempoMetrics: metrics, tempoStatus: metrics.status });
      this.count += 1; this.sequence += 1; candidate.candidateId = `${this.exerciseId}:${this.sequence}`; candidate.candidateCount = this.count;
      this.onCandidate?.(candidate);
      const cue = metrics.status === 'faster_than_target' ? 'Slow it down.' : metrics.status === 'slower_than_target' ? 'Drive up.' : metrics.status === 'on_tempo' ? 'Good tempo.' : null;
      if (cue) this.onGuidance?.(cue, metrics.status);
      this.reset('new_cycle_required');
      this.terminalLatched = true;
      return candidate;
    }

    snapshot(observation = null, overrides = {}) {
      return {
        schemaVersion: SCHEMA_VERSION, exerciseId: this.exerciseId, movementFamily: this.definition?.movementFamily || null,
        candidateId: null, state: this.state, qualificationStatus: supported(this.definition) ? 'pending' : 'unsupported',
        qualificationSupported: supported(this.definition), startedAt: this.startedAt, completedAt: null,
        observedCheckpoints: this.observed.map((item) => ({ ...item })), skippedCheckpointCount: this.skipped,
        candidateConfidence: this.confidences.length ? Number(Math.min(...this.confidences).toFixed(3)) : 0,
        checkpointConfidence: Number(observation?.confidence || 0), tempoTarget: this.tempoTarget || parseTempo(null),
        tempoMetrics: { observedSeconds: null, expectedSeconds: this.tempoTarget?.expectedSeconds || null, status: 'insufficient_timing_data' },
        tempoStatus: this.tempoTarget?.status === 'not_applicable' ? 'not_applicable' : 'insufficient_timing_data',
        side: this.side, orientation: this.orientation, rejectionReason: this.lastReason, candidateCount: this.count, advisory: true,
        ...overrides
      };
    }
  }

  return Object.freeze({ SCHEMA_VERSION, CandidateStateMachine, parseTempo, tempoMetrics, supported });
});
