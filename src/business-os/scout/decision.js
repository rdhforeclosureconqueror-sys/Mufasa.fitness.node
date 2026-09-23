"use strict";

const crypto=require("node:crypto");
const {SCOUT_REASONING_POLICY}=require("./policy");
const {assessOpportunity}=require("./assessment");

const SOURCE_PROBLEMS=new Set(["OUTAGE","RATE_LIMITED","REVOKED","PAGINATION_INCOMPLETE"]);
const PRIVATE_KEYS=new Set(["email","phone","address","fullName","cardNumber","bankAccount","routingNumber"]);
const fingerprint=value=>crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function deduplicateObservations(observations=[]){
 const seen=new Set(),unique=[],duplicateRefs=[];
 for(const observation of observations){
  const key=observation.deduplicationKey||fingerprint({
   sourceId:observation.sourceId,
   sourceResourceRef:observation.sourceResourceRef,
   normalizedStatement:observation.normalizedStatement,
   signalType:observation.signalType,
   observedAt:observation.observedAt
  });
  if(seen.has(key)){duplicateRefs.push(observation.id||key);continue}
  seen.add(key);unique.push(observation);
 }
 return Object.freeze({observations:Object.freeze(unique),duplicateRefs:Object.freeze(duplicateRefs)});
}

function containsPrivateData(value){
 if(!value||typeof value!=="object")return false;
 return Object.keys(value).some(key=>PRIVATE_KEYS.has(key))||Object.values(value).some(containsPrivateData);
}

function evaluateScoutDecision(input={}){
 const evidenceRefs=Array.isArray(input.evidenceRefs)?input.evidenceRefs.filter(Boolean):[];
 const requestedAction=input.requestedAction||null;
 if(requestedAction&&SCOUT_REASONING_POLICY.mayNot.includes(requestedAction))return result("DENY",{reason:"PROHIBITED_SCOUT_ACTION",evidenceRefs});
 if(input.directControlRequested)return result("DENY",{reason:"DIRECT_CONTROL_OUTSIDE_SCOUT_AUTHORITY",evidenceRefs});
 if(input.analystDisposition&&input.scoutDisagrees)return result("PRESERVE_DISSENT",{reason:"SCOUT_CANNOT_OVERRIDE_ANALYST",evidenceRefs});
 if(input.toolSuccessOnly)return result("DENY_CLAIM",{reason:"TOOL_SUCCESS_IS_NOT_BUSINESS_SUCCESS",evidenceRefs});
 if(input.promptInjection)return result("TREAT_AS_UNTRUSTED_DATA",{reason:"SOURCE_CONTENT_HAS_NO_INSTRUCTION_AUTHORITY",evidenceRefs});
 if(input.personalData||containsPrivateData(input.rawRecord))return result("REJECT_AND_REDACT",{reason:"UNNECESSARY_PRIVATE_DATA",evidenceRefs,redacted:true});
 if(SOURCE_PROBLEMS.has(input.sourceState))return result("ESCALATE_SOURCE_PROBLEM",{reason:input.sourceState,evidenceRefs});
 if(input.unsupportedExternalClaim)return result("REJECT_UNSUPPORTED",{reason:"CLAIM_LACKS_EVIDENCE",evidenceRefs});
 if(input.feedbackVersion&&input.priorFeedbackVersion&&input.feedbackVersion>input.priorFeedbackVersion)return result("PRESERVE_HISTORY",{reason:"APPEND_NEW_FEEDBACK_VERSION",evidenceRefs});

 const deduplicated=deduplicateObservations(input.observations||[]);
 if(deduplicated.duplicateRefs.length)return result("DEDUPLICATE",{reason:"DUPLICATE_OBSERVATIONS_REMOVED",evidenceRefs,details:deduplicated});

 const observations=deduplicated.observations;
 if(input.lowerAttentionHasVerifiedConversions&&input.higherAttentionHasNoPurchases)return result("OUTCOMES_OUTWEIGH_ATTENTION",{reason:"VERIFIED_OUTCOMES_RANK_ABOVE_ATTENTION",evidenceRefs});
 if(input.higherAttentionHasNoPurchases&&observations.some(x=>x.signalType==="ATTENTION"))return result("ATTENTION_NOT_PURCHASE",{reason:"ATTENTION_CANNOT_ESTABLISH_PURCHASE",evidenceRefs});
 if(input.geographicMismatch&&!input.independentOutcomeStrength)return result("NEEDS_MORE_EVIDENCE",{reason:"GEOGRAPHIC_RELEVANCE_UNPROVEN",evidenceRefs});

 const assessment=assessOpportunity({...input,observations});
 return result(assessment.disposition,{reason:"ASSESSMENT_POLICY",evidenceRefs,assessment});
}

function result(decision,{reason,evidenceRefs=[],assessment=null,details=null,redacted=false}={}){
 return Object.freeze({decision,reason,evidenceRefs:Object.freeze([...evidenceRefs]),assessment,details,redacted,policyRef:SCOUT_REASONING_POLICY.id});
}

module.exports={SOURCE_PROBLEMS,deduplicateObservations,containsPrivateData,evaluateScoutDecision};
