"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildGettingStartedModel, createPrivateClientGettingStartedService } = require("../src/services/privateClientGettingStartedService");

function baseUser(){return {userId:"client_1",courtesyTrial:{acceptedAt:1},membership:{status:"trialing"},privateCoachingQuote:{quoteStatus:"requested",submittedAt:"2026-09-01T00:00:00Z"},journeyIntake:{status:"draft"},journeyProfile:{},sessions:{}};}

test("private client checklist identifies Retention Journey as next required step",()=>{
  const model=buildGettingStartedModel(baseUser());
  assert.equal(model.privateClient,true);
  assert.equal(model.nextAction.id,"retention_journey");
  assert.equal(model.readyForTrainerProgramming,false);
});

test("photos and measurements may be scheduled with trainer without being marked complete",()=>{
  const user=baseUser();
  user.journeyIntake.status="submitted";
  user.transformationProfile={returnAgreement:{returnProcess:"return",why:"why",whyImportant:"important",whoAffected:"family"},checkIns:[]};
  user.privateClientGettingStarted={photosPlan:"trainer",measurementsPlan:"trainer"};
  const model=buildGettingStartedModel(user);
  assert.equal(model.tasks.find(t=>t.id==="photos").state,"scheduled");
  assert.equal(model.tasks.find(t=>t.id==="measurements").state,"scheduled");
  assert.equal(model.tasks.find(t=>t.id==="photos").complete,false);
  assert.equal(model.readyForTrainerProgramming,true);
  assert.equal(model.nextAction.id,"program");
  assert.equal(model.nextAction.owner,"trainer");
});

test("baseline uploads complete photo and measurement tasks",()=>{
  const user=baseUser();user.journeyIntake.status="submitted";
  user.transformationProfile={returnAgreement:{returnProcess:"return",why:"why",whyImportant:"important",whoAffected:"family"},checkIns:[{baseline:true,measurements:{bicep:14,chest:40,waist:32,hips:38,thigh:22},photos:{front:"data:image/jpeg;base64,AA==",side:"data:image/jpeg;base64,AA=="}}]};
  const model=buildGettingStartedModel(user);
  assert.equal(model.tasks.find(t=>t.id==="photos").complete,true);
  assert.equal(model.tasks.find(t=>t.id==="measurements").complete,true);
  assert.equal(model.readyForTrainerProgramming,true);
});

test("assigned program unlocks first workout and first completion finishes checklist",()=>{
  const user=baseUser();user.journeyIntake.status="submitted";
  user.transformationProfile={returnAgreement:{returnProcess:"return",why:"why",whyImportant:"important",whoAffected:"family"},checkIns:[{baseline:true,measurements:{waist:32},photos:{front:"data:image/jpeg;base64,AA==",side:"data:image/jpeg;base64,AA=="}}]};
  user.program={programId:"p1",assignedByTrainerUserId:"trainer_1"};
  let model=buildGettingStartedModel(user);
  assert.equal(model.tasks.find(t=>t.id==="first_workout").state,"ready");
  user.sessions={s1:{status:"completed",completedAt:"2026-09-02T00:00:00Z"}};
  model=buildGettingStartedModel(user);
  assert.equal(model.tasks.find(t=>t.id==="first_workout").complete,true);
  assert.equal(model.firstWorkoutComplete,true);
});

test("preference service persists trainer/self choices canonically",()=>{
  let user=baseUser();
  const store={loadUser:()=>structuredClone(user),updateUser:(_id,fn)=>{user=fn(structuredClone(user));return structuredClone(user);}};
  const service=createPrivateClientGettingStartedService({userStore:store});
  const model=service.savePreferences("client_1",{photosPlan:"trainer",measurementsPlan:"self"});
  assert.deepEqual(model.preferences,{photosPlan:"trainer",measurementsPlan:"self"});
});
