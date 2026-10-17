"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {aggregateEventConversions}=require("../src/services/wellnessEventConversions");
test("counts only linked event claims and verified trial origins",()=>{
 const guests=[{id:"a",event:"rooftop-yoga"},{id:"b",event:"rooftop-yoga"},{id:"c",event:"another"}];
 const users=[{wellnessEventClaims:[{id:"a",eventId:"rooftop-yoga"}],trialAccess:{acceptedAt:"2026-10-17",origin:{kind:"verified-event-check-in",eventId:"rooftop-yoga",checkInId:"a"}}},{wellnessEventClaims:[{id:"b",eventId:"rooftop-yoga"}],trialAccess:{acceptedAt:"2026-10-17",origin:{kind:"verified-event-check-in",eventId:"another",checkInId:"b"}}},{trialAccess:{acceptedAt:"2026-10-17",origin:{kind:"verified-event-check-in",eventId:"rooftop-yoga",checkInId:"unverified"}}}];
 const result=aggregateEventConversions(guests,users,"rooftop-yoga");
 assert.equal(result.checkedIn,2);assert.equal(result.linkedAccounts,2);assert.equal(result.trialActivations,1);assert.equal(result.conversionRate,50);assert.equal(result.membershipConversions,null);
 assert.equal(JSON.stringify(result).includes("email"),false);
});
test("empty events produce zero counts without invented membership conversions",()=>{
 const result=aggregateEventConversions([],[],"rooftop-yoga");
 assert.equal(result.checkedIn,0);assert.equal(result.conversionRate,0);assert.equal(result.membershipStatus,"not_integrated");
});
