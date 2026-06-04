"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ApiError } = require("../lib/apiResponse");

const VARIANTS = Object.freeze({
  standard_pushup: { label: "Standard Push-Up", multiplier: 1 },
  one_hand_pushup: { label: "One-Hand Push-Up", multiplier: 2 }
});

function cleanString(value, max = 120) {
  return String(value || "").trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max);
}

function safeLeaderboardRow(record) {
  return {
    id: record.id,
    rank: record.rank || null,
    displayName: record.displayName,
    team: record.team || null,
    variant: record.variant,
    variantLabel: record.variantLabel,
    validRepCount: record.validRepCount,
    twoHandRepCount: record.twoHandRepCount || 0,
    oneHandRepCount: record.oneHandRepCount || 0,
    multiplier: record.multiplier,
    totalScore: record.totalScore ?? record.score,
    score: record.score,
    timestamp: record.timestamp
  };
}

function compareResults(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (b.validRepCount !== a.validRepCount) return b.validRepCount - a.validRepCount;
  return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
}

function createChallengeService({ filePath }) {
  if (!filePath) throw new Error("challengeService filePath required");

  function ensureDir() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  function readResults() {
    try {
      if (!fs.existsSync(filePath)) return [];
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return Array.isArray(parsed?.results) ? parsed.results : [];
    } catch (_err) {
      return [];
    }
  }

  function writeResults(results) {
    ensureDir();
    fs.writeFileSync(filePath, JSON.stringify({ updatedAt: new Date().toISOString(), results }, null, 2));
  }

  function savePushupResult(payload = {}) {
    const displayName = cleanString(payload.displayName, 80);
    if (!displayName) throw new ApiError("VALIDATION_ERROR", "displayName is required", 400);
    if (payload.consent !== true) throw new ApiError("VALIDATION_ERROR", "Challenge leaderboard consent is required", 400);

    const variant = cleanString(payload.variant, 40) || "auto";
    const autoScored = variant === "auto" || Number.isFinite(Number(payload.totalScore)) || Number.isFinite(Number(payload.score));
    const variantConfig = VARIANTS[variant] || (autoScored ? { label: "Auto-classified Push-Up", multiplier: 1 } : null);
    if (!variantConfig) throw new ApiError("VALIDATION_ERROR", "Unsupported push-up challenge variant", 400, { allowedVariants: [...Object.keys(VARIANTS), "auto"] });

    const validRepCount = Math.max(0, Math.floor(Number(payload.validRepCount || 0)));
    const twoHandRepCount = Math.max(0, Math.floor(Number(payload.twoHandRepCount || 0)));
    const oneHandRepCount = Math.max(0, Math.floor(Number(payload.oneHandRepCount || 0)));
    const multiplier = variantConfig.multiplier;
    const computedAutoScore = twoHandRepCount + oneHandRepCount * 2 + Math.max(0, validRepCount - twoHandRepCount - oneHandRepCount);
    const score = autoScored ? Math.max(0, Math.floor(Number(payload.totalScore ?? payload.score ?? computedAutoScore))) : validRepCount * multiplier;
    const totalScore = score;
    const timestamp = new Date().toISOString();
    const record = {
      id: `pushup_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      displayName,
      email: cleanString(payload.email, 160) || null,
      phone: cleanString(payload.phone, 40) || null,
      team: cleanString(payload.team, 80) || null,
      variant,
      variantLabel: variantConfig.label,
      validRepCount,
      twoHandRepCount,
      oneHandRepCount,
      multiplier,
      totalScore,
      score,
      timestamp
    };
    const results = readResults();
    results.push(record);
    writeResults(results);
    return safeLeaderboardRow(record);
  }

  function getPushupLeaderboard({ limit = 50 } = {}) {
    const rows = readResults()
      .slice()
      .sort(compareResults)
      .slice(0, Math.max(1, Math.min(Number(limit) || 50, 100)))
      .map((record, index) => safeLeaderboardRow({ ...record, rank: index + 1 }));
    return { leaderboard: rows, count: rows.length };
  }

  return { VARIANTS, savePushupResult, getPushupLeaderboard, _readResults: readResults };
}

module.exports = { createChallengeService, compareResults, safeLeaderboardRow };
