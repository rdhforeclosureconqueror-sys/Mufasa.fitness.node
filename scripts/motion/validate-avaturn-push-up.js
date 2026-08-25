#!/usr/bin/env node
"use strict";
const contract = require("./avaturn-push-up-contract");
const generic = require("./lib/motion-fixture");
function inventory(file = contract.output) { return generic.inventory(file); }
function validate() { return generic.validate(contract.manifest, contract.output); }
if (require.main === module) console.log(JSON.stringify(validate(), null, 2));
module.exports = { inventory, validate };
