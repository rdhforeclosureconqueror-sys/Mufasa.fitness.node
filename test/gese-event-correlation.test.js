'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {RepetitionEventCorrelator}=require('../public/push-up-challenge');
test('correlates repetition events one-to-one and prevents duplicates',()=>{const c=new RepetitionEventCorrelator({windowMs:100,expiryMs:200});assert.deepEqual(c.add('legacy',{eventId:'l1',timestamp:1000}),[]);assert.equal(c.add('sequence',{eventId:'s1',timestamp:1050})[0].classification,'both_counted');assert.deepEqual(c.add('sequence',{eventId:'s1',timestamp:1050}),[]);assert.equal(c.status().matches.length,1);});
test('expires unmatched events and marks interruptions ambiguous',()=>{const c=new RepetitionEventCorrelator({windowMs:50,expiryMs:100});c.add('legacy',{eventId:'l',timestamp:100});const results=c.add('sequence',{eventId:'s',timestamp:300,interrupted:true},300).concat(c.expire(500));assert.ok(results.some(x=>x.classification==='legacy_only'));assert.ok(results.some(x=>x.classification==='unmatched_or_ambiguous'));});
