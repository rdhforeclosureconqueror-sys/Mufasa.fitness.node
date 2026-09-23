"use strict";
const {AcademyScenario}=require("./contracts");
function createScenarioRegistry(){const scenarios=new Map();return Object.freeze({register(value){const scenario=AcademyScenario(value),key=`${scenario.id}@${scenario.version}`;if(scenarios.has(key))throw new Error(`duplicate_scenario_version:${key}`);scenarios.set(key,scenario);return scenario},get:(id,version)=>scenarios.get(`${id}@${version}`)||null,list:()=>[...scenarios.values()]});}
module.exports={createScenarioRegistry};
