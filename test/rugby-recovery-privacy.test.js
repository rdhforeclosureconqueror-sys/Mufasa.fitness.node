'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {installRugbyProfileRoutes}=require('../src/routes/rugbyProfileRoutes');
function harness(){
 const routes={},user={};let writes=0;
 const app={get(){},put(){},post(path,auth,handler){routes[path]=handler;}};
 installRugbyProfileRoutes({app,requireAuth(){},userStore:{updateUser(id,fn){writes++;fn(user);}}});
 return {user,get writes(){return writes;},submit(body){const res={code:200,set(){},status(n){this.code=n;return this;},json(data){this.data=data;return this;}};return routes['/api/me/rugby/checkins']({auth:{userId:'test-athlete'},body},res);}};
}
const base={date:'2026-11-25',readiness:'normal'};
test('detailed recovery rejected before persistence even with claimed consent',()=>{for(const recovery of [null,{}, {sleepHours:8}]){const h=harness();assert.equal(h.submit({...base,recovery,consent:true,ageGroup:'adult'}).code,403);assert.equal(h.writes,0);}});
test('legacy readiness remains available without detailed recovery',()=>{const h=harness();assert.equal(h.submit(base).code,201);assert.equal(h.writes,1);assert.equal(h.user.rugbyCheckins[0].recovery,undefined);});
