#!/usr/bin/env node
'use strict';
// Read-only client journey simulator. No registration, attendance, or payment writes.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'public');
const live = process.argv.includes('--live');
const origin = process.env.WELLNESS_BASE_URL || 'https://mufasafitsite.onrender.com';
const journeys = [
  { id:'nfc-explore', steps:['/quick-connect.html','/apartment-wellness.html'] },
  { id:'nfc-checkin', steps:['/quick-connect.html','/wellness-check-in.html','/event-checkin.js'] },
  { id:'nfc-assessment', steps:['/quick-connect.html','/sound-assessment.html'] },
  { id:'nfc-private-session', steps:['/quick-connect.html','/private-sessions.html'] },
  { id:'community-run-club', steps:['/community-hub.html','/free-run-club.html'] },
  { id:'residential-wellness', steps:['/apartment-wellness.html','/residential-wellness.html'] },
  { id:'mindfulness', steps:['/community-hub.html','/mindfulness.html'] }
];
const routeLinks = {
 '/apartment-wellness.html': '/apartment-wellness.html',
 '/wellness-check-in.html': '/wellness-check-in.html',
 '/sound-assessment.html': '/sound-assessment.html',
 '/private-sessions.html': '/private-sessions.html'
};
async function check(step, previous) {
  if (!/^\/[\w./-]+$/.test(step)) return {ok:false, reason:'INVALID_ROUTE'};
  const file = path.join(root, step.slice(1));
  if (!fs.existsSync(file)) return {ok:false,reason:'MISSING_LOCAL_FILE'};
  const body = fs.readFileSync(file,'utf8');
  if (previous === '/quick-connect.html' && routeLinks[step] && !body) return {ok:false,reason:'EMPTY_FILE'};
  if (previous === '/quick-connect.html' && !fs.readFileSync(path.join(root,'quick-connect.html'),'utf8').includes('href="'+step)) {
    if (step !== '/private-sessions.html') return {ok:false,reason:'LINK_NOT_PRESENT'};
    if (!fs.readFileSync(path.join(root,'quick-connect.html'),'utf8').includes('/private-sessions.html?')) return {ok:false,reason:'LINK_NOT_PRESENT'};
  }
  if (live) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(()=>controller.abort(),10000);
      let res;
      try { res = await fetch(new URL(step,origin),{method:'GET',redirect:'manual',signal:controller.signal}); }
      finally { clearTimeout(timer); }
      if (res.status >= 400) return {ok:false,reason:'HTTP_'+res.status,status:res.status};
      if (res.status >= 300 && res.status < 400) return {ok:false,reason:'REDIRECT_REQUIRES_REVIEW',status:res.status,location:res.headers.get('location')};
    } catch(e) { return {ok:false,reason:'NETWORK_ERROR',detail:String(e.message)}; }
  }
  return {ok:true,reason:live?'FILE_AND_HTTP_OK':'FILE_PRESENT'};
}
(async()=>{
 const results=[];
 for (const journey of journeys) {
   const checks=[];let previous=null;
   for (const step of journey.steps) {
     const outcome=await check(step,previous);
     checks.push({step,...outcome});
     if (!outcome.ok) break;
     previous=step;
   }
   results.push({id:journey.id,status:checks.some(x=>!x.ok)?'FAIL':'PASS_STATIC_ONLY',firstFailure:checks.find(x=>!x.ok)||null,checks});
 }
 const report={kind:'WellnessClientJourneyReport',schemaVersion:1,mode:live?'READ_ONLY_LIVE_HTTP':'LOCAL_STATIC',generatedAt:new Date().toISOString(),origin:live?origin:null,summary:{total:results.length,failed:results.filter(x=>x.status==='FAIL').length,staticPassed:results.filter(x=>x.status==='PASS_STATIC_ONLY').length},limitations:['Does not emulate browser clicks, NFC hardware, authentication, registration, database writes, RSVP, or reflection submission.','Passing routes do not certify complete client journeys.','Run browser E2E tests in an isolated staging environment using disposable identities for write workflows.'],results};
 console.log(JSON.stringify(report,null,2));
 process.exitCode=report.summary.failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=2;});
