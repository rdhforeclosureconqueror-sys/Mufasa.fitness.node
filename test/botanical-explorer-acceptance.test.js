"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const script = fs.readFileSync(path.join(__dirname, "../public/botanical-wisdom-explorer.js"), "utf8");
const page = fs.readFileSync(path.join(__dirname, "../public/nutrition.html"), "utf8");
function harness() {
  const elements = new Map();
  function element(tag) {
    return {
      tag, children: [], listeners: {}, textContent: "", value: "", href: "", rel: "", target: "",
      append(...items) { this.children.push(...items); },
      replaceChildren(...items) { this.children = items; },
      addEventListener(name, fn) { this.listeners[name] = fn; }
    };
  }
  for (const id of ["botanicalQuestion", "botanicalSearchBtn", "botanicalSearchResults"]) elements.set(id, element("div"));
  const document = {
    listeners: {},
    getElementById(id) { return elements.get(id) || null; },
    createElement: element,
    createTextNode(text) { return { textContent: text }; },
    addEventListener(name, fn) { this.listeners[name] = fn; }
  };
  vm.runInNewContext(script, { document, URL }, { timeout: 1000 });
  document.listeners.DOMContentLoaded();
  const input = elements.get("botanicalQuestion");
  const button = elements.get("botanicalSearchBtn");
  const results = elements.get("botanicalSearchResults");
  function search(query) { input.value = query; button.listeners.click(); return results; }
  return { search };
}
test("explorer loads only within the existing authenticated nutrition shell", () => {
  const shell = page.indexOf('id="journalShell"');
  const explorer = page.indexOf('id="botanicalWisdom"');
  const close = page.indexOf("</main>", explorer);
  assert.ok(shell > 0 && explorer > shell && close > explorer);
  assert.match(page, /botanical-wisdom-explorer\.js/);
});
test("historical topic lookup returns clearly labeled sources without invented answers", () => {
  const result = harness().search("What did he teach about minerals?");
  const links = result.children.flatMap(p => p.children || []).filter(x => x.tag === "a");
  assert.ok(links.some(x => /Bio-Mineral Balance/.test(x.textContent)));
  assert.ok(links.every(x => x.rel === "noopener noreferrer" && x.target === "_blank"));
  assert.ok(result.children.some(p => /No verified passage/.test(p.textContent)));
});
test("unknown medical treatment questions do not produce a fake citation", () => {
  const result = harness().search("Can this cure glioblastoma?");
  const links = result.children.flatMap(p => p.children || []).filter(x => x.tag === "a");
  assert.equal(links.length, 0);
  assert.match(result.children[0].textContent, /No source is indexed/);
});
test("no query shows a clear prompt", () => {
  const result = harness().search("");
  assert.match(result.textContent, /Enter a topic/);
});
