"use strict";
// Membership is assigned through trusted administrative provisioning only.
// User-selected interests, URL parameters, and client-supplied profile data never grant access.
function isVerifiedPanAfricanMember(user){
 const membership=user?.communityMemberships?.panAfrican;
 return membership?.status==="approved" &&
   typeof membership.approvedBy==="string" && membership.approvedBy.trim().length>0 &&
   typeof membership.approvedAt==="string" && Number.isFinite(Date.parse(membership.approvedAt));
}
function getPanAfricanAccess(userStore,userId){
 if(!userId) return {authorized:false,reason:"authentication_required"};
 const user=userStore.loadUser(userId);
 if(!user) return {authorized:false,reason:"account_not_found"};
 return {authorized:isVerifiedPanAfricanMember(user),reason:isVerifiedPanAfricanMember(user)?"verified_member":"membership_not_verified"};
}

function isValidLegacyDay(value){
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const parsed=new Date(value+"T12:00:00Z");
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value&&parsed.getTime()<=Date.now()+86400000;
}
function migrateLegacyPanAfricanProgress(userStore,userId,input={}){
 if(!getPanAfricanAccess(userStore,userId).authorized)return {status:"membership_not_verified",imported:false};
 const candidates={
  combinedEightLimbsStart:input.combinedEightLimbsStart,
  eightPillarsStart:input.eightPillarsStart
 };
 const provided=Object.entries(candidates).filter(([,v])=>v!==undefined&&v!==null&&v!=="");
 if(!provided.length)return {status:"no_legacy_progress",imported:false};
 if(provided.some(([,v])=>!isValidLegacyDay(v)))return {status:"invalid_legacy_date",imported:false};
 let result;
 userStore.updateUser(userId,user=>{
  const prior=user.panAfricanJourneyProgress||{};
  const dates={};
  for(const [key,value] of provided)if(!prior[key])dates[key]=value;
  user.panAfricanJourneyProgress={...prior,...dates,schemaVersion:1,updatedAt:new Date().toISOString()};
  result={status:"ok",imported:Object.keys(dates).length>0,progress:structuredClone(user.panAfricanJourneyProgress)};
  return user;
 });
 return result;
}
function getPanAfricanProgress(userStore,userId){
 if(!getPanAfricanAccess(userStore,userId).authorized)return null;
 return userStore.loadUser(userId)?.panAfricanJourneyProgress||null;
}
module.exports={isVerifiedPanAfricanMember,getPanAfricanAccess,migrateLegacyPanAfricanProgress,getPanAfricanProgress};
