"use strict";
function evaluateSimulationRun(report){const assertions=[
 ["world-determinism",Boolean(report.reproducibility?.seed&&report.reproducibility?.scenarioVersion)],
 ["ledger-reconciles",report.reconciliation?.reconciled===true],
 ["governance-preserved",report.cycles.every(c=>c.decision.actions?.length===0||c.observations.length===c.decision.actions.length)],
 ["obligations-persist",Array.isArray(report.world?.obligations)],
 ["first-failure-truthful",report.gate==="PASS"?!report.diagnostics.simulationFirstFailure:Boolean(report.diagnostics.simulationFirstFailure)]
 ].map(([id,pass])=>({id,status:pass?"PASS":"FAIL",evidenceRefs:[`simulation-run:${report.runId}`]}));return Object.freeze({kind:"OrganismEvaluation",simulationRunRef:report.runId,verdict:assertions.every(x=>x.status==="PASS")?"PASS":"FAIL",assertions,doesNotModifyBrainCertification:true})}
module.exports={evaluateSimulationRun};
