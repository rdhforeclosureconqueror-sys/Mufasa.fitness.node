"use strict";

const { haversineMeters } = require("./gpsEngine");

const SUSPICIOUS_MOVEMENT_THRESHOLDS = Object.freeze({
  minimumAcceptedSamples: 2,
  minimumSamplesForRatio: 20,
  maximumMovementRejectionRatio: 0.5,
  consecutiveImpossibleSamples: 3,
  repeatedLargeJumps: 3,
  teleportDistanceMeters: 1000
});
const MOVEMENT_REJECTIONS = new Set(["gps_jump", "impossible_speed", "implausible_movement"]);

function movementEvidence(samples = []) {
  let movementRejectedSamples=0, consecutive=0, maximumConsecutive=0, impossibleSpeedSamples=0;
  let consecutiveSpeed=0, maximumConsecutiveSpeed=0, largeJumpSamples=0, maximumObservedJumpMeters=0, prior=null;
  for (const sample of Array.isArray(samples)?samples:[]) {
    const reason=String(sample?.rejectionReason||""), movementRejected=sample?.accepted===false&&MOVEMENT_REJECTIONS.has(reason);
    if(movementRejected){movementRejectedSamples++;maximumConsecutive=Math.max(maximumConsecutive,++consecutive);}else if(reason!=="session_paused")consecutive=0;
    if(sample?.accepted===false&&reason==="impossible_speed"){impossibleSpeedSamples++;maximumConsecutiveSpeed=Math.max(maximumConsecutiveSpeed,++consecutiveSpeed);}else if(reason!=="session_paused")consecutiveSpeed=0;
    if(sample?.accepted===false&&reason==="gps_jump")largeJumpSamples++;
    const valid=Number.isFinite(Number(sample?.latitude))&&Number.isFinite(Number(sample?.longitude));
    if(valid&&prior&&movementRejected)maximumObservedJumpMeters=Math.max(maximumObservedJumpMeters,haversineMeters(prior,sample));
    if(valid)prior=sample;
  }
  return {movementRejectedSamples,maximumConsecutiveImplausibleSamples:maximumConsecutive,impossibleSpeedSamples,maximumConsecutiveImpossibleSpeedSamples:maximumConsecutiveSpeed,largeJumpSamples,maximumObservedJumpMeters};
}

function evaluateSuspiciousMovement({samples=[],acceptedSamples=0,rejectedSamples=0}={}) {
  const accepted=Math.max(0,Number(acceptedSamples)||0),rejected=Math.max(0,Number(rejectedSamples)||0),total=accepted+rejected;
  const evidence=movementEvidence(samples),movementRejectionRatio=total?evidence.movementRejectedSamples/total:0;
  const patterns={
    excessiveMovementRejectionRatio:total>=SUSPICIOUS_MOVEMENT_THRESHOLDS.minimumSamplesForRatio&&movementRejectionRatio>=SUSPICIOUS_MOVEMENT_THRESHOLDS.maximumMovementRejectionRatio,
    consecutiveImplausibleSamples:evidence.maximumConsecutiveImplausibleSamples>=SUSPICIOUS_MOVEMENT_THRESHOLDS.consecutiveImpossibleSamples,
    sustainedImpossibleSpeed:evidence.maximumConsecutiveImpossibleSpeedSamples>=SUSPICIOUS_MOVEMENT_THRESHOLDS.consecutiveImpossibleSamples,
    impossibleTeleport:evidence.maximumObservedJumpMeters>=SUSPICIOUS_MOVEMENT_THRESHOLDS.teleportDistanceMeters,
    repeatedLargeJumps:evidence.largeJumpSamples>=SUSPICIOUS_MOVEMENT_THRESHOLDS.repeatedLargeJumps
  };
  return {suspicious:Object.values(patterns).some(Boolean),patterns,evidence:{...evidence,acceptedSamples:accepted,rejectedSamples:rejected,totalSamples:total,movementRejectionRatio},thresholds:SUSPICIOUS_MOVEMENT_THRESHOLDS};
}

module.exports={SUSPICIOUS_MOVEMENT_THRESHOLDS,evaluateSuspiciousMovement};
