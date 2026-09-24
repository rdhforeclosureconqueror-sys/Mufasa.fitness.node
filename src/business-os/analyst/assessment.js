"use strict";
const crypto=require("node:crypto");
const {AnalystAssessment,DISPOSITIONS,EVIDENCE_CLASSES}=require("./contracts");
const forbiddenAction=/^(LAUNCH_CAMPAIGN|CONTACT_PROSPECT|SPEND_MONEY|RUN_TEST_A|PUBLISH|CHANGE_PRICING)$/;
const hasRefs=v=>Array.isArray(v)&&v.length>0&&v.every(x=>typeof x==="string"&&x.trim());
const unit=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(1,Number(v))):0;
function analyzeOpportunity(input={}){
 const evidence=Array.isArray(input.evidence)?input.evidence:[];
 if(input.requestedAction&&forbiddenAction.test(input.requestedAction))return decision(input,"REJECT",0,["Requested action exceeds Analyst authority."],["UNAUTHORIZED_ACTION"]);
 if(input.promptInjection)return decision(input,"REJECT",0,["Source content is untrusted data, not instruction."],["PROMPT_INJECTION"]);
 if(input.personalData||input.credentialsPresent)return decision(input,"REJECT",0,["Private or credential-bearing input cannot be analyzed."],["PRIVACY_BOUNDARY"]);
 if(!evidence.length||!evidence.some(x=>hasRefs(x.evidenceRefs)))return decision(input,"REQUEST_EVIDENCE",0,["No attributable evidence supports analysis."],["MISSING_EVIDENCE"]);
 if(evidence.some(x=>!EVIDENCE_CLASSES.includes(x.classification||"UNVERIFIED")))throw new Error("invalid_analyst_evidence_classification");
 const contradictions=[...(input.contradictions||[])],unknowns=[...(input.unknowns||[])];
 const independent=evidence.filter(x=>x.classification==="VERIFIED_OUTCOME");
 const weak=evidence.every(x=>["SYNTHETIC","CONTROLLED_VALIDATION","UNVERIFIED"].includes(x.classification||"UNVERIFIED"));
 const score=Math.round(100*(.35*unit(input.problemEvidence)+.25*unit(input.productFit)+.2*unit(input.readiness)+.2*unit(independent.length?input.outcomeStrength:0)));
 if(contradictions.length)return decision(input,"ESCALATE_CONTRADICTION",score,["Material contradictory evidence requires preservation and resolution."],contradictions);
 if(input.scoutDisposition==="REJECT_UNSUPPORTED"||weak)return decision(input,"REJECT",score,["Controlled, synthetic, or unverified evidence cannot establish independent demand."],["UNSUPPORTED_EVIDENCE"]);
 if(input.productReadiness&&input.productReadiness!=="OPERATIONAL")return decision(input,"HOLD",score,["Product readiness does not support an experiment recommendation."],["PRODUCT_NOT_READY"]);
 if(unknowns.length||score<55)return decision(input,"REQUEST_EVIDENCE",score,["Material unknowns or low evidence strength prevent advancement."],unknowns.length?unknowns:["LOW_EVIDENCE_STRENGTH"]);
 return decision(input,"ADVANCE_TO_EXPERIMENT",score,["Attributable evidence supports only a bounded experiment recommendation."],[]);
}
function decision(input,disposition,score,reasoning,openQuestions){if(!DISPOSITIONS.includes(disposition))throw new Error("invalid_analyst_disposition");const evidenceRefs=[...new Set((input.evidence||[]).flatMap(x=>x.evidenceRefs||[]))];return Object.freeze({policyRef:"ANALYST_REASONING_POLICY_V1",disposition,score,confidence:unit(input.confidence??score/100),reasoning:Object.freeze(reasoning),openQuestions:Object.freeze(openQuestions),evidenceRefs:Object.freeze(evidenceRefs),limitations:Object.freeze(["Analysis is advisory; it does not prove market demand, causality, conversion, or profitability.",...(input.limitations||[])]),historicalEvidenceRewritten:false})}
function createAnalystAssessment(input={}){const result=analyzeOpportunity(input);if(!result.reasoning.length||!result.evidenceRefs.length)throw new Error("meaningful_analysis_and_evidence_required");const id=input.id||`analyst-assessment:${crypto.createHash("sha256").update(JSON.stringify({candidateRef:input.candidateRef,evidenceRefs:result.evidenceRefs,version:input.version||1})).digest("hex").slice(0,16)}`;return AnalystAssessment({id,organizationId:input.organizationId,candidateRef:input.candidateRef,evidenceRefs:result.evidenceRefs,analysis:{score:result.score,reasoning:result.reasoning,openQuestions:result.openQuestions},disposition:result.disposition,confidence:result.confidence,limitations:result.limitations,provenance:{policyRef:result.policyRef,inputArtifactRefs:input.inputArtifactRefs||[input.candidateRef]},priorAssessmentRef:input.priorAssessmentRef||null,historicalEvidenceRewritten:false,version:input.version||1})}
module.exports={analyzeOpportunity,createAnalystAssessment};
