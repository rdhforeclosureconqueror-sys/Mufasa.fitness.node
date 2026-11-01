"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const read = (file) =>
  fs.readFileSync(path.join(__dirname, "../public", file), "utf8");
test("Eight Limbs + Adinkra is a dedicated community path", () => {
  const html = read("eight-limbs-adinkra.html");
  assert.match(html, /Pan-African Connection/);
  assert.match(html, /community-hub\.html/);
  assert.match(html, /eight-limbs-adinkra\.js/);
});
test("program maps every limb to a named Adinkra teaching bridge", () => {
  const js = read("eight-limbs-adinkra.js");
  for (const value of [
    "Yama",
    "Niyama",
    "Asana",
    "Pranayama",
    "Pratyahara",
    "Dharana",
    "Dhyana",
    "Samadhi",
    "Mpatapo",
    "Sankofa",
    "Aya",
    "Nkonsonkonson",
    "Akofena",
    "Nyame Nti",
    "Adinkrahene",
    "Funtunfunefu Denkyemfunefu",
  ])
    assert.ok(js.includes(value), value);
  const html = read("eight-limbs-adinkra.html");
  assert.match(html, /without claiming that classical/i);
  assert.match(html, /yoga and Akan Adinkra have the same origin/i);
});
test("community path uses the existing Eight Limbs curriculum and weekly stories", () => {
  const js = read("eight-limbs-adinkra.js");
  assert.match(js, /mindfulness-limbs-v1\.json/);
  assert.match(js, /mindfulness-weekly-stories-v1\.json/);
  assert.match(js, /Start today in the Mindfulness Dashboard/);
  assert.match(js, /mindfulness\.html\?community=pac#pac-community-today/);
  assert.match(read("eight-limbs-adinkra.html"), /existing 56-day Mindfulness curriculum/);
});
