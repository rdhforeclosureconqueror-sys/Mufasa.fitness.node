(function initPocketPTPoseStability(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTPoseStability = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function poseStabilityFactory() {
  'use strict';

  const MOVENET_NAMES = Object.freeze([
    'nose','left_eye','right_eye','left_ear','right_ear',
    'left_shoulder','right_shoulder','left_elbow','right_elbow','left_wrist','right_wrist',
    'left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle'
  ]);

  const DEFAULTS = Object.freeze({
    confidenceFloor: 0.18,
    confidenceTrust: 0.62,
    minAlpha: 0.18,
    maxAlpha: 0.78,
    velocityForMaxAlphaPxPerSecond: 900,
    velocitySmoothing: 0.35,
    maxJumpPxPerSecond: 1800,
    minimumJumpAllowancePx: 32,
    maxCoastMs: 180,
    coastConfidenceDecay: 0.72,
    defaultFrameMs: 1000 / 30
  });

  const finite = value => Number.isFinite(Number(value));
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const lerp = (from, to, alpha) => from + (to - from) * alpha;

  function pointName(point, index) {
    return point?.name || point?.part || MOVENET_NAMES[index] || `point_${index}`;
  }

  function resolveTimestamp(packet, explicit, lastTimestamp, defaultFrameMs) {
    const candidates = [explicit, packet?.timestampMs, packet?.timestamp, packet?.time];
    for (const candidate of candidates) {
      const value = Number(candidate);
      if (Number.isFinite(value)) return value;
    }
    return lastTimestamp == null ? 0 : lastTimestamp + defaultFrameMs;
  }

  function createPoseStabilizer(options = {}) {
    const config = { ...DEFAULTS, ...options };
    const states = new Map();
    let lastTimestamp = null;
    let frameCount = 0;
    let totals = { accepted: 0, smoothed: 0, coasted: 0, clamped: 0, dropped: 0 };

    function reset() {
      states.clear();
      lastTimestamp = null;
      frameCount = 0;
      totals = { accepted: 0, smoothed: 0, coasted: 0, clamped: 0, dropped: 0 };
    }

    function diagnostics() {
      return {
        frameCount,
        trackedPoints: states.size,
        ...totals,
        lastTimestamp
      };
    }

    function process(posePacket, timestampMs) {
      const input = Array.isArray(posePacket?.keypoints) ? posePacket.keypoints : [];
      const resolvedNow = resolveTimestamp(posePacket, timestampMs, lastTimestamp, config.defaultFrameMs);
      // Internal time must never move backward. A restarted source/session should
      // reset the stabilizer, but a malformed/repeated frame timestamp must not
      // extend coasting windows or create negative pose ages.
      const now = lastTimestamp == null ? resolvedNow : Math.max(resolvedNow, lastTimestamp + 1);
      const frameDtMs = lastTimestamp == null ? config.defaultFrameMs : clamp(now - lastTimestamp, 1, 250);
      lastTimestamp = now;
      frameCount += 1;

      const frameStats = { accepted: 0, smoothed: 0, coasted: 0, clamped: 0, dropped: 0 };
      const output = input.map((raw, index) => {
        const name = pointName(raw, index);
        const confidence = clamp(Number(raw?.score ?? raw?.confidence ?? 0) || 0, 0, 1);
        const hasPosition = finite(raw?.x) && finite(raw?.y);
        const previous = states.get(name);

        if (!hasPosition || confidence < config.confidenceFloor) {
          if (previous && now - previous.lastTrustedAt <= config.maxCoastMs) {
            const dtSeconds = frameDtMs / 1000;
            const coasted = {
              ...raw,
              name,
              x: previous.x + previous.vx * dtSeconds,
              y: previous.y + previous.vy * dtSeconds,
              score: Math.max(confidence, previous.confidence * config.coastConfidenceDecay),
              confidence: Math.max(confidence, previous.confidence * config.coastConfidenceDecay),
              rawConfidence: confidence,
              stabilityState: 'coasted',
              stabilityCoastAgeMs: now - previous.lastTrustedAt
            };
            previous.x = coasted.x;
            previous.y = coasted.y;
            previous.confidence = coasted.score;
            previous.lastOutputAt = now;
            states.set(name, previous);
            frameStats.coasted += 1;
            return coasted;
          }
          frameStats.dropped += 1;
          return {
            ...raw,
            name,
            x: undefined,
            y: undefined,
            score: 0,
            confidence: 0,
            rawConfidence: confidence,
            stabilityState: 'dropped'
          };
        }

        const measuredX = Number(raw.x);
        const measuredY = Number(raw.y);
        if (!previous) {
          states.set(name, {
            x: measuredX,
            y: measuredY,
            vx: 0,
            vy: 0,
            confidence,
            lastTrustedAt: now,
            lastOutputAt: now
          });
          frameStats.accepted += 1;
          return {
            ...raw,
            name,
            x: measuredX,
            y: measuredY,
            score: confidence,
            confidence,
            rawConfidence: confidence,
            stabilityState: 'accepted',
            stabilityAlpha: 1,
            stabilityDisplacementPx: 0
          };
        }

        const dtSeconds = frameDtMs / 1000;
        const dx = measuredX - previous.x;
        const dy = measuredY - previous.y;
        const distance = Math.hypot(dx, dy);
        const observedSpeed = distance / Math.max(dtSeconds, 0.001);
        const maxJump = Math.max(config.minimumJumpAllowancePx, config.maxJumpPxPerSecond * dtSeconds);
        let targetX = measuredX;
        let targetY = measuredY;
        let wasClamped = false;

        if (distance > maxJump) {
          const ratio = maxJump / Math.max(distance, 0.0001);
          targetX = previous.x + dx * ratio;
          targetY = previous.y + dy * ratio;
          wasClamped = true;
          frameStats.clamped += 1;
        }

        const confidenceWeight = clamp(
          (confidence - config.confidenceFloor) / Math.max(0.0001, config.confidenceTrust - config.confidenceFloor),
          0,
          1
        );
        const velocityWeight = clamp(observedSpeed / config.velocityForMaxAlphaPxPerSecond, 0, 1);
        // The previous formula max(confidenceWeight, velocityWeight * confidenceWeight)
        // collapsed algebraically to confidenceWeight because velocityWeight <= 1.
        // This confidence-gated boost allows deliberate speed to increase response
        // without letting a low-confidence high-velocity outlier become authoritative.
        const responsiveness = clamp(
          confidenceWeight + velocityWeight * confidenceWeight * (1 - confidenceWeight),
          0,
          1
        );
        const alpha = lerp(config.minAlpha, config.maxAlpha, responsiveness);
        const nextX = lerp(previous.x, targetX, alpha);
        const nextY = lerp(previous.y, targetY, alpha);
        const measuredVx = (nextX - previous.x) / Math.max(dtSeconds, 0.001);
        const measuredVy = (nextY - previous.y) / Math.max(dtSeconds, 0.001);
        const nextVx = lerp(previous.vx, measuredVx, config.velocitySmoothing);
        const nextVy = lerp(previous.vy, measuredVy, config.velocitySmoothing);

        states.set(name, {
          x: nextX,
          y: nextY,
          vx: nextVx,
          vy: nextVy,
          confidence,
          lastTrustedAt: now,
          lastOutputAt: now
        });
        frameStats.smoothed += 1;
        return {
          ...raw,
          name,
          x: nextX,
          y: nextY,
          score: confidence,
          confidence,
          rawConfidence: confidence,
          stabilityState: wasClamped ? 'clamped_smoothed' : 'smoothed',
          stabilityAlpha: alpha,
          stabilityDisplacementPx: distance,
          stabilityMaxJumpPx: maxJump,
          stabilityObservedSpeedPxPerSecond: observedSpeed
        };
      });

      for (const key of Object.keys(frameStats)) totals[key] += frameStats[key];
      return {
        ...posePacket,
        keypoints: output,
        timestampMs: now,
        stability: {
          version: 2,
          frame: frameCount,
          frameStats,
          trackedPoints: states.size
        }
      };
    }

    return Object.freeze({ process, reset, diagnostics, config: Object.freeze({ ...config }) });
  }

  return Object.freeze({ MOVENET_NAMES, DEFAULTS, createPoseStabilizer });
});
