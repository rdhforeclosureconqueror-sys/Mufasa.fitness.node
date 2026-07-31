#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),path=require("node:path"),contract=require("../config/route-authorization-contract");
const source=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
const runtime=[...source.matchAll(/app\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g)].map(match=>`${match[1].toUpperCase()} ${match[2]}`);
const declared=contract.map(item=>`${item.method} ${item.path}`),unique=values=>[...new Set(values)].sort();
const runtimeSet=new Set(runtime),contractSet=new Set(declared),missing=unique(runtime.filter(route=>!contractSet.has(route))),stale=unique(declared.filter(route=>!runtimeSet.has(route))),duplicates=declared.filter((route,index)=>declared.indexOf(route)!==index);
const incomplete=contract.filter(item=>!item.publicOutput||(item.authentication==="required"&&!item.ownership&&!item.requiredPermissions?.length)||(item.method!=="GET"&&item.authentication==="public"&&!item.publicWrite)).map(item=>`${item.method} ${item.path}`);
if(missing.length||stale.length||duplicates.length||incomplete.length){console.error(JSON.stringify({missing,stale,duplicates:unique(duplicates),incomplete:unique(incomplete)},null,2));process.exitCode=1;}else console.log(`Route authorization contract matches ${unique(runtime).length} runtime routes.`);
