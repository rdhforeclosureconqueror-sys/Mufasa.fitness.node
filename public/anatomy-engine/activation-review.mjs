// Release gate for reviewed exercise mappings. No approvals are supplied by this module.
export function evaluateActivationReview(record,exerciseIds,muscleIds){
 const issues=[];
 if(!record||!exerciseIds.has(record.exerciseId))issues.push('unknown_exercise');
 if(!record?.technique?.trim())issues.push('missing_technique');
 if(!record?.reviewer?.trim()||record?.decision!=='approved'||!/^\d{4}-\d{2}-\d{2}$/.test(record?.reviewDate||''))issues.push('missing_review');
 const evidence=Array.isArray(record?.evidence)?record.evidence:[];
 const refs=new Set(evidence.filter(e=>e?.id&&e?.citation?.trim()&&e?.limitations?.trim()).map(e=>e.id));
 const mappings=Array.isArray(record?.mappings)?record.mappings:[];
 if(!mappings.length)issues.push('missing_mappings');
 const seen=new Set();
 for(const m of mappings){
 if(!muscleIds.has(m.muscleId)||!['primary','secondary','stabilizer'].includes(m.role)||!['left','right','bilateral','midline'].includes(m.side))issues.push('invalid_mapping');
 const key=m.muscleId+':'+m.side;
 if(seen.has(key))issues.push('duplicate_mapping');seen.add(key);
 if(!m.rationale?.trim()||!Array.isArray(m.evidenceIds)||!m.evidenceIds.length||m.evidenceIds.some(id=>!refs.has(id)))issues.push('unsupported_mapping');
 }
 if(record?.geometryReview!=='approved')issues.push('geometry_pending');
 return {eligible:issues.length===0,issues,mappings:issues.length?[]:mappings.map(({muscleId,role,side})=>({muscleId,role,side}))};
}
