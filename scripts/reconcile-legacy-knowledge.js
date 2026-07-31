#!/usr/bin/env node
'use strict';
const fs=require('node:fs'); const path=require('node:path');
const {ROOT,buildRegister,validateRegister,safeJson}=require('./lib/legacy-reconciliation');
const register=buildRegister(); const errors=validateRegister(register); if(errors.length){console.error(errors.join('\n'));process.exitCode=1;} else {const output=path.join(ROOT,'data/reconciliation/legacy-knowledge-register.v1.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${safeJson(register)}\n`);console.log(`Reconciled ${register.records.length} assets -> ${path.relative(ROOT,output)}`);}
