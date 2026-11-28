import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolveRegions} from '../../public/anatomy-engine/engine.mjs';
import {MODEL_IDS} from '../../public/anatomy-engine/premium-adapter.mjs';
const root=new URL('../../public/anatomy-engine/',import.meta.url);
const html=readFileSync(new URL('premium-preview.html',root),'utf8');
const manifest=JSON.parse(readFileSync(new URL('assets/premium/manifest.json',root),'utf8'));
const figures=[...html.matchAll(/<figure data-model="([^"]+)" data-view="([^"]+)">([\s\S]*?)<\/figure>/g)];
for(const model of MODEL_IDS)test(model+' asset and resolver contract',()=>{
 const views=figures.filter(f=>f[1]===model);assert.equal(views.length,2);
 const regions=views.flatMap(f=>{
 const asset=manifest.models[model][f[2]];
 assert.ok(existsSync(new URL('assets/premium/'+asset,root)));
 assert.ok(f[3].includes('href="./assets/premium/'+asset+'"'));
 const paths=[...f[3].matchAll(/<path\b[^>]*>/g)];
 assert.equal(paths.length,f[2]==='anterior'?24:26);
 return paths.map(([p])=>({id:p.match(/data-region-id="([^"]+)"/)[1],muscleId:p.match(/data-muscle="([^"]+)"/)[1],side:p.match(/data-side="([^"]+)"/)[1]}));
 });
 assert.equal(new Set(regions.map(r=>r.id)).size,50);
 const result=resolveRegions(regions,[{muscleId:'pectoralis_major',role:'primary',side:'bilateral'}],'unverified');
 assert.equal(result.issues.length,0);assert.equal(result.regions.filter(r=>r.role==='primary').length,2);
 assert.ok(resolveRegions(regions,[],'missing').regions.every(r=>r.role==='unknown'));
});
