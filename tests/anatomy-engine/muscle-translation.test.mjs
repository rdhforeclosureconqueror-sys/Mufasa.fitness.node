import test from 'node:test';
import assert from 'node:assert/strict';
import {translateClassification,supportedGroups} from '../../public/anatomy-engine/muscle-translation.mjs';
import {readFileSync} from 'node:fs';
test('all source labels recognized',()=>{const rows=JSON.parse(readFileSync(new URL('../../data/exercise.json',import.meta.url)));for(const row of rows)for(const label of [...row.primaryMuscles,...row.secondaryMuscles])assert.ok(supportedGroups().includes(label.replaceAll(' ','_')),label);});
test('broad groups never activate specific muscles',()=>{const r=translateClassification({primaryMuscles:['shoulders','shoulders'],secondaryMuscles:['lower back']});assert.equal(r.candidates.length,2);assert.deepEqual(r.mappings,[]);assert.ok(r.missingRoles.includes('stabilizer'));});
test('unsupported and prototype labels unresolved',()=>{const r=translateClassification({primaryMuscles:['neck','constructor','unknown']});assert.equal(r.unresolved.length,3);assert.equal(r.status,'missing');});
test('candidate IDs exist in preview',()=>{const html=readFileSync(new URL('../../public/anatomy-engine/premium-preview.html',import.meta.url),'utf8');const ids=new Set([...html.matchAll(/data-muscle="([^"]+)"/g)].map(m=>m[1]));for(const c of translateClassification({primaryMuscles:supportedGroups()}).candidates)for(const id of c.muscleIds)assert.ok(ids.has(id),id);});
