"use strict";

const fs = require("fs");
const path = require("path");
const { ApiError } = require("../lib/apiResponse");

function isSafeUserId(userId) {
  return /^[a-zA-Z0-9._-]{1,128}$/.test(String(userId || ""));
}

function createUserStore({ userDir }) {
  function ensureDirs() {
    fs.mkdirSync(userDir, { recursive: true });
  }

  function userPath(userId) {
    if (!isSafeUserId(userId)) {
      throw new ApiError("INVALID_USER_ID", "userId must be 1-128 chars and only include letters, numbers, . _ -", 400);
    }
    return path.join(userDir, `${userId}.json`);
  }

  function readJSON(p) {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  }

  function writeJSON(p, obj) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  }

  function loadUser(userId) {
    const p = userPath(userId);
    if (fs.existsSync(p)) return normalizeUserRecord(readJSON(p), userId);
    return createEmptyUser(userId);
  }

  function listUsers() {
    ensureDirs();
    return fs.readdirSync(userDir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -5))
      .filter(isSafeUserId)
      .map((userId) => loadUser(userId));
  }

  function saveUser(user) {
    if (!user || !user.userId) {
      throw new ApiError("INVALID_USER_RECORD", "Cannot save invalid user record", 500);
    }
    const normalized = normalizeUserRecord(user, user.userId);
    normalized.updatedAt = Date.now();
    const p = userPath(normalized.userId);
    writeJSON(p, normalized);
    return normalized;
  }

  function updateUser(userId, updater) {
    if (typeof updater !== "function") {
      throw new ApiError("INVALID_USER_UPDATE", "User update function is required", 500);
    }
    const user = loadUser(userId);
    const updated = updater(user) || user;
    return saveUser(updated);
  }

  function createEmptyUser(userId) {
    const now = Date.now();
    return {
      userId,
      createdAt: now,
      updatedAt: now,
      events: [],
      sessions: {},
      ohsa: []
    };
  }

  function normalizeUserRecord(user, userId) {
    const now = Date.now();
    const normalized = (user && typeof user === "object" && !Array.isArray(user))
      ? { ...user }
      : {};

    normalized.userId = normalized.userId || userId;
    normalized.createdAt = Number.isFinite(normalized.createdAt) ? normalized.createdAt : now;
    normalized.updatedAt = Number.isFinite(normalized.updatedAt) ? normalized.updatedAt : now;
    normalized.events = Array.isArray(normalized.events) ? normalized.events : [];
    normalized.sessions = (normalized.sessions && typeof normalized.sessions === "object" && !Array.isArray(normalized.sessions))
      ? normalized.sessions
      : {};
    normalized.ohsa = Array.isArray(normalized.ohsa) ? normalized.ohsa : [];

    return normalized;
  }

  return {
    ensureDirs,
    loadUser,
    listUsers,
    saveUser,
    updateUser,
    userPath
  };
}

module.exports = {
  createUserStore
};
