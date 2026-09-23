"use strict";

const {runScoutPlatinumArchitecture}=require("./academy-executors");
const {scoutReadiness}=require("./readiness");

async function buildScoutCertificationReport({sourceHealth=[],liveEvidence=[],outcomeFeedback=[],humanAcceptance=null,clock=()=>new Date(),id,brainVersion="SMART_SCOUT@1"}={}){
 const architectureRun=await runScoutPlatinumArchitecture({clock,id,brainVersion});
 const readiness=scoutReadiness({architectureResults:architectureRun.results,sourceHealth,liveEvidence,outcomeFeedback,humanAcceptance});
 const nextActions=[];
 if(readiness.gates.SCOUT_PLATINUM_ARCHITECTURE_READY!=="PASS")nextActions.push("Repair failing canonical Scout Academy scenarios.");
 if(readiness.gates.SCOUT_APPROVED_SOURCE_CONFIGURED!=="PASS")nextActions.push("Configure and verify an approved official read-only source.");
 if(readiness.gates.SCOUT_LIVE_SOURCE_VERIFIED!=="PASS")nextActions.push("Run the approved source and preserve a verified provider record.");
 if(readiness.gates.SCOUT_OUTCOME_FEEDBACK_VERIFIED!=="PASS")nextActions.push("Complete an independent experiment and import aggregate outcome feedback.");
 if(readiness.humanAcceptance.status!=="PASS")nextActions.push("Record authenticated human acceptance after reviewing all evidence.");
 return Object.freeze({generatedAt:clock().toISOString(),brainVersion,architecture:{scenarioCount:architectureRun.results.length,passed:architectureRun.results.filter(x=>x.verdict==="PASS").length,failed:architectureRun.results.filter(x=>x.verdict!=="PASS").map(x=>({scenarioId:x.scenarioId,verdict:x.verdict,firstFailure:x.diagnostics?.academyFirstFailure||x.diagnostics?.brainFirstFailure||null}))},readiness,nextActions,certified:readiness.gates.SCOUT_PLATINUM_CERTIFIED==="PASS"});
}

module.exports={buildScoutCertificationReport};
