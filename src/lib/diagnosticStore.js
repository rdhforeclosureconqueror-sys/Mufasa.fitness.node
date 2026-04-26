"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function appendNdjson(filePath, item) {
  ensureDir(filePath);
  fs.appendFileSync(filePath, JSON.stringify(item) + "\n", "utf8");
}

function readRecentNdjson(filePath, limit = 20) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
  const parsed = [];
  for (let i = lines.length - 1; i >= 0 && parsed.length < limit; i -= 1) {
    try {
      parsed.push(JSON.parse(lines[i]));
    } catch {
      // ignore malformed lines
    }
  }
  return parsed;
}

function createDiagnosticStore(options = {}) {
  const filePath = options.filePath;

  function createReport(input = {}) {
    const now = new Date().toISOString();
    return {
      id: `diag_${crypto.randomUUID()}`,
      timestamp: now,
      buildVersion: input.buildVersion || "unknown",
      route: input.route || input.url || "unknown",
      source: input.source || "browser",
      payload: input.payload || {},
      openAiSummaryStatus: input.openAiSummaryStatus || "pending",
      openAiSummary: input.openAiSummary || null,
      openAiErrorType: input.openAiErrorType || null,
      openAiErrorMessage: input.openAiErrorMessage || null,
      openAiHttpStatus: Number.isInteger(input.openAiHttpStatus) ? input.openAiHttpStatus : null,
      openAiModel: input.openAiModel || null,
      openAiEndpoint: input.openAiEndpoint || null,
      openAiRawResponsePreview: input.openAiRawResponsePreview || null,
      openAiApiKeyMissing: Boolean(input.openAiApiKeyMissing),
      routeCheck: input.routeCheck || null,
      pilotReadiness: input.pilotReadiness || null
    };
  }

  return {
    createReport,
    append(report) {
      appendNdjson(filePath, report);
    },
    recent(limit = 20) {
      return readRecentNdjson(filePath, limit);
    }
  };
}

module.exports = {
  createDiagnosticStore
};
