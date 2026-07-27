#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {generateProfile,generateReview,generateTranslationSource,loadSource,validateGeneratedProfile} = require('./lib/exercise-profile-generator');

function writeIfChanged(file, content) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

function generateExercise(id, {dryRun=false,expectedFingerprint}={}) {
  const source = loadSource(id);
  if (expectedFingerprint && source.overrides.existingFingerprint !== expectedFingerprint) throw new Error(`Stale fingerprint: expected ${expectedFingerprint}, source guard is ${source.overrides.existingFingerprint}.`);
  const result = generateProfile(source);
  if (!result.validation.valid) throw new Error(JSON.stringify(result.validation,null,2));
  const generatedValidation = validateGeneratedProfile(result.profile);
  if (!generatedValidation.valid) throw new Error(JSON.stringify(generatedValidation,null,2));
  const outputDirectory = path.resolve(__dirname,'../generated/exercise-profiles',id);
  const artifacts = {
    profile:path.join(outputDirectory,'profile.generated.json'),
    review:path.join(outputDirectory,'review.generated.md'),
    translationSource:path.join(outputDirectory,'translation-source.generated.json')
  };
  const content = {
    profile:`${JSON.stringify(result.profile,null,2)}\n`,
    review:generateReview(result.profile),
    translationSource:`${JSON.stringify(generateTranslationSource(result.profile),null,2)}\n`
  };
  const changed = [];
  if (!dryRun) for (const key of Object.keys(artifacts)) if (writeIfChanged(artifacts[key],content[key])) changed.push(key);
  return {exerciseId:id,dryRun,outputDirectory,artifacts,changed,metadataFingerprint:result.profile.metadataFingerprint,validation:result.validation,generatedValidation};
}

if (require.main === module) {
  const id = process.argv.find(arg=>arg.startsWith('--exercise='))?.split('=')[1] || 'push_up';
  const dryRun = process.argv.includes('--dry-run');
  const expectedFingerprint = process.argv.find(arg=>arg.startsWith('--expected-fingerprint='))?.split('=')[1];
  console.log(JSON.stringify(generateExercise(id,{dryRun,expectedFingerprint}),null,2));
}

module.exports={generateExercise,writeIfChanged};
