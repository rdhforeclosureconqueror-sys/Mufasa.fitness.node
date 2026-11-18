"use strict";
const {buildScoutCertificationReport}=require("../src/business-os/scout");
const {buildAnalystCertificationReport}=require("../src/business-os/analyst");
const {run:runFirstFailure}=require("./marketing-bot-first-failure");
// Runs existing canonical Academy/certification implementations. No fabricated external evidence.
async function run({scout=buildScoutCertificationReport,analyst=buildAnalystCertificationReport,baseline=runFirstFailure}={}){
 const [scoutEvidence,analystEvidence]=await Promise.all([scout(),analyst()]);
 const base=baseline();
 const checks=[
  {role:"SCOUT",evidence:scoutEvidence,architecturePass:scoutEvidence.architecture?.failed?.length===0&&scoutEvidence.architecture?.scenarioCount>0,certified:scoutEvidence.certified===true},
  {role:"ANALYST",evidence:analystEvidence,architecturePass:analystEvidence.architectureReady===true&&analystEvidence.architecture?.failed?.length===0,certified:analystEvidence.certified===true}
 ];
 const roles=base.roles.map(r=>{
  const check=checks.find(c=>c.role===r.role);
  if(!check)return r;
  return {role:r.role,status:check.architecturePass?"INTERNAL_PASS":"BLOCKED",reason:check.architecturePass?"CANONICAL_ARCHITECTURE_ONLY_NOT_PLATINUM":"CANONICAL_ARCHITECTURE_FAILED",scenarioCount:check.evidence.architecture?.scenarioCount||0,firstFailure:check.evidence.architecture?.failed?.[0]||null,platinumCertified:check.certified};
 });
 return {kind:"MarketingBotCanonicalRoleEvidence",schemaVersion:1,mode:"SIMULATED_NO_SIDE_EFFECTS",platinumCertified:false,liveEnabled:false,roles,firstFailure:roles.find(r=>r.status==="BLOCKED")||null,externalEvidenceVerified:false};
}
if(require.main===module)run().then(report=>{process.stdout.write(JSON.stringify(report,null,2)+"\n");if(report.firstFailure)process.exitCode=1}).catch(e=>{process.stderr.write(JSON.stringify({error:e.message})+"\n");process.exitCode=2});
module.exports={run};
