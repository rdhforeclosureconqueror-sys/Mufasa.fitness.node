"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {aggregateGuestCampaigns}=require("../src/services/wellnessCampaignReport");
test("counts only matching event, groups consented campaign fields, and excludes personal data",()=>{
 const rows=[{event:"evt-1",name:"A",email:"a@example.com",attribution:{utm_source:"nfc",utm_medium:"community",utm_campaign:"yoga"}},{event:"evt-1",name:"B",attribution:{utm_source:"nfc",utm_medium:"community",utm_campaign:"yoga"}},{event:"evt-1",attribution:null},{event:"evt-2",attribution:{utm_source:"nfc"}}];
 const report=aggregateGuestCampaigns(rows,"evt-1");
 assert.equal(report.checkedIn,3);assert.equal(report.attributedCheckIns,2);assert.equal(report.unattributedCheckIns,1);
 assert.deepEqual(report.campaigns,[{utm_source:"nfc",utm_medium:"community",utm_campaign:"yoga",checkIns:2}]);
 assert.doesNotMatch(JSON.stringify(report),/example.com|name|email|token|reflection/);
});
test("ignores malformed attribution while retaining total check-ins",()=>{
 const report=aggregateGuestCampaigns([{event:"evt-1",attribution:{utm_source:"<script>"}}],"evt-1");
 assert.equal(report.checkedIn,1);assert.equal(report.attributedCheckIns,0);assert.deepEqual(report.campaigns,[]);
});
