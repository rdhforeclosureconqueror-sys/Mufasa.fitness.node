"use strict";
// Pure ownership guard. Never deletes or mutates production records.
const PREFIX="milele-acceptance-";
function assessTestRecordOwnership({runId,record,kind,expectedUserId}={}){
 const fail=reason=>({authorized:false,reason});
 if(typeof runId!=="string"||!new RegExp("^"+PREFIX+"[a-f0-9]{16,64}$").test(runId))return fail("INVALID_RUN_ID");
 if(!["identity","event","crm"].includes(kind))return fail("UNSUPPORTED_RECORD_KIND");
 if(!record||typeof record!=="object"||Array.isArray(record))return fail("MISSING_RECORD");
 if(record.syntheticTest!==true||record.testRunId!==runId)return fail("OWNERSHIP_MARKER_MISMATCH");
 if(record.productionCustomer===true||record.paymentCustomerId||record.stripeCustomerId)return fail("REAL_CUSTOMER_OR_BILLING_LINK");
 if(kind==="identity"&&(!expectedUserId||record.userId!==expectedUserId))return fail("IDENTITY_ID_MISMATCH");
 if(kind==="event"&&(!record.eventId||record.status==="confirmed"))return fail("EVENT_NOT_ISOLATED_DRAFT");
 if(kind==="crm"&&(!expectedUserId||record.userId!==expectedUserId))return fail("CRM_IDENTITY_MISMATCH");
 return {authorized:true,reason:null};
}
module.exports={PREFIX,assessTestRecordOwnership};
