"use strict";
const {assessOpportunity}=require("../src/business-os/scout/assessment");
const {analyzeOpportunity}=require("../src/business-os/analyst/assessment");
// Controlled internal policy handoff: never converts Scout's score into evidence.
function evaluate({scoutInput={},analystInput={}}={}){
 const scout=assessOpportunity(scoutInput);
 const analyst=analyzeOpportunity({...analystInput,scoutDisposition:scout.disposition});
 const blocked=["REJECT_UNSUPPORTED","INSUFFICIENT_EVIDENCE","ESCALATE_SOURCE_PROBLEM","STALE_SIGNAL","CONTRADICTORY","PRODUCT_NOT_READY"].includes(scout.disposition);
 return Object.freeze({kind:"MarketingBotScoutAnalystPolicyHandoff",mode:"SIMULATED_NO_SIDE_EFFECTS",scoutDisposition:scout.disposition,analystDisposition:analyst.disposition,scoutScore:scout.score,analystScore:analyst.score,scoutEvidenceRefs:(scoutInput.observations||[]).map(x=>x.sourceId).filter(Boolean),analystEvidenceRefs:analyst.evidenceRefs,gate:blocked||analyst.disposition!=="ADVANCE_TO_EXPERIMENT"?"BLOCKED":"ADVISORY_ONLY",firstFailure:blocked?"SCOUT":analyst.disposition!=="ADVANCE_TO_EXPERIMENT"?"ANALYST":null,liveEnabled:false,platinumCertified:false,experimentAuthorized:false});
}
module.exports={evaluate};
