'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createPolicyService}=require('../src/rugby/beastModePolicyService');
const {initialLedger}=require('../src/rugby/beastModePolicyLedger');
const {defaultPolicy}=require('../src/rugby/beastModePolicy');
const {createAuthorizationResolver}=require('../src/lib/authorization');
function fixture(){
 let ledger=initialLedger();
 const store={read:async()=>structuredClone(ledger),compareAndSwap:async(v,next)=>{if(ledger.at(-1).version!==v)return false;ledger=structuredClone(next);return true;}};
 const resolver=createAuthorizationResolver({adminEmails:[],bootstrap:{superAdminUserIds:['owner','other'],superAdminSubjects:[]},roleAssignments:{adminUserIds:['admin'],adminSubjects:[],trainerUserIds:['coach'],trainerSubjects:[]}});
 return createPolicyService({store,authorizationResolver:resolver,ownerUserIds:['owner'],now:()=> '2026-11-25T00:00:00.000Z'});
}
const owner={userId:'owner'};
const request=()=>({policy:defaultPolicy(),expectedVersion:1,reason:'Review'});
test('owner publishes and restores as new versions',async()=>{const s=fixture();assert.equal((await s.publish(owner,request())).version,2);assert.equal((await s.restore(owner,{version:1,expectedVersion:2,reason:'Restore'})).version,3);assert.equal((await s.read(owner)).length,3);});
test('other roles cannot read or publish or restore',async()=>{const s=fixture();for(const auth of [null,{userId:'other'},{userId:'admin'},{userId:'coach'},{userId:'athlete',role:'super_admin'}]){await assert.rejects(s.read(auth),/owner required/);await assert.rejects(s.publish(auth,request()),/owner required/);await assert.rejects(s.restore(auth,{version:1,expectedVersion:1,reason:'x'}),/owner required/);}});
test('concurrent updates cannot overwrite history',async()=>{const s=fixture();const results=await Promise.allSettled([s.publish(owner,request()),s.publish(owner,request())]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.filter(x=>x.status==='rejected').length,1);assert.equal((await s.read(owner)).length,2);});
test('stale restore rejected',async()=>{const s=fixture();await s.publish(owner,request());await assert.rejects(s.restore(owner,{version:1,expectedVersion:1,reason:'stale'}),/Version conflict/);});
