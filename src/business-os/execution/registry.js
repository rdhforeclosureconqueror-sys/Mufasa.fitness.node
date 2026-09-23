"use strict";
const C=require("./contracts");
const clone=value=>structuredClone(value);
const readable=(record,actor)=>record.organizationId===actor?.organizationId&&(record.permissionTags||["PUBLIC"]).some(tag=>tag==="PUBLIC"||(actor.permissionTags||[]).includes(tag));
function createRegistry(){
 const tools=new Map(),capabilities=new Map();
 function registerTool(values){const item=C.Tool(values);if(tools.has(item.id))throw new Error("tool_id_exists");tools.set(item.id,item);return item}
 function registerCapability(values){const item=C.Capability(values);if(capabilities.has(item.id))throw new Error("capability_id_exists");capabilities.set(item.id,item);return item}
 const get=(map,id,actor)=>{const item=map.get(id);return item&&readable(item,actor)?clone(item):null};
 function resolveCapabilities({actor,requiredInputs=[],autonomyLevel,maxCost,riskLevels}={}){return [...capabilities.values()].filter(c=>readable(c,actor)&&c.status==="AVAILABLE"&&c.validationStatus==="VALIDATED"&&c.requiredInputs.every(x=>requiredInputs.includes(x))&&(!autonomyLevel||C.AUTONOMY_LEVELS.indexOf(autonomyLevel)<=C.AUTONOMY_LEVELS.indexOf(c.autonomyLevel))&&(maxCost===undefined||c.estimatedCost?.amount!==null&&c.estimatedCost.amount<=maxCost)&&(!riskLevels||riskLevels.includes(c.risk))).map(clone)}
 function toolsForCapability(capabilityId,actor){return [...tools.values()].filter(t=>readable(t,actor)&&t.supportedCapabilityIds.includes(capabilityId)).map(clone)}
 return Object.freeze({registerTool,registerCapability,getTool:(id,a)=>get(tools,id,a),getCapability:(id,a)=>get(capabilities,id,a),resolveCapabilities,toolsForCapability,listTools:a=>[...tools.values()].filter(x=>readable(x,a)).map(clone),listCapabilities:a=>[...capabilities.values()].filter(x=>readable(x,a)).map(clone)});
}
module.exports={createRegistry};
