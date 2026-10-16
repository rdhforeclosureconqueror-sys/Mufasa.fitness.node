"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {assessTestRecordOwnership}=require("../src/services/syntheticRecordOwnershipGuard");
const runId="milele-acceptance-0123456789abcdef";
test("rejects unmarked, foreign and production-linked records",()=>{
 for(const record of [{userId:"test"}, {userId:"test",syntheticTest:true,testRunId:"milele-acceptance-ffffffffffffffff"},{userId:"test",syntheticTest:true,testRunId:runId,stripeCustomerId:"cus_live"}]){
  assert.equal(assessTestRecordOwnership({runId,record,kind:"identity",expectedUserId:"test"}).authorized,false);
 }
});
test("requires exact identity and CRM ownership",()=>{
 const record={userId:"test",syntheticTest:true,testRunId:runId};
 assert.equal(assessTestRecordOwnership({runId,record,kind:"identity",expectedUserId:"test"}).authorized,true);
 assert.equal(assessTestRecordOwnership({runId,record,kind:"crm",expectedUserId:"other"}).authorized,false);
});
test("confirmed events cannot be classified as isolated cleanup targets",()=>{
 const record={eventId:"evt_test",syntheticTest:true,testRunId:runId,status:"confirmed"};
 assert.equal(assessTestRecordOwnership({runId,record,kind:"event"}).authorized,false);
 assert.equal(assessTestRecordOwnership({runId,record:{...record,status:"draft"},kind:"event"}).authorized,true);
});
test("malformed run ids always fail closed",()=>{
 assert.equal(assessTestRecordOwnership({runId:"random",record:{syntheticTest:true,testRunId:"random"},kind:"crm",expectedUserId:"test"}).authorized,false);
});
