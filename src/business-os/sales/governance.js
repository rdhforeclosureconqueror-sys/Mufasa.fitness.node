"use strict";
const {SALES_SCHEMA_VERSION,digest,artifactRef}=require("./contracts");
const {OfferProposal}=require("./offers");
const {validateEconomicAssessment}=require("../economics/contracts");
const text=x=>typeof x==="string"&&x.trim().length>0;
function requireThat(x,k){if(!x)throw new Error("invalid_sales_governance:"+k)}
function frozen(x){const y=structuredClone(x);const visit=v=>{if(v&&typeof v==="object"){Object.values(v).forEach(visit);Object.freeze(v)}return v};return visit(y)}
function EconomicOfferBinding({id,version=1,proposal,economicAssessment,limitations=[]}={}){
 const p=OfferProposal(proposal);
 requireThat(economicAssessment&&typeof economicAssessment==="object","economic_assessment");
 const e=validateEconomicAssessment(economicAssessment);
 requireThat(e.organizationId===p.organizationId&&e.workId===p.workId,"scope");
 requireThat(e.disposition==="CONTINUE","economic_disposition");
 requireThat(e.grossContribution.classification!=="UNKNOWN"&&e.unknownCosts.length===0,"economic_unknown");
 requireThat(Array.isArray(limitations)&&limitations.every(text),"limitations");
 requireThat(text(id)&&Number.isSafeInteger(version)&&version>0,"identity");
 requireThat(p.lines.every(line=>line.serviceId===e.productRef),"product_scope");
 return frozen({kind:"EconomicOfferBinding",salesSchemaVersion:SALES_SCHEMA_VERSION,id,version,organizationId:p.organizationId,workId:p.workId,proposalRef:artifactRef(p),economicAssessmentRef:{artifactType:"EconomicAssessment",artifactId:e.id,version:e.version,digest:digest(e),organizationId:e.organizationId,workId:e.workId},economicView:e.actualValue.classification==="OBSERVED"?"ACTUAL":"ESTIMATED_OR_UNKNOWN",currency:e.currency,limitations,status:"EVIDENCE_BOUND",approved:false,accepted:false,paymentVerified:false,fulfilled:false});
}
function ApprovalRequest({id,version=1,binding,proposal,limitations=[]}={}){
 requireThat(binding&&binding.kind==="EconomicOfferBinding"&&binding.salesSchemaVersion===SALES_SCHEMA_VERSION&&binding.status==="EVIDENCE_BOUND","binding");
 requireThat(Number.isSafeInteger(binding.version)&&binding.version>0&&text(binding.id),"binding_identity");
 requireThat(binding.approved===false&&binding.accepted===false&&binding.paymentVerified===false&&binding.fulfilled===false,"binding_authority");
 requireThat(binding.economicAssessmentRef&&binding.economicAssessmentRef.artifactType==="EconomicAssessment"&&text(binding.economicAssessmentRef.artifactId)&&Number.isSafeInteger(binding.economicAssessmentRef.version)&&binding.economicAssessmentRef.version>0&&/^[a-f0-9]{64}$/.test(binding.economicAssessmentRef.digest),"economic_reference");
 requireThat(binding.economicAssessmentRef.organizationId===binding.organizationId&&binding.economicAssessmentRef.workId===binding.workId,"economic_scope");
 const p=OfferProposal(proposal);
 requireThat(binding.organizationId===p.organizationId&&binding.workId===p.workId,"scope");
 const ref=artifactRef(p);
 requireThat(binding.proposalRef&&binding.proposalRef.artifactType==="OfferProposal"&&binding.proposalRef.artifactId===ref.artifactId&&binding.proposalRef.version===ref.version&&binding.proposalRef.digest===ref.digest&&binding.proposalRef.organizationId===ref.organizationId&&binding.proposalRef.workId===ref.workId,"proposal_digest");
 requireThat(text(id)&&Number.isSafeInteger(version)&&version>0,"identity");
 requireThat(Array.isArray(limitations)&&limitations.every(text),"limitations");
 return frozen({kind:"SalesApprovalRequest",salesSchemaVersion:SALES_SCHEMA_VERSION,id,version,organizationId:p.organizationId,workId:p.workId,bindingRef:artifactRef(binding),proposalRef:ref,status:"AWAITING_EXTERNAL_AUTHORIZATION",approved:false,accepted:false,paymentVerified:false,fulfilled:false,limitations});
}
module.exports={EconomicOfferBinding,ApprovalRequest};
