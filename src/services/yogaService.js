"use strict";
const crypto=require("crypto");
const { ApiError }=require("../lib/apiResponse");
function boundedText(v,n=128){return typeof v==="string"&&v.length>0&&v.length<=n;}
function createYogaService({userStore,poses,sessions,movementDefinitions=[],eventService=null,onCommitted=null,clock=Date.now}){
 const poseMap=new Map(poses.map(p=>[p.id,p])),sessionMap=new Map(sessions.map(s=>[s.id,s]));
 function catalogue(){return {poses:poses.map(({expectedAngles,commonFaults,...publicPose})=>publicPose),sessions,movementDefinitions};}
 function sessionDetail(sessionId){
  const session=sessionMap.get(sessionId);
  if(!session)throw new ApiError("YOGA_SESSION_NOT_FOUND","Yoga session not found",404);
  return {...session,steps:session.poses.map((step,index)=>{
   const pose=poseMap.get(step.poseId);
   if(!pose)throw new ApiError("YOGA_CONTENT_INVALID",`Yoga pose ${step.poseId} is unavailable`,500);
   return {position:index+1,poseId:pose.id,name:pose.displayName,description:pose.description,difficulty:pose.difficulty,category:pose.category,holdSeconds:step.holdSeconds,restSeconds:step.restSeconds,transition:step.transition,cameraSupported:step.cameraSupported,safetyNotes:pose.safetyNotes||[],media:pose.media||null};
  })};
 }
 function history(userId){return (userStore.loadUser(userId).yogaSessions||[]).slice().sort((a,b)=>b.completedAt-a.completedAt);}
 function complete(userId,input={}){
  if(!boundedText(input.sessionId)||!sessionMap.has(input.sessionId))throw new ApiError("INVALID_YOGA_SESSION","A valid guided session is required",400);
  if(input.idempotencyKey!==undefined&&!boundedText(input.idempotencyKey,128))throw new ApiError("INVALID_IDEMPOTENCY_KEY","A valid idempotency key is required",400);
  if(!Array.isArray(input.poseResults)||input.poseResults.length<1||input.poseResults.length>30)throw new ApiError("INVALID_POSE_RESULTS","Provide 1-30 derived pose results",400);
  if(input.idempotencyKey){const existing=history(userId).find(record=>record.idempotencyKey===input.idempotencyKey);if(existing)return existing;}
  const now=clock(), recordId=`yoga_${crypto.randomUUID()}`;
  const poseResults=input.poseResults.map(r=>{if(!poseMap.has(r.poseId)||(r.score!==null&&(!Number.isInteger(r.score)||r.score<0||r.score>100))||!Number.isFinite(r.holdDurationMs)||r.holdDurationMs<0||r.holdDurationMs>600000)throw new ApiError("INVALID_POSE_RESULT","Pose results are outside accepted bounds",400);return {poseId:r.poseId,score:r.score,holdDurationMs:Math.round(r.holdDurationMs),confidenceBand:["low","medium","high"].includes(r.confidenceBand)?r.confidenceBand:"low",faultIds:Array.isArray(r.faultIds)?r.faultIds.filter(x=>boundedText(x,100)).slice(0,5):[],cuesShown:Array.isArray(r.cuesShown)?r.cuesShown.filter(x=>boundedText(x,180)).slice(0,3):[]};});
  const expected=sessionMap.get(input.sessionId).poses.map(p=>p.poseId);
  if(poseResults.length!==expected.length||poseResults.some((result,index)=>result.poseId!==expected[index]))throw new ApiError("INCOMPLETE_YOGA_SESSION","Complete every pose in the published session order before finishing",400);
  const assessed=poseResults.filter(r=>r.score!==null),averageScore=assessed.length?Math.round(assessed.reduce((n,r)=>n+r.score,0)/assessed.length):null,best=assessed.slice().sort((a,b)=>b.score-a.score)[0];
  const result={recordId,sessionId:input.sessionId,idempotencyKey:input.idempotencyKey||null,status:"completed",startedAt:Number.isFinite(input.startedAt)&&input.startedAt<=now?input.startedAt:now,completedAt:now,durationMs:Math.min(7200000,Math.max(0,now-(input.startedAt||now))),poseResults,summary:{posesCompleted:poseResults.length,posesAssessed:assessed.length,averageScore,bestPoseId:best?.poseId||null,totalHoldMs:poseResults.reduce((n,r)=>n+r.holdDurationMs,0)},detectorVersion:boundedText(input.detectorVersion,64)?input.detectorVersion:"movenet-unknown",ruleVersion:"1.0.0",progression:averageScore!==null&&averageScore>=85&&poseResults.every(r=>r.holdDurationMs>=10000)?{status:"consistency_required",requiredCompletions:3}:{status:"keep_practicing"}};
  userStore.updateUser(userId,u=>{u.yogaSessions=Array.isArray(u.yogaSessions)?u.yogaSessions:[];u.yogaSessions.push(result);return u;});
  try{if(eventService)eventService.recordYogaSessionCompleted({userId,result});onCommitted?.(result);}catch(error){/* authoritative result remains committed; replay can recover */}
  return result;
 }
 return Object.freeze({catalogue,sessionDetail,history,complete});
}
module.exports={createYogaService};
