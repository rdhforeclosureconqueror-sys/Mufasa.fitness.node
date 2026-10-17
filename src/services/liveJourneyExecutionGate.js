"use strict";
// Explicit production execution gate. This module does not perform production writes.
// Only verified operational safeguards can authorize an eventual executor.
const {assessLiveJourneyPreflight,REQUIRED}=require("./liveJourneySafetyContract");
const CONFIRM="AUTHORIZE_ISOLATED_PRODUCTION_JOURNEY";
function assessExecutionRequest(input={},context={}){
 const allowed=new Set([...REQUIRED,"confirmation"]);
 if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).some(key=>!allowed.has(key)))
  return {authorized:false,executionPerformed:false,firstFailure:"INVALID_REQUEST"};
 if(input.confirmation!==CONFIRM)
  return {authorized:false,executionPerformed:false,firstFailure:"EXPLICIT_CONFIRMATION_REQUIRED"};
 const verified=Object.fromEntries(REQUIRED.map(key=>[key,input[key]===true&&context[key]===true]));
 const preflight=assessLiveJourneyPreflight(verified);
 return {authorized:false,executionPerformed:false,readyForImplementation:preflight.readyForImplementation,firstFailure:preflight.firstFailure||"EXECUTOR_NOT_IMPLEMENTED",checks:preflight.checks};
}
module.exports={assessExecutionRequest,CONFIRM};
