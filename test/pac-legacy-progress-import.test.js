"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {migrateLegacyPanAfricanProgress,getPanAfricanProgress}=require("../src/services/panAfricanMembershipService");
const approved={communityMemberships:{panAfrican:{status:"approved",approvedBy:"admin-1",approvedAt:"2026-11-10T18:00:00Z"}}};
function store(){
 const records=new Map([["approved",{userId:"approved",...structuredClone(approved)}],["ordinary",{userId:"ordinary"}]]);
 return {loadUser:id=>records.get(id)||null,updateUser:(id,fn)=>records.set(id,fn(records.get(id)))};
}
test("legacy PAC opt-in dates import once, without changing or starting absent journeys",()=>{
 const s=store();
 assert.deepEqual(migrateLegacyPanAfricanProgress(s,"approved",{}),{status:"no_legacy_progress",imported:false});
 const first=migrateLegacyPanAfricanProgress(s,"approved",{combinedEightLimbsStart:"2026-11-01"});
 assert.equal(first.imported,true);
 assert.equal(first.progress.combinedEightLimbsStart,"2026-11-01");
 assert.equal(first.progress.eightPillarsStart,undefined);
 const second=migrateLegacyPanAfricanProgress(s,"approved",{combinedEightLimbsStart:"2026-11-05",eightPillarsStart:"2026-11-02"});
 assert.equal(second.progress.combinedEightLimbsStart,"2026-11-01");
 assert.equal(second.progress.eightPillarsStart,"2026-11-02");
 assert.equal(migrateLegacyPanAfricanProgress(s,"approved",{eightPillarsStart:"2026-11-10"}).imported,false);
 assert.equal(getPanAfricanProgress(s,"approved").combinedEightLimbsStart,"2026-11-01");
});
test("PAC browser-date migration refuses interest-only members and invalid dates",()=>{
 const s=store();
 assert.equal(migrateLegacyPanAfricanProgress(s,"ordinary",{combinedEightLimbsStart:"2026-11-01"}).status,"membership_not_verified");
 assert.equal(getPanAfricanProgress(s,"ordinary"),null);
 assert.equal(migrateLegacyPanAfricanProgress(s,"approved",{combinedEightLimbsStart:"2026-02-31"}).status,"invalid_legacy_date");
 assert.equal(migrateLegacyPanAfricanProgress(s,"approved",{combinedEightLimbsStart:"2099-01-01"}).status,"invalid_legacy_date");
 assert.equal(getPanAfricanProgress(s,"approved"),null);
});
