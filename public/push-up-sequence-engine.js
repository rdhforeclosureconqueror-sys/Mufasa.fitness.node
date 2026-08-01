(function installPushUpSequenceEngine(globalScope, factory) {
  'use strict';
  const api = factory(globalScope);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (globalScope) globalScope.PushUpSequenceEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function pushUpSequenceEngineFactory(globalScope) {
  'use strict';

  const SEQUENCE_LANDMARKS = Object.freeze(['shoulder', 'elbow', 'wrist', 'hip', 'ankle']);
  const FEATURE_WEIGHTS = Object.freeze({ bodyAlignment: .2, elbowAngle: .35, relativePosition: .25, movementDirection: .2 });
  const definitionSource = typeof require === 'function' ? require('./exercise-sequence-definitions').pushUp : globalScope.ExerciseSequenceDefinitions.pushUp;
  const genericApi = typeof require === 'function' ? require('./generic-exercise-sequence-engine') : globalScope.GenericExerciseSequenceEngine;
  const PUSH_UP_SEQUENCE_DEFINITION = Object.freeze({...definitionSource, phases:Object.freeze(definitionSource.phases.map(phase=>Object.freeze({phaseId:phase.id,type:phase.kind,...phase}))), reviewState:'trainer_review_required', featureWeights:FEATURE_WEIGHTS, landmarks:SEQUENCE_LANDMARKS, templateFingerprint:genericApi.fingerprint(definitionSource)});

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
    constructor(options = {}) {
      const GESE = typeof require === 'function' ? require('./generic-exercise-sequence-engine') : globalScope.GenericExerciseSequenceEngine;
      const definitions = typeof require === 'function' ? require('./exercise-sequence-definitions') : globalScope.ExerciseSequenceDefinitions;
      const definition = JSON.parse(JSON.stringify(definitions.pushUp));
      if (options.persistenceFrames) for (const phase of definition.phases) if (phase.kind !== 'transition') phase.persistenceFrames=options.persistenceFrames;
      if (options.transitionFrames) for (const phase of definition.phases) if (phase.kind === 'transition') phase.persistenceFrames=options.transitionFrames;
      this.engine=new GESE.ExerciseSequenceEngine(definition);this.definition=definition;this.reset();
    }
    reset(){this.engine.reset();this.repetitions=0;this.phaseEvents=[];this.transitionEvents=[];this.repetitionExplanations=[];this.interruptedTransitions=0;this.unscorableDurationMs=0;this.phaseEvaluations=0;this.phaseMismatches=0;this.transitionEvaluations=0;this.transitionMismatches=0;this.lastTimestamp=null;}
    expected(){return this.engine.expected();}
    observe(frame){const phase=this.definition.phases.find(p=>p.id===this.engine.phase),out=this.engine.observe(frame);if(phase.kind==='transition'){this.transitionEvaluations++;if(!out.transitionMatched)this.transitionMismatches++;}else{this.phaseEvaluations++;if(!out.phaseMatched)this.phaseMismatches++;}if(out.unscorableReason){if(this.lastTimestamp!=null)this.unscorableDurationMs+=Math.max(0,Number(frame?.timestamp)-this.lastTimestamp);this.interruptedTransitions+=phase.kind==='transition'?1:0;}this.lastTimestamp=Number(frame?.timestamp);this.repetitions=this.engine.repetitions;const d=this.engine.diagnostics();this.phaseEvents=d.phaseEvents.map(({phaseId,timestamp,matched})=>({phaseId,timestamp,matched}));this.transitionEvents=d.transitionEvents.map(({phaseId,timestamp,matched})=>({phaseId,timestamp,matched}));this.repetitionExplanations=d.repetitionExplanations;return out;}
    diagnostics(){return{sequenceId:this.definition.sequenceId,sequenceVersion:this.definition.sequenceVersion,templateFingerprint:this.engine.templateFingerprint,phaseEvents:this.phaseEvents.slice(),transitionEvents:this.transitionEvents.slice(),completedSequenceRepetitions:this.repetitions,interruptedTransitions:this.interruptedTransitions,unscorableDurationMs:this.unscorableDurationMs,phaseEvaluations:this.phaseEvaluations,phaseMismatches:this.phaseMismatches,transitionEvaluations:this.transitionEvaluations,transitionMismatches:this.transitionMismatches,repetitionExplanations:this.repetitionExplanations.slice(),decisionEvidence:this.engine.decisionEvidence.slice()};}
  }

  return Object.freeze({ SEQUENCE_LANDMARKS, FEATURE_WEIGHTS, PUSH_UP_SEQUENCE_DEFINITION, normalizeSequencePose, PushUpSequenceMatcher });
});
