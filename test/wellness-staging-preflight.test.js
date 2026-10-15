"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const {URL}=require("node:url");
const {validateStagingTarget}=require("../scripts/wellness-staging-preflight");
test("staging preflight rejects missing and production targets",()=>{
 for(const target of ["","https://mufasafitsite.onrender.com","https://mufasa-fitness-node.onrender.com","http://localhost:10000","https://example.com"]){
  assert.throws(()=>validateStagingTarget({target,approvedHost:"",productionHosts:["mufasafitsite.onrender.com","mufasa-fitness-node.onrender.com"]}));
 }
});
test("staging preflight requires explicit matching allowlisted hostname",()=>{
 const target="https://milele-wellness-staging.onrender.com";
 assert.throws(()=>validateStagingTarget({target,approvedHost:"other.onrender.com"}));
 assert.equal(validateStagingTarget({target,approvedHost:"milele-wellness-staging.onrender.com"}).origin,target);
 assert.throws(()=>validateStagingTarget({target:"https://milele-wellness-staging.onrender.com.attacker.net",approvedHost:"milele-wellness-staging.onrender.com"}));
 assert.throws(()=>validateStagingTarget({target:"https://user:pass@milele-wellness-staging.onrender.com",approvedHost:"milele-wellness-staging.onrender.com"}));
});
