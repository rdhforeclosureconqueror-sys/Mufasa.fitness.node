"use strict";
const registry = require("./sources.json");
const validUrl = (value) => { try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol); } catch { return false; } };
function listSources() {
  return registry.sources.filter(source => validUrl(source.url)).map(source => ({ ...source }));
}
function findTeachings(query) {
  const terms = String(query || "").toLowerCase().match(/[a-z]{3,}/g) || [];
  if (!terms.length) return [];
  return registry.teachings.filter(t => t.sourceId && t.excerpt && terms.some(term => (t.topic + " " + t.excerpt).toLowerCase().includes(term)))
    .map(t => ({ ...t, source: listSources().find(s => s.id === t.sourceId) || null })).filter(t => t.source);
}
function historicalAnswer(question) {
  const matches = findTeachings(question);
  return matches.length ? { status:"sourced", teachings:matches, note:"These are attributed historical teachings, not verified medical treatment instructions." }
    : { status:"insufficient_sources", teachings:[], sources:listSources(), note:"No verified passage has been indexed for this question. Do not invent a quote, treatment, or historical attribution." };
}
module.exports = { listSources, findTeachings, historicalAnswer };
