'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {parseAllowlist,authorizeQuins,installQuinsPlaybookRoutes}=require('../src/routes/quinsPrivatePlaybookRoutes');
test('allowlist matches exact IDs only',()=>{const s=parseAllowlist('user1, user2');assert.equal(s.has('user1'),true);assert.equal(s.has('user'),false);});
test('unauthenticated and unauthorized users denied',()=>{
 const allowlist=new Set(['team-1']);
 assert.equal(authorizeQuins({auth:null},{allowlist,enabled:true}).status,401);
 assert.equal(authorizeQuins({auth:{userId:'other'}},{allowlist,enabled:true}).status,403);
 assert.equal(authorizeQuins({auth:{userId:'team-1'}},{allowlist,enabled:false}).status,503);
 assert.equal(authorizeQuins({auth:{userId:'team-1'}},{allowlist,enabled:true}).status,200);
});
test('endpoint fails closed without configured private playbook',()=>{
 const routes=[];const app={get:(path,...handlers)=>routes.push({path,handlers})};
 const result=installQuinsPlaybookRoutes(app,{requireAuth:(_req,_res,next)=>next(),env:{}});
 assert.equal(result.enabled,false);assert.equal(routes.length,1);
 const res={status(n){this.code=n;return this;},set(){return this;},json(v){this.body=v;return this;}};
 routes[0].handlers[1]({auth:{userId:'any'}},res,()=>{throw Error('unexpected access');});
 assert.equal(res.code,503);
});
test('only allowlisted bearer identity receives configured payload',()=>{
 const routes=[];const app={get:(path,...handlers)=>routes.push({path,handlers})};
 installQuinsPlaybookRoutes(app,{requireAuth:()=>{},env:{QUINS_PLAYBOOK_ENABLED:'true',QUINS_PLAYBOOK_USER_IDS:'coach1',QUINS_RAVENS_PLAYBOOK_JSON:'{"id":"ravens"}'}});
 const res={status(n){this.code=n;return this;},set(){return this;},json(v){this.body=v;return this;}};
 let passed=false;routes[0].handlers[1]({auth:{userId:'outsider'}},res,()=>passed=true);assert.equal(res.code,403);assert.equal(passed,false);
 routes[0].handlers[1]({auth:{userId:'coach1'}},res,()=>passed=true);assert.equal(passed,true);
 routes[0].handlers[2]({},res);assert.deepEqual(res.body.playbook,{id:'ravens'});
});
