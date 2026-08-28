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
  return { id: slug(`avatar-${category}-${title}`), title, category, canonical: true, canonicalStatus: implemented ? "Repository evidence present; acceptance pending" : "Implementation not evidenced", status: humanRequired ? "HUMAN_TEST_REQUIRED" : (implemented ? "IN_PROGRESS" : "BACKLOG"), definitionOfDone: `Verify ${title.toLowerCase()} through the actual MoveNet → normalized pose → personalized avatar architecture.`, implementationState: implemented ? "Technical implementation or verification tooling exists; acceptance is not complete" : "Implementation evidence not found", automated: "NOT_RUN", browserQa: "NOT_RECORDED", physicalDeviceQa: humanRequired ? "REQUIRED" : "NOT_APPLICABLE", accessibility: "NOT_RECORDED", productionStatus: "NOT_RECORDED", humanRequired, humanVerified: false, evidence: [], blocker: "", implementationRef: "public/avatar-runtime.js; public/pose-runtime.js; public/normalized-pose.js; scripts/motion" };
}
function seed(matrix = { features: [] }) {
  return { version: 3, canonicalSchemaVersion: matrix.schemaVersion || null, updatedAt: null, boards: { launch: matrix.features.map(canonicalCard), avatar: Object.entries(AVATAR_GROUPS).flatMap(([group, titles]) => titles.map(title => avatarCard(title, group))) } };
}
const EVIDENCE_FIELDS = Object.freeze(["status", "evidence", "automated", "browserQa", "physicalDeviceQa", "accessibility", "productionStatus", "humanVerified", "blocker", "implementationRef", "tester", "verifiedAt"]);
function legacyMatch(card, cards, board, storedVersion) {
  const exact = cards.find(old => old.id === card.id);
  if (exact) return exact;
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
        return { ...card, ...mutable, humanRequired: card.humanRequired };
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
    const mutable = ["status", "evidence", "automated", "browserQa", "physicalDeviceQa", "accessibility", "productionStatus", "humanVerified", "blocker", "implementationRef", "tester", "verifiedAt"];
    Object.assign(target, Object.fromEntries(Object.entries(patch).filter(([key]) => mutable.includes(key))));
    if (target.humanRequired && target.humanVerified && !String(target.evidence || "").trim()) throw Object.assign(new Error("human_evidence_required"), { status: 422 });
    return write(value);
  };
  return { snapshot, update, effectiveStatus, summary };
}
module.exports = { createLaunchReadinessService, effectiveStatus, summary, seed, mapCanonicalStatus, AVATAR_GROUPS, STATUSES };
