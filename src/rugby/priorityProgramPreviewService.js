'use strict';
const {generateProgram}=require('../program-engine/programGenerator');
const {buildPriorityProgramDraft}=require('./priorityProgramDraft');
// Internal composition only. The priority service performs verified admin authorization.
function createPriorityProgramPreviewService({priorityService,clock=()=>Date.now(),generator=generateProgram}){
 function preview(auth,athleteId,priorityId,input){
  const view=priorityService.view(auth,athleteId);
  const priority=view.priorities.find(p=>p.id===priorityId);
  if(!priority||priority.athleteId!==athleteId||priority.evidenceCurrent!==true||priority.currentReviewState!=='working_priority'||priority.priorityType==='needs_more_evidence')throw Error('Current actionable priority required');
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Explicit coach preview inputs required');
  const fields=['goal','experienceLevel','trainingDays','durationWeeks','sessionDuration','availableDays','equipment','limitations','preferredSplit'];
  if(Object.keys(input).some(k=>!fields.includes(k)))throw Error('Unsupported preview input');
  if(!['goal','experienceLevel','trainingDays','durationWeeks','sessionDuration','availableDays','equipment','limitations'].every(k=>Object.hasOwn(input,k)))throw Error('Explicit coach preview inputs required');
  if(!Array.isArray(input.availableDays)||!Array.isArray(input.equipment)||!Array.isArray(input.limitations))throw Error('Invalid preview constraints');
  const program=generator({...structuredClone(input),startDate:new Date(clock()).toISOString()},[]);
  return buildPriorityProgramDraft({athleteId,priorityView:view,priorityId,program});
 }
 return Object.freeze({preview});
}
module.exports={createPriorityProgramPreviewService};
