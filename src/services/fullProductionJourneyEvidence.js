"use strict";
// Explicit evidence boundaries for full production signup → RSVP → check-in → CRM.
// A missing receipt is BLOCKED, never a simulated PASS.
const STEPS=[
 ["campaignEntry","Campaign entry with attribution"],
 ["signup","Production signup persisted"],
 ["authentication","New customer authenticated"],
 ["event","Isolated event published"],
 ["rsvp","RSVP persisted and read back"],
 ["checkin","Attendance persisted and read back"],
 ["crm","CRM record and attribution read back"],
 ["cleanup","Only test-owned records cleaned up"]
];
function evaluateFullJourney(evidence={}){
 let blocked=false,firstFailure=null;
 const checks=STEPS.map(([id,label])=>{
  const receipt=evidence[id];
  if(blocked)return {id,label,status:"BLOCKED",reason:"UPSTREAM_FAILURE"};
  if(!receipt||receipt.verified!==true){
   const status=receipt?.verified===false?"FAIL":"BLOCKED";
   const reason=receipt?.reason||"NO_VERIFIED_PRODUCTION_RECEIPT";
   firstFailure={id,status,reason};blocked=true;
   return {id,label,status,reason};
  }
  return {id,label,status:"PASS"};
 });
 return {kind:"FullProductionCustomerJourneyEvidence",schemaVersion:1,mode:"EVIDENCE_ONLY_NO_PRODUCTION_WRITES",passed:!firstFailure,firstFailure,checks,executionPerformed:false,limitations:["This evaluates independently verified receipts; it does not create accounts, events, payments, check-ins, or CRM entries."]};
}
module.exports={STEPS,evaluateFullJourney};
