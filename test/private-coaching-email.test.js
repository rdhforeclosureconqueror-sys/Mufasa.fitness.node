"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {sendPrivateCoachingEmail}=require("../src/services/privateCoachingEmailService");
const quote={services:["yoga","sound_bowl"],contactPhone:"972-555-0100",preferredSchedule:"Tuesday evening",locationPreference:"outside",sessionsPerWeek:1,paymentPreference:"per_session",budgetRange:"under_200",notes:"Synthetic test only",submittedAt:"2026-10-13T20:00:00Z"};
test("synthetic private-session request sends owner notification via mocked Resend",async()=>{
 let captured;const fetchImpl=async(url,options)=>{captured={url,options};return{ok:true,status:200}};
 const result=await sendPrivateCoachingEmail({quote,userId:"synthetic-client-001",env:{RESEND_API_KEY:"fake-test-key",EVENT_EMAIL_FROM:"test@example.com"},fetchImpl});
 assert.equal(result.sent,true);assert.equal(captured.url,"https://api.resend.com/emails");
 const payload=JSON.parse(captured.options.body);
 assert.deepEqual(payload.to,["rdhforeclosureconqueror@gmail.com"]);
 assert.match(payload.text,/Tuesday evening/);assert.match(payload.text,/Synthetic test only/);
 assert.ok(captured.options.headers["Idempotency-Key"]);
});
test("missing email credentials does not falsely claim delivery",async()=>{
 const result=await sendPrivateCoachingEmail({quote,userId:"synthetic-client-001",env:{}});
 assert.deepEqual(result,{sent:false,reason:"not_configured"});
});
