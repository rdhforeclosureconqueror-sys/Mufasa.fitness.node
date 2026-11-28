'use strict';
const profiles=require('../../data/rugby/full-xv-assessments/position-profiles.v1.json');
const assessments=require('../../data/rugby/full-xv-assessments/assessment-candidates.v1.json');
const states=['not_assessed','introduced','assisted','independent_controlled','independent_live','repeatable_under_pressure'];
function fail(message){const error=Error(message);error.status=400;throw error;}
const string=(value,min=1,max=500)=>typeof value==='string'&&value.trim().length>=min&&value.trim().length<=max;
function menu(){return structuredClone({positionProfiles:profiles.profiles,candidateAssessments:assessments.protocols});}
function binding(candidateId,localProcedure,actorId,at){
 const candidate=assessments.protocols.find(item=>item.id===candidateId);
 if(!candidate)fail('Unknown framework assessment');
 const entry={candidateId:candidate.id,candidateVersion:candidate.version,candidateSnapshot:structuredClone(candidate),captureOnly:true,criteriaApproved:false,localProcedureReview:{actorId,recordedAt:at,note:localProcedure},setup:candidate.procedure+' Local procedure: '+localProcedure};
 if(candidate.mode==='physical'){
  if(candidate.metrics.length!==1)fail('This assessment needs a separate multi-metric capture schema');
  Object.assign(entry,{category:'physical',unit:candidate.metrics[0].unit,metricId:candidate.metrics[0].id});
 }else if(candidate.id==='overhead_squat'){
  Object.assign(entry,{category:'movement',observationKeys:['squat_depth','arms_fall_forward','heels_lift','knees_collapse','torso_lean','hip_shift'],observationValues:{squat_depth:['not_assessed','described_in_notes']}});
 }else Object.assign(entry,{category:candidate.domain==='movement'?'movement':'rugby_skill',observationKeys:['development_state'],observationValues:{development_state:states}});
 return entry;
}
function positions(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['primary','secondary'].includes(key))||!Number.isInteger(input.primary)||input.primary<1||input.primary>15||!(input.secondary===null||Number.isInteger(input.secondary)&&input.secondary>=1&&input.secondary<=15&&input.secondary!==input.primary))fail('Choose a primary position and a different optional secondary position');
 return {primary:input.primary,secondary:input.secondary};
}
function context(protocol,input){
 if(!protocol.candidateId){if(input!==undefined)fail('Structured context requires a registered framework procedure');return undefined;}
 const skill=protocol.observationKeys?.includes('development_state'),contact=protocol.candidateSnapshot.contact;
 const common=['position','role','side','environment','pressure','readiness','conditions'];
 const skillFields=['prompts','behavior','decision','execution','outcome','clipRef'];
 const contactFields=['supervisor','supervision','contactLevel','space','prerequisites'];
 const keys=[...common,...(skill?skillFields:[]),...(contact?contactFields:[])];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!keys.includes(key)))fail('Complete the structured assessment context');
 if(!Number.isInteger(input.position)||input.position<1||input.position>15||!string(input.role,1,100)||!string(input.conditions,5,1000)||!['left','right','bilateral','not_applicable','unknown'].includes(input.side)||!['gym','field','training','match','simulator','other'].includes(input.environment)||!['unopposed','controlled','live','unknown'].includes(input.pressure)||!['fresh','normal','fatigued','pain','unknown'].includes(input.readiness))fail('Position, role, side, environment, pressure, readiness and conditions are required');
 if(skill&&(!['prompts','behavior','decision','execution','outcome'].every(key=>string(input[key]))||input.clipRef!==undefined&&!string(input.clipRef,0,300)))fail('Record prompts, factual behavior, decision, execution and outcome separately');
 if(contact&&(!string(input.supervisor,1,100)||!['qualified_reported','not_established'].includes(input.supervision)||!['no_contact','walkthrough','controlled','live','unknown'].includes(input.contactLevel)||!string(input.space,5,300)||!['demonstrated','not_demonstrated','not_assessed'].includes(input.prerequisites)))fail('Contact records need supervisor, supervision status, contact level, space and prerequisites');
 return Object.fromEntries(Object.entries(input).map(([key,value])=>[key,typeof value==='string'?value.trim():value]));
}
module.exports={menu,binding,positions,context};
