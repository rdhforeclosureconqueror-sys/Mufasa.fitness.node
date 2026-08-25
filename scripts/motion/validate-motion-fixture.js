#!/usr/bin/env node
"use strict";
const { validate, inventory } = require("./lib/motion-fixture");
const { MANIFEST } = require("./lib/motion-manifest");
function main(args = process.argv.slice(2)) { return validate(args[0] || MANIFEST, args[1]); }
if (require.main === module) console.log(JSON.stringify(main(), null, 2));
module.exports = { main, validate, inventory };
