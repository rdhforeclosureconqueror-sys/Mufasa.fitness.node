'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {validateCheckin}=require('../src/rugby/checkinValidation');
test('valid check-in defaults',()=>assert.deepEqual(validateCheckin({date:'2026-11-06',readiness:'fatigued'}),{date:'2026-11-06',readiness:'fatigued',teamHighLoad:false,injuryConcern:false,week:1}));
test('rejects malformed readiness',()=>{for(const input of [{date:'2026-11-06',readiness:'great'},{date:'2026-02-30',readiness:'normal'},{date:'2026-11-06',readiness:'normal',teamHighLoad:'false'},{date:'2026-11-06',readiness:'normal',week:9}])assert.throws(()=>validateCheckin(input));});
