import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const source=require('../data/exercise.json');
const {listExercises}=require('../src/exercise-intelligence/exerciseCatalog.js');
const html=readFileSync(new URL('../public/anatomy-engine/premium-preview.html',import.meta.url),'utf8');
const visible=new Set([...html.matchAll(/data-muscle="([^"]+)"/g)].map(m=>m[1]));
function inventory(rows,fields){
 return Object.fromEntries(Object.entries(fields).map(([role,read])=>{
 const values=rows.map(r=>read(r)).map(v=>Array.isArray(v)?v:[]);
 const labels=[...new Set(values.flat())].sort();
 return [role,{populated:values.filter(v=>v.length).length,empty:values.filter(v=>!v.length).length,labels,exactVisibleLabels:labels.filter(v=>visible.has(v)),unresolvedLabels:labels.filter(v=>!visible.has(v))}];
 }));
}
const canonical=listExercises();
console.log(JSON.stringify({sourceCount:source.length,canonicalCount:canonical.length,visibleMuscles:[...visible].sort(),source:inventory(source,{primary:r=>r.primaryMuscles,secondary:r=>r.secondaryMuscles,stabilizer:r=>r.stabilizers}),canonical:inventory(canonical,{primary:r=>r.classification.primaryMuscles,secondary:r=>r.classification.secondaryMuscles,stabilizer:r=>r.stabilizers}),note:'Exact label comparison only; no anatomical approval or inferred stabilizers.'},null,2));
