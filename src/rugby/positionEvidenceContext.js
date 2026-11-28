'use strict';
const profiles=require('../../data/rugby/full-xv-assessments/position-profiles.v1.json');
const assessments=require('../../data/rugby/full-xv-assessments/assessment-candidates.v1.json');
function buildPositionEvidenceContext(positions,priority,evidence){
 const selected=(priority.evidenceIds||[]).map(id=>evidence.find(e=>e.id===id)).filter(Boolean);
 const roles=['primary','secondary'].flatMap(role=>{
  const p=profiles.profiles.find(p=>p.number===positions?.[role]);if(!p)return [];
  const menu=new Set([...p.assessmentIds,...Object.values(p.alternatives||{}).flat()]);
  return [{role,number:p.number,name:p.name,demands:[...p.demands],roleAssignmentNote:p.roleAssignmentNote,domainAssessmentIds:assessments.protocols.filter(a=>menu.has(a.id)&&a.domain===priority.domain).map(a=>a.id),evidence:selected.map(e=>{
   const a=assessments.protocols.find(a=>e.protocol?.candidateId?a.id===e.protocol.candidateId&&a.version===e.protocol.candidateVersion:a.liveBuiltinId===e.protocol?.id&&a.liveBuiltinId!=null);
   return {evidenceId:e.id,assessmentId:a?.id||null,domainMatch:a?.domain===priority.domain,positionMenuMatch:!!a&&menu.has(a.id),recordedPosition:e.context?.position??null,positionContextMatch:e.context?.position==null?null:e.context.position===p.number};
  })}];
 });
 return {schemaVersion:1,profileVersion:profiles.version,assessmentVersion:assessments.version,roles,positionSource:positions?.source||null,positionReviewRequired:true,automaticWeighting:false,trainingAuthorized:false};
}
module.exports={buildPositionEvidenceContext};
