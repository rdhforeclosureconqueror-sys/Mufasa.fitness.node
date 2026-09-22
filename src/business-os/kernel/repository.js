"use strict";
function clone(value){return structuredClone(value)}
function createKernelRepository(){
 const data={actors:new Map(),grants:new Map(),policies:new Map(),works:new Map(),intents:new Map(),executions:new Map(),evidence:new Map(),provenance:new Map(),events:new Map(),outbox:new Map(),switches:new Map(),consumerReceipts:new Set()};
 const audit=[];
 Object.defineProperty(data,"audit",{enumerable:false,get:()=>Object.freeze([...audit])});
 const snapshot=()=>clone(data),restore=s=>{for(const key of Object.keys(data)){if(data[key] instanceof Map){data[key].clear();for(const [k,v] of s[key])data[key].set(k,v)}else if(data[key] instanceof Set){data[key].clear();for(const v of s[key])data[key].add(v)}else data[key].splice(0,data[key].length,...s[key])}};
 const appendAudit=event=>{audit.push(event);return event};
 return Object.freeze({data,snapshot,restore,appendAudit,updateAudit(){throw new Error("audit_immutable")},deleteAudit(){throw new Error("audit_immutable")}});
}
module.exports={createKernelRepository};
