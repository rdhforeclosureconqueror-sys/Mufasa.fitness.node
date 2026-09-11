(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTMotionLabGymCompatibility = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";
  const VERSION = "motion-lab-gym-compatibility-v1.2";
  const STORAGE_KEY = "pocketpt.motionLab.gymCompatibility.v1";
  const REMOTE_PATH = "/api/me/gym-mapping-profile";

  function authority() { return root.PocketPTPersonalAvatarCompatibility || null; }
  function profile() { return root.PocketPTAvatarProfiles?.profiles?.personalized || null; }

  function inspectRuntime(runtimeState) {
    const compat = authority();
    if (!compat) return { version: VERSION, firstFailure: "COMPATIBILITY_AUTHORITY_AVAILABLE", stages: [{ stage: "COMPATIBILITY_AUTHORITY_AVAILABLE", status: "FAIL", detail: "PocketPTPersonalAvatarCompatibility unavailable" }] };
    const avatar = runtimeState?.avatar || profile();
    const report = compat.inspect({
      mounted: Boolean(runtimeState?.mounted), avatar,
      skeleton: runtimeState?.skeleton || null,
      animations: runtimeState?.animations || [],
      restPoseValid: runtimeState?.restPoseValid === true
    });
    return Object.assign({ version: VERSION }, report);
  }

  function applyCorrection(report, canonicalJoint, rawBoneName) {
    if (!report || !canonicalJoint || !rawBoneName) return report;
    const available = new Set(report.boneNames || []);
    if (!available.has(rawBoneName)) throw new Error(`Bone not present on loaded avatar: ${rawBoneName}`);
    if (!(authority()?.REQUIRED_CANONICAL_JOINTS || []).includes(canonicalJoint)) throw new Error(`Unknown canonical joint: ${canonicalJoint}`);
    const existingOwner = Object.entries(report.canonicalMap || {}).find(([joint, raw]) => joint !== canonicalJoint && raw === rawBoneName);
    if (existingOwner) throw new Error(`Bone already mapped to canonical joint ${existingOwner[0]}: ${rawBoneName}`);
    const next = JSON.parse(JSON.stringify(report));
    next.canonicalMap = next.canonicalMap || {};
    next.canonicalMap[canonicalJoint] = rawBoneName;
    next.unmapped = (next.unmapped || []).filter(item => item.joint !== canonicalJoint);
    next.mappingCoverage = `${Object.keys(next.canonicalMap).length}/${authority().REQUIRED_CANONICAL_JOINTS.length}`;
    const stage = (next.stages || []).find(item => item.stage === "CANONICAL_MAP_RESOLVED");
    if (stage) { stage.status = next.unmapped.length ? "FAIL" : "PASS"; stage.detail = next.unmapped.length ? `${next.unmapped.length} required joints unresolved` : "all required canonical joints resolved"; }
    const classified = (next.stages || []).find(item => item.stage === "COMPATIBILITY_CLASSIFIED");
    const rest = (next.stages || []).find(item => item.stage === "REST_POSE_VALID");
    if (classified) { classified.status = !next.unmapped.length && rest?.status === "PASS" ? "PASS" : "FAIL"; classified.detail = classified.status === "PASS" ? "mapping and rest-pose compatibility" : "mapping or rest-pose compatibility incomplete"; }
    next.firstFailure = ((next.stages || []).find(item => item.status === "FAIL") || {}).stage || "NONE";
    return next;
  }

  function createMappingProfile(report, options) {
    const opts = options || {};
    const compat = authority();
    const required = compat?.REQUIRED_CANONICAL_JOINTS || [];
    const unresolved = report?.unmapped || [];
    if (unresolved.length) throw new Error(`Cannot save mapping profile with ${unresolved.length} unresolved required joint(s)`);
    const map = report?.canonicalMap || {};
    const missing = required.filter(joint => !map[joint]);
    if (missing.length) throw new Error(`Cannot save mapping profile with ${missing.length} missing required mapping(s)`);
    if (new Set(required.map(joint => map[joint])).size !== required.length) throw new Error("Cannot save mapping profile with duplicate raw-bone mappings");
    const restStage = (report?.stages || []).find(item => item.stage === "REST_POSE_VALID");
    if (opts.restPoseValid !== true || restStage?.status !== "PASS") throw new Error("Cannot save mapping profile before rest pose validation");
    return Object.freeze({
      schemaVersion: 1,
      profileId: opts.profileId || `${report.avatarId || "personalized"}-gym-map-v1`,
      avatarId: report.avatarId || null,
      skeletonProfile: report.skeletonProfile || null,
      canonicalMap: Object.freeze(Object.assign({}, map)),
      restPoseValid: true,
      embeddedAnimations: Object.freeze((report.embeddedAnimations || []).map(item => Object.freeze(Object.assign({}, item)))),
      validationStatus: "development-verified",
      updatedAt: opts.updatedAt || new Date().toISOString()
    });
  }

  function saveProfile(mappingProfile, storage) {
    const target = storage || root.localStorage;
    if (!target?.setItem) throw new Error("Mapping profile storage unavailable");
    target.setItem(STORAGE_KEY, JSON.stringify(mappingProfile));
    return mappingProfile;
  }

  function loadProfile(storage) {
    const target = storage || root.localStorage;
    if (!target?.getItem) return null;
    const raw = target.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function backendBase(options) {
    const explicit = String(options?.baseUrl || "").trim();
    const runtime = String(root.RuntimeState?.getBackendOrigin?.() || "").trim();
    const origin = String(root.location?.origin || "").trim();
    return (explicit || runtime || origin).replace(/\/+$/, "");
  }

  function authToken(options) {
    const explicit = String(options?.authToken || "").trim();
    const runtime = String(root.AuthStateRuntime?.getAuthToken?.() || "").trim();
    return explicit || runtime || "";
  }

  async function requestRemote(method, mappingProfile, options) {
    const fetchImpl = options?.fetchImpl || root.fetch;
    if (typeof fetchImpl !== "function") throw new Error("Gym mapping remote transport unavailable");
    const token = authToken(options);
    if (!token) throw new Error("Gym mapping remote save requires authenticated PocketPT session");
    const response = await fetchImpl(`${backendBase(options)}${REMOTE_PATH}`, {
      method,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: mappingProfile ? JSON.stringify({ profile: mappingProfile }) : undefined,
      cache: "no-store"
    });
    let payload = null;
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok || !payload?.ok) {
      const error = new Error(payload?.error?.message || `Gym mapping bridge request failed (${response.status})`);
      error.code = payload?.error?.code || "GYM_MAPPING_REMOTE_FAILED";
      error.status = response.status;
      throw error;
    }
    return payload.data?.profile || null;
  }

  function saveProfileRemote(mappingProfile, options) {
    return requestRemote("PUT", mappingProfile, options || {});
  }

  function loadProfileRemote(options) {
    return requestRemote("GET", null, options || {});
  }

  async function saveProfileEverywhere(mappingProfile, options) {
    saveProfile(mappingProfile, options?.storage);
    const remote = await saveProfileRemote(mappingProfile, options || {});
    return { local: mappingProfile, remote };
  }

  function firstFailureText(report) {
    const compat = authority();
    if (compat?.formatReport && report?.stages) return compat.formatReport(report);
    return `POCKETPT MOTION LAB — GYM COMPATIBILITY\nFIRST FAILURE: ${report?.firstFailure || "UNKNOWN"}`;
  }

  return Object.freeze({ VERSION, STORAGE_KEY, REMOTE_PATH, inspectRuntime, applyCorrection, createMappingProfile, saveProfile, loadProfile, saveProfileRemote, loadProfileRemote, saveProfileEverywhere, firstFailureText });
});
