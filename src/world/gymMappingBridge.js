"use strict";

const { ApiError } = require("../lib/apiResponse");

const REQUIRED_CANONICAL_JOINTS = Object.freeze([
  "Hips", "Spine", "Spine1", "Spine2", "Neck", "Head",
  "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
  "RightShoulder", "RightArm", "RightForeArm", "RightHand",
  "LeftUpLeg", "LeftLeg", "LeftFoot",
  "RightUpLeg", "RightLeg", "RightFoot"
]);

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeProfile(input, now = () => new Date()) {
  const profile = plainObject(input) ? input : null;
  if (!profile) throw new ApiError("GYM_MAPPING_PROFILE_REQUIRED", "Gym mapping profile is required", 400);
  if (Number(profile.schemaVersion) !== 1) throw new ApiError("GYM_MAPPING_SCHEMA_UNSUPPORTED", "Unsupported gym mapping schema", 422);
  if (profile.restPoseValid !== true) throw new ApiError("GYM_MAPPING_REST_POSE_REQUIRED", "Rest pose must be explicitly validated before saving", 422);
  if (!plainObject(profile.canonicalMap)) throw new ApiError("GYM_MAPPING_CANONICAL_MAP_REQUIRED", "Canonical bone map is required", 422);

  const canonicalMap = {};
  for (const joint of REQUIRED_CANONICAL_JOINTS) {
    const raw = profile.canonicalMap[joint];
    if (typeof raw !== "string" || !raw.trim()) {
      throw new ApiError("GYM_MAPPING_INCOMPLETE", `Missing required canonical mapping: ${joint}`, 422);
    }
    canonicalMap[joint] = raw.trim();
  }

  const values = Object.values(canonicalMap);
  if (new Set(values).size !== values.length) {
    throw new ApiError("GYM_MAPPING_DUPLICATE_BONE", "A personalized-avatar bone cannot satisfy more than one required canonical joint", 422);
  }

  const profileId = String(profile.profileId || "personalized-gym-map-v1").trim().slice(0, 160);
  const embeddedAnimations = Array.isArray(profile.embeddedAnimations)
    ? profile.embeddedAnimations.slice(0, 64).map(item => plainObject(item) ? {
      name: String(item.name || "").slice(0, 160),
      embedded: item.embedded === true,
      stackingRisk: item.stackingRisk === true,
      policy: String(item.policy || "").slice(0, 160)
    } : null).filter(Boolean)
    : [];

  return {
    schemaVersion: 1,
    profileId,
    avatarId: profile.avatarId == null ? null : String(profile.avatarId).slice(0, 160),
    skeletonProfile: profile.skeletonProfile == null ? null : String(profile.skeletonProfile).slice(0, 160),
    canonicalMap,
    restPoseValid: true,
    embeddedAnimations,
    validationStatus: "member-validated",
    source: "motion-lab-gym-compatibility",
    savedAt: now().toISOString()
  };
}

function createGymMappingBridge({ userStore, now } = {}) {
  if (!userStore?.loadUser || !userStore?.updateUser) throw new Error("userStore is required");
  const clock = now || (() => new Date());

  function read(userId) {
    const user = userStore.loadUser(userId);
    return plainObject(user.gymMappingProfile) ? user.gymMappingProfile : null;
  }

  function save(userId, profile) {
    const normalized = normalizeProfile(profile, clock);
    userStore.updateUser(userId, user => ({ ...user, gymMappingProfile: normalized }));
    return normalized;
  }

  function describe(userId) {
    const profile = read(userId);
    return {
      gymMappingProfile: profile,
      gymMappingState: profile
        ? { status: "AVAILABLE", schemaVersion: profile.schemaVersion, profileId: profile.profileId, savedAt: profile.savedAt }
        : { status: "MISSING", schemaVersion: 1, profileId: null, savedAt: null }
    };
  }

  function registerMemberRoutes(app, requireAuth) {
    app.get("/api/me/gym-mapping-profile", requireAuth, (req, res) => {
      res.set("Cache-Control", "private, no-store");
      const profile = read(req.auth.userId);
      return res.status(200).json({ ok: true, data: { profile } });
    });

    app.put("/api/me/gym-mapping-profile", requireAuth, (req, res, next) => {
      try {
        const profile = save(req.auth.userId, req.body?.profile);
        res.set("Cache-Control", "private, no-store");
        return res.status(200).json({ ok: true, data: { profile } });
      } catch (error) {
        return next(error);
      }
    });
  }

  return { read, save, describe, registerMemberRoutes };
}

module.exports = { createGymMappingBridge, normalizeProfile, REQUIRED_CANONICAL_JOINTS };
