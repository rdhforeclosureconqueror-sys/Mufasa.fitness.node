#!/usr/bin/env node
'use strict';
const fs=require('node:fs'); const path=require('node:path');
const {ROOT,SCHEMA_VERSION,walkLegacy,safeJson}=require('./lib/legacy-reconciliation');
const output=path.join(ROOT,'data/reconciliation/legacy-inventory.v1.json');
const inventory={schemaVersion:SCHEMA_VERSION,legacyRoot:'public/new',generatedBy:'scripts/inventory-legacy-knowledge.js',assets:walkLegacy()};
fs.mkdirSync(path.dirname(output),{recursive:true}); fs.writeFileSync(output,`${safeJson(inventory)}\n`); console.log(`Inventoried ${inventory.assets.length} assets -> ${path.relative(ROOT,output)}`);
