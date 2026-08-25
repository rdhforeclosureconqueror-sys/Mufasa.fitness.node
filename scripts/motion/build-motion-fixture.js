#!/usr/bin/env node
"use strict";
const { build } = require("./lib/motion-fixture");
const { MANIFEST } = require("./lib/motion-manifest");
function main(args = process.argv.slice(2)) {
  const manifest = args[0] || MANIFEST;
  let outputPath, reportPath, writeProvenance = true;
  for (let index = 1; index < args.length; index += 1) {
    if (args[index] === "--output") outputPath = args[++index];
    else if (args[index] === "--report") reportPath = args[++index];
    else if (args[index] === "--no-provenance") writeProvenance = false;
    else throw new Error(`unknown argument: ${args[index]}`);
  }
  return build(manifest, { outputPath, reportPath, writeProvenance });
}
if (require.main === module) console.log(JSON.stringify(main(), null, 2));
module.exports = { main, build };
