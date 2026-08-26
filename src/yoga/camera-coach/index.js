'use strict';

const { normalizeLandmarks } = require('./landmarks');
const { evaluatePose } = require('./ruleEngine');

/** Provider adapter boundary: providers supply landmarks; Yoga remains camera-optional. */
function createCameraCoach({ landmarkProvider, ruleDefinitions, minimumConfidence = 0.5 }) {
  if (!landmarkProvider || typeof landmarkProvider.observe !== 'function') throw new TypeError('landmarkProvider.observe is required');
  return {
    async checkForm(poseId) {
      const providerFrame = await landmarkProvider.observe();
      const definition = ruleDefinitions.find((item) => item.poseId === poseId);
      if (!definition) throw new Error(`No rules configured for ${poseId}`);
      const landmarks = normalizeLandmarks(providerFrame.landmarks, providerFrame);
      return evaluatePose({ poseId, timestamp: providerFrame.timestamp, landmarks }, definition, { minimumConfidence });
    },
  };
}

module.exports = { createCameraCoach, normalizeLandmarks, evaluatePose };
