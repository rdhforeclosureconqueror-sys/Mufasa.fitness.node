// WELLNESS-1: preserve campaign context at the navigation boundary without collecting PII.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('public/wellness-campaign-links.js','utf8');
function run(search){
 const anchors=['/apartment-wellness.html','/wellness-check-in.html','/sound-assessment.html','/private-sessions.html?source=community'].map(href=>({href,getAttribute(){return this.href},setAttribute(_,v){this.href=v}}));
 const context={window:{location:{search,origin:'https://example.test'}},document:{querySelectorAll:()=>anchors},URL,URLSearchParams};
 vm.runInNewContext(script,context);return anchors.map(a=>a.href);
}
test('campaign and event survive each same-origin wellness destination',()=>{
 const links=run('?utm_source=nfc&utm_medium=flyer&utm_campaign=addison_oct&eventId=event_123');
 assert.equal(links.length,4);
 for(const href of links){const u=new URL(href,'https://example.test');assert.equal(u.searchParams.get('utm_campaign'),'addison_oct');assert.equal(u.searchParams.get('eventId'),'event_123')}
 assert.equal(new URL(links[3],'https://example.test').searchParams.get('source'),'community');
});
test('invalid and duplicated campaign parameters never propagate',()=>{
 for(const href of run('?utm_campaign=bad%20value&utm_source=one&utm_source=two&eventId=https://evil.example')){
  const u=new URL(href,'https://example.test');for(const key of ['utm_campaign','utm_source','eventId'])assert.equal(u.searchParams.has(key),false)
 }
});
test('check-in uses explicit attribution consent',()=>{
 const js=fs.readFileSync('public/event-checkin.js','utf8');
 assert.match(js,/attributionConsent:new FormData\(beforeEl\)\.get\("attributionConsent"\)==="yes"/);
 assert.match(js,/guest-check-in/);
});
