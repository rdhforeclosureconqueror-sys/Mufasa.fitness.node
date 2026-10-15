"use strict";
const crypto=require("node:crypto");
const {scenarios,runScenario}=require("./business-os-acceptance-lab");
const validId=id=>typeof id==="string"&&/^[a-z0-9-]+$/.test(id);
function execute({scenarioIds=scenarios.map(x=>x.id),commitSha="UNKNOWN",deployment="LOCAL"}={}){
 if(!Array.isArray(scenarioIds)||!scenarioIds.length||scenarioIds.some(id=>!validId(id)))throw Error("invalid_acceptance_selection");
 if(new Set(scenarioIds).size!==scenarioIds.length)throw Error("duplicate_acceptance_selection");
 const byId=new Map(scenarios.map(s=>[s.id,s]));
 const results=scenarioIds.map(id=>{const scenario=byId.get(id);if(!scenario)throw Error("unknown_acceptance_scenario:"+id);const {durationMs,...stable}=runScenario(scenario);return stable});
 const summary={kind:"BusinessOSAcceptanceReport",schemaVersion:2,mode:"SIMULATED_NO_SIDE_EFFECTS",commitSha,deployment,passed:results.every(r=>r.passed),total:results.length,results};
 return {...summary,reportDigest:crypto.createHash("sha256").update(JSON.stringify(summary)).digest("hex")};
}
if(require.main===module){
 try{
  const ids=process.argv.slice(2);
  const report=execute({scenarioIds:ids.length?ids:undefined,commitSha:process.env.GITHUB_SHA||"UNKNOWN",deployment:"CI_OR_LOCAL"});
  process.stdout.write(JSON.stringify(report,null,2)+"\n");
  if(!report.passed)process.exitCode=1;
 }catch(error){process.stderr.write(JSON.stringify({kind:"AcceptanceLabExecutionError",firstFailure:error.message})+"\n");process.exitCode=2}
}
module.exports={execute};
