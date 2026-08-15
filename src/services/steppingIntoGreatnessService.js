"use strict";

const crypto = require("crypto");
const { ApiError } = require("../lib/apiResponse");
const { ACTIVITY_TYPES, DEFAULT_PRIVACY, BADGES } = require("../stepping/domain");
const { acceptedPoints, activityMetrics } = require("../stepping/activityMetrics");
const { normalizeGoal } = require("../stepping/distanceGoals");
const { SUSPICIOUS_MOVEMENT_THRESHOLDS, evaluateSuspiciousMovement } = require("../stepping/suspiciousMovementPolicy");

const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;
const iso = (value = Date.now()) => new Date(value).toISOString();
const VERIFICATION_LEVELS = Object.freeze(["verified_gps", "verified_device", "provider_imported", "estimated", "manual", "unverified"]);
const ELIGIBLE_VERIFICATION_LEVELS = Object.freeze(["verified_gps", "verified_device"]);
const DEFAULT_VISIBILITY = Object.freeze({ showActivities:true, showGreatnessMarks:true, showBadges:true, showPersonalRecords:true, showLifetimeDistance:true, showPace:true, showExactStartTime:false });
const VISIBILITY_KEYS = Object.freeze(Object.keys(DEFAULT_VISIBILITY));
const MAX_OPERATIONAL_EVENTS = 1000;
const ROUTE_SOURCES = Object.freeze(["verified_geometry","trail_network","park_constrained_walking_route","google_walking_route","place_only"]);
const CLIENT_OPERATIONAL_EVENTS = Object.freeze(new Set(["recording_started","permission_granted","permission_denied","gps_acquired","gps_degraded","recording_paused","recording_resumed","recording_finished","recording_cancelled","recording_recovered","save_retried","save_failed"]));
const CHALLENGES = Object.freeze([
  { challengeId:"move_10k", name:"Move 10K", metric:"distance", target:10000, startsAt:"2026-01-01T00:00:00.000Z", endsAt:"2027-01-01T00:00:00.000Z", allowedVerificationLevels:["verified_gps","verified_device"], verificationRequirements:"Verified GPS or device activities" },
  { challengeId:"three_active_days", name:"Three Active Days", metric:"active_days", target:3, startsAt:"2026-01-01T00:00:00.000Z", endsAt:"2027-01-01T00:00:00.000Z", allowedVerificationLevels:["verified_gps","verified_device"], verificationRequirements:"Verified activity on three UTC days" },
  { challengeId:"community_100k", name:"Greatness Together 100K", metric:"community_distance", target:100000, startsAt:"2026-01-01T00:00:00.000Z", endsAt:"2027-01-01T00:00:00.000Z", allowedVerificationLevels:["verified_gps","verified_device"], verificationRequirements:"Active Movement members and verified activities" }
]);

function ensureDomain(user) {
  user.steppingIntoGreatness ||= { schemaVersion:3, activities:[], achievements:[], personalBests:{}, memberships:[], feedEvents:[], contributions:[], enrollments:[], operationalEvents:[] };
  const d=user.steppingIntoGreatness;
  for (const key of ["activities","achievements","memberships","feedEvents","contributions","trailContributions","enrollments","operationalEvents"]) d[key] ||= [];
  d.personalBests ||= {};
  return d;
}

function verificationFor(sourceType, provider, state) {
  let level="unverified";
  if (sourceType==="browser_gps" || sourceType==="sig_gps") level=state==="valid"?"verified_gps":"unverified";
  else if (sourceType==="manual") level="manual";
  else if (sourceType==="estimated") level="estimated";
  else if (sourceType==="device") level=state==="valid"?"verified_device":"unverified";
  else if (sourceType==="provider_import") level="provider_imported";
  const eligible=ELIGIBLE_VERIFICATION_LEVELS.includes(level)&&state==="valid";
  return { sourceType:sourceType==="sig_gps"?"browser_gps":sourceType, sourceProvider:provider||null, verificationLevel:level, verificationLabel:level.split("_").map(x=>x[0].toUpperCase()+x.slice(1)).join(" "), rankingEligible:eligible, challengeEligible:eligible, personalRecordEligible:eligible, rankingEligibility:eligible, challengeEligibility:eligible, personalRecordEligibility:eligible };
}

function validateCompletion(input) {
  const reasons=[];
  const movement=evaluateSuspiciousMovement({samples:input.samples,acceptedSamples:input.gpsQuality?.acceptedSamples,rejectedSamples:input.gpsQuality?.rejectedSamples});
  if((input.gpsQuality?.acceptedSamples||0)<SUSPICIOUS_MOVEMENT_THRESHOLDS.minimumAcceptedSamples) reasons.push("insufficient_accepted_points");
  if(movement.suspicious) reasons.push("suspicious_movement");
  if(["poor","unavailable"].includes(input.gpsQuality?.rating)) reasons.push("poor_gps_quality");
  if(!Number.isFinite(input.distanceMeters)||input.distanceMeters<0) reasons.push("invalid_distance");
  const state=reasons.includes("invalid_distance")||reasons.includes("insufficient_accepted_points")?"invalid":reasons.length?"questionable":"valid";
  const verification=verificationFor(input.sourceType||"browser_gps",input.sourceProvider,state);
  return {state,reasons,movementEvidence:movement,challengeEligible:verification.challengeEligible,personalBestEligible:verification.personalRecordEligible,rankingEligible:verification.rankingEligible};
}

function verificationDiagnostic(activity) {
  const accepted=Number(activity?.gpsQuality?.acceptedSamples??activity?.route?.acceptedPointCount??0);
  const rejected=Number(activity?.gpsQuality?.rejectedSamples??activity?.route?.rejectedPointCount??0);
  const total=Math.max(0,accepted)+Math.max(0,rejected);
  const trailId=activity?.selectedRoute?.routeId||activity?.selectedRoute?.routeFingerprint||null;
  const reasons=Array.isArray(activity?.validation?.reasons)?activity.validation.reasons:[];
  const authoritative=Boolean(activity?.activityId&&activity?.userId&&activity?.createdAt&&activity?.updatedAt);
  const verified=authoritative&&activity?.status==="completed"&&activity?.validation?.state==="valid"&&ELIGIBLE_VERIFICATION_LEVELS.includes(activity?.verificationLevel);
  const rule=(id,category,passed,reasonCode,evidence,enforced=true)=>({id,category,enforced,result:passed?"PASS":"FAIL",reasonCodes:passed?[]:[reasonCode],evidence});
  const rules=[
    rule("accepted_points_minimum","gps_quality",accepted>=SUSPICIOUS_MOVEMENT_THRESHOLDS.minimumAcceptedSamples,"insufficient_accepted_points",{acceptedSamples:accepted,minimumAcceptedSamples:SUSPICIOUS_MOVEMENT_THRESHOLDS.minimumAcceptedSamples}),
    rule("suspicious_movement_pattern_absent","gps_quality",!activity?.validation?.movementEvidence?.suspicious,"suspicious_movement",activity?.validation?.movementEvidence||{note:"No persisted deterministic suspicious-movement pattern."}),
    rule("gps_rating_usable","gps_quality",!["poor","unavailable"].includes(activity?.gpsQuality?.rating),"poor_gps_quality",{rating:activity?.gpsQuality?.rating||"unavailable",rejectedRatings:["poor","unavailable"]}),
    rule("distance_nonnegative","minimum_distance",Number.isFinite(activity?.distanceMeters)&&activity.distanceMeters>=0,"invalid_distance",{distanceMeters:activity?.distanceMeters,minimumDistanceMeters:0}),
    rule("accepted_sample_ratio","accepted_rejected_sample_ratio",true,"accepted_sample_ratio_below_minimum",{acceptedSamples:accepted,rejectedSamples:rejected,acceptedRatio:total?accepted/total:null,minimumRatio:null,note:"No accepted-sample ratio threshold is configured."},false),
    rule("route_or_trail_association","route_trail_association",true,"route_association_required",{trailIdentity:trailId,routeSource:activity?.selectedRoute?.routeSource||null,note:"Route association is not a completion-verification rule."},false),
    rule("goal_completion","goal_completion",true,"goal_not_completed",{goalConfigured:activity?.goal?.distanceMeters!=null,goalCompleted:Boolean(activity?.goal?.completed),note:"Goal completion is recorded but is not a verification rule."},false),
    rule("elapsed_moving_time_sanity","elapsed_moving_time_sanity",true,"time_sanity_failed",{elapsedTimeMs:activity?.elapsedTimeMs,movingTimeMs:activity?.movingTimeMs,pausedTimeMs:activity?.pausedTimeMs,note:"No time-sanity threshold is configured."},false),
    rule("browser_suspension_resume","browser_suspension_resume",true,"browser_suspension_detected",{evaluatedFromPersistedActivity:false,note:"Suspension/resume telemetry is operational only and is not a verification rule."},false),
    rule("speed_pace_plausibility","speed_pace_plausibility",true,"implausible_speed_or_pace",{averagePaceSecondsPerKilometer:activity?.averagePaceSecondsPerKilometer??null,note:"Only client-reported suspicious movement is currently enforced; no separate pace threshold is configured."},false),
    rule("duplicate_replay","duplicate_replay_detection",true,"duplicate_or_replayed_activity",{clientSessionIdPresent:Boolean(activity?.clientSessionId),note:"Completion writes are idempotent by clientSessionId; no separate replay-verification rule is configured."},false),
    rule("authoritative_activity_persistence","authoritative_persistence",authoritative,"missing_authoritative_activity_persistence",{persisted:authoritative,activityId:activity?.activityId||null}),
    rule("trail_identity_present","missing_trail_identity",Boolean(trailId),"missing_trail_identity",{trailIdentity:trailId,note:"Required for trail-specific outcomes, not base activity verification."},false)
  ];
  const failingReasonCodes=[...new Set(rules.filter(item=>item.enforced&&item.result==="FAIL").flatMap(item=>item.reasonCodes))];
  const trailEligible=verified&&Boolean(trailId);
  return {
    diagnosticVersion:"greatness-verification-trace-2026.08.14.3",
    activityId:activity?.activityId||null,
    activityTimestamp:activity?.endedAt||null,
    completedDistanceMeters:Number.isFinite(activity?.distanceMeters)?activity.distanceMeters:null,
    decision:verified?"VERIFIED":"NOT_VERIFIED",
    verificationLevel:activity?.verificationLevel||"unverified",
    validationState:activity?.validation?.state||"unknown",
    persistedVerificationReasonCodes:reasons,
    failingReasonCodes:[...new Set([...reasons,...failingReasonCodes])],
    gpsQuality:{acceptedSamples:accepted,rejectedSamples:rejected,rating:activity?.gpsQuality?.rating||"unavailable",suspiciousMovementDetected:Boolean(activity?.gpsQuality?.suspiciousMovementDetected)},
    rules,
    authoritativePersistence:{persisted:authoritative,source:"steppingIntoGreatness.activities"},
    qualifications:{
      "greatness.activity.completed":verified,
      xp:verified,
      achievements:verified,
      records:verified,
      runCountAchievements:verified&&["run","jog","trail_run"].includes(activity?.activityType),
      distanceAchievements:verified,
      trailExploration:trailEligible,
      verifiedTrailVisit:trailEligible,
      trailPhotoContributionEligibility:trailEligible
    }
  };
}

function redactedVerificationTrace(activity) {
  const diagnostic=verificationDiagnostic(activity),q=diagnostic.qualifications,gps=diagnostic.gpsQuality;
  const accuracy=activity?.accuracyDiagnostics||{};
  return {diagnosticVersion:"greatness-run-accuracy-2026.08.15.1",activityTimestamp:diagnostic.activityTimestamp,browserRecordedDistanceMeters:accuracy.browserRecordedDistanceMeters??diagnostic.completedDistanceMeters,unroundedStoredDistanceMeters:diagnostic.completedDistanceMeters,acceptedGpsSamples:gps.acceptedSamples,rejectedGpsSamples:gps.rejectedSamples,finalGpsQuality:gps.rating,interruptionCount:accuracy.interruptionCount||0,interruptionDurationMs:accuracy.interruptionDurationMs||0,baselineResetCount:accuracy.baselineResetCount||0,finalDisplayedDistance:accuracy.finalDisplayedDistance||null,rawSampleCount:accuracy.rawSampleCount??(gps.acceptedSamples+gps.rejectedSamples),accumulatedAcceptedSegmentMeters:accuracy.accumulatedAcceptedSegmentMeters??diagnostic.completedDistanceMeters,excludedMetersByReason:accuracy.excludedMetersByReason||{},unitConversionPath:accuracy.unitConversionPath||"stored meters -> displayed kilometers / 1000",decision:diagnostic.decision,persistedVerificationReasonCodes:diagnostic.persistedVerificationReasonCodes,suspiciousMovementDetected:gps.suspiciousMovementDetected,authoritativePersistence:diagnostic.authoritativePersistence.persisted,eligibility:{"greatness.activity.completed":q["greatness.activity.completed"],xp:q.xp,achievements:q.achievements,records:q.records,trailExploration:q.trailExploration,verifiedTrailVisit:q.verifiedTrailVisit,trailPhotoContribution:q.trailPhotoContributionEligibility}};
}

function recordCandidates(activity) {
  const values={
    [`longest_${activity.activityType}`]:{value:activity.distanceMeters,unit:"meters"},
    longest_overall_activity:{value:activity.distanceMeters,unit:"meters"}
  };
  if(activity.elevationGainMeters!=null) values.greatest_elevation_gain={value:activity.elevationGainMeters,unit:"meters"};
  for(const [unit,splits] of [["mile",activity.splits?.miles||[]],["kilometer",activity.splits?.kilometers||[]]]){
    const fastest=splits.filter(s=>s.complete).sort((a,b)=>a.durationMs-b.durationMs)[0];
    const requiredMeters=unit==="mile"?1609.344:1000;
    if(fastest&&activity.distanceMeters>=requiredMeters)values[`fastest_${unit}`]={value:fastest.durationMs,unit:"milliseconds",lower:true};
  }
  for(const [distance,key] of [[5000,"fastest_5k"],[10000,"fastest_10k"]]) if(activity.distanceMeters>=distance) values[key]={value:activity.movingTimeMs*(distance/activity.distanceMeters),unit:"milliseconds",lower:true};
  return values;
}

function activeMembership(d){return d.memberships.find(m=>m.communityId==="greatness_movement"&&m.status==="active")||null;}
function eligibleActivities(d){return d.activities.filter(a=>!a.deletedAt&&a.status==="completed"&&a.validation?.state==="valid"&&a.personalRecordEligibility!==false&&a.validation?.personalBestEligible!==false);}
function streakFor(activities){const days=[...new Set(activities.map(a=>a.endedAt.slice(0,10)))].sort();let best=0,current=0,prior=null;for(const day of days){current=prior&&Date.parse(day)-Date.parse(prior)===86400000?current+1:1;best=Math.max(best,current);prior=day;}return best;}

function visibilityPreferences(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ApiError("INVALID_COMMUNITY_SETTINGS", "Visibility preferences must be an object", 400);
  for (const [key, value] of Object.entries(input)) {
    if (!VISIBILITY_KEYS.includes(key)) throw new ApiError("INVALID_COMMUNITY_SETTING", `Unsupported setting: ${key}`, 400);
    if (typeof value !== "boolean") throw new ApiError("INVALID_COMMUNITY_SETTING", `Setting ${key} must be true or false`, 400);
  }
  return { ...input };
}

function selectedRouteForPersistence(route) {
  if (!route || !ROUTE_SOURCES.includes(route.routeSource)) throw new ApiError("INVALID_ACTIVITY_ROUTE", "Select a valid route before starting", 400);
  const polyline=Array.isArray(route.polyline)?route.polyline.slice(0,5000).map(p=>({latitude:Number(p.latitude),longitude:Number(p.longitude)})).filter(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)):[];
  return {routeId:String(route.routeId||"").slice(0,160)||null,routeFingerprint:String(route.routeFingerprint||route.routeId||"").slice(0,160)||null,routeSource:route.routeSource,routeSourceLabel:String(route.routeSourceLabel||"").slice(0,80),routeType:route.routeType||null,targetDistanceMeters:Number(route.targetDistanceMeters)||null,estimatedDistanceMeters:Number(route.estimatedDistanceMeters)||null,polyline,startPoint:route.startPoint||route.start||null,turnaroundPoint:route.turnaroundPoint||route.turnaround||null,loopCount:Number(route.loopCount)||null,warnings:Array.isArray(route.warnings)?route.warnings.map(x=>String(x).slice(0,240)).slice(0,5):[]};
}

function createSteppingIntoGreatnessService({userStore,clock=()=>Date.now()}) {
  const audit=(d,eventName,metadata={})=>{
    d.operationalEvents.push({eventId:id("op"),eventName,occurredAt:iso(clock()),metadata});
    if(d.operationalEvents.length>MAX_OPERATIONAL_EVENTS)d.operationalEvents.splice(0,d.operationalEvents.length-MAX_OPERATIONAL_EVENTS);
  };
  function recalculateDomain(d,userId){
    const eligible=eligibleActivities(d);
    d.personalBests={};
    // Persisted insertion order is authoritative for exact ties, matching the
    // original "equal values do not replace" behavior.
    for(const activity of eligible){
      activity.personalRecordsEarned=[];
      for(const [recordType,candidate] of Object.entries(recordCandidates(activity))){
        const prior=d.personalBests[recordType];
        if(!prior||(candidate.lower?candidate.value<prior.value:candidate.value>prior.value)) d.personalBests[recordType]={recordType,value:candidate.value,valueMeters:candidate.unit==="meters"?candidate.value:undefined,unit:candidate.unit,activityId:activity.activityId,earnedAt:activity.endedAt};
      }
    }
    for(const record of Object.values(d.personalBests)){const source=d.activities.find(a=>a.activityId===record.activityId);if(source)source.personalRecordsEarned.push(record.recordType);}
    const values={activity_count:eligible.length,walk_count:eligible.filter(a=>["walk","trail_walk"].includes(a.activityType)).length,run_count:eligible.filter(a=>["run","jog","trail_run"].includes(a.activityType)).length,trail_count:eligible.filter(a=>a.activityType.startsWith("trail")).length,lifetime_distance:eligible.reduce((s,a)=>s+a.distanceMeters,0),active_day_streak:streakFor(eligible)};
    d.achievements=[];
    for(const badge of BADGES){const source=eligible.find(a=>badge.metric==="single_distance"?a.distanceMeters>=badge.threshold:(values[badge.metric]||0)>=badge.threshold);if(source){const award={achievementId:`achievement_${badge.achievementKey}`,achievementKey:badge.achievementKey,name:badge.name,activityId:source.activityId,earnedAt:source.endedAt};d.achievements.push(award);}}
    for(const a of d.activities)a.achievementIds=d.achievements.filter(x=>x.activityId===a.activityId).map(x=>x.achievementId);
    for(const enrollment of d.enrollments.filter(e=>e.status==="active")){
      const challenge=CHALLENGES.find(c=>c.challengeId===enrollment.challengeId);if(!challenge)continue;
      for(const activity of eligible.filter(a=>Date.parse(a.endedAt)>=Date.parse(challenge.startsAt)&&Date.parse(a.endedAt)<Date.parse(challenge.endsAt)&&challenge.allowedVerificationLevels.includes(a.verificationLevel))){
        if(challenge.metric==="community_distance"&&!activeMembership(d))continue;
        let contribution=d.contributions.find(c=>c.activityId===activity.activityId&&c.challengeId===challenge.challengeId);
        if(!contribution){contribution={contributionId:id("contribution"),userId,activityId:activity.activityId,challengeId:challenge.challengeId,metric:challenge.metric,amount:challenge.metric.includes("distance")?activity.distanceMeters:1,activeDay:activity.endedAt.slice(0,10),source:activity.sourceType,verificationState:activity.verificationLevel,createdAt:iso(clock()),revoked:false,revocationReason:null,revokedAt:null};d.contributions.push(contribution);audit(d,"challenge_contribution_created",{activityId:activity.activityId,challengeId:challenge.challengeId});}
        activity.challengeContributionIds ||= [];if(!activity.challengeContributionIds.includes(contribution.contributionId))activity.challengeContributionIds.push(contribution.contributionId);
      }
    }
    d.calculated={lifetimeDistanceMeters:values.lifetime_distance,activeDayTotal:new Set(eligible.map(a=>a.endedAt.slice(0,10))).size,longestStreakDays:values.active_day_streak,recalculatedAt:iso(clock())};
    return d.calculated;
  }
  function revokeContributionInDomain(d,contribution,reason){if(contribution.revoked)return contribution;contribution.revoked=true;contribution.revocationReason=reason;contribution.revokedAt=iso(clock());audit(d,"challenge_contribution_revoked",{activityId:contribution.activityId,challengeId:contribution.challengeId,reason});return contribution;}
  function revokeActivityContributions(d,activityId,reason){return d.contributions.filter(c=>c.activityId===activityId).map(c=>revokeContributionInDomain(d,c,reason));}
  function membership(userId){return activeMembership(ensureDomain(userStore.loadUser(userId)));}
  function join(userId,preferences={}){const validatedPreferences={...DEFAULT_VISIBILITY,...visibilityPreferences(preferences)};let result;userStore.updateUser(userId,user=>{const d=ensureDomain(user);let m=d.memberships.find(x=>x.communityId==="greatness_movement");if(m)Object.assign(m,{status:"active",visibilityPreferences:validatedPreferences,leftAt:null,updatedAt:iso(clock())});else{m={membershipId:id("membership"),communityId:"greatness_movement",userId,status:"active",joinedAt:iso(clock()),visibilityPreferences:validatedPreferences};d.memberships.push(m);}result=m;recalculateDomain(d,userId);return user;});return result;}
  function updateSettings(userId,preferences){const validatedPreferences=visibilityPreferences(preferences);let result;userStore.updateUser(userId,user=>{const d=ensureDomain(user),m=activeMembership(d);if(!m)throw new ApiError("COMMUNITY_MEMBERSHIP_REQUIRED","Join The Greatness Movement to edit settings",403);m.visibilityPreferences={...m.visibilityPreferences,...validatedPreferences};m.updatedAt=iso(clock());result=m;return user;});return result;}
  function leave(userId){let result;userStore.updateUser(userId,user=>{const d=ensureDomain(user);result=d.memberships.find(m=>m.communityId==="greatness_movement");if(!result)throw new ApiError("MEMBERSHIP_NOT_FOUND","Community membership not found",404);result.status="left";result.leftAt=iso(clock());for(const c of d.contributions.filter(c=>c.metric==="community_distance"))revokeContributionInDomain(d,c,"membership_left");recalculateDomain(d,userId);return user;});return result;}
  function enroll(userId,challengeId){const challenge=CHALLENGES.find(c=>c.challengeId===challengeId);if(!challenge)throw new ApiError("CHALLENGE_NOT_FOUND","Challenge not found",404);let result;userStore.updateUser(userId,user=>{const d=ensureDomain(user);result=d.enrollments.find(e=>e.challengeId===challengeId);if(!result){result={enrollmentId:id("enrollment"),challengeId,userId,enrolledAt:iso(clock()),status:"active"};d.enrollments.push(result);}else result.status="active";recalculateDomain(d,userId);return user;});return result;}
  function challengeList(userId){const d=ensureDomain(userStore.loadUser(userId));return CHALLENGES.map(c=>{const contributions=d.contributions.filter(x=>x.challengeId===c.challengeId&&!x.revoked),progress=c.metric==="active_days"?new Set(contributions.map(x=>x.activeDay)).size:contributions.reduce((s,x)=>s+x.amount,0);return{...c,enrolled:d.enrollments.some(e=>e.challengeId===c.challengeId&&e.status==="active"),progress,completed:progress>=c.target};});}
  function start(userId,input){
    if(!input?.clientSessionId||typeof input.clientSessionId!=="string")throw new ApiError("ACTIVITY_START_ID_REQUIRED","A start operation ID is required",400);
    if(!ACTIVITY_TYPES.includes(input.activityType))throw new ApiError("INVALID_ACTIVITY_TYPE","Choose walk, jog, run, trail walk, or trail run",400);
    let goal;try{goal=normalizeGoal(input.goal);}catch(error){throw new ApiError("INVALID_DISTANCE_GOAL",error.message,400);}
    const selectedRoute=selectedRouteForPersistence(input.selectedRoute);
    let result;userStore.updateUser(userId,user=>{const d=ensureDomain(user),existing=d.activities.find(a=>a.clientSessionId===input.clientSessionId);if(existing){result={...existing,duplicateStart:true};return user;}const now=iso(clock());const activity={activityId:id("activity"),clientSessionId:input.clientSessionId,userId,activityType:input.activityType,status:"in_progress",startedAt:iso(input.startedAt||clock()),endedAt:null,elapsedTimeMs:0,movingTimeMs:0,pausedTimeMs:0,distanceMeters:0,goal:{...goal,completed:false,completedAt:null},selectedRoute,route:{points:[],acceptedPointCount:0,rejectedPointCount:0,visibility:"private",simplification:"uniform_limit_2000"},privacy:{...DEFAULT_PRIVACY},validation:{state:"pending",reasons:[],challengeEligible:false,personalBestEligible:false,rankingEligible:false},challengeContributionIds:[],achievementIds:[],personalRecordsEarned:[],schemaVersion:5,createdAt:now,updatedAt:now};d.activities.push(activity);audit(d,"activity_started",{activityId:activity.activityId,routeIdPresent:Boolean(selectedRoute.routeId)});result=activity;return user;});return result;
  }
  function complete(userId,input){
    if(!ACTIVITY_TYPES.includes(input?.activityType))throw new ApiError("INVALID_ACTIVITY_TYPE","Choose walk, jog, run, trail walk, or trail run",400);
    if(input.stepCount!=null)throw new ApiError("UNTRUSTED_STEP_COUNT","Browser GPS activities cannot submit step counts",400);
    if(input.verificationLevel||input.sourceType||input.sourceProvider)throw new ApiError("VERIFICATION_SERVER_CONTROLLED","Activity verification is assigned by the server",400);
    let goal;try{goal=normalizeGoal(input.goal);}catch(error){throw new ApiError("INVALID_DISTANCE_GOAL",error.message,400);}
    let result;userStore.updateUser(userId,user=>{const d=ensureDomain(user),existing=d.activities.find(a=>input.clientSessionId&&a.clientSessionId===input.clientSessionId);if(existing&&existing.status!=="in_progress"){
      // Older partial writes could omit activityType. Repair from the already
      // validated retry request so the idempotency path returns a canonical activity.
      if(!ACTIVITY_TYPES.includes(existing.activityType)){existing.activityType=input.activityType;existing.updatedAt=iso(clock());audit(d,"legacy_activity_repaired",{activityId:existing.activityId,field:"activityType"});recalculateDomain(d,userId);}
      result={...existing,duplicateCompletion:true};return user;}
      const now=iso(clock()),validation=validateCompletion({...input,sourceType:"browser_gps"}),verification=verificationFor("browser_gps","browser_geolocation",validation.state),privacy={...DEFAULT_PRIVACY,...input.privacy},points=acceptedPoints(input.samples),computed=activityMetrics(points);
      const goalCompleted=goal.distanceMeters!=null&&Number(input.distanceMeters)>=goal.distanceMeters;
      const selected=input.selectedRoute?selectedRouteForPersistence(input.selectedRoute):(existing?.selectedRoute||null);
      const gpsQuality={...(input.gpsQuality||{rating:"unavailable",acceptedSamples:0,rejectedSamples:0}),suspiciousMovementDetected:validation.movementEvidence.suspicious};
      const supplied=input.accuracyDiagnostics||{},accuracyDiagnostics={rawSampleCount:Math.max(0,Number(supplied.rawSampleCount)||input.samples?.length||0),acceptedSampleCount:gpsQuality.acceptedSamples||0,rejectedSampleCount:gpsQuality.rejectedSamples||0,accumulatedAcceptedSegmentMeters:Math.max(0,Number(supplied.accumulatedAcceptedSegmentMeters)||Number(input.distanceMeters)||0),excludedMetersByReason:Object.fromEntries(Object.entries(supplied.excludedMetersByReason||{}).filter(([key,value])=>/^[a-z_]+$/.test(key)&&Number.isFinite(Number(value))).slice(0,20).map(([key,value])=>[key,Math.max(0,Number(value))])),interruptionCount:Math.max(0,Math.floor(Number(supplied.interruptionCount)||0)),interruptionDurationMs:Math.max(0,Number(supplied.interruptionDurationMs)||0),baselineResetCount:Math.max(0,Math.floor(Number(supplied.baselineResetCount)||0)),browserRecordedDistanceMeters:Math.max(0,Number(input.distanceMeters)||0),finalDisplayedDistance:String(supplied.finalDisplayedDistance||"").slice(0,40),unitConversionPath:"browser_geolocation coordinates -> Haversine meters -> kilometers / 1000"};
      const activity={activityId:existing?.activityId||id("activity"),clientSessionId:input.clientSessionId||null,userId,activityType:input.activityType,status:validation.state==="invalid"?"invalid":"completed",...verification,startedAt:iso(input.startedAt),endedAt:iso(input.endedAt),elapsedTimeMs:Math.max(0,Number(input.elapsedTimeMs)||0),movingTimeMs:Math.max(0,Number(input.movingTimeMs)||0),pausedTimeMs:Math.max(0,Number(input.pausedTimeMs)||0),distanceMeters:Math.max(0,Number(input.distanceMeters)||0),accuracyDiagnostics,goal:{...goal,completed:goalCompleted,completedAt:goalCompleted?(input.goal?.completedAt||iso(input.endedAt)):null},selectedRoute:selected,elevationGainMeters:computed.elevation?.meters,elevationEstimated:Boolean(computed.elevation),averagePaceSecondsPerKilometer:input.distanceMeters>0?(Number(input.movingTimeMs)/1000)/(input.distanceMeters/1000):undefined,splits:{miles:computed.mileSplits,kilometers:computed.kilometerSplits},route:{points,acceptedPointCount:input.gpsQuality?.acceptedSamples||points.length,rejectedPointCount:input.gpsQuality?.rejectedSamples||0,visibility:"private",simplification:"uniform_limit_2000"},gpsQuality,validation,privacy,challengeContributionIds:[],achievementIds:[],personalRecordsEarned:[],schemaVersion:6,createdAt:existing?.createdAt||now,updatedAt:now};
      if(existing)d.activities[d.activities.indexOf(existing)]=activity;else d.activities.push(activity);recalculateDomain(d,userId);const member=activeMembership(d);if(member&&privacy.activityVisibleToCommunity&&member.visibilityPreferences.showActivities){d.feedEvents.push({eventId:id("event"),communityId:"greatness_movement",userId,activityId:activity.activityId,eventType:"activity_completed",summaryData:{activityType:activity.activityType,distanceMeters:activity.distanceMeters,durationMs:activity.movingTimeMs,goalLabel:goalCompleted?goal.label:undefined,averagePaceSecondsPerKilometer:activity.averagePaceSecondsPerKilometer,startedAt:activity.startedAt},visibility:"community",createdAt:now});audit(d,"community_event_created",{activityId:activity.activityId});}audit(d,"save_succeeded",{activityId:activity.activityId,validationState:validation.state});result=activity;return user;});return result;
  }
  function remove(userId,activityId){let result;userStore.updateUser(userId,user=>{const d=ensureDomain(user),a=d.activities.find(x=>x.activityId===activityId);if(!a)throw new ApiError("ACTIVITY_NOT_FOUND","Activity not found",404);if(a.deletedAt){result={activityId,deleted:true,duplicateDeletion:true};return user;}a.deletedAt=iso(clock());a.deletedReason="owner_deleted";a.status="deleted";a.route={visibility:"private",points:[],detachedAt:a.deletedAt};d.feedEvents=d.feedEvents.filter(e=>e.activityId!==activityId);revokeActivityContributions(d,activityId,"activity_deleted");recalculateDomain(d,userId);audit(d,"activity_deleted",{activityId});result={activityId,deleted:true,duplicateDeletion:false};return user;});return result;}
  function setEligibility(userId,activityId,{validationState,verificationLevel,reason="activity_ineligible"}){let result;userStore.updateUser(userId,user=>{const d=ensureDomain(user),a=d.activities.find(x=>x.activityId===activityId&&!x.deletedAt);if(!a)throw new ApiError("ACTIVITY_NOT_FOUND","Activity not found",404);if(validationState)a.validation={...a.validation,state:validationState,challengeEligible:validationState==="valid",personalBestEligible:validationState==="valid",rankingEligible:validationState==="valid"};if(verificationLevel){if(!VERIFICATION_LEVELS.includes(verificationLevel))throw new ApiError("INVALID_VERIFICATION_LEVEL","Invalid verification level",400);a.verificationLevel=verificationLevel;}const eligible=a.validation.state==="valid"&&ELIGIBLE_VERIFICATION_LEVELS.includes(a.verificationLevel);a.challengeEligibility=a.personalRecordEligibility=a.rankingEligibility=eligible;if(!eligible)revokeActivityContributions(d,activityId,reason);recalculateDomain(d,userId);result=a;return user;});return result;}
  function journey(userId){const d=ensureDomain(userStore.loadUser(userId)),eligible=eligibleActivities(d),activities=d.activities.filter(a=>!a.deletedAt).map(a=>({...a,route:{...a.route,points:undefined}}));return{activities,personalBests:d.personalBests,achievements:d.achievements,lifetimeDistanceMeters:eligible.reduce((s,a)=>s+a.distanceMeters,0),activeDayTotal:new Set(eligible.map(a=>a.endedAt.slice(0,10))).size,longestStreakDays:streakFor(eligible),membership:activeMembership(d)};}
  function activity(userId,activityId){const a=ensureDomain(userStore.loadUser(userId)).activities.find(x=>x.activityId===activityId&&!x.deletedAt);if(!a)throw new ApiError("ACTIVITY_NOT_FOUND","Activity not found",404);return{...a,route:{...a.route,points:undefined}};}
  function diagnostic(userId,activityId){return verificationDiagnostic(activity(userId,activityId));}
  function mostRecentCompletedDiagnostic(){
    const recent=userStore.listUsers().flatMap(user=>(user.steppingIntoGreatness?.activities||[])).filter(item=>item&&!item.deletedAt&&item.status==="completed"&&Number.isFinite(Date.parse(item.endedAt))).sort((left,right)=>Date.parse(right.endedAt)-Date.parse(left.endedAt))[0];
    if(!recent)throw new ApiError("ACTIVITY_NOT_FOUND","No completed Greatness activity is available in production records",404);
    return redactedVerificationTrace(recent);
  }
  function route(userId,activityId){const a=ensureDomain(userStore.loadUser(userId)).activities.find(x=>x.activityId===activityId&&!x.deletedAt);if(!a)throw new ApiError("ACTIVITY_NOT_FOUND","Activity not found",404);return a.route;}
  function feed(userId){if(!membership(userId))throw new ApiError("COMMUNITY_MEMBERSHIP_REQUIRED","Join The Greatness Movement to view the Movement Feed",403);return userStore.listUsers().flatMap(u=>{const d=ensureDomain(u),m=activeMembership(d);if(!m||!m.visibilityPreferences.showActivities)return[];return d.feedEvents.filter(e=>{const a=d.activities.find(x=>x.activityId===e.activityId);return a&&!a.deletedAt&&a.privacy?.activityVisibleToCommunity;}).map(e=>{const a=d.activities.find(x=>x.activityId===e.activityId),summary={...e.summaryData};if(!m.visibilityPreferences.showPace||!a.privacy?.paceVisible)delete summary.averagePaceSecondsPerKilometer;if(!m.visibilityPreferences.showExactStartTime||!a.privacy?.exactStartTimeVisible)delete summary.startedAt;return{...e,summaryData:summary};});}).filter(e=>e.visibility==="community").sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,50);}
  function weeklySummary(userId){if(!membership(userId))throw new ApiError("COMMUNITY_MEMBERSHIP_REQUIRED","Join The Greatness Movement to view the weekly summary",403);const end=clock(),start=end-7*86400000,activities=userStore.listUsers().flatMap(u=>{const d=ensureDomain(u);return activeMembership(d)?eligibleActivities(d).filter(a=>a.privacy?.activityVisibleToCommunity):[];}).filter(a=>Date.parse(a.endedAt)>=start&&Date.parse(a.endedAt)<=end);return{timezone:"UTC",weekBoundaryRule:"Rolling seven-day window ending at request time; activity days use UTC",periodStartsAt:iso(start),periodEndsAt:iso(end),verifiedActivities:activities.length,verifiedCommunityDistanceMeters:activities.reduce((s,a)=>s+a.distanceMeters,0),activeParticipatingMembers:new Set(activities.map(a=>a.userId)).size,personalRecordsEarned:activities.reduce((s,a)=>s+(a.personalRecordsEarned?.length||0),0),greatnessMarksEarned:activities.reduce((s,a)=>s+(a.achievementIds?.length||0),0)};}
  function recordOperationalEvent(userId,eventName){if(!CLIENT_OPERATIONAL_EVENTS.has(eventName))throw new ApiError("INVALID_OPERATIONAL_EVENT","Unsupported operational event",400);userStore.updateUser(userId,user=>{audit(ensureDomain(user),eventName);return user;});return{recorded:true};}
  return{join,leave,updateSettings,membership,enroll,challengeList,start,complete,remove,setEligibility,recalculateDomain,revokeActivityContributions,journey,activity,diagnostic,mostRecentCompletedDiagnostic,feed,weeklySummary,route,recordOperationalEvent,validateCompletion};
}

module.exports={createSteppingIntoGreatnessService,validateCompletion,verificationDiagnostic,redactedVerificationTrace,verificationFor,ensureDomain,CHALLENGES,VERIFICATION_LEVELS,CLIENT_OPERATIONAL_EVENTS};
