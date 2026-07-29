const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = name => fs.readFileSync(path.join(__dirname, "../public", name), "utf8");

test("cinematic assets retain exact deployed paths and rotation order", () => {
  const js = read("cinematic-background.js");
  const matches = [...js.matchAll(/src: "(new\/stepintograteness\d\.jpg)"/g)].map(match => match[1]);
  assert.deepEqual(matches, ["new/stepintograteness1.jpg", "new/stepintograteness2.jpg", "new/stepintograteness3.jpg"]);
  for (const asset of matches) assert.ok(fs.statSync(path.join(__dirname, "../public", asset)).size > 0, asset);
});

test("page starts with a loaded first layer and only preloads the first image", () => {
  const html = read("greatness.html");
  assert.match(html, /cinematic-layer-a is-visible/);
  assert.equal((html.match(/rel="preload"/g) || []).length, 1);
  assert.match(html, /href="new\/stepintograteness1\.jpg"/);
  assert.match(html, /aria-hidden="true" inert/);
});

test("runtime uses two layers, next-image decode, visibility pausing and one guarded timer", () => {
  const js = read("cinematic-background.js");
  assert.match(js, /layers\.length !== 2/); assert.match(js, /image\.decoding = "async"/);
  assert.match(js, /visibilitychange/); assert.match(js, /clearTimeout\(timer\)/);
  assert.match(js, /cinematicInitialized === "true"/); assert.match(js, /displayMs = 12000, transitionMs = 2500/);
  assert.match(js, /connection\?\.saveData/); assert.match(js, /prefers-reduced-motion: reduce/);
});

test("decorative effects and responsive positions remain pointer-safe", () => {
  const css = read("greatness.css"), html = read("greatness.html");
  for (const token of ["pointer-events:none", "goldShimmer", "maneLight", "africaReveal", "greatnessBreathe", "panAfricanPulse", "--mobile-position", "--desktop-position", "overflow-x:hidden"]) assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const token of ["cinematic-shimmer", "cinematic-mane", "cinematic-africa", "cinematic-greatness"]) assert.match(html, new RegExp(token));
});

test("map and route controls remain outside inert decorative root", () => {
  const html = read("greatness.html");
  assert.ok(html.indexOf("</div><header>") < html.indexOf('id="trailMap"'));
  assert.match(html, /id="challengeRouteSuggestions"/); assert.match(html, /id="start"/);
  assert.match(html, /cinematic-background\.js\?v=cinematic-background-20260729/);
});
