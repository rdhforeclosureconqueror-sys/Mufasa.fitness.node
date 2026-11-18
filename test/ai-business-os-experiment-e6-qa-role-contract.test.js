"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {createRoleConfigurationRegistry} = require("../src/business-os/organization/roles");
test("independent QA role can receive experiment QA requests without granting approval", () => {
 const roles=createRoleConfigurationRegistry({organizationId:"org"});roles.registerDefaults();
 const qa=roles.get("INDEPENDENT_QA"), experiment=roles.get("EXPERIMENT_MANAGER");
 assert.ok(qa.inputArtifactTypes.includes("ExperimentQaReviewRequest"));
 assert.ok(qa.inputArtifactTypes.includes("ExperimentResult"));
 assert.equal(qa.missionTypes.includes("ASSESS_ACCEPTANCE"),true);
 assert.equal(qa.outputArtifactTypes.includes("QAAssessment"),true);
 assert.equal(qa.autonomyCeiling,"RECOMMEND");
 assert.equal(experiment.outputArtifactTypes.includes("QAAssessment"),false);
 assert.equal(experiment.missionTypes.includes("ASSESS_ACCEPTANCE"),false);
});
