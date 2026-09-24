"use strict";
const crypto=require("node:crypto");
const {AnalystHumanAcceptance}=require("./contracts");
const REQUIRED_GATES=["ANALYST_PLATINUM_ARCHITECTURE_READY","ANALYST_INTERNAL_INTEGRATION_VERIFIED","ANALYST_LIVE_EVIDENCE_VERIFIED"];
function createAnalystAcceptanceService({verifyAuthenticatedAdmin,verifyAuthority,clock=()=>new Date()}={}){
 if(typeof verifyAuthenticatedAdmin!=="function"||typeof verifyAuthority!=="function")throw new Error("authenticated_admin_boundary_required");
 return Object.freeze({async accept({organizationId,requestContext,evidenceRefs,readiness}={}){
  if(!organizationId)throw new Error("organization_required");
  if(!Array.isArray(evidenceRefs)||!evidenceRefs.length)throw new Error("acceptance_evidence_required");
  for(const gate of REQUIRED_GATES)if(readiness?.gates?.[gate]!=="PASS")throw new Error("analyst_platinum_prerequisites_not_passed");
  const identity=await verifyAuthenticatedAdmin(requestContext);
  if(!identity?.verified||!identity.userId||!["admin","super_admin"].includes(identity.role)||!identity.verificationRef)throw new Error("authenticated_admin_required");
  const authority=await verifyAuthority({identity,organizationId,scope:"ANALYST_PLATINUM_ACCEPT"});
  if(!authority?.verified||authority.subjectId!==identity.userId||authority.organizationId!==organizationId||authority.scope!=="ANALYST_PLATINUM_ACCEPT"||!authority.verificationRef)throw new Error("verified_acceptance_authority_required");
  const acceptedAt=clock().toISOString(),hash=crypto.createHash("sha256").update(JSON.stringify({organizationId,userId:identity.userId,authority:authority.verificationRef,acceptedAt})).digest("hex").slice(0,16);
  return AnalystHumanAcceptance({id:`analyst-acceptance:${hash}`,organizationId,actorType:"HUMAN",actorId:identity.userId,authorityRef:authority.verificationRef,authenticationEvidenceRefs:[identity.verificationRef],identityVerificationRef:identity.verificationRef,authorityVerificationRef:authority.verificationRef,recordedBy:"AUTHENTICATED_ADMIN_BOUNDARY",scope:"ANALYST_PLATINUM",status:"PASS",acceptedAt,evidenceRefs,version:1});
 }});
}
module.exports={createAnalystAcceptanceService};
