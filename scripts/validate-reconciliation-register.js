#!/usr/bin/env node
'use strict';
const fs=require('node:fs'); const path=require('node:path');
const {ROOT,validateRegister}=require('./lib/legacy-reconciliation');
const file=path.join(ROOT,'data/reconciliation/legacy-knowledge-register.v1.json');
const errors=validateRegister(JSON.parse(fs.readFileSync(file,'utf8'))); if(errors.length){console.error(errors.join('\n'));process.exitCode=1;} else console.log('Legacy reconciliation register is valid.');
