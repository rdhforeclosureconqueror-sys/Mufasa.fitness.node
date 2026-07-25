#!/usr/bin/env node
'use strict';
const metadata=require('../public/exercise-metadata.js');
let profiles=metadata.profiles;
const fixture=process.argv[2];
if(fixture) profiles=require(require('node:path').resolve(fixture));
const result=metadata.validateExerciseRegistry(profiles);
for(const kind of ['errors','warnings'])for(const item of result[kind])console[kind==='errors'?'error':'warn'](`${kind.toUpperCase()} ${item.code} ${item.exerciseId||'<registry>'} ${item.path}: ${item.message}`);
console.log(`Exercise metadata: ${profiles.length} profiles, ${result.errors.length} errors, ${result.warnings.length} warnings.`);
process.exitCode=result.valid?0:1;
