"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {isVerifiedPanAfricanMember,getPanAfricanAccess}=require("../src/services/panAfricanMembershipService");
const approved={communityMemberships:{panAfrican:{status:"approved",approvedBy:"admin-123",approvedAt:"2026-11-12T10:00:00Z"}}};
test("only trusted verified membership grants PAC access",()=>{
 assert.equal(isVerifiedPanAfricanMember(approved),true);
 for(const user of [null,{}, {residentialWellness:{interests:["pac_community"]}},{communityMemberships:{panAfrican:{status:"pending"}}},{communityMemberships:{panAfrican:{status:"approved"}}},{communityMemberships:{panAfrican:{status:"approved",approvedBy:"admin-123",approvedAt:"not a date"}}}])assert.equal(isVerifiedPanAfricanMember(user),false);
});
test("access lookup never grants access to self-selected interest",()=>{
 const records={verified:approved,interested:{residentialWellness:{interests:["pac_community"]}}};
 const userStore={loadUser:id=>records[id]||null};
 assert.equal(getPanAfricanAccess(userStore,"verified").authorized,true);
 assert.equal(getPanAfricanAccess(userStore,"interested").authorized,false);
 assert.equal(getPanAfricanAccess(userStore,"missing").authorized,false);
 assert.equal(getPanAfricanAccess(userStore,null).authorized,false);
});
