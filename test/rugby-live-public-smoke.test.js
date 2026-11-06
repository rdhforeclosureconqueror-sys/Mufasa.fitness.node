'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
test('public Rugby HQ page and diagnostics asset are reachable',async()=>{
 for(const path of ['/rugby-player.html','/rugby-diagnostics.js']){
  const response=await fetch('https://mufasafitsite.onrender.com'+path,{signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,200,path);
 }
});
