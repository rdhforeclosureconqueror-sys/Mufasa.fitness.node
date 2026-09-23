"use strict";
function createSyntheticAdapter(behavior="SUCCESS"){let calls=0;return Object.freeze({get calls(){return calls},async invoke(input){calls++;if(behavior==="TIMEOUT")return new Promise(()=>{});if(behavior==="RETRYABLE"&&calls===1){const e=new Error("temporary");e.retryable=true;throw e}if(behavior==="FAIL"){const e=new Error("permanent");e.retryable=false;throw e}if(behavior==="MALFORMED")return {wrong:true};if(behavior==="PARTIAL")return {accepted:true,complete:false};return {accepted:true,value:input.value}}})}
module.exports={createSyntheticAdapter};
