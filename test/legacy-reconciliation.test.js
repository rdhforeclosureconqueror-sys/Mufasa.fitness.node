'use strict';
const assert=require('node:assert/strict'); const fs=require('node:fs'); const os=require('node:os'); const path=require('node:path'); const test=require('node:test');
const audit=require('../scripts/lib/legacy-reconciliation');

test('inventory is deterministic, checksummed, bounded, and does not mutate legacy files',()=>{
  const before=audit.walkLegacy(), after=audit.walkLegacy(); assert.deepEqual(after,before); assert.ok(before.length>40);
  for(const item of before){assert.match(item.sha256,/^[a-f0-9]{64}$/);assert.ok(item.sizeBytes<5_000_000);}
});
test('reconciliation IDs and register ordering are stable',()=>{const a=audit.buildRegister(),b=audit.buildRegister();assert.deepEqual(a,b);assert.equal(new Set(a.records.map(x=>x.reconciliationId)).size,a.records.length);});
test('schema validator catches duplicate records, invalid statuses, paths, and missing evidence',()=>{
  const r=audit.buildRegister(); assert.deepEqual(audit.validateRegister(r),[]); const bad=structuredClone(r); bad.records.push({...bad.records[0]}); bad.records[0].primaryReconciliationStatus='Maybe'; bad.records[0].legacyAssetPath='../secret'; bad.records[0].validationEvidence=[]; const errors=audit.validateRegister(bad).join('\n'); assert.match(errors,/invalid status/);assert.match(errors,/invalid path/);assert.match(errors,/missing validationEvidence/);assert.match(errors,/Duplicate reconciliation ID/);
});
test('malformed JSON fails safely and executable legacy content is never loaded',()=>{
  const item=audit.walkLegacy().find(x=>x.path.endsWith('erm.json'));assert.equal(item.parsingStatus,'malformed-json');
  const scripts=audit.walkLegacy().filter(x=>/\.(js|py)$/.test(x.path));assert.ok(scripts.length);assert.ok(scripts.every(x=>['text-not-executed','binary-or-opaque-not-executed'].includes(x.parsingStatus)));
});
test('symlinks are reported and never traversed',()=>{
  const link=path.join(audit.LEGACY_ROOT,'.audit-test-link'); try{fs.symlinkSync(os.tmpdir(),link);const row=audit.walkLegacy().find(x=>x.path.endsWith('.audit-test-link'));assert.equal(row.parsingStatus,'rejected-symlink');}finally{fs.rmSync(link,{force:true});}
});
test('checksum changes with content but is stable for identical bytes',()=>{assert.equal(audit.sha256(Buffer.from('a')),audit.sha256(Buffer.from('a')));assert.notEqual(audit.sha256(Buffer.from('a')),audit.sha256(Buffer.from('b')));});
test('secret redaction masks values without copying them',()=>{const out=audit.redact('api_key=super-secret password: hunter2');assert.doesNotMatch(out,/super-secret|hunter2/);assert.match(out,/\[REDACTED\]/);});
test('coverage calculates status/domain summaries and evidence-based denominators',()=>{const c=audit.coverage(audit.buildRegister());assert.equal(Object.values(c.byStatus).reduce((a,b)=>a+b,0),c.totalAssets);assert.equal(Object.values(c.byDomain).reduce((a,b)=>a+b,0),c.totalAssets);assert.equal(c.currentSystemCoverage.canonicalExercises,873);assert.equal(c.transferDimensions.media.percentage,0);});
test('archive manifest and migration packages can be derived without changing sources',()=>{const r=audit.buildRegister();const archive=r.records.filter(x=>['Archive Only','Reject','Superseded'].includes(x.primaryReconciliationStatus));const packages=new Set(r.records.filter(x=>['Partially Integrated','Requires Expert Review','Requires Technical Validation'].includes(x.primaryReconciliationStatus)).map(x=>x.domain));assert.ok(archive.length);assert.ok(packages.has('yoga-movement'));assert.deepEqual(audit.walkLegacy(),audit.walkLegacy());});
