#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const metadata = require('../public/exercise-metadata.js');

const OUTPUT = path.resolve(__dirname, '../reports/exercise-metadata-review.json');
const REVIEW_FIELDS = Object.freeze({reviewerName:null,reviewerCredential:null,reviewedAt:null,decision:null,comments:null});
const LIMITATIONS = Object.freeze({
  dead_bug:['Automated form judgment is unsupported; the current measurement set cannot establish torso stability, pelvic control, or opposite-limb coordination.'],
  cat_cow:['Automated form judgment is unsupported; MoveNet has no detailed spinal segmentation for precise curvature assessment.'],
  push_up:['A two-dimensional shoulder–hip–ankle angle cannot assess wrist comfort, pain, elbow angle, depth, or full three-dimensional alignment.'],
  bodyweight_squat:['The current shoulder–hip–ankle angle does not measure squat depth, knee tracking, or torso position independently, especially from an unsuitable view.'],
  squat:['The current shoulder–hip–ankle angle does not measure squat depth, knee tracking, load, or torso position independently.'],
  dumbbell_bicep_curl:['Automated form judgment is unsupported; elbow position, shoulder movement, and curl range are not implemented and weights may occlude landmarks.'],
  side_bridge:['A two-dimensional shoulder–hip–ankle angle is unreliable when the lower body is obscured and cannot establish three-dimensional alignment.']
});

function fingerprint(profile) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(profile)).digest('hex')}`;
}

function buildReviewExport(profiles=metadata.profiles) {
  return {
    exportVersion:1,
    metadataAssetVersion:metadata.ASSET_VERSION,
    profiles:profiles.map(profile=>({
      exerciseId:profile.exerciseId,
      displayName:profile.displayName,
      schemaVersion:profile.schemaVersion,
      profileVersion:profile.profileVersion,
      approvalStatus:profile.approval.status,
      metadataFingerprint:fingerprint(profile),
      instructions:JSON.parse(JSON.stringify(profile.instruction)),
      cadence:JSON.parse(JSON.stringify(profile.cadence)),
      phrases:JSON.parse(JSON.stringify(profile.phrases)),
      poseAnalysis:JSON.parse(JSON.stringify(profile.poseAnalysis)),
      cameraGuidance:profile.cameraGuidance||null,
      automatedAnalysisScope:profile.automatedAnalysisScope||null,
      limitations:[...(profile.limitations||LIMITATIONS[profile.exerciseId]||[])],
      reviewFields:{...REVIEW_FIELDS}
    }))
  };
}

function serializeReviewExport(value=buildReviewExport()) { return `${JSON.stringify(value,null,2)}\n`; }
function writeReviewExport(output=OUTPUT) { fs.writeFileSync(output,serializeReviewExport(),'utf8'); return output; }

if(require.main===module) console.log(`Exercise metadata review export: ${writeReviewExport()}`);
module.exports={OUTPUT,REVIEW_FIELDS,LIMITATIONS,fingerprint,buildReviewExport,serializeReviewExport,writeReviewExport};
