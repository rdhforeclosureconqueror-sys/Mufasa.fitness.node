'use strict';
const {publish,restore}=require('./beastModePolicyLedger');
// Internal service only. Auth must originate from verified server authentication.
// Store must implement atomic compare-and-swap across all writers.
function createPolicyService({store,authorizationResolver,ownerUserIds=[],canonicalOwner=false,now=()=>new Date().toISOString()}){
 const owners=new Set(ownerUserIds.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()));
 function authorize(auth){
  if(!auth||typeof auth.userId!=='string')throw Error(canonicalOwner?'Policy admin required':'Policy owner required');
  const role=authorizationResolver.resolveRole(auth);
  if(canonicalOwner){
   if(auth.providerVerified!==true||auth.provider==='pilot_bypass'||auth.identityClass==='pilot_bypass'||!['super_admin','admin'].includes(role.role))throw Error('Policy admin required');
   return auth.userId;
  }
  if(!owners.has(auth.userId)||role.role!=='super_admin'||role.isBootstrapSuperAdmin!==true)throw Error('Policy owner required');
  return auth.userId;
 }
 async function change(auth,request,operation){
  const actor=authorize(auth);
  const ledger=await store.read();
  const next=operation(ledger,request,actor,now());
  if(await store.compareAndSwap(request.expectedVersion,next)!==true)throw Error('Version conflict');
  return structuredClone(next.at(-1));
 }
 async function preview(auth,request){
  const actor=authorize(auth);
  const ledger=await store.read();
  const proposed=publish(ledger,request,actor,now()).at(-1);
  const current=ledger.at(-1);
  const changes=[];
  for(const [i,stage] of proposed.policy.stages.entries()){
   const before=current.policy.stages[i];
   for(const field of Object.keys(stage)){
    if(JSON.stringify(before[field])!==JSON.stringify(stage[field]))changes.push({stageId:stage.id,field,before:before[field],after:stage[field]});
   }
  }
  return structuredClone({baseVersion:current.version,proposedPolicy:proposed.policy,changes,published:false,stageChangeAuthorized:false});
 }
 return {preview,read:async auth=>{authorize(auth);return structuredClone(await store.read());},
 publish:(auth,request)=>change(auth,request,publish),
 restore:(auth,request)=>change(auth,request,restore)};
}
module.exports={createPolicyService};
