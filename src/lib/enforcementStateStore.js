"use strict";

const fs = require("fs");
const path = require("path");

function createEnforcementStateStore({ filePath, enforceableActions }) {
  const actions = Array.isArray(enforceableActions) ? [...enforceableActions] : [];

  function validateOverrideCandidate(candidate) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return {
        ok: false,
        reason: "override_payload_invalid",
        sanitized: {}
      };
    }

    const sanitized = {};
    const invalidActions = [];
    const nonBooleanActions = [];

    for (const [action, value] of Object.entries(candidate)) {
      if (!actions.includes(action)) {
        invalidActions.push(action);
        continue;
      }
      if (typeof value !== "boolean") {
        nonBooleanActions.push(action);
        continue;
      }
      sanitized[action] = value;
    }

    return {
      ok: invalidActions.length === 0 && nonBooleanActions.length === 0,
      reason: invalidActions.length || nonBooleanActions.length ? "override_shape_invalid" : null,
      sanitized,
      invalidActions,
      nonBooleanActions
    };
  }

  function parsePersistedState() {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const payload = raw && typeof raw === "object" && !Array.isArray(raw) ? raw.overrides : null;
    const validated = validateOverrideCandidate(payload);
    return { raw, validated };
  }

  function load() {
    if (!fs.existsSync(filePath)) {
      return {
        found: false,
        loaded: false,
        overrides: {},
        warnings: []
      };
    }

    try {
      const { raw, validated } = parsePersistedState();
      if (!validated.ok) {
        return {
          found: true,
          loaded: false,
          overrides: {},
          version: Number.isInteger(raw?.revision) ? raw.revision : 0,
          warnings: [
            `Persisted enforcement overrides ignored (${validated.reason})`,
            ...(validated.invalidActions?.length ? [`Unknown actions: ${validated.invalidActions.join(", ")}`] : []),
            ...(validated.nonBooleanActions?.length ? [`Non-boolean actions: ${validated.nonBooleanActions.join(", ")}`] : [])
          ]
        };
      }

      return {
        found: true,
        loaded: true,
        loadedAt: raw.loadedAt || null,
        version: Number.isInteger(raw?.revision) ? raw.revision : 0,
        overrides: validated.sanitized,
        warnings: []
      };
    } catch (error) {
      return {
        found: true,
        loaded: false,
        overrides: {},
        version: 0,
        warnings: [`Persisted enforcement overrides unreadable: ${error.message}`]
      };
    }
  }

  function save(overrides, options = {}) {
    const ifVersion = options.ifVersion;
    const validated = validateOverrideCandidate(overrides);
    if (!validated.ok) {
      const err = new Error("Invalid enforcement override shape");
      err.code = "INVALID_OVERRIDE_SHAPE";
      err.details = validated;
      throw err;
    }

    let currentVersion = 0;
    if (fs.existsSync(filePath)) {
      try {
        const loaded = load();
        currentVersion = Number.isInteger(loaded.version) ? loaded.version : 0;
      } catch {
        currentVersion = 0;
      }
    }
    if (ifVersion != null) {
      if (!Number.isInteger(ifVersion) || ifVersion < 0) {
        const err = new Error("ifVersion must be a non-negative integer");
        err.code = "INVALID_IF_VERSION";
        throw err;
      }
      if (ifVersion !== currentVersion) {
        const err = new Error("Enforcement override version conflict");
        err.code = "VERSION_CONFLICT";
        err.details = {
          expectedVersion: ifVersion,
          currentVersion
        };
        throw err;
      }
    }
    const nextVersion = currentVersion + 1;

    const payload = {
      version: 1,
      revision: nextVersion,
      loadedAt: new Date().toISOString(),
      overrides: validated.sanitized
    };

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2));
    fs.renameSync(tmpPath, filePath);

    return {
      filePath,
      saved: true,
      version: nextVersion,
      overrides: validated.sanitized
    };
  }

  return {
    validateOverrideCandidate,
    load,
    save,
    filePath,
    actions
  };
}

module.exports = {
  createEnforcementStateStore
};
