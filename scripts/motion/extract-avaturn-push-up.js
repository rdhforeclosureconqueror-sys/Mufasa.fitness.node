#!/usr/bin/env node
"use strict";
const contract = require("./avaturn-push-up-contract");
const { build } = require("./lib/motion-fixture");
function extract() { const result = build(contract.manifest); return { bytes: result.bytes, sha256: result.sha256 }; }
if (require.main === module) console.log(JSON.stringify(extract(), null, 2));
module.exports = { extract };
