"use strict";
const {execute}=require("./business-os-acceptance-report");
const ROLE_ORDER=["SCOUT","ANALYST","EXPERIMENT_MANAGER","ECONOMICS","SALES","PRODUCTION","QA","LEARNING","MANAGER"];
const COVERAGE=Object.freeze({
 SCOUT:[],ANALYST:[],
 EXPERIMENT_MANAGER:["experiment-approval-requires-human","experiment-idempotency-budget"],
 ECONOMICS:[],
 SALES:["qualified-offer","unauthorized-approval","missing-economic-evidence"],
 PRODUCTION:[],QA:[],LEARNING:[],MANAGER:[]
});
function run({acceptance=execute}={}){
 const base=acceptance();
 if(!base||base.mode!=="SIMULATED_NO_SIDE_EFFECTS"||!Array.isArray(base.results))throw Error("untrusted_acceptance_report");
 const byId=new Map(base.results.map(r=>[r.id,r]));
 const roles=ROLE_ORDER.map(role=>{
  const required=COVERAGE[role];
  if(!required.length)return {role,status:"BLOCKED",reason:"NO_REGISTERED_ROLE_ACCEPTANCE",scenarioIds:[]};
  const missing=required.filter(id=>!byId.has(id));
  if(missing.length)return {role,status:"BLOCKED",reason:"MISSING_SCENARIO_RESULT",scenarioIds:required,missing};
  const failed=required.filter(id=>byId.get(id).passed!==true);
  if(failed.length)return {role,status:"BLOCKED",reason:"ACCEPTANCE_FAILED",scenarioIds:required,failed};
  return {role,status:"INTERNAL_PASS",reason:"SYNTHETIC_ONLY_NOT_PLATINUM",scenarioIds:required};
 });
 const firstFailure=roles.find(r=>r.status==="BLOCKED")||null;
 return {kind:"MarketingBotFirstFailureReport",schemaVersion:1,mode:"SIMULATED_NO_SIDE_EFFECTS",platinumCertified:false,liveEnabled:false,acceptanceDigest:base.reportDigest||null,roles,firstFailure,readyForLive:false};
}
if(require.main===module){try{const report=run();process.stdout.write(JSON.stringify(report,null,2)+"\n");if(report.firstFailure)process.exitCode=1;}catch(e){process.stderr.write(JSON.stringify({kind:"MarketingBotFirstFailureExecutionError",error:e.message})+"\n");process.exitCode=2;}}
module.exports={run,ROLE_ORDER,COVERAGE};
