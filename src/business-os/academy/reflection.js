"use strict";
const {ReflectionRecord}=require("./contracts");
const FORBIDDEN=new Set(["POLICY_CHANGE","AUTHORITY_CHANGE","VALIDATED_KNOWLEDGE_REWRITE","AUTONOMY_CHANGE","PROMPT_CONFIG_APPLY","CODE_CHANGE","PROCEDURE_APPLY","CAPABILITY_APPLY"]);
function createReflection({id,preActionExpectation,observedOutcome,differences,proposals=[],clock=()=>new Date()}={}){
 if(!preActionExpectation?.ref||!Object.isFrozen(preActionExpectation.record))throw new Error("immutable_pre_action_expectation_required");
 if(proposals.some(p=>!p.type||p.applied||FORBIDDEN.has(p.type)))throw new Error("reflection_proposal_boundary_violation");
 return ReflectionRecord({id,preActionExpectationRef:preActionExpectation.ref,preActionExpectation:preActionExpectation.record,observedOutcomeRefs:observedOutcome.refs||[],observedOutcome:observedOutcome.value,differences,proposals:proposals.map(p=>Object.freeze({...p,status:"PROPOSED"})),createdAt:clock().toISOString()});
}
module.exports={FORBIDDEN,createReflection};
