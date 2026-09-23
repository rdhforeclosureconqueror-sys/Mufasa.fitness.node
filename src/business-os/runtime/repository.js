"use strict";
const clone=value=>value===undefined?undefined:structuredClone(value);
function createRuntimeRepository(){const maps={roles:new Map(),agents:new Map(),missions:new Map(),goals:new Map(),runs:new Map(),transitions:new Map(),observations:new Map(),decisions:new Map(),escalations:new Map(),reports:new Map()};const scoped=(map,id,organizationId)=>{const value=map.get(id);return value&&value.organizationId===organizationId?clone(value):null};return Object.freeze({data:maps,put:(name,value)=>{maps[name].set(value.id,value);return value},get:(name,id,organizationId)=>scoped(maps[name],id,organizationId),list:(name,organizationId)=>[...maps[name].values()].filter(x=>x.organizationId===organizationId).map(clone)});}
module.exports={createRuntimeRepository};
