'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {appendSelfReport:append,currentEvidence:view}=require('../src/rugby/athleteEvidence');
const now='2026-11-25T00:00:00.000Z', earlier='2026-11-24T00:00:00.000Z';
const input={eventType:'assessment_recorded',occurredAt:earlier,sourceRef:'assessment:1'};
const first=()=>append([],input,'a',now,'e1');
test('server-owned unverified evidence',()=>assert.deepEqual(first()[0],{eventId:'e1',athleteId:'a',occurredAt:earlier,recordedAt:now,eventType:'assessment_recorded',sourceRef:'assessment:1',verificationStatus:'unverified'}));
for(const [name,patch] of Object.entries({future:{occurredAt:'2026-11-26T00:00:00.000Z'},invalid:{occurredAt:'2026-02-30T00:00:00.000Z'},forged:{verificationStatus:'verified'},identity:{athleteId:'b'},coach:{eventType:'coach_reviewed'},stage:{eventType:'stage_change_authorized'},attendance:{eventType:'attendance_recorded'},source:{sourceRef:''}}))test(name,()=>assert.throws(()=>append([],{...input,...patch},'a',now,'e1')));
test('duplicate',()=>assert.throws(()=>append(first(),input,'a',now,'e1')));
test('cross athlete',()=>assert.throws(()=>append(first(),input,'b',now,'e2')));
test('correction preserves history',()=>{const h=first(),next=append(h,{...input,supersedes:'e1'},'a',now,'e2');assert.equal(h.length,1);assert.equal(next.length,2);assert.deepEqual(view(next,'a').map(e=>e.eventId),['e2']);});
test('unknown correction',()=>assert.throws(()=>append(first(),{...input,supersedes:'missing'},'a',now,'e2')));
test('duplicate correction',()=>{const h=append(first(),{...input,supersedes:'e1'},'a',now,'e2');assert.throws(()=>append(h,{...input,supersedes:'e1'},'a',now,'e3'));});
test('chronological view',()=>{const h=append(first(),{...input,occurredAt:'2026-11-23T00:00:00.000Z'},'a',now,'e2');assert.deepEqual(view(h,'a').map(e=>e.eventId),['e2','e1']);});
test('view rejects cross athlete',()=>assert.throws(()=>view(first(),'b')));

const {installRugbyProfileRoutes}=require('../src/routes/rugbyProfileRoutes');
function fixture(){
 const routes={},users={a:{rugbyAssessments:[{id:'legacy'}]},b:{}};
 const app={};for(const method of ['get','post','put'])app[method]=(path,auth,handler)=>{routes[method+' '+path]=handler;};
 installRugbyProfileRoutes({app,requireAuth:()=>{},userStore:{loadUser:id=>users[id],updateUser:(id,fn)=>{users[id]=fn(structuredClone(users[id]));}}});
 function call(method,path,id,body){const res={code:200,headers:{},set(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};routes[method+' /api/me/rugby/'+path]({auth:{userId:id},body},res);return res;}
 return {users,call};
}
const measurement={type:'sprint_10m',value:2,date:'2020-01-01'};
test('route saves assessment and linked unverified evidence',()=>{const {users,call}=fixture();const r=call('post','assessments','a',{...measurement,verified:true,athleteId:'b'});assert.equal(r.code,201);assert.equal(users.a.rugbyAssessments.length,2);assert.equal(users.a.rugbyAssessments[0].id,'legacy');assert.equal(users.a.rugbyEvidence[0].sourceRef,'assessment:'+r.body.data.id);assert.equal(users.a.rugbyEvidence[0].verificationStatus,'unverified');assert.equal(users.a.rugbyEvidence[0].athleteId,'a');assert.equal(users.b.rugbyEvidence,undefined);});
test('route rejects future date without writing either record',()=>{const {users,call}=fixture();assert.equal(call('post','assessments','a',{...measurement,date:'9999-01-01'}).code,400);assert.equal(users.a.rugbyAssessments.length,1);assert.equal(users.a.rugbyEvidence,undefined);});
test('evidence route is private and athlete scoped',()=>{const {call}=fixture();call('post','assessments','a',measurement);const a=call('get','evidence','a'),b=call('get','evidence','b');assert.equal(a.body.data.length,1);assert.equal(b.body.data.length,0);assert.equal(a.headers['Cache-Control'],'private, no-store');assert.equal(a.body.legacyAssessmentsIncluded,false);});
