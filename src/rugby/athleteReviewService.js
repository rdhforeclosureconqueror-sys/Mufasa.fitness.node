'use strict';
const {currentEvidence}=require('./athleteEvidence');
const {validateAssessment}=require('./assessmentValidation');
const {defaultPolicy}=require('./beastModePolicy');
const {evaluateAthleteEligibility}=require('./athleteEligibility');
const {reviewCandidate}=require('./beastModeCandidateReview');
const {currentCapturedAssessments}=require('./assessmentCapture');

// Read-only adapter. Identities, measurements and safety come from server stores.
function createAthleteReviewService({userStore,authorizationResolver,now=()=>new Date().toISOString()}){
 function authorize(auth){
  if(!auth?.userId||auth.providerVerified!==true||auth.provider==='pilot_bypass'||auth.identityClass==='pilot_bypass'||!['admin','super_admin'].includes(authorizationResolver.resolveRole(auth).role))throw Error('Admin required');
 }
 const hasRugby=user=>Boolean(user.rugbyProfile)||Boolean(user.rugbyAssessmentPositions)||['rugbyAssessments','rugbyCheckins','rugbyEvidence','rugbyAssessmentRecords'].some(key=>Array.isArray(user[key])&&user[key].length);
 const label=user=>({athleteId:user.userId,name:String(user.displayName||user.name||user.userId).slice(0,120)});
 function list(auth){authorize(auth);return userStore.listUsers().filter(hasRugby).map(label);}
 function read(auth,athleteId,stageId){
  authorize(auth);
  if(typeof athleteId!=='string'||!athleteId||!/^BM-0[1-7]$/.test(stageId))throw Error('Invalid review selection');
  const user=userStore.listUsers().find(user=>user.userId===athleteId&&hasRugby(user));
  if(!user)throw Error('Athlete unavailable');
  const at=now(),today=at.slice(0,10),policy=defaultPolicy(),stage=policy.stages.find(stage=>stage.id===stageId);
  const rawHistory=user.rugbyEvidence||[];
  const ids=new Set();
  const validTime=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
  if(!Array.isArray(rawHistory))throw Error('Invalid evidence history');
  for(const event of rawHistory){
   if(!event||typeof event.eventId!=='string'||!event.eventId||ids.has(event.eventId)||!validTime(event.occurredAt)||!validTime(event.recordedAt)||Date.parse(event.occurredAt)>Date.parse(event.recordedAt)||Date.parse(event.recordedAt)>Date.parse(at))throw Error('Invalid evidence history');
   ids.add(event.eventId);
  }
  const history=currentEvidence(rawHistory,athleteId);
  const assessments=history.filter(event=>event.eventType==='assessment_recorded').map(event=>{
   const raw=(user.rugbyAssessments||[]).find(item=>'assessment:'+item.id===event.sourceRef);
   let measurement=null;
   try{if(raw){const item=validateAssessment(raw);if(item.date===event.occurredAt.slice(0,10))measurement=item;}}catch{/* Broken links remain visible as unavailable. */}
   const reviews=history.filter(review=>review.eventType==='coach_reviewed'&&review.sourceRef==='evidence:'+event.eventId&&review.verificationStatus==='coach_reviewed'&&typeof review.assessorId==='string'&&review.assessorId&&review.assessorId!==athleteId&&Date.parse(review.recordedAt)>=Date.parse(event.recordedAt));
   return {eventId:event.eventId,measurement,review:reviews.length===1?reviews[0].finding:'unverified'};
  });
  const safety=evaluateAthleteEligibility(user,athleteId,today,undefined);
  const developmentAssessments=currentCapturedAssessments(user,athleteId);
  // Candidate criteria are descriptive. Existing writer only verifies assessments;
  // other event types cannot become trusted competencies by asserting a flag.
  const candidate=reviewCandidate(stageId,[],{athleteId,today,policy});
  const gaps=[
   'Current Beast Mode stage has not been assigned through a saved development workflow.',
   'Stage criteria shown here are candidate requirements; policy publication is not connected.',
   'Movement and physical assessment capture is active. Stage-specific scoring and approval are still required.',
   'A versioned programme with planned versus completed sessions is not connected.',
   'Rugby field-transfer observations and a comparable baseline/retest review are not connected.'
  ];
  if(!developmentAssessments.some(item=>item.protocol.category==='movement'))gaps.unshift('Record movement observations, such as the overhead squat screen.');
  if(!developmentAssessments.some(item=>item.protocol.category==='physical')&&!assessments.some(item=>item.measurement))gaps.unshift('Record physical test results from an assessment or combine.');
  if(!assessments.some(item=>item.measurement&&item.review==='confirmed'))gaps.unshift('Assessment capture does not establish independent verification. Arrange a coach review.');
  if(developmentAssessments.some(item=>item.pain===true||item.context?.readiness==='pain'))gaps.unshift('An assessment records pain. Review that finding before training progression.');
  const summary=safety.readiness.status==='REFER'?'Reported pain or injury needs appropriate review before progression.':'Assessment review is active. Progression needs the evidence and approvals listed below.';
  return {athlete:label(user),positions:structuredClone(user.rugbyAssessmentPositions||{primary:null,secondary:null}),reviewActive:true,reviewedAt:at,reviewTargetStage:stageId,assignedStage:null,criteria:{...stage,approved:false},assessments,developmentAssessments,legacyAssessmentCount:Math.max(0,(user.rugbyAssessments||[]).length-assessments.filter(item=>item.measurement).length),readiness:safety.readiness,eligibility:safety.eligibility,candidate,gaps,summary,stageChangeAuthorized:false};
 }
 return {list,read};
}
module.exports={createAthleteReviewService};
