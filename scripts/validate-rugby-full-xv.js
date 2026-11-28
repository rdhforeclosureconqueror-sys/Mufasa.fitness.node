'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {getExercise}=require('../src/exercise-intelligence/exerciseCatalog');
const root=path.resolve(__dirname,'..');
function load(){
 const base=path.join(root,'data/rugby/full-xv-assessments');
 return Object.fromEntries(['position-profiles','assessment-candidates','development-links'].map(name=>[name,JSON.parse(fs.readFileSync(path.join(base,`${name}.v1.json`),'utf8'))]));
}
function validate(bundle=load()){
 const errors=[]; const check=(ok,message)=>{if(!ok)errors.push(message);};
 const profiles=bundle['position-profiles'], assessments=bundle['assessment-candidates'], development=bundle['development-links'];
 for(const [name,document] of Object.entries(bundle))check(document.version===1&&document.runtimeActivation===false&&document.status.startsWith('candidate'),`${name}: must remain versioned inactive candidate`);
 const protocols=new Map(assessments.protocols.map(p=>[p.id,p]));
 const sources=new Set(assessments.sources.map(s=>s.id));
 const domains=new Set(development.links.map(l=>l.domain));
 check(protocols.size===assessments.protocols.length,'duplicate protocol ID');
 check(domains.size===development.links.length,'duplicate development domain');
 const numbers=profiles.profiles.map(p=>p.number).sort((a,b)=>a-b);
 check(JSON.stringify(numbers)===JSON.stringify(Array.from({length:15},(_,i)=>i+1)),'must cover positions 1–15 exactly once');
 for(const profile of profiles.profiles){
  check(profile.unit===(profile.number<=8?'forwards':'backs'),`${profile.number}: wrong unit`);
  check(profile.selectionThresholds===null,`${profile.number}: unapproved selection threshold`);
  check(profile.demands.length>0&&!!profile.roleAssignmentNote,`${profile.number}: missing role context`);
  check(new Set(profile.assessmentIds).size===profile.assessmentIds.length,`${profile.number}: duplicate assessment`);
  for(const id of profile.assessmentIds)check(protocols.has(id),`${profile.number}: unknown assessment ${id}`);
  for(const id of profiles.commonAssessmentIds)check(profile.assessmentIds.includes(id),`${profile.number}: missing common assessment ${id}`);
  for(const [id,alternatives] of Object.entries(profile.alternatives)){
   check(profile.assessmentIds.includes(id),`${profile.number}: alternative has no primary`);
   for(const alternative of alternatives)check(protocols.has(alternative),`${profile.number}: unknown alternative ${alternative}`);
  }
 }
 const builtinIds=new Set(['sprint_10m','sprint_20m','agility_505_left','agility_505_right','ankle_knee_to_wall','overhead_squat']);
 const supportedUnits=new Set(['seconds','cm','m','kg','reps']);
 for(const p of protocols.values()){
  check(p.version===1&&p.status==='candidate'&&p.coachReviewRequired===true,`${p.id}: approval boundary`);
  check(domains.has(p.domain),`${p.id}: missing development domain`);
  check(p.sourceIds.length>0&&p.sourceIds.every(id=>sources.has(id)),`${p.id}: unknown or missing source`);
  check(p.liveBuiltinId===null||builtinIds.has(p.liveBuiltinId),`${p.id}: false builtin mapping`);
  check(p.procedure.length>30&&p.validityCriteria.length>0&&p.stopRule.length>30&&p.requiredSetup.includes('readiness'),`${p.id}: incomplete protocol context`);
  check(typeof p.contact==='boolean',`${p.id}: missing contact classification`);
  if(p.contact)check(['qualified_supervisor','contact_level','assigned_role','space','prerequisites_demonstrated'].every(key=>p.requiredSetup.includes(key)),`${p.id}: missing contact supervision/context`);
  check(p.mode==='physical'||p.mode==='observation',`${p.id}: invalid mode`);
  check(p.mode==='physical'?p.metrics.length>0:p.metrics.length===0,`${p.id}: physical/observation mismatch`);
  check(p.metrics.every(m=>m.id&&supportedUnits.has(m.unit)),`${p.id}: unsupported metric unit`);
 }
 for(const link of development.links){
  check(link.coachApprovalRequired===true&&link.automaticDose===false,`${link.domain}: automatic prescription`);
  check(link.question&&link.interpretation&&link.retest&&link.exerciseFamilies.length,`${link.domain}: missing development context`);
  for(const id of link.canonicalExerciseExamples)check(!!getExercise(id),`${link.domain}: unresolved exercise ${id}`);
 }
 const role=(n)=>profiles.profiles.find(p=>p.number===n)?.assessmentIds||[];
 check(role(9).includes('scrum_half_service'),'9: service assessment missing');
 check(role(2).includes('lineout_throw'),'2: throw assessment missing');
 check(role(8).includes('scrum_base_control'),'8: base assessment missing');
 for(let n=1;n<=8;n++)check(role(n).includes('scrum_role'),`${n}: scrum role missing`);
 return errors;
}
if(require.main===module){const errors=validate();if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('PASS: 15 positions, assessment/development references, exercise catalog and inactive candidate boundaries');}
module.exports={load,validate};
