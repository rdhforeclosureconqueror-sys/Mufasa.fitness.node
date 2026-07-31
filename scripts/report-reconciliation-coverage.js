#!/usr/bin/env node
'use strict';
const fs=require('node:fs'); const path=require('node:path');
const {ROOT,coverage,safeJson}=require('./lib/legacy-reconciliation');
const register=JSON.parse(fs.readFileSync(path.join(ROOT,'data/reconciliation/legacy-knowledge-register.v1.json'),'utf8')); const metrics=coverage(register);
const output=path.join(ROOT,'data/reconciliation/legacy-coverage.v1.json'); fs.writeFileSync(output,`${safeJson(metrics)}\n`); console.log(safeJson(metrics));
