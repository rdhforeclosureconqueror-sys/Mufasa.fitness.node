"use strict";

const crypto=require("node:crypto");
const {ScoutHumanAcceptance}=require("./contracts");
const hash=value=>crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function createScoutHumanAcceptance({organizationId,actor,authorityRef,evidenceRefs,readiness,clock=()=>new Date()}={}){
 if(!actor?.userId||!["admin","super_admin"].includes(String(actor.role||"").toLowerCase()))throw new Error("authenticated_admin_required");
 if(!Array.isArray(actor.authenticationEvidenceRefs)||!actor.authenticationEvidenceRefs.length)throw new Error("authentication_evidence_required");
 if(typeof authorityRef!=="string"||!authorityRef)throw new Error("authority_reference_required");
 if(!Array.isArray(evidenceRefs)||!evidenceRefs.length)throw new Error("acceptance_evidence_required");
 const prerequisiteGates=["SCOUT_PLATINUM_ARCHITECTURE_READY","SCOUT_APPROVED_SOURCE_CONFIGURED","SCOUT_LIVE_SOURCE_VERIFIED","SCOUT_OUTCOME_FEEDBACK_VERIFIED"];
 if(!readiness?.gates||prerequisiteGates.some(gate=>readiness.gates[gate]!=="PASS"))throw new Error("scout_platinum_prerequisites_not_passed");
 const acceptedAt=clock().toISOString();
 return ScoutHumanAcceptance({id:`scout-acceptance:${hash({organizationId,actorId:actor.userId,authorityRef,acceptedAt}).slice(0,16)}`,organizationId,actorType:"HUMAN",actorId:actor.userId,authorityRef,authenticationEvidenceRefs:actor.authenticationEvidenceRefs,recordedBy:"AUTHENTICATED_ADMIN_BOUNDARY",scope:"SCOUT_PLATINUM",status:"PASS",acceptedAt,evidenceRefs,version:1});
}

module.exports={createScoutHumanAcceptance};
