'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {classify,format}=require('../public/rugby-policy-dashboard-diagnostics.js');
test('classifies every owner-preview acceptance boundary without session data',()=>{
 assert.deepEqual(classify({error:{code:'AUTH_NOT_READY'},diagnostics:{dispatched:false}}),{boundary:'SESSION',code:'AUTH_NOT_READY',message:'Your signed-in session is not ready. Sign in again, then retry.'});
 assert.equal(classify({diagnostics:{dispatched:false,failureClass:'timeout'}}).code,'REQUEST_TIMEOUT');
 assert.equal(classify({diagnostics:{dispatched:false,failureClass:'unknown network'}}).code,'REQUEST_NOT_DISPATCHED');
 assert.equal(classify({diagnostics:{dispatched:true,status:401}}).boundary,'HTTP_AUTHENTICATION');
 assert.equal(classify({diagnostics:{dispatched:true,status:403}}).boundary,'HTTP_AUTHORIZATION');
 assert.equal(classify({diagnostics:{dispatched:true,status:502}}).boundary,'HTTP_RESPONSE');
 assert.equal(classify({ok:true,diagnostics:{dispatched:true,status:200},payload:{ok:false}}).boundary,'RESPONSE_SHAPE');
 assert.deepEqual(classify({ok:true,diagnostics:{dispatched:true,status:200},payload:{ok:true,data:{version:1}}}),{boundary:'NONE',code:'PASS',message:'Owner-preview acceptance request completed.'});
 assert.match(format(classify({diagnostics:{dispatched:true,status:403}})),/HTTP_AUTHORIZATION/);
});
