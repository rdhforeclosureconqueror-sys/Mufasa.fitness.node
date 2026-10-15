"use strict";
const assert=require("node:assert/strict");
const S=require("../src/business-os/sales");
const scenarios=[
 {id:"qualified-offer",expected:"PASS",run(){const q=S.QualificationAssessment({id:"qualification",organizationId:"lab-org",workId:"lab-work",version:1,qualificationInputRef:{artifactType:"QualificationInput",artifactId:"input",version:1,digest:"a".repeat(64),organizationId:"lab-org",workId:"lab-work"},criteria:[{id:"need",question:"Yoga needed?",status:"SATISFIED",evidenceRefs:["simulated-inquiry"]}],disposition:"QUALIFIED",limitations:[],missingEvidence:[]});const p=S.proposeOffer({id:"proposal",organizationId:"lab-org",workId:"lab-work",opportunityId:"opportunity",qualification:q,capabilities:[{id:"yoga",organizationId:"lab-org",workId:"lab-work",version:1,serviceId:"yoga",description:"Yoga",status:"SUPPORTED",evidenceRefs:["simulated-capability"],limitations:[]}]});assert.equal(p.approved,false);assert.equal(p.accepted,false);return {qualification:q.disposition,proposalId:p.id,approved:p.approved}}},
 {id:"unauthorized-approval",expected:"REJECT",run(){S.ApprovalRequest({id:"approval",proposal:{},binding:{kind:"EconomicOfferBinding",status:"EVIDENCE_BOUND",approved:true}})}},
 {id:"missing-economic-evidence",expected:"REJECT",run(){S.EconomicOfferBinding({id:"binding",proposal:{}})}}
];
function runScenario(s){const start=Date.now();try{const details=s.run();return {id:s.id,expected:s.expected,actual:"PASS",passed:s.expected==="PASS",details,durationMs:Date.now()-start}}catch(e){return {id:s.id,expected:s.expected,actual:"REJECT",passed:s.expected==="REJECT",firstFailure:e.message,durationMs:Date.now()-start}}}
const results=scenarios.map(runScenario);
const report={kind:"BusinessOSAcceptanceReport",schemaVersion:1,mode:"SIMULATED_NO_SIDE_EFFECTS",passed:results.every(x=>x.passed),total:results.length,results};
if(require.main===module){process.stdout.write(JSON.stringify(report,null,2)+"\n");if(!report.passed)process.exitCode=1}
module.exports={scenarios,runScenario,report};
