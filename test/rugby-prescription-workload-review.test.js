'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {normalizeWorkload,reviewPrescription}=require('../src/rugby/prescriptionWorkloadReview');
const program={microcycles:[{week:1,sessions:[{type:'workout',date:'2026-11-30',sessionId:'s',durationMinutes:30,exercises:[{sets:3}]}]}]};
test('missing workload is unknown, not zero',()=>{const r=reviewPrescription(program,normalizeWorkload(undefined));assert.equal(r.externalMinutes,null);assert.ok(r.reasons.includes('weekly_workload_unknown'));assert.equal(r.trainingAuthorized,false);});
test('same day practice and protected recovery are flagged without changing prescription',()=>{const before=JSON.stringify(program);const r=reviewPrescription(program,normalizeWorkload([{day:1,kind:'practice',minutes:90},{day:1,kind:'protected_recovery',minutes:60}]));assert.equal(r.externalMinutes,90);assert.equal(r.weeks[0].plannedSets,3);assert.equal(r.weeks[0].collisions.length,2);assert.equal(r.automaticDoseAdjustment,false);assert.equal(JSON.stringify(program),before);});
test('invalid workload is rejected',()=>{for(const x of [null,[{day:7,kind:'match',minutes:80}],[{day:1,kind:'match',minutes:-1}],[{day:1,kind:'match',minutes:80,approved:true}]])assert.throws(()=>normalizeWorkload(x));});

const {normalizeMatchDates}=require('../src/rugby/prescriptionWorkloadReview');
test('match proximity reuses in-season guide without changing workout',()=>{const before=JSON.stringify(program);const r=reviewPrescription(program,[],normalizeMatchDates(['2026-12-02']));assert.equal(r.weeks[0].competition[0].phase,'match_window');assert.equal(r.weeks[0].competition[0].daysToMatch,2);assert.equal(r.automaticDoseAdjustment,false);assert.equal(JSON.stringify(program),before);});
test('unknown calendar differs from explicitly empty calendar',()=>{assert.equal(reviewPrescription(program,[]).weeks[0].competition[0].phase,null);assert.equal(reviewPrescription(program,[],[]).weeks[0].competition[0].phase,'maintenance_window');});
test('match dates validate and normalize',()=>{assert.deepEqual(normalizeMatchDates(['2026-12-02','2026-11-30','2026-12-02']),['2026-11-30','2026-12-02']);assert.throws(()=>normalizeMatchDates(['2026-02-30']));});
