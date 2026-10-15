"use strict";
const {SALES_SCHEMA_VERSION,digest,artifactRef}=require("./contracts");
const isText=x=>typeof x==="string"&&x.trim().length>0;
const isObject=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const SHA=/^[a-f0-9]{64}$/;
function check(ok,code){if(!ok)throw new Error("invalid_sales_offer:"+code)}
function copyFreeze(x){const v=structuredClone(x);const visit=y=>{if(y&&typeof y==="object"){Object.values(y).forEach(visit);Object.freeze(y)}return y};return visit(v)}
function scopedRef(v,type,org,work){check(isObject(v)&&v.artifactType===type,"ref_type");check(isText(v.artifactId)&&Number.isSafeInteger(v.version)&&v.version>0&&SHA.test(v.digest),"ref_identity");check(v.organizationId===org&&v.workId===work,"ref_scope");return copyFreeze(v)}
function CapabilityEvidence(v={}){
 check(isObject(v),"capability");
 for(const k of ["id","organizationId","workId","serviceId","description"])check(isText(v[k]),"capability_"+k);
 check(Number.isSafeInteger(v.version)&&v.version>0,"capability_version");
 check(["SUPPORTED","UNSUPPORTED","UNKNOWN"].includes(v.status),"capability_status");
 check(Array.isArray(v.evidenceRefs)&&v.evidenceRefs.every(isText),"capability_evidence");
 check(Array.isArray(v.limitations)&&v.limitations.every(isText),"capability_limitations");
 check(v.status!=="SUPPORTED"||v.evidenceRefs.length>0,"supported_requires_evidence");
 return copyFreeze({salesSchemaVersion:SALES_SCHEMA_VERSION,kind:"CapabilityEvidence",...v});
}
function OfferProposal(v={}){
 check(isObject(v),"proposal");
 for(const k of ["id","organizationId","workId","opportunityId"])check(isText(v[k]),"proposal_"+k);
 check(Number.isSafeInteger(v.version)&&v.version>0,"proposal_version");
 check(v.status==="PROPOSED","proposal_status");
 check(v.accepted===false&&v.paymentVerified===false&&v.fulfilled===false&&v.approved===false,"proposal_authority");
 const qualification=scopedRef(v.qualificationRef,"QualificationAssessment",v.organizationId,v.workId);
 check(v.qualificationDisposition==="QUALIFIED","qualification_not_verified");
 check(Array.isArray(v.lines)&&v.lines.length>0,"proposal_lines");
 check(Array.isArray(v.limitations)&&v.limitations.every(isText),"proposal_limitations");
 const ids=new Set();
 const lines=v.lines.map(line=>{
  check(isObject(line)&&isText(line.id)&&isText(line.serviceId)&&isText(line.description),"line_identity");
  check(!ids.has(line.id),"duplicate_line");ids.add(line.id);
  check(line.quantity===1,"line_quantity_not_supported");
  const cap=scopedRef(line.capabilityRef,"CapabilityEvidence",v.organizationId,v.workId);
  check(line.capabilityStatus==="SUPPORTED"&&Array.isArray(line.capabilityEvidenceRefs)&&line.capabilityEvidenceRefs.length>0&&line.capabilityEvidenceRefs.every(isText),"unsupported_capability");
  check(Array.isArray(line.limitations)&&line.limitations.every(isText),"line_limitations");
  check(!Object.hasOwn(line,"price")&&!Object.hasOwn(line,"amount")&&!Object.hasOwn(line,"discount"),"pricing_requires_sales_4");
  return copyFreeze({...line,capabilityRef:cap});
 });
 check(!Object.hasOwn(v,"total")&&!Object.hasOwn(v,"price")&&!Object.hasOwn(v,"guarantee"),"unverified_commercial_claim");
 return copyFreeze({salesSchemaVersion:SALES_SCHEMA_VERSION,kind:"OfferProposal",...v,qualificationRef:qualification,lines});
}
function proposeOffer({id,organizationId,workId,version=1,opportunityId,qualification,capabilities,limitations=[]}={}){
 check(isObject(qualification)&&qualification.kind==="QualificationAssessment"&&qualification.disposition==="QUALIFIED","qualification");
 check(qualification.organizationId===organizationId&&qualification.workId===workId,"qualification_scope");
 check(Array.isArray(capabilities)&&capabilities.length>0,"capabilities");
 const lines=capabilities.map((input,i)=>{
  const cap=CapabilityEvidence(input);
  check(cap.organizationId===organizationId&&cap.workId===workId,"capability_scope");
  check(cap.status==="SUPPORTED","unsupported_capability");
  return {id:"line-"+(i+1),serviceId:cap.serviceId,description:cap.description,quantity:1,capabilityRef:artifactRef(cap),capabilityStatus:cap.status,capabilityEvidenceRefs:cap.evidenceRefs,limitations:cap.limitations};
 });
 return OfferProposal({id,organizationId,workId,version,opportunityId,status:"PROPOSED",approved:false,accepted:false,paymentVerified:false,fulfilled:false,qualificationRef:artifactRef(qualification),qualificationDisposition:qualification.disposition,lines,limitations});
}
module.exports={CapabilityEvidence,OfferProposal,proposeOffer};
