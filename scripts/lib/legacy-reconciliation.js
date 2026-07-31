'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const LEGACY_ROOT = path.join(ROOT, 'public/new');
const SCHEMA_VERSION = '1.0.0';
const STATUSES = Object.freeze([
  'Fully Integrated', 'Integrated After Transformation', 'Partially Integrated',
  'Superseded', 'Deferred', 'Requires Expert Review',
  'Requires Technical Validation', 'Archive Only', 'Reject', 'Unknown'
]);
const SECRET_PATTERN = /(api[_-]?key|secret|password|private[_-]?key|authorization|credential)/i;

function relative(file) { return path.relative(ROOT, file).split(path.sep).join('/'); }
function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
function stableId(assetPath) { return `LKR-${sha256(Buffer.from(assetPath)).slice(0, 12).toUpperCase()}`; }
function formatOf(file) {
  const ext = path.extname(file).toLowerCase().slice(1);
  return ext || (path.basename(file) === 'yoga' ? 'empty-file' : 'unknown');
}
function domainOf(name) {
  if (/FitnessMVP/i.test(name)) return 'gamification';
  if (/Dataset_|Combined|Nataraja|Vruk|Veerabh|Triangle|Downward|Konasana|landmark|main\.py|check_all/i.test(name)) return 'yoga-movement';
  if (/gymnastic/i.test(name)) return 'gymnastics';
  if (/nasm|assessment/i.test(name)) return 'assessment-corrective';
  if (/lego/i.test(name)) return 'program-workout';
  if (/cue/i.test(name)) return 'coaching';
  if (/firebase|maat|baseURL/i.test(name)) return 'configuration-security';
  if (/Router|services\.js|schemas\.js|server\.js|index\.js|validator|errorHandler/i.test(name)) return 'legacy-runtime';
  if (/Dockerfile|compose|package|requirements/i.test(name)) return 'legacy-infrastructure';
  if (/\.jpg$/i.test(name)) return 'media';
  return 'governance-archive';
}

function walkLegacy(dir = LEGACY_ROOT) {
  const rootReal = fs.realpathSync(LEGACY_ROOT);
  const output = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        output.push({ path: relative(full), parsingStatus: 'rejected-symlink', reason: 'Symlinks are not traversed.' });
        continue;
      }
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.isFile()) continue;
      const real = fs.realpathSync(full);
      if (real !== rootReal && !real.startsWith(`${rootReal}${path.sep}`)) throw new Error(`Path escaped legacy root: ${full}`);
      const buffer = fs.readFileSync(full);
      output.push({
        path: relative(full), type: 'file', sizeBytes: buffer.length,
        domain: domainOf(entry.name), likelyPurpose: purposeOf(entry.name),
        detectedFormat: formatOf(entry.name), sha256: sha256(buffer),
        parsingStatus: parsingStatus(entry.name, buffer), duplicateCandidates: []
      });
    }
  }
  walk(dir);
  const groups = new Map();
  for (const item of output.filter((x) => x.sha256)) {
    if (!groups.has(item.sha256)) groups.set(item.sha256, []);
    groups.get(item.sha256).push(item.path);
  }
  for (const item of output) item.duplicateCandidates = (groups.get(item.sha256) || []).filter((x) => x !== item.path);
  return output;
}

function parsingStatus(name, buffer) {
  if (buffer.length > 5_000_000) return 'bounded-not-parsed';
  const ext = path.extname(name).toLowerCase();
  if (ext === '.json') {
    try { JSON.parse(buffer.toString('utf8')); return 'parsed-json'; } catch { return 'malformed-json'; }
  }
  if (ext === '.csv') {
    const first = buffer.toString('utf8', 0, Math.min(buffer.length, 8192)).split(/\r?\n/, 1)[0];
    return first.includes(',') ? 'header-inspected' : 'malformed-csv';
  }
  if (['.txt', '.md', '.js', '.py', '.html', '.yml', '.yaml'].includes(ext)) return 'text-not-executed';
  return 'binary-or-opaque-not-executed';
}

function purposeOf(name) {
  if (/FitnessMVP/i.test(name)) return 'Legacy reward policy or catalogue seed';
  if (/Dataset_|Combined|drive\.google/i.test(name)) return 'MediaPipe landmark/angle research dataset';
  if (/\.jpg$/i.test(name)) return 'Legacy brand image with unknown production rights';
  if (/\.txt$/i.test(name)) return 'Legacy domain knowledge document';
  if (/\.py$/i.test(name)) return 'Non-production research script';
  if (/\.js$/i.test(name)) return 'Legacy prototype JavaScript; inventory never evaluates it';
  return 'Legacy project support or provenance asset';
}

function decision(item) {
  const n = path.basename(item.path);
  if (/FitnessMVP/i.test(n)) return ['Integrated After Transformation', 'src/gamification; data/gamification', ['event-sourced rewards', 'achievement definitions'], ['legacy point values and client authority'], 'Product/economy review'];
  if (/01_lego/i.test(n)) return ['Partially Integrated', 'src/program-engine; src/services/generatedWorkoutService.js', ['movement-pattern workout assembly', 'progression and recovery concepts'], ['legacy block catalogue and named rep schemes'], 'Certified trainer'];
  if (/02_nasm/i.test(n)) return ['Requires Expert Review', 'Future corrective-movement taxonomy', ['basic movement taxonomy'], ['attribution, clinical-sounding contributor claims'], 'Qualified movement professional and legal/licensing'];
  if (/03_nasm/i.test(n)) return ['Requires Expert Review', 'Future corrective-movement rules', ['observation and camera-view concept'], ['causal claims, corrective prescriptions, pain logic'], 'Qualified movement/medical professional'];
  if (/gymnastics/i.test(n)) return ['Requires Expert Review', 'Future gymnastics skill graph', [], ['skills, prerequisites, spotting and progression rules'], 'Qualified gymnastics coach and safeguarding reviewer'];
  if (/06_coach/i.test(n)) return ['Partially Integrated', 'Exercise Intelligence and AI Coach safety/context', ['general stop-on-pain and quality cues'], ['reviewed cue IDs and youth-specific checklist'], 'Certified trainer/editor'];
  if (/Dataset_|Combined|drive\.google/i.test(n)) return ['Requires Technical Validation', 'Research quarantine; future movement-engine benchmark', [], ['row-level landmarks/angles and classifier use'], 'Data provenance/privacy, movement expert, and ML validation'];
  if (/landmarks\.py|main\.py|check_all\.py/i.test(n)) return ['Archive Only', 'Archive; behavior may inform benchmark specifications', [], ['executable implementation'], 'Technical validation only if benchmarked'];
  if (/stepintograteness.*\.jpg/i.test(n)) return ['Requires Technical Validation', 'Potential media archive/content curation', [], ['member-facing media'], 'Rights, accessibility, and image-quality review'];
  if (/README|LICENSE/i.test(n)) return ['Archive Only', 'docs/reconciliation provenance evidence', ['provenance leads'], [], 'Owner/legal'];
  if (/erm\.json/i.test(n)) return ['Superseded', 'data/yoga/poses.v1.json and schemas', ['pose/category modelling concept'], ['invalid pseudo-schema'], 'None'];
  if (/firebaseConfig|maatApi|baseURL/i.test(n)) return ['Reject', 'None', [], ['configuration/client stub'], 'Security owner'];
  if (/requirements|Dockerfile|compose|package\.json|Router|services\.js|schemas\.js|server\.js|index\.js|validator|errorHandler|index\.html|\.gitignore|\.gitattributes|^yoga$/i.test(n)) return ['Reject', 'None; current root runtime is authoritative', [], ['alternate runtime/deployment implementation'], 'None'];
  return ['Unknown', 'None identified', [], ['unclassified asset meaning'], 'Repository owner'];
}

function makeRecord(item) {
  const [status, destination, transferred, omitted, reviewer] = decision(item);
  const evidence = evidenceFor(item, status);
  return {
    reconciliationId: stableId(item.path), legacyAssetPath: item.path, legacyAssetType: item.type || 'file',
    domain: item.domain, title: path.basename(item.path), briefDescription: item.likelyPurpose,
    detectedFormat: item.detectedFormat, contentFingerprint: item.sha256 ? `sha256:${item.sha256}` : null,
    lastKnownSourceContext: 'Immutable legacy source library public/new; prior planning registry docs/legacy-integration/01_LEGACY_ASSET_REGISTRY.md',
    primaryReconciliationStatus: status, currentDestination: destination, canonicalIdsAffected: canonicalIds(item.path),
    currentModulesAffected: destination === 'None' ? [] : destination.split(';').map((x) => x.trim()),
    transferredConcepts: transferred, omittedConcepts: omitted,
    transformationSummary: status === 'Integrated After Transformation' ? 'Legacy seeds were redesigned behind authenticated, event-sourced deterministic services; numeric equivalence is not asserted.' : 'No content-level transformation asserted beyond the evidence listed.',
    duplicationAssessment: item.duplicateCandidates.length ? `Byte-identical to ${item.duplicateCandidates.join(', ')}` : 'No byte-identical legacy duplicate detected.',
    safetyAssessment: safetyFor(item.domain, status), technicalQualityAssessment: `${item.parsingStatus}; ${item.sizeBytes} bytes; executable source was read only as bytes and never loaded.`,
    expertReviewRequirement: reviewer, validationEvidence: evidence,
    testsCoveringMigratedBehavior: testsFor(item.domain, status), documentationReferences: ['docs/legacy-integration/01_LEGACY_ASSET_REGISTRY.md', 'docs/reconciliation/METHODOLOGY.md'],
    risks: risksFor(item, status), recommendedAction: actionFor(status), priority: priorityFor(status, item.domain),
    ownerRole: ownerFor(item.domain, status), proposedTargetRelease: releaseFor(status), notes: 'Status applies to this file as a unit; it does not imply row-level approval.',
    reconciliationSchemaVersion: SCHEMA_VERSION
  };
}
function evidenceFor(item, status) {
  const e = [`Fingerprint ${item.sha256}`, `Inventory parse result: ${item.parsingStatus}`];
  if (item.domain === 'gamification') e.push('Current event contracts and policies: src/gamification/eventService.js, src/gamification/xpPolicyService.js, src/gamification/achievementEvaluator.js');
  if (item.domain === 'program-workout') e.push('Current deterministic engines: src/program-engine/programGenerator.js, progressionEngine.js, periodizationEngine.js');
  if (item.domain === 'yoga-movement') e.push('Current launch catalog: data/yoga/poses.v1.json; runtime schema: src/movement-engine/index.js');
  if (status === 'Reject') e.push('Explicit replacement decision: docs/legacy-integration/00_MASTER_INDEX.md');
  return e;
}
function canonicalIds(p) { const n = path.basename(p); if (/Ardha/i.test(n)) return ['half-moon']; if (/Baddha/i.test(n)) return []; if (/Downward/i.test(n)) return ['downward-dog']; if (/Nataraja/i.test(n)) return ['dancer']; if (/Triangle/i.test(n)) return ['triangle']; if (/Utkata/i.test(n)) return []; if (/Veerabh/i.test(n) || /drive\.google/i.test(n)) return ['warrior-variant-unresolved']; if (/Vruk/i.test(n)) return ['tree']; return []; }
function safetyFor(domain, status) { if (domain === 'assessment-corrective' || domain === 'gymnastics') return 'Not approved for member guidance; clinical, injury, youth, or high-skill implications require qualified review.'; if (domain === 'yoga-movement') return 'Research measurements are not safety or diagnosis evidence.'; if (status === 'Reject') return 'Must not regain runtime authority.'; return 'No new runtime activation authorized by this audit.'; }
function testsFor(domain, status) { if (status === 'Integrated After Transformation' && domain === 'gamification') return ['test/gamification-event-infrastructure.test.js', 'test/gamification-xp-policy.test.js', 'test/gamification-achievement-engine.test.js']; if (domain === 'program-workout') return ['test/program-engine.test.js', 'test/program-generation.test.js']; return []; }
function risksFor(item, status) { const r=[]; if (item.domain === 'yoga-movement') r.push('Unknown dataset provenance/consent/licensing and unvalidated MediaPipe-to-MoveNet compatibility.'); if (item.domain === 'assessment-corrective') r.push('Could be mistaken for diagnosis or treatment.'); if (item.domain === 'gymnastics') r.push('High-skill and youth safeguarding risk.'); if (status === 'Unknown') r.push('Insufficient evidence to classify safely.'); if (!r.length) r.push('Architecture drift if legacy source is used directly.'); return r; }
function actionFor(s) { return ({'Fully Integrated':'Retain evidence and monitor drift.','Integrated After Transformation':'Keep legacy read-only; maintain explicit replacement tests.','Partially Integrated':'Create a bounded reviewed content migration package.','Superseded':'Archive the source and retain replacement decision.','Deferred':'Retain for its future domain; do not activate.','Requires Expert Review':'Quarantine until named qualified reviewers approve or reject it.','Requires Technical Validation':'Quarantine and validate provenance, compatibility, and quality before content review.','Archive Only':'Retain solely for provenance/history; never load at runtime.','Reject':'Retain only until approved archival disposition; never import or execute.','Unknown':'Obtain provenance and owner context, then reclassify.'})[s]; }
function priorityFor(s,d) { if (s === 'Reject') return 'launch critical'; if (s === 'Requires Expert Review' && d === 'assessment-corrective') return 'future domain prerequisite'; if (s === 'Partially Integrated') return 'high value after launch'; if (s === 'Requires Technical Validation') return 'optional enhancement'; return 'archive candidate'; }
function ownerFor(d,s) { if (d === 'gamification') return 'Product economy owner'; if (d === 'assessment-corrective') return 'Qualified movement professional'; if (d === 'gymnastics') return 'Qualified gymnastics coach'; if (d === 'yoga-movement') return 'Movement ML/data steward'; if (s === 'Reject') return 'Architecture/security owner'; return 'Repository/content owner'; }
function releaseFor(s) { return ['Reject','Archive Only','Superseded'].includes(s) ? 'archive-governance' : ['Requires Expert Review','Requires Technical Validation'].includes(s) ? 'not scheduled—gated review' : 'post-launch reconciliation package'; }

function buildRegister(inventory = walkLegacy()) {
  return { schemaVersion: SCHEMA_VERSION, registerVersion: '1', generatedBy: 'scripts/reconcile-legacy-knowledge.js', legacyRoot: 'public/new', records: inventory.map(makeRecord).sort((a,b)=>a.legacyAssetPath.localeCompare(b.legacyAssetPath)) };
}
function validateRegister(register) {
  const errors=[]; if (register.schemaVersion !== SCHEMA_VERSION) errors.push('Unsupported schemaVersion.');
  const ids=new Set(), paths=new Set();
  for (const [i,r] of (register.records || []).entries()) {
    for (const key of ['reconciliationId','legacyAssetPath','primaryReconciliationStatus','validationEvidence','recommendedAction','reconciliationSchemaVersion']) if (r[key] == null || r[key] === '' || (Array.isArray(r[key]) && !r[key].length)) errors.push(`Record ${i} missing ${key}.`);
    if (!STATUSES.includes(r.primaryReconciliationStatus)) errors.push(`Record ${i} has invalid status.`);
    if (!r.legacyAssetPath.startsWith('public/new/') || r.legacyAssetPath.includes('..') || path.isAbsolute(r.legacyAssetPath)) errors.push(`Record ${i} has invalid path.`);
    if (ids.has(r.reconciliationId)) errors.push(`Duplicate reconciliation ID ${r.reconciliationId}.`); ids.add(r.reconciliationId);
    if (paths.has(r.legacyAssetPath)) errors.push(`Duplicate asset path ${r.legacyAssetPath}.`); paths.add(r.legacyAssetPath);
  }
  return errors;
}
function coverage(register) {
  const records=register.records; const byStatus={}, byDomain={};
  for (const r of records) { byStatus[r.primaryReconciliationStatus]=(byStatus[r.primaryReconciliationStatus]||0)+1; byDomain[r.domain]=(byDomain[r.domain]||0)+1; }
  const pct=(n,d=records.length)=>d ? Number((100*n/d).toFixed(1)) : 0;
  const architectureCandidates=records.filter(r=>['gamification','program-workout','legacy-runtime','legacy-infrastructure','configuration-security'].includes(r.domain));
  const architectureResolved=architectureCandidates.filter(r=>['Integrated After Transformation','Superseded','Reject'].includes(r.primaryReconciliationStatus));
  const behaviorCandidates=records.filter(r=>['gamification','program-workout','assessment-corrective','coaching','yoga-movement','gymnastics'].includes(r.domain) && !/Dataset_|Combined|drive\.google/.test(r.title));
  const behaviorTransferred=behaviorCandidates.filter(r=>['Fully Integrated','Integrated After Transformation'].includes(r.primaryReconciliationStatus));
  const structured=records.filter(r=>['csv','json','txt'].includes(r.detectedFormat));
  const structuredTransferred=structured.filter(r=>['Fully Integrated','Integrated After Transformation'].includes(r.primaryReconciliationStatus));
  const media=records.filter(r=>r.domain==='media'); const mediaTransferred=media.filter(r=>['Fully Integrated','Integrated After Transformation'].includes(r.primaryReconciliationStatus));
  const activationReady=records.filter(r=>['Fully Integrated','Integrated After Transformation','Superseded','Reject','Archive Only'].includes(r.primaryReconciliationStatus)).length;
  return { totalAssets:records.length, byStatus, byDomain, statusPercentages:Object.fromEntries(STATUSES.map(s=>[s,pct(byStatus[s]||0)])), transferDimensions:{ architecture:{transferred:architectureResolved.length,total:architectureCandidates.length,percentage:pct(architectureResolved.length,architectureCandidates.length),definition:'Current authoritative architecture exists or explicit rejection/supersession prevents legacy authority.'}, deterministicBehavior:{transferred:behaviorTransferred.length,total:behaviorCandidates.length,percentage:pct(behaviorTransferred.length,behaviorCandidates.length),definition:'File-level behavior equivalence supported by explicit current implementation evidence.'}, structuredContent:{transferred:structuredTransferred.length,total:structured.length,percentage:pct(structuredTransferred.length,structured.length),definition:'Structured/text assets with content or data transfer evidence; transformed architecture alone does not count.'}, media:{transferred:mediaTransferred.length,total:media.length,percentage:pct(mediaTransferred.length,media.length),definition:'Legacy image assets approved and mapped for production.'}, professionalReview:{completed:0,required:records.filter(r=>r.expertReviewRequirement!=='None'&&r.expertReviewRequirement!=='Technical validation only if benchmarked').length,percentage:0}, productionActivation:{ready:activationReady,total:records.length,percentage:pct(activationReady)} }, currentSystemCoverage: currentCoverage() };
}
function currentCoverage() {
  const exercises=JSON.parse(fs.readFileSync(path.join(ROOT,'data/exercise.json'),'utf8'));
  const poses=JSON.parse(fs.readFileSync(path.join(ROOT,'data/yoga/poses.v1.json'),'utf8')).poses;
  const count=(fn)=>exercises.filter(fn).length, pc=(n,d)=>Number((100*n/d).toFixed(1));
  const rich=count(x=>Array.isArray(x.instructions)&&x.instructions.length>=3&&x.primaryMuscles?.length&&x.images?.length);
  const mappedLegacyPoseIds=new Set(['downward-dog','triangle','tree','dancer','half-moon']);
  const launchMatches=poses.filter(p=>mappedLegacyPoseIds.has(p.id)).length;
  return { canonicalExercises:exercises.length, richCanonicalExercises:rich, richCanonicalExercisePercentage:pc(rich,exercises.length), exercisesWithValidatedLegacyMovementMetadata:0, yogaLaunchPoses:poses.length, yogaLegacyPoseIdentityMatches:launchMatches, yogaLegacyRuleSetsValidated:0, yogaRuleCoveragePercentage:0, legacyMediaAssets:3, legacyMediaMappedAndApproved:0, mediaMappingCoveragePercentage:0, legacyProgramKnowledgeAssets:1, programTemplatesContentMigrated:0, programTemplateCoveragePercentage:0, legacyAssessmentRuleAssets:2, assessmentRulesProfessionallyApproved:0, assessmentRuleCoveragePercentage:0 };
}
function redact(value) { return String(value).replace(/([A-Za-z0-9_-]*(?:api[_-]?key|secret|password|credential)[A-Za-z0-9_-]*\s*[:=]\s*)[^\s,;]+/gi,'$1[REDACTED]'); }
function safeJson(value) { const text=JSON.stringify(value,null,2); if (SECRET_PATTERN.test(text)) return redact(text); return text; }

module.exports={ROOT,LEGACY_ROOT,SCHEMA_VERSION,STATUSES,walkLegacy,stableId,buildRegister,validateRegister,coverage,redact,safeJson,sha256};
