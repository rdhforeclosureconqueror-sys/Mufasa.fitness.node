"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {createConstitutionalKernel}=require("../src/business-os/kernel/kernel");
const {deriveDiagnostics,STAGES}=require("../src/business-os/kernel/diagnostics");
const C=require("../src/business-os/kernel/contracts");
const {REQUIREMENTS,phase1Readiness}=require("../src/business-os/kernel/phase1-readiness");

function fixture(policyOutcome="ALLOW",options={}){
 let n=0;const clock=()=>new Date("2026-09-22T20:00:00.000Z");
 const kernel=createConstitutionalKernel({clock,id:()=>`id-${++n}`,handlerTimeoutMs:10});
 kernel.registerActor({id:"issuer",type:"HUMAN",status:"ACTIVE"});
 kernel.registerActor({id:"actor",type:options.actorType||"SERVICE",status:"ACTIVE"});
 kernel.registerActor({id:"human",type:"HUMAN",status:"ACTIVE"});
 kernel.issueGrant({id:"grant",subjectActorId:"actor",issuerActorId:"issuer",actionScopes:["synthetic.*"],resourceScopes:["work:*"]});
 kernel.addPolicy({definitionId:"synthetic-policy",id:"synthetic-policy@1",version:1,rules:{"synthetic.echo":{outcome:policyOutcome,reason:`TEST_${policyOutcome}`},"synthetic.fail":{outcome:"ALLOW"},"synthetic.timeout":{outcome:"ALLOW"}}});
 kernel.createWork({id:"work-1"});
 return kernel;
}
function request(overrides={}){return {actorId:"actor",intentId:"intent-1",executionId:"exec-1",actionType:"synthetic.echo",resourceScope:"work:work-1",payload:{message:"constitutional heartbeat"},grantId:"grant",policyVersionId:"synthetic-policy@1",workId:"work-1",expectedVersion:1,correlationId:"correlation-1",...overrides}}
function check(result,stage,code){assert.equal(result.ok,false);assert.equal(result.code,code);assert.equal(result.diagnostics.firstFailure.checkId,stage);const index=STAGES.indexOf(stage);for(const upstream of result.diagnostics.checks.slice(0,index))assert.equal(upstream.status,"PASS");for(const downstream of result.diagnostics.checks.slice(index+1))assert.equal(downstream.status,"BLOCKED")}

test("all Phase 1 contracts carry one semantic version and freeze their records",()=>{
 const specimens=[
  C.Actor({id:"a",type:"HUMAN",status:"ACTIVE",createdAt:"t"}),C.StructuredIntent({id:"i",actorId:"a",actionType:"x",resourceScope:"r",payloadHash:"h",createdAt:"t",correlationId:"c"}),
  C.AuthorityGrant({id:"g",subjectActorId:"a",actionScopes:[],resourceScopes:[],issuerActorId:"b",issuedAt:"t",status:"ACTIVE",version:1}),C.PolicyDefinition({id:"p",scope:"s",createdAt:"t"}),C.PolicyVersion({id:"pv",definitionId:"p",version:1,rules:{},createdAt:"t"}),
  C.PolicyDecision({id:"d",policyVersionId:"pv",actorId:"a",grantId:"g",intentId:"i",outcome:"ALLOW",reasonCodes:[],evaluatedAt:"t"}),C.Work({id:"w",state:"READY",version:1,allowedTransitions:{},createdAt:"t"}),C.WorkItem({id:"wi",workId:"w",state:"READY",version:1,createdAt:"t"}),
  C.StateTransition({id:"s",workId:"w",from:"A",to:"B",expectedVersion:1,actorId:"a",intentId:"i",outcome:"VALID",createdAt:"t"}),C.EvidenceRecord({id:"e",evidenceType:"OBSERVED_FACT",source:"s",actorId:"a",recordedAt:"t",version:1,scope:"r",payloadHash:"h"}),
  C.ProvenanceLink({id:"l",fromId:"e",toId:"d",relation:"SUPPORTS",createdAt:"t"}),C.AuditEvent({id:"au",eventType:"X",actorId:"a",outcome:"OK",reason:"r",correlationId:"c",timestamp:"t"}),C.EventEnvelope({id:"ev",eventType:"X",schemaVersion:"1",producer:"p",subjectId:"w",timestamp:"t",correlationId:"c",idempotencyKey:"k"}),
  C.OutboxRecord({id:"o",eventId:"ev",idempotencyKey:"k",state:"PENDING",attempts:0,maxAttempts:3,createdAt:"t"}),C.DiagnosticCheck({id:"x",status:"PASS",order:0,dependencies:[]}),C.FirstFailure({checkId:"x",derivedAt:"t"}),C.KillSwitch({id:"k",scopeType:"SYSTEM",scopeValue:"*",active:true,issuerActorId:"a",reason:"r",changedAt:"t"})];
 for(const specimen of specimens){assert.equal(specimen.contractVersion,C.CONTRACT_VERSION);assert.equal(Object.isFrozen(specimen),true)}
});

test("golden path completes governed work, evidence, immutable audit, and outbox",async()=>{
 const k=fixture(),result=await k.execute(request());
 assert.equal(result.ok,true);assert.deepEqual(result.result,{echo:"constitutional heartbeat"});assert.equal(result.work.state,"COMPLETED");assert.equal(result.work.version,3);
 assert.equal(result.evidence.evidenceType,"OBSERVED_FACT");assert.equal(result.decision.outcome,"ALLOW");assert.equal(result.outbox.state,"PENDING");assert.equal(result.diagnostics.firstFailure,null);assert.ok(result.diagnostics.checks.every(c=>c.status==="PASS"));
 assert.throws(()=>k.repository.updateAudit(0,{}),/audit_immutable/);assert.throws(()=>k.repository.deleteAudit(0),/audit_immutable/);
 assert.throws(()=>k.repository.data.audit.push({}),/extensible|read only|object is not extensible/i);
});

test("Phase 1 readiness composes machine evidence without manufacturing human acceptance",()=>{const automated=Object.fromEntries(REQUIREMENTS.map(id=>[id,"PASS"])),view=phase1Readiness({automated});assert.equal(view.firstFailure,null);assert.equal(view.gate,"CONDITIONAL_GO");assert.equal(view.humanAcceptance.status,"PENDING");assert.equal(view.humanAcceptance.recordingAuthority,"AUTHENTICATED_ADMIN_ONLY")});

test("unknown actor is the truthful first failure",async()=>check(await fixture().execute(request({actorId:"ghost"})),"ACTOR","UNKNOWN_ACTOR"));
test("missing grant fails authority separately from policy",async()=>check(await fixture().execute(request({grantId:"absent"})),"AUTHORITY","MISSING_AUTHORITY"));
test("expired authority fails closed",async()=>{const k=fixture();k.repository.data.grants.set("grant",C.AuthorityGrant({...k.repository.data.grants.get("grant"),expiresAt:"2026-09-22T19:59:00.000Z"}));check(await k.execute(request()),"AUTHORITY","EXPIRED_AUTHORITY")});
test("revoked authority fails closed",async()=>{const k=fixture();k.revokeGrant("grant","issuer");check(await k.execute(request()),"AUTHORITY","REVOKED_AUTHORITY")});
test("wrong action scope fails authority",async()=>check(await fixture().execute(request({actionType:"other.echo"})),"AUTHORITY","WRONG_ACTION_SCOPE"));
test("wrong resource scope fails authority",async()=>check(await fixture().execute(request({resourceScope:"account:1"})),"AUTHORITY","WRONG_RESOURCE_SCOPE"));
test("policy DENY is independently visible",async()=>check(await fixture("DENY").execute(request()),"POLICY","POLICY_DENY"));
test("REQUIRE_HUMAN stays blocked without human acceptance",async()=>check(await fixture("REQUIRE_HUMAN").execute(request()),"POLICY","HUMAN_ACCEPTANCE_REQUIRED"));
test("machine cannot manufacture human acceptance",async()=>{const k=fixture("REQUIRE_HUMAN");check(await k.execute(request({humanApproval:{actorId:"actor",accepted:true,evidenceRef:"self"}})),"POLICY","HUMAN_ACCEPTANCE_REQUIRED")});
test("distinct authorized human acceptance permits execution",async()=>{const k=fixture("REQUIRE_HUMAN");assert.equal((await k.execute(request({humanApproval:{actorId:"human",accepted:true,evidenceRef:"human-review-1"}}))).ok,true)});
test("illegal transition does not mutate work",async()=>{const k=fixture();k.repository.data.works.set("work-1",C.Work({...k.repository.data.works.get("work-1"),state:"COMPLETED"}));check(await k.execute(request()),"STATE_VALIDATION","ILLEGAL_TRANSITION");assert.equal(k.repository.data.works.get("work-1").state,"COMPLETED")});
test("stale expected version is a concurrency conflict and does not mutate",async()=>{const k=fixture();check(await k.execute(request({expectedVersion:0})),"STATE_VALIDATION","CONCURRENCY_CONFLICT");assert.equal(k.repository.data.works.get("work-1").version,1)});
test("competing stale writer receives concurrency conflict",async()=>{const k=fixture();k.repository.data.works.set("work-1",C.Work({...k.repository.data.works.get("work-1"),version:2}));check(await k.execute(request({expectedVersion:1})),"STATE_VALIDATION","CONCURRENCY_CONFLICT")});
test("controlled handler failure rolls back and never reports success",async()=>{const k=fixture();check(await k.execute(request({actionType:"synthetic.fail"})),"EXECUTION","HANDLER_FAILURE");assert.equal(k.repository.data.works.get("work-1").state,"READY");assert.equal(k.repository.data.evidence.size,0);assert.equal(k.repository.data.events.size,0)});
test("controlled handler timeout rolls back and never reports success",async()=>{const k=fixture();check(await k.execute(request({actionType:"synthetic.timeout"})),"EXECUTION","HANDLER_TIMEOUT");assert.equal(k.repository.data.works.get("work-1").state,"READY")});
test("duplicate intent cannot replay a business effect",async()=>{const k=fixture();assert.equal((await k.execute(request())).ok,true);k.createWork({id:"work-2"});check(await k.execute(request({workId:"work-2",resourceScope:"work:work-2"})),"AUTHORITY","DUPLICATE_INTENT");assert.equal(k.repository.data.executions.size,1)});
test("duplicate execution key cannot create a second side effect",async()=>{const k=fixture();assert.equal((await k.execute(request())).ok,true);k.createWork({id:"work-2"});check(await k.execute(request({intentId:"intent-2",workId:"work-2",resourceScope:"work:work-2",executionId:"exec-1"})),"EXECUTION","DUPLICATE_EXECUTION");assert.equal(k.repository.data.evidence.size,1);assert.equal(k.repository.data.works.get("work-2").state,"READY")});
test("duplicate event delivery is an idempotent no-op",async()=>{const k=fixture(),r=await k.execute(request());let effects=0;const consumer={id:"consumer",handle(){effects++}};assert.equal(k.deliverOutbox(r.outbox.id,consumer).state,"DELIVERED");assert.equal(k.deliverOutbox(r.outbox.id,consumer).state,"DELIVERED");assert.equal(effects,1)});
test("outbox retries then succeeds",async()=>{const k=fixture(),r=await k.execute(request());let calls=0;const consumer={id:"flaky",handle(){if(++calls===1)throw new Error("temporary")}};assert.equal(k.deliverOutbox(r.outbox.id,consumer).state,"RETRY");assert.equal(k.deliverOutbox(r.outbox.id,consumer).state,"DELIVERED");assert.equal(calls,2)});
test("outbox retry exhaustion dead-letters with failure evidence",async()=>{const k=fixture(),r=await k.execute(request({maxAttempts:2}));const consumer={id:"broken",handle(){throw new Error("downstream")}};assert.equal(k.deliverOutbox(r.outbox.id,consumer).state,"RETRY");const dead=k.deliverOutbox(r.outbox.id,consumer);assert.equal(dead.state,"DEAD_LETTER");assert.equal(dead.attempts,2);assert.equal(dead.failureEvidence.length,2)});
test("active authorized kill switch fails closed and is audited",async()=>{const k=fixture();k.issueGrant({id:"kill-grant",subjectActorId:"issuer",issuerActorId:"human",actionScopes:["governance.kill-switch"],resourceScopes:["system"]});k.setKillSwitch({id:"stop",scopeType:"ACTION",scopeValue:"synthetic.*",active:true,issuerActorId:"issuer",reason:"incident"});check(await k.execute(request()),"AUTHORITY","KILL_SWITCH_ACTIVE");assert.ok(k.repository.data.audit.some(a=>a.eventType==="KILL_SWITCH_CHANGE"))});
test("kill switch changes require authority",()=>assert.throws(()=>fixture().setKillSwitch({id:"stop",scopeType:"SYSTEM",scopeValue:"*",active:true,issuerActorId:"actor",reason:"attempt"}),/kill_switch_authority_required/));
test("actor cannot self-grant authority",()=>assert.throws(()=>fixture().issueGrant({id:"self",subjectActorId:"actor",issuerActorId:"actor",actionScopes:["*"],resourceScopes:["*"]}),/self_grant_forbidden/));
test("delegation cannot expand parent authority",()=>{const k=fixture();assert.throws(()=>k.issueGrant({id:"expanded",subjectActorId:"human",issuerActorId:"issuer",parentGrantId:"grant",actionScopes:["governance.kill-switch"],resourceScopes:["system"]}),/authority_expansion_forbidden/)});
test("historical audit update and deletion are rejected",()=>{const r=fixture().repository;assert.throws(()=>r.updateAudit(),/audit_immutable/);assert.throws(()=>r.deleteAudit(),/audit_immutable/)});
test("evidence category promotion requires explicit authority and preserves lineage",async()=>{const k=fixture(),result=await k.execute(request());assert.throws(()=>k.promoteEvidence({sourceEvidenceId:result.evidence.id,evidenceType:"KNOWLEDGE",actorId:"actor",grantId:"grant",payload:{claim:true}}),/evidence_promotion_forbidden/);k.issueGrant({id:"promotion",subjectActorId:"actor",issuerActorId:"issuer",actionScopes:["evidence.promote"],resourceScopes:["work:*"]});const promoted=k.promoteEvidence({sourceEvidenceId:result.evidence.id,evidenceType:"KNOWLEDGE",actorId:"actor",grantId:"promotion",payload:{claim:true}});assert.equal(promoted.evidenceType,"KNOWLEDGE");assert.equal(k.repository.data.evidence.get(result.evidence.id).evidenceType,"OBSERVED_FACT");assert.ok([...k.repository.data.provenance.values()].some(x=>x.fromId===result.evidence.id&&x.toId===promoted.id))});
test("downstream cannot be reported or run after upstream failure",async()=>{const k=fixture(),result=await k.execute(request({grantId:"none"}));assert.equal(k.repository.data.executions.size,0);assert.equal(k.repository.data.evidence.size,0);assert.equal(k.repository.data.events.size,0);for(const c of result.diagnostics.checks.slice(2))assert.equal(c.status,"BLOCKED")});
test("FIRST FAILURE is derived by dependency order, never caller convenience",()=>{const d=deriveDiagnostics({ACTOR:{status:"PASS"},AUTHORITY:{status:"FAIL",reason:"no grant"},POLICY:{status:"FAIL",reason:"should not run"}},()=>"now");assert.equal(d.firstFailure.checkId,"AUTHORITY");assert.equal(d.checks.find(c=>c.id==="POLICY").status,"BLOCKED")});
