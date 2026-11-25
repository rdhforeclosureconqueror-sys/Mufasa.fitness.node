function resolveMaster(registry,key){if(typeof key!=="string")return {status:"INVALID_REFERENCE"};if(!key.includes(":"))return {status:"QUALIFIED_REFERENCE_REQUIRED"};const matches=registry.records.filter(r=>r.key===key);return matches.length===1?{status:"SOURCE_ONLY",record:matches[0],runtimeActivation:false}:{status:"UNKNOWN_OR_AMBIGUOUS_REFERENCE"};}
module.exports={resolveMaster};
