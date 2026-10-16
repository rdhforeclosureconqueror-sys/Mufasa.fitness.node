"use strict";
// Production live-journey execution is denied unless every safety prerequisite is explicit.
// This module is a fail-closed policy contract, not an executor or a production write path.
const REQUIRED=["adminAuthorized","explicitRunConfirmation","testIdentityIsolated","testEventIsolated","notificationsSuppressed","paymentsDisabled","cleanupVerified","rollbackCommitRecorded"];
function assessLiveJourneyPreflight(input={}){
 const checks=REQUIRED.map(id=>({id,status:input[id]===true?"PASS":"FAIL"}));
 const firstFailure=checks.find(c=>c.status==="FAIL")?.id||null;
 return {mode:"PRODUCTION_LIVE_JOURNEY_PREFLIGHT_ONLY",authorized:false,readyForImplementation:!firstFailure,firstFailure,checks,executionPerformed:false};
}
module.exports={assessLiveJourneyPreflight,REQUIRED};
