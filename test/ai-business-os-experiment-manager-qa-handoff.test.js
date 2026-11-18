"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {createExperimentFixture} = require("../src/business-os/experiment-manager/academy-fixtures");
const {requestExperimentQaReview} = require("../src/business-os/experiment-manager/qa-handoff");

test("E6 QA request binds exact stored result and grants no downstream approval", () => {
  const f = createExperimentFixture();
  const {run} = f.start();
  const result = f.manager.complete({runRef: run.id});
  const request = requestExperimentQaReview({manager:f.manager, result, organizationId:result.organizationId, workId:result.workId});
  assert.equal(request.status,"REVIEW_REQUIRED");
  assert.equal(request.sourceResultId,result.id);
  assert.equal(request.runRef,run.id);
  assert.equal(request.qaApproved,false);
  assert.equal(request.economicVerified,false);
  assert.equal(request.learningPromoted,false);
  assert.equal(request.liveEnabled,false);
  assert.equal(request.sourceDigest.length,64);
});
test("E6 QA request fails closed on forged, cross-scope or non-QA requests", () => {
  const f = createExperimentFixture();
  const {run} = f.start();
  const result = f.manager.complete({runRef:run.id});
  const base = {manager:f.manager,result,organizationId:result.organizationId,workId:result.workId};
  assert.throws(()=>requestExperimentQaReview({...base,result:{...result,resultClass:"SUPPORTED"}}),/stored_experiment_result_required/);
  assert.throws(()=>requestExperimentQaReview({...base,organizationId:"other-org"}),/qa_organization_scope_mismatch/);
  assert.throws(()=>requestExperimentQaReview({...base,workId:"other-work"}),/qa_work_scope_mismatch/);
  assert.throws(()=>requestExperimentQaReview({...base,reviewerRole:"EXPERIMENT_MANAGER"}),/independent_qa_role_required/);
});
