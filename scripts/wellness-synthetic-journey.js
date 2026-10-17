#!/usr/bin/env node
"use strict";
// Local isolated acceptance harness. Does not connect to the production server or write CRM records.
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createEventCatalog}=require("../src/services/communityEventCatalog");
const {createResidentialCommunityService}=require("../src/services/residentialCommunityService");
const {createEventCheckinStore}=require("../src/services/eventCheckinStore");
const {aggregateEventConversions}=require("../src/services/wellnessEventConversions");
function run(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"milele-wellness-acceptance-"));
 const checks=[],clock=()=>Date.parse("2026-10-15T12:00:00Z");
 let firstFailure=null,blocked=false;
 function step(id,label,fn){
  if(blocked){checks.push({id,label,status:"BLOCKED",reason:"UPSTREAM_FAILURE"});return}
  try{fn();checks.push({id,label,status:"PASS"})}
  catch(error){firstFailure={id,label,reason:error.message};checks.push({id,label,status:"FAIL",reason:error.message});blocked=true}
 }
 try{
  const users=new Map();
  const userStore={
   loadUser:id=>users.has(id)?structuredClone(users.get(id)):null,
   listUsers:()=>Array.from(users.values(),v=>structuredClone(v)),
   updateUser:(id,fn)=>{if(!users.has(id))throw Error("UNKNOWN_MEMBER");const next=fn(structuredClone(users.get(id)));users.set(id,next);return structuredClone(next)}
  };
  const catalog=createEventCatalog({filePath:path.join(dir,"catalog.json"),clock});
  const guests=createEventCheckinStore({dataDir:dir,clock});
  const community=createResidentialCommunityService({userStore,eventCatalog:catalog,guestCheckins:guests,clock});
  let event,guestPass,firstCheckin;
  step("WJ-019","Register synthetic member",()=>{
   const id="synthetic-member";
   if(users.has(id))throw Error("DUPLICATE_MEMBER");
   users.set(id,{userId:id,displayName:"Synthetic Member",residentialWellness:{communicationConsent:true}});
   if(!userStore.loadUser(id))throw Error("MEMBER_NOT_STORED");
  });
  step("WJ-009","Create and confirm isolated event",()=>{
   event=catalog.create({title:"Synthetic Yoga",location:"Test Studio",type:"yoga",capacity:3,startAt:"2026-11-14T15:00:00Z",endAt:"2026-11-14T16:00:00Z"},"admin");
   catalog.update(event.eventId,{status:"confirmed"},"admin");
   if(!community.dashboard("synthetic-member").events.some(e=>e.eventId===event.eventId))throw Error("EVENT_NOT_DISCOVERABLE");
  });
  step("WJ-011","Member RSVP persists",()=>{
   const r=community.rsvp("synthetic-member",event.eventId);
   if(r.status!=="going"||community.attendance(event.eventId).registered!==1)throw Error("RSVP_NOT_RECORDED");
  });
  step("WJ-015","Duplicate RSVP is idempotent",()=>{
   community.rsvp("synthetic-member",event.eventId);
   if(community.attendance(event.eventId).registered!==1)throw Error("DUPLICATE_RSVP");
  });
  step("WJ-013","Guest check-in without account",()=>{
   guestPass=guests.checkin({event:event.eventId,name:"Synthetic Guest",email:"synthetic@example.invalid",before:"Ready"});
   if(guests.roster().filter(x=>x.event===event.eventId).length!==1)throw Error("GUEST_NOT_RECORDED");
  });
  step("WJ-014","Guest reflection stored",()=>{
   guests.reflect({...guestPass,after:"Calm"});
   if(guests.roster()[0].after.response!=="Calm")throw Error("REFLECTION_NOT_STORED");
  });
  step("WJ-020","Verified guest claim links to synthetic member",()=>{
   const claim=guests.claim({...guestPass,userId:"synthetic-member"});
   if(claim.eventId!==event.eventId)throw Error("CLAIM_EVENT_MISMATCH");
   userStore.updateUser("synthetic-member",user=>{user.wellnessEventClaims=[{id:claim.id,eventId:claim.eventId,claimedAt:claim.claimedAt}];return user});
   if(!guests.roster().some(x=>x.id===claim.id&&x.claimedBy==="synthetic-member"))throw Error("CLAIM_NOT_PERSISTED");
  });
  step("WJ-021","Verified event origin converts to seven-day trial",()=>{
   const user=userStore.loadUser("synthetic-member"),claim=user.wellnessEventClaims[0];
   if(!claim||!guests.roster().some(x=>x.id===claim.id&&x.claimedBy===user.userId))throw Error("UNVERIFIED_TRIAL_ORIGIN");
   const acceptedAt=new Date(clock()).toISOString();
   userStore.updateUser(user.userId,record=>{record.trialAccess={acceptedAt,expiresAt:new Date(clock()+7*86400000).toISOString(),paymentRequired:false,origin:{kind:"verified-event-check-in",eventId:claim.eventId,checkInId:claim.id,claimedAt:new Date(claim.claimedAt).toISOString()}};return record});
   if(userStore.loadUser(user.userId).trialAccess.origin.checkInId!==claim.id)throw Error("TRIAL_ORIGIN_NOT_PERSISTED");
  });
  step("WJ-022","Event conversion report counts verified trial",()=>{
   const report=aggregateEventConversions(guests.roster(),userStore.listUsers(),event.eventId);
   if(report.checkedIn!==1||report.linkedAccounts!==1||report.trialActivations!==1||report.conversionRate!==100)throw Error("CONVERSION_REPORT_MISMATCH");
  });
  step("WJ-012","Member check-in persists",()=>{
   firstCheckin=community.checkIn(event.eventId,"synthetic-member");
   if(!community.attendance(event.eventId).attendees.some(a=>a.checkedInAt===firstCheckin.checkedInAt))throw Error("ATTENDANCE_NOT_VISIBLE");
  });
  step("WJ-018","Repeat check-in is idempotent",()=>{
   if(community.checkIn(event.eventId,"synthetic-member").checkedInAt!==firstCheckin.checkedInAt)throw Error("DUPLICATE_CHECKIN");
  });
  step("WJ-016","Wrong event check-in blocked",()=>{
   let rejected=false;
   try{community.checkIn("nonexistent-event","synthetic-member")}catch(_){rejected=true}
   if(!rejected)throw Error("WRONG_EVENT_ACCEPTED");
  });
  return {kind:"WellnessSyntheticJourneyReport",schemaVersion:1,mode:"ISOLATED_TEMP_STORAGE_NO_PRODUCTION_SIDE_EFFECTS",passed:!firstFailure,firstFailure,checks,limitations:["Service-level simulation, not real browser signup or HTTP authorization; trial creation is modeled in the harness rather than invoking the production endpoint","Admin API authorization and real CRM synchronization require separate integration tests","All test identities and records are temporary"]};
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
}
if(require.main===module){try{const report=run();console.log(JSON.stringify(report,null,2));process.exitCode=report.passed?0:1}catch(error){console.error(JSON.stringify({kind:"WellnessSyntheticJourneyReport",passed:false,firstFailure:{id:"HARNESS_SETUP",reason:error.message}}));process.exitCode=2}}
module.exports={run};
