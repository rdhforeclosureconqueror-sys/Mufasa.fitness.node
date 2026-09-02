"use strict";

const crypto = require("crypto");
const fs = require("fs");
const { ApiError } = require("../lib/apiResponse");

const AVATAR_ASSET_PATH = "/api/game/avatar/asset";
const RELATIVE_URL_BASE = "https://pocketpt-avatar.invalid";

function fallback(reason) {
  return {
    avatar: null,
    avatarState: { status: "FALLBACK", reason, fallback: "DEFAULT_AVATAR" }
  };
}

function createAvatarBridge({ assets, publicOrigins = [] } = {}) {
  const allowedOrigins = new Set();
  for (const value of publicOrigins.filter(Boolean)) {
    try { allowedOrigins.add(new URL(value).origin); } catch (_) {}
  }

  function selectedAssetId(value) {
    if (typeof value !== "string") return null;
    const raw = value.trim();
    const relative = raw.startsWith("/") && !raw.startsWith("//");
    if (!relative && !/^https?:\/\//i.test(raw)) return null;
    let url;
    try { url = new URL(raw, RELATIVE_URL_BASE); } catch (_) { return null; }
    if (url.username || url.password) return null;
    if (relative ? url.origin !== RELATIVE_URL_BASE : !allowedOrigins.has(url.origin)) return null;
    const match = url.pathname.match(/^\/api\/me\/avatar\/assets\/([a-f0-9-]{16,64})(?:\.glb)?$/i)
      || url.pathname.match(/^\/uploads\/avatars\/([a-f0-9-]{16,64})\.glb$/i);
    return match ? match[1] : null;
  }

  function resolve(userId) {
    if (!assets) return fallback("AVATAR_BRIDGE_UNAVAILABLE");
    if (!assets.isEnabled()) return fallback("AVATAR_FEATURE_DISABLED");
    const selected = assets.getMemberAvatar(userId);
    if (!selected?.avatarModelUrl) return fallback("AVATAR_NOT_CONFIGURED");
    const avatarId = selectedAssetId(selected.avatarModelUrl);
    if (!avatarId) return fallback("AVATAR_SOURCE_UNSUPPORTED");

    let file;
    let stat;
    try {
      file = assets.requireOwnedAsset(userId, avatarId);
      stat = fs.statSync(file.glb);
      if (!stat.isFile() || stat.size === 0) return fallback("AVATAR_ASSET_UNAVAILABLE");
    } catch (error) {
      if (error.code === "AVATAR_ASSET_NOT_FOUND" || error.code === "ENOENT") {
        return fallback("AVATAR_ASSET_UNAVAILABLE");
      }
      throw error;
    }

    // Opaque revision of this selection and stored asset, not the whole profile.
    // A replaced selection or changed file metadata gets a new download URL.
    const profileVersion = crypto.createHash("sha256")
      .update(JSON.stringify([avatarId, selected.avatarUpdatedAt ?? null, stat.size, stat.mtimeMs]))
      .digest("hex").slice(0, 32);
    return {
      avatar: {
        avatarId,
        profileVersion,
        format: "glb",
        assetUrl: `${AVATAR_ASSET_PATH}?version=${profileVersion}`
      },
      avatarState: { status: "AVAILABLE", reason: null, fallback: "DEFAULT_AVATAR" },
      file
    };
  }

  function describe(userId) {
    const { avatar, avatarState } = resolve(userId);
    return { avatar, avatarState };
  }

  function read(userId, version) {
    // Re-read the current selection and re-check ownership for every download.
    const selection = resolve(userId);
    if (!selection.avatar) {
      throw new ApiError("ARENA_AVATAR_UNAVAILABLE", "The saved avatar is unavailable. Reload the arena bootstrap.", 404,
        { reason: selection.avatarState.reason });
    }
    if (typeof version !== "string" || !/^[a-f0-9]{32}$/.test(version)) {
      throw new ApiError("ARENA_AVATAR_VERSION_REQUIRED", "Use the versioned avatar URL from the arena bootstrap.", 400);
    }
    if (version !== selection.avatar.profileVersion) {
      throw new ApiError("ARENA_AVATAR_VERSION_CHANGED", "The saved avatar changed. Reload the arena bootstrap.", 409);
    }
    return { path: selection.file.glb, profileVersion: selection.avatar.profileVersion };
  }

  return { describe, read };
}

module.exports = { createAvatarBridge, AVATAR_ASSET_PATH };
