"use strict";

const crypto = require("crypto");
const { ApiError } = require("../lib/apiResponse");
const config = require("../config/generatedWorkoutProgression");
const { byId } = require("../workouts/exerciseCatalog");
const { availableEquipment } = require("../workouts/workoutPlanBuilder");

const OUTCOMES = Object.freeze({ PROGRESS:"PROGRESS", MAINTAIN:"MAINTAIN", DELOAD:"DELOAD", INCOMPLETE_WEEK:"INCOMPLETE_WEEK", HEALTH_REVIEW_BLOCKED:"HEALTH_REVIEW_BLOCKED", ASSIGNED_PROGRAM_ACTIVE:"ASSIGNED_PROGRAM_ACTIVE" });
const PLAN_STATUSES = new Set(["recommended", "active", "completed", "superseded", "restricted"]);
const nowIso = () => new Date().toISOString();
const clone = value => structuredClone(value);
const stableId = (prefix, userId, version) => `${prefix}_${crypto.createHash("sha256").update(`${userId}:${version}`).digest("hex").slice(0,24)}`;

function lifecyclePlan(persisted, userId, fallbackCreatedAt) {
  const plan = clone(persisted.plan);
  const planVersion = Number(plan.planVersion || plan.version || 1);
  const restricted = plan.status === "health_review_restricted" || plan.status === "restricted";
  return {
    lifecycleVersion: config.lifecycleVersion, planId: plan.planId || stableId("gwp", userId, planVersion), planVersion,
    generatorVersion: Number(persisted.generatorVersion || plan.generatorVersion || 1), sourceJourneyProfileVersion: persisted.sourceJourneyProfileVersion || persisted.journeyProfileVersion || null,
    programRecommendationVersion: persisted.programRecommendationVersion || null, weekNumber: Number(plan.weekNumber || plan.week || planVersion),
    status: restricted ? "restricted" : (PLAN_STATUSES.has(plan.status) ? plan.status : "recommended"), createdAt: plan.createdAt || persisted.generatedAt || fallbackCreatedAt,
    activatedAt: plan.activatedAt || null, completedAt: plan.completedAt || null, supersededAt: plan.supersededAt || null,
    recommendationOnly: persisted.recommendationOnly !== false, healthReviewRestricted: restricted, previousPlanVersion: plan.previousPlanVersion || null,
    progressionReason: plan.progressionReason || "INITIAL_GENERATION", pathway: plan.pathway, experience: plan.experience, sessions: clone(plan.sessions || [])
  };
}

function migrate(user, userId, timestamp) {
  user.generatedWorkoutPlans = Array.isArray(user.generatedWorkoutPlans) ? user.generatedWorkoutPlans : [];
  if (user.generatedWorkoutPlan?.plan && !user.generatedWorkoutPlans.length) {
    const migrated = lifecyclePlan(user.generatedWorkoutPlan, userId, timestamp);
    migrated.programRecommendationVersion = migrated.programRecommendationVersion || user.programRecommendation?.generatorVersion || null;
    user.generatedWorkoutPlans.push(migrated);
  }
  user.generatedWorkoutProgressions = Array.isArray(user.generatedWorkoutProgressions) ? user.generatedWorkoutProgressions : [];
  return user.generatedWorkoutPlans;
}

function summarizeInputs(user, plan) {
  const executions = (user.generatedWorkoutExecutions || []).filter(x => Number(x.planVersion) === plan.planVersion);
  const completed = executions.filter(x => x.status === "completed");
  const prescribedSessionCount = plan.sessions.length;
  const completedSessionIds = new Set(completed.map(x => x.sessionId));
  const completedSessionCount = completedSessionIds.size;
  const prescribedSets = completed.reduce((sum,x) => sum + (x.exerciseProgress || []).reduce((n,p) => n + Number(p.prescribedSets || 0),0),0);
  const actualCompletedSets = completed.reduce((sum,x) => sum + (x.exerciseProgress || []).reduce((n,p) => n + Number(p.completedSets || 0),0),0);
  const exerciseCount = completed.reduce((sum,x)=>sum+(x.exerciseProgress||[]).length,0);
  const completedExerciseCount = completed.reduce((sum,x)=>sum+(x.exerciseProgress||[]).filter(p=>p.completed).length,0);
  const latestCheckIn = (user.checkIns || []).at(-1) || null;
  return { prescribedSessionCount, completedSessionCount, sessionAdherencePercent: prescribedSessionCount ? Math.round(completedSessionCount/prescribedSessionCount*100) : 0, prescribedSets, actualCompletedSets, exerciseCompletionPercent: exerciseCount ? Math.round(completedExerciseCount/exerciseCount*100) : 0, completionTimestamps: completed.map(x=>x.completedAt).filter(Boolean).sort(), checkIn: latestCheckIn ? { painFlag:latestCheckIn.painFlag===true, soreness:Number(latestCheckIn.soreness), energy:Number(latestCheckIn.energy), sleep:Number(latestCheckIn.sleep), adherence:Number(latestCheckIn.adherence) } : null, healthReviewRequired: plan.healthReviewRestricted || user.journeyProfile?.healthReviewRequired === true || user.memberJourneyProfile?.status === "needs_review", assignedProgramActive:Boolean(user.program) };
}

function evaluateSummary(input) {
  if (input.healthReviewRequired) return result(OUTCOMES.HEALTH_REVIEW_BLOCKED,["HEALTH_REVIEW_REQUIRED"],"Health review is required. Your restricted plan remains available, and this does not provide medical clearance.",input);
  if (input.assignedProgramActive) return result(OUTCOMES.ASSIGNED_PROGRAM_ACTIVE,["COACH_ASSIGNED_PROGRAM"],"Your coach-assigned program remains active, so a generated next week will not be activated.",input);
  if (input.sessionAdherencePercent < config.minimumSessionAdherencePercent) return result(OUTCOMES.INCOMPLETE_WEEK,["SESSION_ADHERENCE_BELOW_MINIMUM"],"This week is incomplete. Repeat the current prescription before progressing.",input);
  const c=input.checkIn, poor=c && (c.painFlag || c.soreness>=config.poorRecovery.sorenessAtLeast || c.energy<=config.poorRecovery.energyAtMost || c.sleep<config.poorRecovery.sleepHoursBelow);
  if (poor && input.sessionAdherencePercent>=config.minimumSessionAdherencePercent) return result(OUTCOMES.DELOAD,[c.painFlag?"PAIN_REPORTED":"RECOVERY_BELOW_THRESHOLD"],"Recovery feedback supports a lower-volume week. This is not a diagnosis or health clearance.",input);
  const acceptable=c && !c.painFlag && c.soreness<=config.acceptableRecovery.sorenessAtMost && c.energy>=config.acceptableRecovery.energyAtLeast && c.sleep>=config.acceptableRecovery.sleepHoursAtLeast && c.adherence>=config.adequateCheckInAdherencePercent;
  if (input.sessionAdherencePercent>=config.progressSessionAdherencePercent && acceptable) return result(OUTCOMES.PROGRESS,["ADHERENCE_AND_RECOVERY_ACCEPTABLE"],"Your completed sessions and recovery check-in support one small, bounded progression next week.",input);
  return result(OUTCOMES.MAINTAIN,[c?"MIXED_EVIDENCE":"RECOVERY_CHECK_IN_UNAVAILABLE"],"The available evidence supports maintaining the current prescription next week.",input);
}
function result(outcome,reasonCodes,explanation,inputSummary){return{outcome,reasonCodes,explanation,inputSummary,evaluatedAt:null,evaluatorVersion:config.evaluatorVersion};}

function parseRepRange(value) { const match=String(value??"").match(/^\s*(\d+)\s*-\s*(\d+)(.*)$/); return match?{min:+match[1],max:+match[2],suffix:match[3]}:null; }
function nextPlan(prior, outcome, profile={}) {
  const plan=clone(prior), b=config.boundaries;
  plan.planVersion=prior.planVersion+1; plan.planId=null; plan.weekNumber=prior.weekNumber+1; plan.status=prior.healthReviewRestricted?"restricted":"recommended"; plan.previousPlanVersion=prior.planVersion; plan.progressionReason=outcome; plan.activatedAt=null;plan.completedAt=null;plan.supersededAt=null;
  plan.sessions=plan.sessions.slice(0,Math.min(b.maxWeeklyFrequency,Number(profile.trainingAvailability?.sessionsPerWeek)||plan.sessions.length)).map((s,si)=>({...s,week:plan.weekNumber,sessionId:`week_${plan.weekNumber}_session_${si+1}`,durationMinutes:Math.min(Number(s.durationMinutes)||45,Number(profile.trainingAvailability?.sessionLengthMinutes)||b.maxSessionMinutes,b.maxSessionMinutes),exercises:(s.exercises||[]).map(x=>clone(x))}));
  if(outcome===OUTCOMES.DELOAD) plan.sessions.forEach(s=>s.exercises.forEach(x=>{x.sets=Math.max(b.minSets,Math.floor(Number(x.sets||1)*b.deloadVolumeFactor));}));
  if(outcome===OUTCOMES.PROGRESS){let changed=false;for(const s of plan.sessions){for(const x of s.exercises){const range=parseRepRange(x.reps);if(range&&range.max<b.maxReps){x.reps=`${range.min+1}-${Math.min(b.maxReps,range.max+1)}${range.suffix}`;changed=true;break;}if(Number.isInteger(x.reps)&&x.reps<b.maxReps){x.reps++;changed=true;break;}if(Number(x.sets)<b.maxSets){x.sets=Number(x.sets)+1;changed=true;break;}}if(changed)break;}}
  const equipment=availableEquipment(profile);plan.sessions.forEach(s=>s.exercises=s.exercises.filter(x=>byId[x.exerciseId]&&equipment.has(byId[x.exerciseId].equipment)));
  return plan;
}

function createGeneratedWorkoutProgressionService({userStore}) {
  function state(userId){const user=userStore.loadUser(userId);if(!user.generatedWorkoutPlan?.plan)return{available:false,currentPlan:null,latestCompletedWeek:null,evaluationAvailable:false,latestEvaluation:null,nextRecommendedAction:"COMPLETE_JOURNEY_INTAKE"};const plans=user.generatedWorkoutPlans?.length?user.generatedWorkoutPlans:[lifecyclePlan(user.generatedWorkoutPlan,userId,user.generatedWorkoutPlan.generatedAt||nowIso())];const current=plans.find(p=>["active","recommended","restricted"].includes(p.status))||plans.at(-1);const latest=(user.generatedWorkoutProgressions||[]).filter(x=>x.fromPlanVersion===current.planVersion).at(-1)||null;return{available:true,currentPlan:clone(current),latestCompletedWeek:plans.filter(p=>p.status==="completed").sort((a,b)=>b.weekNumber-a.weekNumber)[0]?.weekNumber||null,evaluationAvailable:!latest,latestEvaluation:clone(latest),nextRecommendedAction:latest?.status==="recommended"?"ACCEPT_NEXT_WEEK":latest?.outcome===OUTCOMES.ASSIGNED_PROGRAM_ACTIVE?"FOLLOW_ASSIGNED_PROGRAM":latest?.outcome===OUTCOMES.HEALTH_REVIEW_BLOCKED?"COMPLETE_HEALTH_REVIEW":"EVALUATE_WEEK"};}
  function evaluate(userId){let saved;userStore.updateUser(userId,user=>{const plans=migrate(user,userId,nowIso());const prior=plans.find(p=>["active","recommended","restricted"].includes(p.status))||plans.at(-1);if(!prior)throw new ApiError("GENERATED_PLAN_NOT_FOUND","No generated workout plan is available",404);saved=user.generatedWorkoutProgressions.find(x=>x.fromPlanVersion===prior.planVersion);if(saved)return user;const evaluatedAt=nowIso(), evaluated=evaluateSummary(summarizeInputs(user,prior));Object.assign(evaluated,{evaluatedAt,progressionId:stableId("gwe",userId,prior.planVersion),fromPlanVersion:prior.planVersion,toPlanVersion:null,acceptedAt:null,status:"final"});if(![OUTCOMES.HEALTH_REVIEW_BLOCKED,OUTCOMES.ASSIGNED_PROGRAM_ACTIVE].includes(evaluated.outcome)){const generated=nextPlan(prior,evaluated.outcome,user.journeyProfile||{});generated.planId=stableId("gwp",userId,generated.planVersion);generated.createdAt=evaluatedAt;generated.generatorVersion=prior.generatorVersion;generated.sourceJourneyProfileVersion=prior.sourceJourneyProfileVersion;generated.programRecommendationVersion=prior.programRecommendationVersion;generated.recommendationOnly=true;generated.healthReviewRestricted=prior.healthReviewRestricted;plans.push(generated);evaluated.toPlanVersion=generated.planVersion;evaluated.status="recommended";}user.generatedWorkoutProgressions.push(evaluated);saved=evaluated;return user;});return{evaluation:clone(saved),lifecycle:state(userId)};}
  function accept(userId){let accepted;userStore.updateUser(userId,user=>{const plans=migrate(user,userId,nowIso());const evaluation=user.generatedWorkoutProgressions.filter(x=>x.status==="recommended").at(-1);if(!evaluation) {accepted=user.generatedWorkoutProgressions.filter(x=>x.acceptedAt).at(-1)||null;if(accepted)return user;throw new ApiError("PROGRESSION_NOT_ELIGIBLE","No next-week recommendation is eligible",409);}if(user.program)throw new ApiError("ASSIGNED_PROGRAM_ACTIVE","A coach-assigned program has precedence",409);const next=plans.find(x=>x.planVersion===evaluation.toPlanVersion),prior=plans.find(x=>x.planVersion===evaluation.fromPlanVersion);if(!next)throw new ApiError("PROGRESSION_PLAN_NOT_FOUND","Recommended plan was not found",409);const at=nowIso();if(prior.status!=="completed"&&prior.status!=="superseded"){prior.status="completed";prior.completedAt=at;prior.supersededAt=at;}next.status=next.healthReviewRestricted?"restricted":"active";next.activatedAt=at;evaluation.status="accepted";evaluation.acceptedAt=at;user.generatedWorkoutPlan={generatorVersion:next.generatorVersion,generatedAt:next.createdAt,journeyProfileVersion:next.sourceJourneyProfileVersion,recommendationOnly:true,plan:{...clone(next),version:next.planVersion,week:next.weekNumber,status:next.healthReviewRestricted?"health_review_restricted":next.status}};accepted=evaluation;return user;});return{evaluation:clone(accepted),lifecycle:state(userId)};}
  return{state,evaluate,accept};
}
module.exports={OUTCOMES,PLAN_STATUSES,evaluateSummary,nextPlan,lifecyclePlan,createGeneratedWorkoutProgressionService};
