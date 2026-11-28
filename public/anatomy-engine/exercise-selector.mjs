import {translateClassification} from './muscle-translation.mjs';
export function searchExercises(rows,query){const q=query.trim().toLowerCase();return rows.filter(r=>[r.name,r.id,...(r.aliases||[])].some(v=>String(v).toLowerCase().includes(q))).slice(0,50);}
export function attachExerciseSelector(root,rows){
 const input=root.querySelector('input'),select=root.querySelector('select'),output=root.querySelector('pre');
 function render(){const matches=searchExercises(rows,input.value);select.replaceChildren();for(const row of matches){const o=document.createElement('option');o.value=row.id;o.textContent=row.name;select.append(o);}show();}
 function show(){const row=rows.find(r=>r.id===select.value);if(!row){output.textContent='No matching exercise';return;}const result=translateClassification(row);output.textContent=JSON.stringify({exercise:row.name,primary:row.primaryMuscles,secondary:row.secondaryMuscles,stabilizers:row.stabilizers?.length?row.stabilizers:'Unknown',...result},null,2);}
 input.addEventListener('input',render);select.addEventListener('change',show);render();
}
