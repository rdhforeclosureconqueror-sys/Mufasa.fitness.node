"use strict";

const crypto=require("node:crypto");
const {ScoutOutcomeFeedback}=require("./contracts");
const hash=value=>crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const count=(value,name)=>{if(!Number.isInteger(value)||value<0)throw new Error(`invalid_outcome_count:${name}`);return value};

function createOutcomeFeedbackFromVerifiedExperiment({experimentResult,economicAssessment,measurements,audience,product,opportunityFamily,observationWindow,confidence=.5,limitations=[],version=1}={}){
 if(experimentResult?.kind!=="ExperimentResult")throw new Error("canonical_experiment_result_required");
 if(economicAssessment?.kind!=="EconomicAssessment")throw new Error("canonical_economic_assessment_required");
 if(experimentResult.organizationId!==economicAssessment.organizationId||experimentResult.workId!==economicAssessment.workId)throw new Error("experiment_economics_lineage_mismatch");
 if(!Array.isArray(experimentResult.evidenceRefs)||!experimentResult.evidenceRefs.length||!Array.isArray(economicAssessment.evidenceRefs)||!economicAssessment.evidenceRefs.length)throw new Error("verified_outcome_evidence_required");
 if(!measurements||typeof measurements!=="object")throw new Error("outcome_measurements_required");
 const qualifiedInterestCount=count(measurements.qualifiedInterestCount,"qualifiedInterestCount");
 const conversionCount=count(measurements.conversionCount,"conversionCount");
 const completionCount=count(measurements.completionCount,"completionCount");
 const continuationCount=count(measurements.continuationCount,"continuationCount");
 if(conversionCount>qualifiedInterestCount)throw new Error("conversion_exceeds_qualified_interest");
 if(continuationCount>completionCount)throw new Error("continuation_exceeds_completion");
 const evidenceRefs=[...new Set([...experimentResult.evidenceRefs,...economicAssessment.evidenceRefs,...(measurements.evidenceRefs||[])])];
 if(!evidenceRefs.length)throw new Error("verified_outcome_evidence_required");
 const id=`scout-feedback:${hash({experimentResult:experimentResult.id,economicAssessment:economicAssessment.id,version}).slice(0,16)}`;
 return ScoutOutcomeFeedback({id,organizationId:experimentResult.organizationId,opportunityFamily,experimentRefs:[experimentResult.id,experimentResult.proposalRef],audience,product,resultClassification:experimentResult.resultClass,qualifiedInterestCount,conversionCount,completionCount,continuationCount,refundClassification:measurements.refundClassification||"UNKNOWN",revenueClassification:economicAssessment.actualValue?.classification||"UNKNOWN",contributionClassification:economicAssessment.grossContribution?.classification||"UNKNOWN",evidenceRefs,confidence,limitations:[...limitations,...experimentResult.limitations,...economicAssessment.limitations],observationWindow,provenance:{classification:"INDEPENDENT_EXPERIMENT",experimentResultRef:experimentResult.id,economicAssessmentRef:economicAssessment.id,workId:experimentResult.workId},version});
}

module.exports={createOutcomeFeedbackFromVerifiedExperiment};
