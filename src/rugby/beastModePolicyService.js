'use strict';
const {publish,restore}=require('./beastModePolicyLedger');
// Internal service only. Auth must originate from verified server authentication.
// Store must implement atomic compare-and-swap across all writers.
function createPolicyService({store,authorizationResolver,ownerUserIds=[],now=()=>new Date().toISOString()}){
 const owners=new Set(ownerUserIds.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()));
 function authorize(auth){
  if(!auth||typeof auth.userId!=='string'||!owners.has(auth.userId))throw Error('Policy owner required');
  const role=authorizationResolver.resolveRole(auth);
  if(role.role!=='super_admin'||role.isBootstrapSuperAdmin!==true)throw Error('Policy owner required');
  return auth.userId;
 }
 async function change(auth,request,operation){
  const actor=authorize(auth);
  const ledger=await store.read();
  const next=operation(ledger,request,actor,now());
  if(await store.compareAndSwap(request.expectedVersion,next)!==true)throw Error('Version conflict');
  return structuredClone(next.at(-1));
 }
 return {read:async auth=>{authorize(auth);return structuredClone(await store.read());},
 publish:(auth,request)=>change(auth,request,publish),
 restore:(auth,request)=>change(auth,request,restore)};
}
module.exports={createPolicyService};
