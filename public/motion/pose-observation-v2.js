(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTPoseObservationV2 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA_ID = 'com.mufasa.fitnode.pose-observation';
  const SCHEMA_VERSION = 2;
  const RULESET_VERSION = 'pose-authority-v1';
  const PROVENANCE = Object.freeze({
    OBSERVED_MODEL: 'OBSERVED_MODEL',
    TEMPORAL_PREDICTION: 'TEMPORAL_PREDICTION',
    ANATOMICAL_RECONSTRUCTION: 'ANATOMICAL_RECONSTRUCTION',
    SIDE_VIEW_SHADOW: 'SIDE_VIEW_SHADOW',
    LOST: 'LOST'
  });
  const NON_AUTHORITATIVE = new Set([
    PROVENANCE.TEMPORAL_PREDICTION,
    PROVENANCE.ANATOMICAL_RECONSTRUCTION,
    PROVENANCE.SIDE_VIEW_SHADOW,
    PROVENANCE.LOST
  ]);
  const LEGACY_17 = Object.freeze(['nose','left_eye','right_eye','left_ear','right_ear','left_shoulder','right_shoulder','left_elbow','right_elbow','left_wrist','right_wrist','left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle']);

  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const finiteOrNull = value => Number.isFinite(Number(value)) ? Number(value) : null;
  function provenanceFor(point) {
    if (!point) return PROVENANCE.LOST;
    if (Object.values(PROVENANCE).includes(point.provenance)) return point.provenance;
    if (point.mode === 'LOST') return PROVENANCE.LOST;
    if (point.displayOnly || point.mode === 'COASTING') return PROVENANCE.TEMPORAL_PREDICTION;
    return PROVENANCE.OBSERVED_MODEL;
  }
  function landmark(point, width, height) {
    const provenance = provenanceFor(point);
    const x = finiteOrNull(point?.x), y = finiteOrNull(point?.y);
    const detectorConfidence = clamp(point?.rawScore ?? point?.score);
    const trackingConfidence = provenance === PROVENANCE.OBSERVED_MODEL ? detectorConfidence
      : provenance === PROVENANCE.TEMPORAL_PREDICTION ? clamp(point?.trackingConfidence ?? point?.opacity) : 0;
    return Object.freeze({
      x: x == null || !(width > 0) ? null : x / width,
      y: y == null || !(height > 0) ? null : y / height,
      z: finiteOrNull(point?.z),
      visibility: finiteOrNull(point?.visibility),
      presence: finiteOrNull(point?.presence),
      detectorConfidence,
      trackingConfidence,
      provenance,
      authoritative: provenance === PROVENANCE.OBSERVED_MODEL
    });
  }
  function fromMoveNet(posePacket, options = {}) {
    const width = Number(posePacket?.video?.width || options.width || 0);
    const height = Number(posePacket?.video?.height || options.height || 0);
    const points = Array.isArray(posePacket?.keypoints) ? posePacket.keypoints : Array.isArray(posePacket?.pose?.keypoints) ? posePacket.pose.keypoints : [];
    const byName = Object.fromEntries(points.map((point, index) => [point?.name || point?.part || `keypoint_${index}`, landmark(point, width, height)]));
    for (const name of LEGACY_17) if (!byName[name]) byName[name] = landmark(null, width, height);
    const observedConfidences = Object.values(byName).filter(point => point.provenance === PROVENANCE.OBSERVED_MODEL).map(point => point.detectorConfidence);
    const detectorConfidence = Number.isFinite(Number(posePacket?.pose?.score ?? posePacket?.score)) ? clamp(posePacket?.pose?.score ?? posePacket?.score) : observedConfidences.length ? Math.min(...observedConfidences) : 0;
    return Object.freeze({
      schema: Object.freeze({ id: SCHEMA_ID, version: SCHEMA_VERSION }),
      frame: Object.freeze({ timestamp: Number(posePacket?.at || options.timestamp || Date.now()), width, height }),
      engine: Object.freeze({ id: 'tensorflow-js', version: String(options.engineVersion || '4.22.0') }),
      model: Object.freeze({ id: 'MoveNet.SinglePose.Lightning', version: String(options.modelVersion || '2.1.3'), detector: 'MoveNet' }),
      ruleset: Object.freeze({ id: RULESET_VERSION, version: 1 }),
      coordinates: Object.freeze({ space: 'image-normalized', origin: 'top-left', xAxis: 'image-right', yAxis: 'image-down', depth: 'unsupported' }),
      landmarks: Object.freeze(byName),
      confidence: Object.freeze({ detector: detectorConfidence, tracking: Number.isFinite(Number(options.trackingConfidence)) ? clamp(options.trackingConfidence) : detectorConfidence }),
      authority: Object.freeze({ scoringEligibleProvenance: Object.freeze([PROVENANCE.OBSERVED_MODEL]), derivedLandmarksArePresentationOnly: true })
    });
  }
  function validate(observation) {
    const fail = (boundary, detail) => Object.freeze({ ok: false, firstFailure: boundary, detail });
    if (!observation || typeof observation !== 'object') return fail('POSE_OBSERVATION_MISSING', 'PoseObservationV2 object is required.');
    if (observation.schema?.id !== SCHEMA_ID) return fail('POSE_SCHEMA_ID_INVALID', `Expected ${SCHEMA_ID}.`);
    if (observation.schema?.version !== SCHEMA_VERSION) return fail('POSE_SCHEMA_VERSION_UNSUPPORTED', `Expected schema version ${SCHEMA_VERSION}.`);
    if (!(observation.frame?.width > 0) || !(observation.frame?.height > 0)) return fail('POSE_FRAME_DIMENSIONS_INVALID', 'Positive frame width and height are required.');
    if (!observation.engine?.id) return fail('POSE_ENGINE_METADATA_MISSING', 'engine.id is required.');
    if (!observation.model?.id) return fail('POSE_MODEL_METADATA_MISSING', 'model.id is required.');
    if (!observation.ruleset?.id) return fail('POSE_RULESET_METADATA_MISSING', 'ruleset.id is required.');
    if (!observation.landmarks || typeof observation.landmarks !== 'object') return fail('POSE_LANDMARKS_MISSING', 'landmarks are required.');
    for (const [name, point] of Object.entries(observation.landmarks)) {
      if (!Object.values(PROVENANCE).includes(point?.provenance)) return fail('LANDMARK_PROVENANCE_INVALID', `${name} has invalid provenance.`);
      if (NON_AUTHORITATIVE.has(point.provenance) && point.authoritative === true) return fail('AUTHORITY_LEAKAGE', `${name} (${point.provenance}) cannot be authoritative.`);
    }
    return Object.freeze({ ok: true, firstFailure: 'NONE', detail: 'PoseObservationV2 contract valid.' });
  }
  function projectLegacy17(observation, options = {}) {
    const allowPresentationEvidence = options.purpose === 'presentation' || options.includeDerived === true;
    return Object.freeze(LEGACY_17.map(name => {
      const point = observation?.landmarks?.[name];
      const allowed = point && point.provenance !== PROVENANCE.LOST && (allowPresentationEvidence || point.provenance === PROVENANCE.OBSERVED_MODEL);
      return Object.freeze({ name, x: allowed && point.x != null ? point.x * observation.frame.width : null, y: allowed && point.y != null ? point.y * observation.frame.height : null, score: allowed ? point.detectorConfidence : 0, provenance: point?.provenance || PROVENANCE.LOST, authoritative: Boolean(allowed && point.provenance === PROVENANCE.OBSERVED_MODEL) });
    }));
  }
  function assertAuthoritativeProjection(points) {
    const leak = (points || []).find(point => point?.authoritative && NON_AUTHORITATIVE.has(point.provenance));
    return leak ? Object.freeze({ ok:false, firstFailure:'AUTHORITY_LEAKAGE', detail:`${leak.name || 'landmark'} uses ${leak.provenance}.` }) : Object.freeze({ ok:true, firstFailure:'NONE' });
  }
  return Object.freeze({ SCHEMA_ID, SCHEMA_VERSION, RULESET_VERSION, PROVENANCE, LEGACY_17, fromMoveNet, validate, projectLegacy17, assertAuthoritativeProjection });
});
