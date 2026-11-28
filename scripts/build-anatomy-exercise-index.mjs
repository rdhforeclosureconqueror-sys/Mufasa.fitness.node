import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {listExercises}=require('../src/exercise-intelligence/exerciseCatalog.js');
const rows=listExercises().map(e=>({id:e.exerciseId,name:e.displayName,aliases:e.aliases,primaryMuscles:e.classification.primaryMuscles,secondaryMuscles:e.classification.secondaryMuscles,stabilizers:e.stabilizers}));
if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Duplicate canonical exercise IDs');
writeFileSync(new URL('../public/anatomy-engine/exercise-index.json',import.meta.url),JSON.stringify({version:1,source:'canonical exercise catalog',rows}));
console.log('Canonical anatomy exercise count:',rows.length);
