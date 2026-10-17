"use strict";
// Aggregate counts only. No guest emails, names, reflection text, or claim tokens.
function aggregateEventConversions(guests,users,eventId){
 const checkIns=guests.filter(g=>g?.event===eventId);
 const ids=new Set(checkIns.map(g=>g.id));
 const linkedIds=new Set(),trialIds=new Set();
 for(const user of users){
  const claims=Array.isArray(user?.wellnessEventClaims)?user.wellnessEventClaims:[];
  for(const claim of claims){
   if(claim?.eventId===eventId&&ids.has(claim.id))linkedIds.add(claim.id);
  }
  const origin=user?.trialAccess?.origin;
  if(user?.trialAccess?.acceptedAt&&origin?.kind==="verified-event-check-in"&&origin.eventId===eventId&&ids.has(origin.checkInId)&&linkedIds.has(origin.checkInId))trialIds.add(origin.checkInId);
 }
 return{eventId,checkedIn:checkIns.length,linkedAccounts:linkedIds.size,trialActivations:trialIds.size,conversionRate:linkedIds.size?Number((100*trialIds.size/linkedIds.size).toFixed(1)):0,conversionRateBasis:"linkedAccounts",membershipConversions:null,membershipStatus:"not_integrated"};
}
module.exports={aggregateEventConversions};
