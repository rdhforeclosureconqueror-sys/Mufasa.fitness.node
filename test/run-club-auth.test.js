"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createApp}=require("../server");
async function request(base,route,{method="GET",token,body}={}){const response=await fetch(base+route,{method,headers:{...(token?{authorization:`Bearer ${token}`}:{}) ,...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});return{response,payload:await response.json().catch(()=>({}))};}
test("free Run Club account uses one persistent identity for auth, scoped Greatness data, and paid gating",async t=>{
  const previousGate=process.env.MEMBERSHIP_GATE_TEST_ENFORCED;process.env.MEMBERSHIP_GATE_TEST_ENFORCED="true";
  t.after(()=>{if(previousGate===undefined)delete process.env.MEMBERSHIP_GATE_TEST_ENFORCED;else process.env.MEMBERSHIP_GATE_TEST_ENFORCED=previousGate;});
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),"run-club-auth-"));
  const app=createApp({dataDir});const server=app.listen(0);t.after(()=>server.close());const base=`http://127.0.0.1:${server.address().port}`;
  const created=await request(base,"/api/auth/register",{method:"POST",body:{name:"Maya",email:"maya@example.test",password:"run-club-pass",entryContext:"run_club"}});
  assert.equal(created.response.status,200);assert.equal(created.payload.user.accessTier,"free_run_club");const id=created.payload.user.id,token=created.payload.token;
  const me=await request(base,"/api/auth/me",{token});assert.equal(me.payload.user.id,id);assert.equal(me.payload.user.accessTier,"free_run_club");
  const journey=await request(base,"/api/me/greatness/journey",{token});assert.equal(journey.response.status,200);
  const paid=await request(base,"/api/yoga/catalogue",{token});assert.equal(paid.response.status,402);assert.equal(paid.payload.code,"membership_required");assert.equal(paid.payload.membershipUrl,"/membership.html");
  const signedIn=await request(base,"/api/auth/login",{method:"POST",body:{email:"maya@example.test",password:"run-club-pass"}});assert.equal(signedIn.payload.user.id,id);assert.equal(signedIn.payload.user.accessTier,"free_run_club");
  const other=await request(base,"/api/auth/register",{method:"POST",body:{name:"Other",email:"other@example.test",password:"other-pass-1",entryContext:"run_club"}});
  const forbidden=await request(base,`/api/me/greatness/activities/not-owned`,{token:other.payload.token});assert.equal(forbidden.response.status,404);
  const credentialText=fs.readFileSync(path.join(dataDir,"ops","auth-credentials.json"),"utf8");assert.doesNotMatch(credentialText,/run-club-pass|other-pass-1/);assert.match(credentialText,/passwordHash/);
  const userRecord=JSON.parse(fs.readFileSync(path.join(dataDir,"users",`${id}.json`),"utf8"));assert.equal(userRecord.identity.accessTier,"free_run_club");assert.equal(userRecord.userId,id);
  userRecord.membership={status:"active",plan:"pocket_pt_monthly"};fs.writeFileSync(path.join(dataDir,"users",`${id}.json`),JSON.stringify(userRecord));
  const upgraded=await request(base,"/api/auth/me",{token});assert.equal(upgraded.payload.user.id,id);assert.equal(upgraded.payload.user.accessTier,"paid_member");
  const upgradedJourney=await request(base,"/api/me/greatness/journey",{token});assert.equal(upgradedJourney.response.status,200);assert.deepEqual(upgradedJourney.payload.data.activities,journey.payload.data.activities);
});
