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
    if (fs.existsSync(p)) return readJSON(p);
    const now = Date.now();
    return { userId, createdAt: now, updatedAt: now, events: [], sessions: {} };
  }

  function saveUser(user) {
    if (!user || !user.userId) {
      throw new ApiError("INVALID_USER_RECORD", "Cannot save invalid user record", 500);
    }
    user.updatedAt = Date.now();
    const p = userPath(user.userId);
    writeJSON(p, user);
    return user;
  }

  return {
    ensureDirs,
    loadUser,
    saveUser,
    userPath
  };
}

module.exports = {
  createUserStore
};
