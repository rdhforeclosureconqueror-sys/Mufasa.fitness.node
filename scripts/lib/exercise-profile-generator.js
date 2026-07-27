'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const RULES = require('../../exercise-generation/rules.json');
const SOURCE_SCHEMA = require('../../exercise-generation/schema.json');
const GENERATED_NOTICE = 'GENERATED FILE — DO NOT EDIT; edit the exercise source or controlled rules.';

const clone = value => JSON.parse(JSON.stringify(value));
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const hash = value => `sha256:${crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex')}`;
const withoutTimestamps = value => {
  if (Array.isArray(value)) return value.map(withoutTimestamps);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key])=>!['generatedAt','createdAt','updatedAt','timestamp'].includes(key)).map(([key,item])=>[key,withoutTimestamps(item)]));
  return value;
};
const issue = (severity, code, pathName, message) => ({severity, code, path:pathName, message});

function validateSource(source) {
  const errors = [];
  for (const key of SOURCE_SCHEMA.required) if (source?.[key] === undefined) errors.push(issue('blocking_error', 'SOURCE_REQUIRED', key, `${key} is required.`));
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(source?.exerciseId || '')) errors.push(issue('blocking_error', 'INVALID_EXERCISE_ID', 'exerciseId', 'exerciseId must be canonical lowercase underscore text.'));
  if (source?.schemaVersion !== 1) errors.push(issue('blocking_error', 'UNSUPPORTED_SOURCE_SCHEMA', 'schemaVersion', 'Only source schema version 1 is supported.'));
  if (!Number.isInteger(source?.sourceVersion) || source.sourceVersion < 1) errors.push(issue('blocking_error', 'INVALID_SOURCE_VERSION', 'sourceVersion', 'sourceVersion must be a positive integer.'));
  for (const key of ['movementPatterns','equipment','cameraCandidates','candidateMeasurements','unsupportedAssessments','trainerReviewRequirements']) if (!Array.isArray(source?.[key]) || source[key].length === 0) errors.push(issue('blocking_error', 'INVALID_SOURCE_ARRAY', key, `${key} must be a non-empty array.`));
  for (const key of ['phaseOne','hold','phaseTwo']) if (!source?.phases?.[key]) errors.push(issue('blocking_error', 'MISSING_PHASE', `phases.${key}`, `${key} is required.`));
  if (!source?.overrides || typeof source.overrides !== 'object' || Array.isArray(source.overrides)) errors.push(issue('blocking_error', 'INVALID_OVERRIDES', 'overrides', 'overrides must be an object.'));
  return errors;
}

function mergeLayer(target, provenance, layer, name, conflicts) {
  for (const [key, value] of Object.entries(layer || {})) {
    if (target[key] !== undefined && JSON.stringify(target[key]) !== JSON.stringify(value) && !name.startsWith('exercise.')) {
      conflicts.push(issue('blocking_error', 'INHERITANCE_CONFLICT', key, `${provenance[key]} conflicts with ${name}.`));
      continue;
    }
    target[key] = clone(value);
    provenance[key] = name;
  }
}

function generateProfile(source, rules = RULES) {
  const errors = validateSource(source), warnings = [], resolved = {}, resolvedFrom = {}, conflicts = [];
  mergeLayer(resolved, resolvedFrom, rules.defaults.global, 'defaults.global', conflicts);
  for (const equipment of source.equipment || []) mergeLayer(resolved, resolvedFrom, rules.defaults.equipment[equipment], `defaults.equipment.${equipment}`, conflicts);
  mergeLayer(resolved, resolvedFrom, rules.defaults.families[source.exerciseFamily], `families.${source.exerciseFamily}`, conflicts);
  mergeLayer(resolved, resolvedFrom, rules.defaults.bodyPositions[source.bodyPosition], `bodyPositions.${source.bodyPosition}`, conflicts);
  mergeLayer(resolved, resolvedFrom, source.overrides?.instruction, `exercise.${source.exerciseId}`, conflicts);
  errors.push(...conflicts);

  const capability = rules.capabilities.find(item => item.capabilityId === source.overrides?.poseCapabilityId && item.exerciseIds.includes(source.exerciseId));
  if (source.overrides?.poseCapabilityId && !capability) errors.push(issue('blocking_error', 'NO_EXERCISE_CAPABILITY', 'overrides.poseCapabilityId', 'Capability is not explicitly scoped to this exercise.'));
  const thresholds = capability && rules.thresholdProfiles[capability.thresholdProfileId];
  if (capability && !thresholds) errors.push(issue('blocking_error', 'MISSING_THRESHOLD_PROFILE', 'poseCapability.thresholdProfileId', 'Capability threshold profile does not exist.'));
  const phrases = source.overrides?.phrases || {};
  const analysis = capability && thresholds ? {
    supported:true,
    capabilityId:capability.capabilityId,
    validationStatus:capability.validationStatus,
    requiredView:capability.view,
    minimumUsableFramePercentage:thresholds.minimumUsableFramePercentage,
    minimumOverallConfidence:thresholds.minimumOverallConfidence,
    rules:[{
      id:'body_alignment', type:'alignment_deviation', measurement:capability.measurement,
      landmarks:clone(capability.requiredLandmarks), thresholds:{maximumDeviationDegrees:thresholds.maximumDeviationDegrees},
      minimumLandmarkConfidence:thresholds.minimumLandmarkConfidence,
      minimumAffectedFramePercentage:thresholds.minimumAffectedFramePercentage,
      minimumConsecutiveDurationMs:thresholds.minimumConsecutiveDurationMs, priority:1,
      feedback:{good:`${source.exerciseId}_form_positive_1`,needsAttention:`${source.exerciseId}_form_corrective_1`,uncertain:`${source.exerciseId}_form_uncertain_1`}
    }]
  } : {supported:false, reasonCode:'no_validated_capability', requiredView:'not_supported', rules:[]};
  const hasAnalysis = analysis.supported;
  const profile = {
    generatedNotice:GENERATED_NOTICE,
    exerciseId:source.exerciseId, displayName:source.displayName, schemaVersion:source.schemaVersion,
    sourceVersion:source.sourceVersion, profileVersion:2, generatorVersion:rules.versions.generator,
    taxonomyVersion:rules.versions.taxonomy, templateVersion:rules.versions.templates,
    capabilityRegistryVersion:rules.versions.capabilities, approvalStatus:'draft', humanReviewStatus:'pending', translationStatus:'pending',
    instructions:{setupCues:resolved.setupCues || [],movementCues:resolved.movementCues || [],safetyCues:resolved.safetyCues || []},
    cadence:resolved.cadence || {},
    phrases:{
      encouragement:(phrases.encouragement || []).map((template,index)=>({id:`${source.exerciseId}_encouragement_${index+1}`,template,supportsName:false})),
      positiveForm:hasAnalysis&&phrases.positiveForm?[{id:`${source.exerciseId}_form_positive_1`,template:phrases.positiveForm,supportsName:false}]:[],
      correctiveForm:hasAnalysis&&phrases.correctiveForm?[{id:`${source.exerciseId}_form_corrective_1`,template:phrases.correctiveForm,supportsName:false}]:[],
      uncertainForm:hasAnalysis&&phrases.uncertainForm?[{id:`${source.exerciseId}_form_uncertain_1`,template:phrases.uncertainForm,supportsName:false}]:[],
      completion:[{id:`${source.exerciseId}_completion_1`,template:resolved.completion,supportsName:false}],
      recovery:[{id:`${source.exerciseId}_recovery_1`,template:resolved.recovery,supportsName:false}]
    },
    camera:{requiredView:analysis.requiredView,guidance:source.overrides?.camera?.guidance || null},
    automatedAnalysisScope:hasAnalysis?'Automated assessment evaluates shoulder–hip–ankle body alignment only.':'Automated form analysis is not supported.',
    automatedFormAnalysis:analysis,
    limitations:hasAnalysis?['A two-dimensional shoulder–hip–ankle angle cannot assess wrist comfort, pain, elbow angle, depth, or full three-dimensional alignment.','Camera placement, lighting, landmark occlusion, and incomplete body visibility may reduce pose-estimation reliability.']:['Automated form analysis is unsupported; coaching cues are not automated findings.'],
    unsupportedAssessments:clone(source.unsupportedAssessments), resolvedFrom
  };
  profile.metadataFingerprint = hash(withoutTimestamps({source,rules,behaviorVersion:rules.versions.generator}));

  const evaluatedText = [...profile.phrases.positiveForm,...profile.phrases.correctiveForm].map(item=>item.template.toLowerCase()).join(' ');
  for (const unsupported of source.unsupportedAssessments || []) if (evaluatedText.includes(unsupported.replaceAll('_',' '))) errors.push(issue('blocking_error', 'UNSUPPORTED_FEEDBACK_CLAIM', 'phrases', `Feedback claims unsupported assessment ${unsupported}.`));
  if (/prevent injury|injury prevention|diagnos/i.test(profile.instructions.safetyCues.join(' '))) errors.push(issue('blocking_error', 'MEDICAL_SAFETY_CLAIM', 'instructions.safetyCues', 'Safety wording contains a prohibited claim.'));
  if (capability?.validationStatus !== 'validated' && capability) warnings.push(issue('trainer_review_warning', 'CAPABILITY_REQUIRES_TRAINER_REVIEW', 'automatedFormAnalysis', 'Capability is not trainer validated.'));
  return {profile,validation:{valid:errors.length===0,errors,warnings,conflicts}};
}

function validateGeneratedProfile(profile) {
  const errors = [];
  for (const key of ['generatedNotice','exerciseId','schemaVersion','sourceVersion','profileVersion','generatorVersion','metadataFingerprint','approvalStatus','instructions','cadence','phrases','camera','automatedFormAnalysis','limitations','resolvedFrom']) if (profile?.[key] === undefined) errors.push(issue('blocking_error','GENERATED_REQUIRED',key,`${key} is required.`));
  if (profile?.approvalStatus !== 'draft' || profile?.humanReviewStatus !== 'pending' || profile?.translationStatus !== 'pending') errors.push(issue('blocking_error','UNAUTHORIZED_WORKFLOW_STATE','approvalStatus','Generated workflow fields must remain draft/pending.'));
  if ('approved' in (profile || {}) || 'publicationStatus' in (profile || {})) errors.push(issue('blocking_error','UNAUTHORIZED_APPROVAL_FIELD','', 'Generated profile contains an authorization field.'));
  const ids = new Set(); for (const pool of Object.values(profile?.phrases || {})) for (const phrase of pool) {if(ids.has(phrase.id)) errors.push(issue('blocking_error','DUPLICATE_PHRASE_ID',phrase.id,'Phrase IDs must be unique.'));ids.add(phrase.id);}
  return {valid:errors.length===0,errors,warnings:[]};
}

function generateReview(profile) {
  return `${GENERATED_NOTICE}\n\n# Exercise Review: ${profile.displayName}\n\n- Exercise ID: ${profile.exerciseId}\n- Profile version: ${profile.profileVersion}\n- Fingerprint: ${profile.metadataFingerprint}\n- Status: ${profile.approvalStatus}; human review ${profile.humanReviewStatus}; translation ${profile.translationStatus}\n\n## Setup\n\n${profile.instructions.setupCues.map(c=>`- ${c}`).join('\n')}\n\n## Movement\n\n${profile.instructions.movementCues.map(c=>`- ${c}`).join('\n')}\n\n## Safety\n\n${profile.instructions.safetyCues.map(c=>`- ${c}`).join('\n')}\n\n## Camera\n\n- Required view: ${profile.camera.requiredView}\n- ${profile.camera.guidance || 'No exercise-specific camera guidance.'}\n\n## Automated Analysis\n\n${profile.automatedAnalysisScope}\n\n## Limitations\n\n${profile.limitations.map(c=>`- ${c}`).join('\n')}\n\nThis generated review cannot approve or publish exercise metadata.\n`;
}

function generateTranslationSource(profile) {
  return {generatedNotice:GENERATED_NOTICE,translationSchemaVersion:1,sourceLocale:'en-US',exerciseId:profile.exerciseId,profileVersion:profile.profileVersion,metadataFingerprint:profile.metadataFingerprint,status:'draft_pending_human_approval',sourceContent:{displayName:profile.displayName,setupCues:clone(profile.instructions.setupCues),movementCues:clone(profile.instructions.movementCues),safetyCues:clone(profile.instructions.safetyCues),cadence:clone(profile.cadence),phrases:clone(profile.phrases)},protectedMeaning:{phraseIdsMustNotChange:true,placeholdersMustBePreserved:true,uncertaintyMustNotBecomeCertainty:true,safetyMeaningMustNotWeaken:true}};
}

function loadSource(id) {return JSON.parse(fs.readFileSync(path.join(ROOT,'exercise-generation/sources',`${id}.json`),'utf8'));}
module.exports={RULES,SOURCE_SCHEMA,GENERATED_NOTICE,stable,hash,withoutTimestamps,validateSource,generateProfile,validateGeneratedProfile,generateReview,generateTranslationSource,loadSource};
