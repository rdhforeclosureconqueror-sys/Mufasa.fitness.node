"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ApiError } = require("../lib/apiResponse");
const { challengeDefinitions } = require("../../data/challenges/seeds");
const { buildCommitmentSchedule, refreshCommitmentStates, rescheduleCommitmentSession, commitmentSummary } = require("../program-engine/challengeCommitmentScheduler");

const DAY_STATUSES = new Set(["pending", "completed", "skipped", "completed_late", "rescheduled"]);
const USER_STATUSES = new Set(["not_started", "active", "paused", "completed", "abandoned"]);
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const requiredDays = (challenge) => challenge.days.filter((day) => !day.isRestDay);

function calculateChallengeProgress(challenge, logs = []) {
  const required = requiredDays(challenge);
  const completed = new Set(logs.filter((log) => ["completed", "completed_late"].includes(log.status)).map((log) => log.challengeDayId));
  return Math.round(clamp((required.filter((day) => completed.has(day.id)).length / Math.max(1, required.length)) * 100));
}
function calculateChallengeAdherence(challenge, logs = [], throughDay = challenge.durationDays) {
  const scheduled = requiredDays(challenge).filter((day) => day.dayNumber <= throughDay);
  const complete = new Set(logs.filter((log) => ["completed", "completed_late"].includes(log.status)).map((log) => log.challengeDayId));
  return Math.round(clamp((scheduled.filter((day) => complete.has(day.id)).length / Math.max(1, scheduled.length)) * 100));
}
function getAdherenceTier(percent) { return percent >= 90 ? "elite" : percent >= 80 ? "gold" : percent >= 70 ? "silver" : percent >= 60 ? "bronze" : "incomplete"; }
function calculateStreak(challenge, logs = []) {
  const byDay = new Map(logs.map((log) => [log.challengeDayId, log]));
  let current = 0, longest = 0;
  for (const day of requiredDays(challenge)) {
    const status = byDay.get(day.id)?.status;
    if (["completed", "completed_late"].includes(status)) { current += 1; longest = Math.max(longest, current); }
    else if (status === "skipped") current = 0;
    else break;
  }
  return { currentStreak: current, longestStreak: longest };
}
function calculateChallengeScore(scores = {}) {
  const weights = { consistency: .40, performance: .25, technique: .15, progression: .10, assessment: .10 };
  const available = Object.entries(weights).filter(([key]) => Number.isFinite(Number(scores[key])));
  const totalWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
  if (!totalWeight) return 0;
  return Math.round(clamp(available.reduce((sum, [key, weight]) => sum + clamp(Number(scores[key])) * weight, 0) / totalWeight));
}
function trainingVolume(log) { return Array.isArray(log.sets) ? log.sets.reduce((sum, set) => sum + Math.max(0, Number(set.reps)||0) * Math.max(0, Number(set.weight)||0), 0) : Math.max(0, Number(log.setsCompleted)||0) * Math.max(0, Number(log.repsCompleted)||0) * Math.max(0, Number(log.weightUsed)||0); }

function createChallengeEngineService({ filePath, clock = () => new Date(), onWorkoutCompleted = null }) {
  if (!filePath) throw new Error("challenge engine filePath required");
  function read() { try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (_) { return { schemaVersion: 1, userChallenges: [], dayLogs: [], activityLogs: [], personalRecords: [], assessments: [] }; } }
  function write(state) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); const temp=`${filePath}.${process.pid}.tmp`; fs.writeFileSync(temp, JSON.stringify(state, null, 2)); fs.renameSync(temp, filePath); }
  const challengeBySlug = (slug) => challengeDefinitions.find((item) => item.slug === slug);
  function library({ category, status = "published" } = {}) { return challengeDefinitions.filter((item) => (!status || item.status === status) && (!category || item.category === category)).map(({ days, phases, ...item }) => ({ ...item, phaseCount: phases.length, requiredDays: requiredDays({ days }).length })); }
  function detail(slug) { const challenge=challengeBySlug(slug); if (!challenge || challenge.status !== "published") throw new ApiError("CHALLENGE_NOT_FOUND", "Challenge not found", 404); return challenge; }
  function participation(userId, challengeId, state = read()) { return state.userChallenges.find((item) => item.userId === userId && item.challengeId === challengeId && !["abandoned", "completed"].includes(item.status)); }
  function joinChallenge(userId, slug, enrollmentInput = null) {
    const challenge=detail(slug), state=read(), existing=participation(userId, challenge.id, state); if (existing) return { participation: existing, created: false };
    let commitment=null;
    if(challenge.id==="challenge_kettlebell_8_week")try{commitment=buildCommitmentSchedule(enrollmentInput||{},{durationWeeks:challenge.durationWeeks});}catch(error){throw new ApiError("VALIDATION_ERROR",error.message,400,{field:error.field||"enrollment"});}
    const now=clock().toISOString(); const joined={ id:`uc_${crypto.randomUUID()}`,userId,challengeId:challenge.id,status:"active",startedAt:now,completedAt:null,currentDay:1,currentWeek:1,completionPercent:0,currentStreak:0,longestStreak:0,totalXpEarned:25,challengeScore:null,...(commitment?{commitment:{...commitment.enrollment,confirmedAt:now},commitmentSchedule:commitment.schedule}:{}),createdAt:now,updatedAt:now };
    state.userChallenges.push(joined); write(state); return { participation: joined, created: true };
  }
  function active(userId) {
    const state=read(), joined=state.userChallenges.find((item) => item.userId===userId && item.status==="active") || state.userChallenges.filter((item)=>item.userId===userId&&item.status==="completed").sort((a,b)=>String(b.completedAt).localeCompare(String(a.completedAt)))[0]; if (!joined) return null;
    if(joined.commitmentSchedule){const refreshed=refreshCommitmentStates(joined.commitmentSchedule,clock());if(JSON.stringify(refreshed)!==JSON.stringify(joined.commitmentSchedule)){joined.commitmentSchedule=refreshed;joined.updatedAt=clock().toISOString();write(state);}}
    const challenge=challengeDefinitions.find((item)=>item.id===joined.challengeId), logs=state.dayLogs.filter((item)=>item.userChallengeId===joined.id); return project(challenge, joined, logs, state);
  }
  function project(challenge, joined, logs, state) {
    const day=challenge.days.find((item)=>item.dayNumber===joined.currentDay) || challenge.days.at(-1); const phase=challenge.phases.find((item)=>day.dayNumber>=item.startDay&&day.dayNumber<=item.endDay);
    return { challenge, participation:joined, todaysMission:day, currentPhase:phase, adherence:calculateChallengeAdherence(challenge,logs,joined.currentDay), adherenceTier:getAdherenceTier(calculateChallengeAdherence(challenge,logs,joined.currentDay)), ...(joined.commitment?{commitmentSummary:commitmentSummary(joined.commitmentSchedule,joined.commitment)}:{}), logs, personalRecords:state.personalRecords.filter((item)=>item.userId===joined.userId&&item.challengeId===challenge.id) };
  }
  function rescheduleCommitment(userId,userChallengeId,sessionId,input={}){const state=read(),joined=state.userChallenges.find(item=>item.id===userChallengeId&&item.userId===userId&&item.status==="active");if(!joined?.commitmentSchedule)throw new ApiError("CHALLENGE_NOT_FOUND","Active commitment challenge not found",404);try{joined.commitmentSchedule=rescheduleCommitmentSession(joined.commitmentSchedule,sessionId,input.targetDate,clock());}catch(error){throw new ApiError("VALIDATION_ERROR",error.message,400,{field:error.field||"targetDate"});}joined.updatedAt=clock().toISOString();write(state);return{participation:joined,commitmentSummary:commitmentSummary(joined.commitmentSchedule,joined.commitment)};}
  function validateActivityInput(input) { for (const key of ["setsCompleted","repsCompleted","secondsCompleted","distanceCompleted","stepsCompleted","weightUsed","leftSideReps","rightSideReps"]) if (input[key] != null && (!Number.isFinite(Number(input[key])) || Number(input[key]) < 0)) throw new ApiError("VALIDATION_ERROR", `${key} must be a non-negative number`, 400,{field:key}); if (input.rpe != null && (!Number.isFinite(Number(input.rpe)) || input.rpe<1 || input.rpe>10)) throw new ApiError("VALIDATION_ERROR","rpe must be from 1 to 10",400,{field:"rpe"}); }
  function logActivity(userId, userChallengeId, activityId, input={}) {
    validateActivityInput(input); const state=read(), joined=state.userChallenges.find((item)=>item.id===userChallengeId&&item.userId===userId); if (!joined) throw new ApiError("CHALLENGE_NOT_FOUND","Active challenge not found",404);
    const challenge=challengeDefinitions.find((item)=>item.id===joined.challengeId), activity=challenge.days.flatMap((day)=>day.activities).find((item)=>item.id===activityId); if (!activity) throw new ApiError("ACTIVITY_NOT_FOUND","Activity not found",404);
    let log=state.activityLogs.find((item)=>item.userChallengeId===joined.id&&item.challengeActivityId===activityId); const now=clock().toISOString(); const values={completed:Boolean(input.completed),setsCompleted:Number(input.setsCompleted)||0,repsCompleted:Number(input.repsCompleted)||0,secondsCompleted:Number(input.secondsCompleted)||0,distanceCompleted:Number(input.distanceCompleted)||0,stepsCompleted:Number(input.stepsCompleted)||0,weightUsed:Number(input.weightUsed)||0,rpe:input.rpe==null?null:Number(input.rpe),notes:String(input.notes||"").slice(0,500),updatedAt:now};
    if (log) Object.assign(log,values); else { log={id:`al_${crypto.randomUUID()}`,userId,userChallengeId:joined.id,challengeActivityId:activityId,createdAt:now,...values}; state.activityLogs.push(log); }
    const metric=challenge.primaryMetric, value=metric==="completion"?null:({reps:log.repsCompleted,seconds:log.secondsCompleted,distance:log.distanceCompleted,steps:log.stepsCompleted,weight:log.weightUsed,volume:trainingVolume(log)})[metric]; let personalRecord=null;
    if (Number(value)>0) { const prior=state.personalRecords.filter((item)=>item.userId===userId&&item.challengeId===challenge.id&&item.exerciseId===activity.exerciseId&&item.metric===metric).sort((a,b)=>b.value-a.value)[0]; if (!prior||value>prior.value) { personalRecord={id:`pr_${crypto.randomUUID()}`,userId,challengeId:challenge.id,exerciseId:activity.exerciseId||null,metric,value,unit:activity.unit||metric,achievedAt:now}; state.personalRecords.push(personalRecord); } }
    write(state); return { activityLog:log, personalRecord };
  }
  function completeDay(userId, userChallengeId, dayId, input={}) {
    const state=read(), joined=state.userChallenges.find((item)=>item.id===userChallengeId&&item.userId===userId); if (!joined||joined.status!=="active") throw new ApiError("CHALLENGE_NOT_FOUND","Active challenge not found",404); const challenge=challengeDefinitions.find((item)=>item.id===joined.challengeId), day=challenge.days.find((item)=>item.id===dayId); if (!day) throw new ApiError("DAY_NOT_FOUND","Challenge day not found",404);
    const status=input.status||"completed"; if (!DAY_STATUSES.has(status)||status==="pending") throw new ApiError("VALIDATION_ERROR","Invalid completion status",400); if (input.sessionRpe!=null&&(input.sessionRpe<1||input.sessionRpe>10)) throw new ApiError("VALIDATION_ERROR","sessionRpe must be from 1 to 10",400); for (const field of ["techniqueRating","energyRating"]) if(input[field]!=null&&(input[field]<1||input[field]>5)) throw new ApiError("VALIDATION_ERROR",`${field} must be from 1 to 5`,400); if(input.painLevel!=null&&(input.painLevel<0||input.painLevel>5)) throw new ApiError("VALIDATION_ERROR","painLevel must be from 0 to 5",400);
    let log=state.dayLogs.find((item)=>item.userChallengeId===joined.id&&item.challengeDayId===day.id); if (log&&["completed","completed_late"].includes(log.status)) return { log, participation:joined, duplicate:true, xpAwarded:0 };
    const now=clock().toISOString(), xp=["completed","completed_late"].includes(status)?(day.xpReward||100):0; if(log) Object.assign(log,{status,completedAt:xp?now:null}); else {log={id:`dl_${crypto.randomUUID()}`,userChallengeId:joined.id,challengeDayId:day.id,status,completedAt:xp?now:null,xpEarned:xp};state.dayLogs.push(log);} Object.assign(log,{workoutDurationMinutes:clamp(Number(input.workoutDurationMinutes)||0,0,1440),sessionRpe:input.sessionRpe??null,techniqueRating:input.techniqueRating??null,energyRating:input.energyRating??null,painLevel:input.painLevel??null,notes:String(input.notes||"").slice(0,1000),xpEarned:xp});
    const logs=state.dayLogs.filter((item)=>item.userChallengeId===joined.id), progress=calculateChallengeProgress(challenge,logs), streak=calculateStreak(challenge,logs); joined.totalXpEarned+=xp; joined.completionPercent=progress; Object.assign(joined,streak,{currentDay:Math.min(challenge.durationDays,day.dayNumber+1),currentWeek:Math.min(challenge.durationWeeks||1,Math.ceil((day.dayNumber+1)/7)),updatedAt:now}); if(progress===100){joined.status="completed";joined.completedAt=now;joined.totalXpEarned+=challenge.xpCompletionBonus||0;} write(state);
    if (xp && onWorkoutCompleted) onWorkoutCompleted({userId,session:{sessionId:`challenge:${joined.id}:${day.id}`,startedAt:new Date(now).getTime()-Math.max(1,log.workoutDurationMinutes)*60000,endedAt:new Date(now).getTime(),repUpdates:day.activities.map((item)=>({exerciseId:item.exerciseId})),summary:{}}});
    return {log,participation:joined,duplicate:false,xpAwarded:xp,progress,adherence:calculateChallengeAdherence(challenge,logs,day.dayNumber),streak};
  }
  function setStatus(userId,id,status){if(!USER_STATUSES.has(status))throw new ApiError("VALIDATION_ERROR","Invalid challenge status",400);const state=read(),joined=state.userChallenges.find((item)=>item.id===id&&item.userId===userId);if(!joined)throw new ApiError("CHALLENGE_NOT_FOUND","Challenge not found",404);joined.status=status;joined.updatedAt=clock().toISOString();write(state);return joined;}
  return { library,detail,joinChallenge,active,rescheduleCommitment,logActivity,completeDay,setStatus,calculateChallengeProgress,calculateChallengeAdherence,calculateStreak,calculateChallengeScore,getAdherenceTier,_read:read };
}
module.exports={createChallengeEngineService,calculateChallengeProgress,calculateChallengeAdherence,calculateStreak,calculateChallengeScore,getAdherenceTier,trainingVolume};
