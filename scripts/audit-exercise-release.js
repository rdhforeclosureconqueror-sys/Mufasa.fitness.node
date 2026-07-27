#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const metadata=require('../public/exercise-metadata.js');
const generator=require('./lib/exercise-profile-generator');

const root=path.resolve(__dirname,'..'),sourceDirectory=path.join(root,'exercise-generation/sources');
const checks=[];const add=(name,pass,details)=>checks.push({name,status:pass?'PASS':'FAIL',details});
const sources=fs.readdirSync(sourceDirectory).filter(file=>file.endsWith('.json')).map(file=>generator.loadSource(path.basename(file,'.json')));
for(const source of sources)add(`source-schema:${source.exerciseId}`,generator.validateSource(source).length===0,generator.validateSource(source));
add('duplicate-source-ids',new Set(sources.map(source=>source.exerciseId)).size===sources.length,{count:sources.length});
const generated=generator.generateProfile(generator.loadSource('push_up'));
add('source-integrity',generated.validation.valid,generated.validation);
add('generated-profile-schema',generator.validateGeneratedProfile(generated.profile).valid,generator.validateGeneratedProfile(generated.profile));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'exercise-review/manifest.json'),'utf8'));
const missingManifestPaths=manifest.exercises.filter(item=>!fs.existsSync(path.join(root,'exercise-review',item.path,'profile.json'))).map(item=>item.exerciseId);
add('manifest-references',missingManifestPaths.length===0,{missing:missingManifestPaths});
const runtimeIds=metadata.profiles.map(profile=>profile.exerciseId);add('duplicate-runtime-ids',new Set(runtimeIds).size===runtimeIds.length,{count:runtimeIds.length});
const phraseIds=Object.values(generated.profile.phrases).flat().map(item=>item.id);add('phrase-id-integrity',new Set(phraseIds).size===phraseIds.length&&phraseIds.every(id=>id.startsWith('push_up_')),{count:phraseIds.length});
const translation=generator.generateTranslationSource(generated.profile);const translatedPhraseIds=Object.values(translation.sourceContent.phrases).flat().map(item=>item.id);add('localization-key-integrity',JSON.stringify(phraseIds)===JSON.stringify(translatedPhraseIds),{count:translatedPhraseIds.length});
add('unauthorized-approval-detection',generated.profile.approvalStatus==='draft'&&generated.profile.humanReviewStatus==='pending'&&generated.profile.translationStatus==='pending'&&!('publicationStatus'in generated.profile),{});
const baseline={measurement:'alignment_deviation',requiredView:'side',landmarks:['shoulder','hip','ankle'],maximumDeviationDegrees:18,minimumLandmarkConfidence:.75,minimumAffectedFramePercentage:35,minimumConsecutiveDurationMs:500,minimumUsableFramePercentage:60,minimumOverallConfidence:.75};
const analysis=generated.profile.automatedFormAnalysis,rule=analysis.rules[0];const current={measurement:rule.measurement,requiredView:analysis.requiredView,landmarks:rule.landmarks,maximumDeviationDegrees:rule.thresholds.maximumDeviationDegrees,minimumLandmarkConfidence:rule.minimumLandmarkConfidence,minimumAffectedFramePercentage:rule.minimumAffectedFramePercentage,minimumConsecutiveDurationMs:rule.minimumConsecutiveDurationMs,minimumUsableFramePercentage:analysis.minimumUsableFramePercentage,minimumOverallConfidence:analysis.minimumOverallConfidence};
const forbidden=['elbow_angle','elbow_flare','wrist_position','wrist_comfort','depth','pain','scapular_movement','neck_position','head_position','three_dimensional_alignment'];const measurements=analysis.rules.map(item=>item.measurement);
add('push-up-pose-logic',JSON.stringify(current)===JSON.stringify(baseline)&&forbidden.every(item=>!measurements.includes(item)),{baseline,current,forbiddenMeasurementsPresent:forbidden.filter(item=>measurements.includes(item))});
const result={status:checks.every(check=>check.status==='PASS')?'PASS':'FAIL',checks};console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='PASS'?0:1;
