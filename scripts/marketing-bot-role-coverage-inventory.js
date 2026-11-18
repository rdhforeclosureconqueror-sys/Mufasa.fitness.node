"use strict";
const {run:canonicalRun}=require("./marketing-bot-canonical-role-evidence");
// Registry of existing code evidence, not a claim that each role has passed live acceptance.
const EXISTING=Object.freeze({
 EXPERIMENT_MANAGER:{module:"src/business-os/experiment-manager",evidence:"scripts/business-os-acceptance-experiment-scenarios.js",scope:"INTERNAL_SYNTHETIC"},
 ECONOMICS:{module:"src/business-os/economics",evidence:"src/business-os/economics/index.js",scope:"IMPLEMENTATION_FOUND_ACCEPTANCE_NOT_WIRED"},
 SALES:{module:"src/business-os/sales",evidence:"scripts/business-os-acceptance-lab.js",scope:"INTERNAL_SYNTHETIC"},
 PRODUCTION:{module:"src/business-os/organization",evidence:"docs/architecture/ai-business-os/PHASE_6_ORGANIZATIONAL_INTELLIGENCE_ROLES.md",scope:"ROLE_CONTRACT_NOT_LIVE_VERIFIED"},
 QA:{module:"src/business-os/organization",evidence:"docs/architecture/ai-business-os/PHASE_6_ORGANIZATIONAL_INTELLIGENCE_ROLES.md",scope:"ROLE_CONTRACT_NOT_LIVE_VERIFIED"},
 LEARNING:{module:"src/business-os/organization",evidence:"docs/architecture/ai-business-os/PHASE_6_ORGANIZATIONAL_INTELLIGENCE_ROLES.md",scope:"ROLE_CONTRACT_NOT_LIVE_VERIFIED"},
 MANAGER:{module:"src/business-os/organization",evidence:"docs/architecture/ai-business-os/PHASE_6_ORGANIZATIONAL_INTELLIGENCE_ROLES.md",scope:"ROLE_CONTRACT_NOT_LIVE_VERIFIED"}
});
async function run({canonical=canonicalRun}={}){
 const report=await canonical();
 const roles=report.roles.map(r=>({...r,implementationEvidence:EXISTING[r.role]||null}));
 return {...report,kind:"MarketingBotRoleCoverageInventory",schemaVersion:1,roles,firstFailure:roles.find(r=>r.status==="BLOCKED")||null,platinumCertified:false,liveEnabled:false,customerJourneyVerified:false};
}
if(require.main===module)run().then(r=>{process.stdout.write(JSON.stringify(r,null,2)+"\n");if(r.firstFailure)process.exitCode=1}).catch(e=>{process.stderr.write(e.message+"\n");process.exitCode=2});
module.exports={run,EXISTING};
