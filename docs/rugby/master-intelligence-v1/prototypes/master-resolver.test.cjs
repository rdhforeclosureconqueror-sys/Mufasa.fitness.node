const {test}=require('node:test');
const assert=require('node:assert/strict');
const {resolveMaster}=require('./master-resolver.cjs');
const registry=require('../../../../data/rugby/master-intelligence-v1/master-qualified-registry.json');
for(const [k,s] of [["archive:M2-03","SOURCE_ONLY"],["thread:M2-03","SOURCE_ONLY"],["M2-03","QUALIFIED_REFERENCE_REQUIRED"],["M1-01","QUALIFIED_REFERENCE_REQUIRED"],["other:M2-03","UNKNOWN_OR_AMBIGUOUS_REFERENCE"],[null,"INVALID_REFERENCE"]])test(String(k),()=>{if(resolveMaster(registry,k).status!==s)throw Error(String(k));});
