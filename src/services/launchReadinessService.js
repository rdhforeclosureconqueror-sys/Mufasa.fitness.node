"use strict";
const fs = require("fs");
const path = require("path");
const STATUSES = Object.freeze(["BACKLOG", "IN_PROGRESS", "BLOCKED", "HUMAN_TEST_REQUIRED", "DONE", "POST_LAUNCH"]);
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const AVATAR_GROUPS = Object.freeze({
  "RUNTIME FOUNDATION": ["Avatar asset/runtime foundation", "Avaturn skeleton profile verification", "Runtime bone-name verification"],
  "POSE PIPELINE": ["MoveNet pose event/payload audit", "Normalized pose mapping", "Rest-pose/calibration handling"],
  "LIVE MIRROR": ["One-arm live-mirror proof", "Full live avatar mirror", "Smoothing/stability"],
  "MOTION RECORDING": ["Motion recorder", "Saved motion data format", "Motion source manifest"],
  "FIXTURES / REGISTRY": ["Phase 4 fixture builder", "Fixture validation", "Registry integration", "Recorded motion playback"],
  "ACCEPTANCE": ["Mobile/browser QA", "Physical-device acceptance", "Privacy/camera handling verification", "Final avatar/motion launch gate"]
});
const HUMAN_AVATAR = new Set([
  "One-arm live-mirror proof", "Full live avatar mirror", "Mobile/browser QA", "Physical-device acceptance",
  "Privacy/camera handling verification", "Final avatar/motion launch gate"
]);
const BROWSER_QA_AVATAR = new Set(["Full live avatar mirror", "Mobile/browser QA", "Privacy/camera handling verification", "Final avatar/motion launch gate"]);
const PHYSICAL_QA_AVATAR = new Set(["One-arm live-mirror proof", "Full live avatar mirror", "Physical-device acceptance", "Privacy/camera handling verification", "Final avatar/motion launch gate"]);
// Version 3 used the phased-pause taxonomy below. Every retired ID has one
// explicit, semantically related destination; no fuzzy title matching is used.
const AVATAR_V3_ID_MIGRATION = Object.freeze(Object.fromEntries([
  ["FOUNDATION", [["Personalized avatar load","Avatar asset/runtime foundation"],["Skeleton profile resolution","Avaturn skeleton profile verification"],["Programmatic manipulation","Runtime bone-name verification"],["Reset / disposal","Rest-pose/calibration handling"]]],
  ["MOVENET / CAMERA", [["Physical iPhone camera","Mobile/browser QA"],["MoveNet initialization","MoveNet pose event/payload audit"],["Continuous live frames","MoveNet pose event/payload audit"],["Full-body framing","Normalized pose mapping"],["Lost tracking","Smoothing/stability"]]],
  ["NORMALIZATION", [["Normalized pose contract","Normalized pose mapping"],["Left / right mapping","Normalized pose mapping"],["Confidence thresholds","MoveNet pose event/payload audit"],["Smoothing","Smoothing/stability"],["Recovery behavior","Rest-pose/calibration handling"]]],
  ["LIVE MIRROR BODY SEGMENTS", [["Torso / root","Full live avatar mirror"],["Left upper arm","One-arm live-mirror proof"],["Right upper arm","One-arm live-mirror proof"],["Left forearm","Full live avatar mirror"],["Right forearm","Full live avatar mirror"],["Left thigh","Full live avatar mirror"],["Right thigh","Full live avatar mirror"],["Left lower leg","Full live avatar mirror"],["Right lower leg","Full live avatar mirror"]]],
  ["VERTICAL SLICE", [["Real human → phone camera → MoveNet → normalized pose → solver → personalized avatar → visible motion","Full live avatar mirror"]]],
  ["RUNTIME SAFETY", [["Start","Avatar asset/runtime foundation"],["Stop","Avatar asset/runtime foundation"],["Restart","Avatar asset/runtime foundation"],["No duplicate listeners","MoveNet pose event/payload audit"],["No duplicate render / inference loops","MoveNet pose event/payload audit"],["Camera cleanup","Privacy/camera handling verification"],["Renderer / resource cleanup","Avatar asset/runtime foundation"],["Neutral / rest recovery","Rest-pose/calibration handling"],["No workout regression","Mobile/browser QA"]]],
  ["PAUSE", [["Physical acceptance","Physical-device acceptance"],["Documentation","Final avatar/motion launch gate"],["Explicitly deferred fidelity list","Final avatar/motion launch gate"]]]
].flatMap(([category, pairs]) => pairs.map(([oldTitle, newTitle]) => [slug(`avatar-${category}-${oldTitle}`), slug(`avatar-${Object.entries(AVATAR_GROUPS).find(([, titles]) => titles.includes(newTitle))[0]}-${newTitle}`)]))));

function mapCanonicalStatus(feature) {
  if (feature.launchStatus === "Excluded from Version 1") return "POST_LAUNCH";
  if (feature.launchStatus === "Hold") return feature.browserTestStatus?.toLowerCase().includes("not completed") ? "HUMAN_TEST_REQUIRED" : "BLOCKED";
  const automated = String(feature.automatedTestStatus || "").toLowerCase();
  const browser = String(feature.browserTestStatus || "").toLowerCase();
  const operational = String(feature.operationalStatus || "").toLowerCase();
  if (!automated.includes("pass") || !browser.includes("pass") || operational.includes("pending")) return "HUMAN_TEST_REQUIRED";
  return ["Ready", "Ready with Accepted Limitation"].includes(feature.launchStatus) ? "DONE" : "BLOCKED";
}

function canonicalCard(feature) {
  return {
    id: `canonical-${feature.featureId}`, title: feature.name, category: feature.domain,
    canonical: true, canonicalStatus: feature.launchStatus, status: mapCanonicalStatus(feature),
    definitionOfDone: "Satisfy every required gate in the canonical feature-readiness matrix.",
    implementationState: `${feature.backendStatus}; UI: ${feature.uiStatus}`,
    automated: feature.automatedTestStatus || "NOT_RECORDED", browserQa: feature.browserTestStatus || "NOT_RECORDED",
    physicalDeviceQa: "NOT_RECORDED", accessibility: feature.accessibilityStatus || "NOT_RECORDED",
    productionStatus: feature.operationalStatus || "NOT_RECORDED", humanRequired: feature.launchStatus === "Hold",
    humanVerified: false, evidence: "", blocker: (feature.blockers || []).join("; "), implementationRef: (feature.apis || []).join("; ")
  };
}
function avatarCard(title, category) {
  const humanRequired = HUMAN_AVATAR.has(title);
  const implemented = !["Motion recorder", "Saved motion data format", "Motion source manifest", "Full live avatar mirror", "Recorded motion playback"].includes(title);
  return { id: slug(`avatar-${category}-${title}`), title, category, canonical: true, canonicalStatus: implemented ? "Technical prerequisites present; verification pending" : "Implementation not evidenced", status: humanRequired ? "HUMAN_TEST_REQUIRED" : (implemented ? "IN_PROGRESS" : "BACKLOG"), technicalReady: implemented, browserQaRequired: BROWSER_QA_AVATAR.has(title), physicalDeviceQaRequired: PHYSICAL_QA_AVATAR.has(title), definitionOfDone: `Verify ${title.toLowerCase()} through the actual MoveNet → normalized pose → personalized avatar architecture.`, implementationState: implemented ? "Technical implementation or verification tooling exists; acceptance is not complete" : "Implementation evidence not found", automated: "NOT_RUN", browserQa: "NOT_RECORDED", physicalDeviceQa: humanRequired ? "REQUIRED" : "NOT_APPLICABLE", accessibility: "NOT_RECORDED", productionStatus: "NOT_RECORDED", humanRequired, humanVerified: false, evidence: [], blocker: "", notes: "", implementationRef: "public/avatar-runtime.js; public/pose-runtime.js; public/normalized-pose.js; scripts/motion" };
}
function seed(matrix = { features: [] }) {
  return { version: 4, canonicalSchemaVersion: matrix.schemaVersion || null, updatedAt: null, boards: { launch: matrix.features.map(canonicalCard), avatar: Object.entries(AVATAR_GROUPS).flatMap(([group, titles]) => titles.map(title => avatarCard(title, group))) } };
}
const EVIDENCE_FIELDS = Object.freeze(["status", "evidence", "automated", "browserQa", "physicalDeviceQa", "accessibility", "productionStatus", "humanVerified", "blocker", "notes", "priorStatus", "implementationRef", "tester", "verifiedAt"]);
const recorded = value => Array.isArray(value) ? value.length > 0 : Boolean(String(value || "").trim());
const passed = value => /^(pass|passed|verified|complete|completed|accepted)$/i.test(String(value || "").trim());
function projectAvatarStatus(card) {
  if (!card.technicalReady) return "BACKLOG";
  if (!passed(card.automated)) return card.humanRequired ? "HUMAN_TEST_REQUIRED" : "IN_PROGRESS";
  if (!card.humanRequired) return "DONE";
  if (!recorded(card.evidence) || !card.humanVerified) return "HUMAN_TEST_REQUIRED";
  if (card.browserQaRequired && !passed(card.browserQa)) return "HUMAN_TEST_REQUIRED";
  if (card.physicalDeviceQaRequired && !passed(card.physicalDeviceQa)) return "HUMAN_TEST_REQUIRED";
  return "DONE";
}
function combineOldCards(cards) {
  if (!cards.length) return {};
  const joined = key => [...new Set(cards.flatMap(card => Array.isArray(card[key]) ? card[key] : [card[key]]).filter(recorded).map(String))].join("\n");
  const qa = key => { const values=[...new Set(cards.map(card=>card[key]).filter(recorded).map(String))]; return values.length === 1 ? values[0] : values.join(" | "); };
  return { priorStatus: qa("status"), evidence: joined("evidence"), blocker: joined("blocker"), notes: joined("notes"), implementationRef: joined("implementationRef"), tester: joined("tester"), verifiedAt: cards.map(card=>card.verifiedAt).filter(recorded).sort().at(-1), automated: qa("automated"), browserQa: qa("browserQa"), physicalDeviceQa: qa("physicalDeviceQa"), accessibility: qa("accessibility"), productionStatus: qa("productionStatus"), humanVerified: cards.every(card=>card.humanVerified === true) };
}
function legacyMatch(card, cards, board, storedVersion) {
  const exact = cards.find(old => old.id === card.id);
  if (exact) return exact;
  if (board === "avatar" && Number(storedVersion || 0) === 3) return combineOldCards(cards.filter(old => AVATAR_V3_ID_MIGRATION[old.id] === card.id));
  if (Number(storedVersion || 0) >= 3) return null;
  const aliases = board === "launch"
    ? new Set([card.id.replace(/^canonical-/, ""), slug(card.title), slug(`${card.category}-${card.title}`)])
    : new Set([slug(card.title), slug(`${card.category}-${card.title}`), slug(`avatar-${card.title}`)]);
  const candidates = cards.filter(old => aliases.has(String(old.id || "")) || (old.title === card.title && (!old.category || old.category === card.category)));
  return candidates.length === 1 ? candidates[0] : null;
}
function effectiveStatus(card) {
  if (card.status === "DONE" && card.humanRequired && !card.humanVerified) return "HUMAN_TEST_REQUIRED";
  return STATUSES.includes(card.status) ? card.status : "BLOCKED";
}
function summary(cards) {
  const counts = Object.fromEntries(STATUSES.map(s => [s, 0]));
  cards.forEach(card => counts[effectiveStatus(card)]++);
  return { counts, remaining: cards.length - counts.DONE - counts.POST_LAUNCH, total: cards.length };
}
function createLaunchReadinessService({ filePath, canonicalMatrixPath = path.join(process.cwd(), "data", "launch", "feature-readiness-matrix.v1.json") }) {
  const matrix = () => JSON.parse(fs.readFileSync(canonicalMatrixPath, "utf8"));
  const read = () => {
    const base = seed(matrix());
    if (!fs.existsSync(filePath)) return base;
    const stored = JSON.parse(fs.readFileSync(filePath, "utf8"));
    for (const board of ["launch", "avatar"]) {
      const oldCards = stored.boards?.[board] || [];
      base.boards[board] = base.boards[board].map(card => {
        const old = legacyMatch(card, oldCards, board, stored.version) || {};
        const mutable = Object.fromEntries(EVIDENCE_FIELDS.map(key => [key, old[key]]).filter(([, value]) => value !== undefined));
        // Canonical launch workflow status is always freshly projected, never overwritten.
        if (card.canonical) delete mutable.status;
        const merged = { ...card, ...mutable, humanRequired: card.humanRequired };
        if (board === "avatar") { merged.status = projectAvatarStatus(merged); merged.canonicalStatus = merged.status === "DONE" ? "Definition of done satisfied" : card.canonicalStatus; }
        return merged;
      });
    }
    base.updatedAt = stored.updatedAt || null;
    return base;
  };
  const write = value => { fs.mkdirSync(path.dirname(filePath), { recursive: true }); const next = { ...value, updatedAt: new Date().toISOString() }; const temp = `${filePath}.${process.pid}.tmp`; fs.writeFileSync(temp, JSON.stringify(next, null, 2)); fs.renameSync(temp, filePath); return next; };
  const snapshot = () => { const value = read(); return { ...value, summaries: { launch: summary(value.boards.launch), avatar: summary(value.boards.avatar) } }; };
  const update = (board, id, patch = {}) => {
    if (!["launch", "avatar"].includes(board)) throw Object.assign(new Error("unknown_board"), { status: 404 });
    const value = read(), target = value.boards[board].find(card => card.id === id);
    if (!target) throw Object.assign(new Error("unknown_card"), { status: 404 });
    if (patch.humanRequired !== undefined && Boolean(patch.humanRequired) !== target.humanRequired) throw Object.assign(new Error("human_requirement_immutable"), { status: 422 });
    if (patch.status && (!STATUSES.includes(patch.status) || (target.canonical && patch.status !== target.status))) throw Object.assign(new Error(target.canonical ? "canonical_status_immutable" : "invalid_status"), { status: 422 });
    const mutable = ["status", "evidence", "automated", "browserQa", "physicalDeviceQa", "accessibility", "productionStatus", "humanVerified", "blocker", "notes", "priorStatus", "implementationRef", "tester", "verifiedAt"];
    Object.assign(target, Object.fromEntries(Object.entries(patch).filter(([key]) => mutable.includes(key))));
    if (target.humanRequired && target.humanVerified && !String(target.evidence || "").trim()) throw Object.assign(new Error("human_evidence_required"), { status: 422 });
    return write(value);
  };
  return { snapshot, update, effectiveStatus, summary };
}
module.exports = { createLaunchReadinessService, effectiveStatus, summary, seed, mapCanonicalStatus, projectAvatarStatus, AVATAR_GROUPS, AVATAR_V3_ID_MIGRATION, STATUSES };
