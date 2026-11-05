"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {listSources, historicalAnswer} = require("../src/botanical-wisdom");
test("historical source catalog has unique IDs and valid URLs", () => {
 const sources = listSources();
 assert.ok(sources.length >= 3);
 assert.equal(new Set(sources.map(s => s.id)).size, sources.length);
 for(const s of sources) assert.match(s.url, /^https?:\/\//);
});
test("does not invent historical claims without indexed excerpts", () => {
 const result = historicalAnswer("Does this herb cure diabetes?");
 assert.equal(result.status, "insufficient_sources");
 assert.deepEqual(result.teachings, []);
 assert.match(result.note, /Do not invent/);
});
