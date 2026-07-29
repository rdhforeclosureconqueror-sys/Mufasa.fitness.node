"use strict";

const { ApiError } = require("../lib/apiResponse");

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 80;
const MAX_LIMIT = 20;

function createTrainerDirectoryService({ userStore, trainerWorkspaceStore, authorizationResolver }) {
  function search(rawQuery = {}) {
    const type = String(rawQuery.type || "");
    if (type !== "trainer" && type !== "member") throw new ApiError("INVALID_DIRECTORY_TYPE", "type must be trainer or member", 422);
    const q = String(rawQuery.q || "").replace(/\s+/g, " ").trim();
    if (q.length < MIN_QUERY_LENGTH || q.length > MAX_QUERY_LENGTH || /[\u0000-\u001f\u007f]/.test(q)) {
      throw new ApiError("INVALID_DIRECTORY_QUERY", `q must be ${MIN_QUERY_LENGTH}-${MAX_QUERY_LENGTH} safe characters`, 422);
    }
    const requestedLimit = rawQuery.limit == null || rawQuery.limit === "" ? 10 : Number(rawQuery.limit);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > MAX_LIMIT) {
      throw new ApiError("INVALID_DIRECTORY_LIMIT", `limit must be an integer from 1-${MAX_LIMIT}`, 422);
    }
    const cursor = rawQuery.cursor == null || rawQuery.cursor === "" ? 0 : Number(rawQuery.cursor);
    if (!Number.isSafeInteger(cursor) || cursor < 0) throw new ApiError("INVALID_DIRECTORY_CURSOR", "cursor is invalid", 422);

    const needle = q.toLocaleLowerCase("en-US");
    const unique = new Map();
    for (const user of userStore.listUsers()) {
      const role = authorizationResolver.resolveRole({ userId: user.userId }).role;
      const roleType = role === authorizationResolver.ROLES.TRAINER ? "trainer" : "member";
      if (roleType !== type || role === authorizationResolver.ROLES.ADMIN || role === authorizationResolver.ROLES.SUPER_ADMIN) continue;
      const displayName = String(user.profile?.displayName || user.profile?.name || user.name || user.userId).replace(/\s+/g, " ").trim().slice(0, 160);
      if (!displayName.toLocaleLowerCase("en-US").includes(needle) && !String(user.userId).toLocaleLowerCase("en-US").includes(needle)) continue;
      const activeForTrainer = trainerWorkspaceStore.listByTrainer(user.userId, true).length;
      const activeForMember = trainerWorkspaceStore.listByClient(user.userId, true).length;
      unique.set(user.userId, {
        userId: user.userId,
        displayName,
        roleType,
        accountStatus: "active",
        assignmentStatus: roleType === "trainer"
          ? (activeForTrainer ? "assigned" : "unassigned")
          : (activeForMember ? "assigned" : "unassigned")
      });
    }
    const ordered = [...unique.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "en-US", { sensitivity: "base" }) || a.userId.localeCompare(b.userId));
    const results = ordered.slice(cursor, cursor + requestedLimit);
    return { results, nextCursor: cursor + results.length < ordered.length ? String(cursor + results.length) : null };
  }
  return { search };
}

module.exports = { createTrainerDirectoryService, MIN_QUERY_LENGTH, MAX_QUERY_LENGTH, MAX_LIMIT };
