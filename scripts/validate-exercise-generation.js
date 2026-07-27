#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{validate}=require('./lib/json-schema-validator'),{ROOT,RULES,loadSource,generateProfile,generateTranslationSource,runtimeAdapter}=require('./lib/exercise-profile-generator'),{sourceIds}=require('./generate-exercise-profiles');
const schema=name=>JSON.parse(fs.readFileSync(path.join(ROOT,'exercise-generation/schemas',name),'utf8'));let failures=[];
function check(label,s,value){const result=validate(s,value);if(!result.valid)failures.push({label,errors:result.errors});}
for(const id of sourceIds()){const source=loadSource(id),profile=generateProfile(source).profile;check(`source:${id}`,JSON.parse(fs.readFileSync(path.join(ROOT,'exercise-generation/schema.json'))),source);check(`profile:${id}`,schema('profile.schema.json'),profile);check(`runtime:${id}`,schema('runtime.schema.json'),runtimeAdapter(profile));check(`translation:${id}`,schema('translation.schema.json'),generateTranslationSource(profile));}
check('capability-registry',schema('capability-registry.schema.json'),RULES);check('manifest',schema('manifest.schema.json'),JSON.parse(fs.readFileSync(path.join(ROOT,'generated/exercise-profiles/manifest.generated.json'))));
if(failures.length){console.error(JSON.stringify(failures,null,2));process.exitCode=1;}else console.log(`Exercise generation schemas: ${sourceIds().length} source(s), canonical profiles, runtime adapters, translations, capability registry, and manifest valid.`);
