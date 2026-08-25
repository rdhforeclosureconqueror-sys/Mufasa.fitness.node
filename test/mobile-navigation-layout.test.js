"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const css = fs.readFileSync(path.join(__dirname, "..", "public", "global-nav.css"), "utf8");
const mobileOverride = css.match(/@media\(max-width:849px\)\{\s*body>\.maat-global-header\{([^}]*)\}/);

test("mobile header does not establish a containing block for the fixed navigation", () => {
  assert.ok(mobileOverride, "expected the production mobile header override");
  const declarations = mobileOverride[1];

  assert.match(declarations, /(?:^|;)contain:style(?:;|$)/);
  assert.doesNotMatch(declarations, /(?:^|;)contain:[^;}]*(?:layout|paint|strict|content)/);
  assert.doesNotMatch(declarations, /(?:^|;)(?:transform|filter|perspective):(?!(?:none)(?:;|$))[^;}]+/);
});

test("mobile drawer and backdrop retain viewport overlay behavior", () => {
  assert.match(css, /@media\(max-width:849px\)[\s\S]*?\.maat-nav-panel\{position:fixed;/);
  assert.match(css, /body>\.maat-global-header>\.maat-nav-panel\{position:fixed!important;inset:0 auto 0 0!important;/);
  assert.match(css, /body>\.maat-global-header>\.maat-nav-backdrop:not\(\[hidden\]\)\{position:fixed!important;inset:0!important;/);
  assert.match(css, /\.maat-nav-panel\{[^}]*overflow-y:auto;/);
  assert.match(css, /\.maat-nav-open\{overflow:hidden;overflow-x:hidden\}/);
  assert.match(css, /padding:calc\(18px \+ env\(safe-area-inset-top,0px\)\)[^;}]*env\(safe-area-inset-bottom,0px\)/);
});

test("desktop navigation keeps its absolute dropdown breakpoint", () => {
  assert.match(css, /@media\(min-width:850px\)\{\.maat-nav-panel\{position:absolute;/);
});
