"use strict";
const assert = require("node:assert/strict");
const {createExperimentFixture} = require("../src/business-os/experiment-manager/academy-fixtures");

// Only deterministic internal fixtures. No customer contact, spend or live evidence.
const scenarios = [
  {
    id: "experiment-approval-requires-human",
    expected: "PASS",
    run() {
      const f = createExperimentFixture();
      assert.throws(() => f.manager.approve(f.approvalInput, {}), /authenticated_human_required/);
      assert.equal(f.manager.getRun("nonexistent"), null);
      return {authority: "REJECTED_UNAUTHENTICATED", liveEnabled: false};
    }
  },
  {
    id: "experiment-idempotency-budget",
    expected: "PASS",
    run() {
      const f = createExperimentFixture();
      const {run, request} = f.start();
      assert.equal(f.manager.start(request).replayed, true);
      assert.throws(() => f.manager.start({...request, budget: 4}), /run_idempotency_conflict/);
      assert.throws(() => f.manager.start({...request, idempotencyKey: "other", budget: 6}), /experiment_budget_exceeded/);
      return {runRef: run.id, replayProtected: true, budgetProtected: true, liveEnabled: false};
    }
  }
];
module.exports = {scenarios};
