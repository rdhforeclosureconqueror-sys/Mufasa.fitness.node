"use strict";
function hashSeed(seed){let h=2166136261;for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function createSeededRandom(seed,state=hashSeed(seed)){let value=state>>>0;return Object.freeze({next(){value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296},snapshot:()=>value,restore:x=>{value=x>>>0}})}
module.exports={createSeededRandom,hashSeed};
