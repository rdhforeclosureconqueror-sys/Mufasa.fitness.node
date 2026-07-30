"use strict";

const fs = require("fs");
const path = require("path");

const LIFECYCLE_STATES = new Set(["draft", "published", "disabled", "retired", "quarantined"]);

function createGamificationDefinitionStore({ directory }) {
  function validateDocument(document, fileName) {
    if (!document || document.schemaVersion !== 1 || !Array.isArray(document.definitions)) throw new Error(`${fileName} is not a version 1 definition document`);
    for (const definition of document.definitions) {
      if (!definition || typeof definition.id !== "string" || !definition.id || typeof definition.definitionVersion !== "string" || !LIFECYCLE_STATES.has(definition.lifecycleState)) {
        throw new Error(`${fileName} contains an invalid definition envelope`);
      }
    }
    return document;
  }
  function loadAll() {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory).filter((name) => name.endsWith(".json")).sort().map((name) => {
      const document = JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"));
      return { fileName: name, document: validateDocument(document, name) };
    });
  }
  return Object.freeze({ loadAll, validateDocument });
}

module.exports = { createGamificationDefinitionStore };
