import {resolveRegions,paintRegions} from './engine.mjs';
export const MODEL_IDS=Object.freeze(['male','female','neutral-male','neutral-female']);
export function mountPremiumModel(figures, mappings, status='unverified', onSelect=()=>{}){
 if(figures.length!==2)throw Error('Expected two anatomical views');
 const models=figures.map(svg=>({svg,regions:[...svg.querySelectorAll('[data-region-id]')].map(n=>({id:n.getAttribute('data-region-id'),muscleId:n.getAttribute('data-muscle-id')||n.getAttribute('data-muscle'),side:n.getAttribute('data-side')}))}));
 if(models[0].regions.length!==24||models[1].regions.length!==26)throw Error('Unexpected region count');
 const result=resolveRegions(models.flatMap(m=>m.regions),mappings,status);
 const clean=[];
 try{for(const m of models){const ids=new Set(m.regions.map(r=>r.id));const subset=result.regions.filter(r=>ids.has(r.id));clean.push(paintRegions(m.svg,{...result,regions:subset},onSelect));const lookup=new Map(subset.map(r=>[r.id,r]));for(const n of m.svg.querySelectorAll('[data-region-id]')){const r=lookup.get(n.getAttribute('data-region-id'));n.style.fill=r.color;n.style.fillOpacity=['primary','secondary','stabilizer'].includes(r.role)?'.55':'0';n.style.pointerEvents='all';}}}catch(e){clean.forEach(fn=>fn());throw e;}
 return {result,dispose:()=>clean.forEach(fn=>fn())};
}
