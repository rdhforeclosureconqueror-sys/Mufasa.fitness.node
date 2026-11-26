'use strict';
const {validatePolicy,defaultPolicy}=require('./beastModePolicy');
// Pure version ledger; caller must supply trusted authorization and atomic persistence.
function initialLedger(){return [{version:1,policy:defaultPolicy(),actor:'system',reason:'Original candidate defaults',publishedAt:null}];}
function publish(ledger,{policy,expectedVersion,reason},actor,now){
 if(!Array.isArray(ledger)||!ledger.length||ledger.some((v,i)=>v.version!==i+1))throw Error('Invalid ledger');
 if(typeof actor!=='string'||!actor.trim()||typeof reason!=='string'||!reason.trim()||reason.length>1000)throw Error('Audit context required');
 if(typeof now!=='string'||!Number.isFinite(Date.parse(now))||new Date(now).toISOString()!==now)throw Error('Invalid timestamp');
 if(ledger.at(-1).version!==expectedVersion)throw Error('Version conflict');
 return [...ledger,{version:expectedVersion+1,policy:validatePolicy(policy),actor,reason,publishedAt:now}];
}
function restore(ledger,{version,expectedVersion,reason},actor,now){
 const prior=ledger.find(v=>v.version===version);
 if(!prior)throw Error('Unknown version');
 return publish(ledger,{policy:prior.policy,expectedVersion,reason},actor,now);
}
module.exports={initialLedger,publish,restore};
