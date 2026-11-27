'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {installRugbyPolicyPreviewRoutes}=require('../src/routes/rugbyPolicyPreviewRoutes');
const {createPolicyService}=require('../src/rugby/beastModePolicyService');
const {initialLedger}=require('../src/rugby/beastModePolicyLedger');
const {defaultPolicy}=require('../src/rugby/beastModePolicy');
const {createAuthorizationResolver}=require('../src/lib/authorization');
function fixture(){
 const routes={},ledger=initialLedger();
 const auth=()=>{};
 const app={get:(p,m,h)=>{assert.equal(m,auth);routes.GET=h;},post:(p,m,h)=>{assert.equal(m,auth);routes.POST=h;}};
 const resolver=createAuthorizationResolver({adminEmails:[],bootstrap:{superAdminUserIds:['owner','other'],superAdminSubjects:[]},roleAssignments:{adminUserIds:[],adminSubjects:[],trainerUserIds:[],trainerSubjects:[]}});
 const service=createPolicyService({store:{read:async()=>structuredClone(ledger),compareAndSwap:async()=>{throw Error('Unexpected write');}},authorizationResolver:resolver,ownerUserIds:['owner']});
 installRugbyPolicyPreviewRoutes({app,requireAuth:auth,policyService:service});
 return async(method,auth,body)=>{const out={status:200};const res={set:(k,v)=>{out[k]=v;},status:n=>{out.status=n;return res;},json:x=>{out.body=x;return res;}};await routes[method]({auth,body},res);return out;};
}
test('owner reads and previews without mutation',async()=>{const call=fixture(),owner={userId:'owner'},policy=defaultPolicy();policy.stages[0].minimumScore=5;const r=await call('POST',owner,{policy,expectedVersion:1,reason:'Review'});assert.equal(r.status,200);assert.equal(r.body.data.published,false);assert.equal(r.body.data.changes.length,1);assert.equal((await call('GET',owner)).body.data.policy.stages[0].minimumScore,4);assert.equal(r['Cache-Control'],'private, no-store');});
test('nonowner and spoofed body identity denied',async()=>{const call=fixture();for(const auth of [null,{userId:'other'},{userId:'athlete',role:'super_admin'}]){assert.equal((await call('GET',auth)).status,403);assert.equal((await call('POST',auth,{userId:'owner',policy:defaultPolicy(),expectedVersion:1,reason:'Review'})).status,403);}});
test('invalid and stale drafts rejected',async()=>{const call=fixture(),owner={userId:'owner'},policy=defaultPolicy();assert.equal((await call('POST',owner,{policy,expectedVersion:2,reason:'Review'})).status,409);policy.stages[0].minimumScore=1;assert.equal((await call('POST',owner,{policy,expectedVersion:1,reason:'Review'})).status,400);});

test('canonical preview owner needs verified identity and bootstrap role, not duplicate allowlist',async()=>{
 const resolver=createAuthorizationResolver({adminEmails:['admin@example.test'],bootstrap:{superAdminUserIds:['owner'],superAdminSubjects:[]},roleAssignments:{adminUserIds:[],adminSubjects:[],trainerUserIds:[],trainerSubjects:[]}});
 const service=createPolicyService({store:{read:async()=>initialLedger(),compareAndSwap:async()=>{throw Error('Unexpected write');}},authorizationResolver:resolver,ownerUserIds:[],canonicalPreviewOwner:true});
 const owner={userId:'owner',provider:'firebase',providerVerified:true};
 const request={policy:defaultPolicy(),expectedVersion:1,reason:'Review'};
 assert.equal((await service.read(owner)).length,1);
 assert.equal((await service.preview(owner,request)).published,false);
 for(const auth of [{...owner,providerVerified:false},{...owner,provider:'pilot_bypass'},{...owner,identityClass:'pilot_bypass'},{userId:'member',providerVerified:true},{userId:'admin',email:'admin@example.test',providerVerified:true}]){
  await assert.rejects(service.read(auth),/Policy owner required/);
  await assert.rejects(service.preview(auth,request),/Policy owner required/);
 }
 await assert.rejects(service.publish(owner,request),/Policy owner required/);
 await assert.rejects(service.restore(owner,{version:1,expectedVersion:1,reason:'Review'}),/Policy owner required/);
});
