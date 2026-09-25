"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const E = require("../src/business-os/experiment-manager");
const {createExperimentFixture} = require("../src/business-os/experiment-manager/academy-fixtures");
function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "experiment-"));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const filePath = path.join(dir, "state.json"), f = createExperimentFixture();
  const open = () => E.createExperimentManager({organizationId: f.organizationId, clock: f.clock, approvalAuthority: f.authority,
    repository: E.createFileExperimentRepository({filePath, organizationId: f.organizationId})});
  return {...f, filePath, open};
}
test("durable lifecycle restores proposals, approvals, reservations, measurements and results", t => {
  const f = setup(t), a = f.open();
  a.propose(f.input);
  const approval = a.approve(f.approvalInput, f.session);
  const request = {proposalId: "proposal", proposalVersion: 1, approvalRef: approval.id, budget: 5, boundary: "INTERNAL", idempotencyKey: "durable"};
  const run = a.start(request), b = f.open();
  assert.equal(b.start(request).replayed, true);
  assert.throws(() => b.start({...request, idempotencyKey: "second"}), /cumulative_budget/);
  b.measure({runRef: run.id, metric: "conversion", value: 1, sampleRef: "one", evidenceRefs: ["e:one"]});
  assert.throws(() => a.measure({runRef: run.id, metric: "conversion", value: 1, sampleRef: "one", evidenceRefs: ["e:one"]}), /duplicate/);
  b.pause({runRef: run.id, reason: "review", evidenceRefs: ["e:pause"]});
  assert.equal(a.getRun(run.id).status, "PAUSED");
  a.resume({runRef: run.id, reason: "continue", evidenceRefs: ["e:resume"]});
  const result = b.complete({runRef: run.id, evidenceRefs: ["e:one"]});
  assert.equal(result.resultClass, "SUPPORTED");
  assert.deepEqual(f.open().validateResult(result), result);
  assert.equal(a.getRun(run.id).status, "COMPLETED");
  assert.throws(() => a.propose(f.input), /immutable/);
});
test("durable transactions roll back, fail closed on locks and preserve corrupt data", t => {
  const f = setup(t), repo = E.createFileExperimentRepository({filePath: f.filePath, organizationId: f.organizationId});
  f.open().propose(f.input);
  const before = fs.readFileSync(f.filePath, "utf8");
  assert.throws(() => repo.transaction(state => { state.tables.proposals = []; throw new Error("abort"); }), /abort/);
  assert.equal(fs.readFileSync(f.filePath, "utf8"), before);
  fs.writeFileSync(f.filePath + ".lock", "stale");
  assert.throws(() => f.open().getProposal("proposal", 1), /repository_busy/);
  fs.unlinkSync(f.filePath + ".lock");
  fs.writeFileSync(f.filePath, "{broken");
  assert.throws(() => f.open().getProposal("proposal", 1), SyntaxError);
  assert.equal(fs.readFileSync(f.filePath, "utf8"), "{broken");
});
test("restored approval still requires active authority and scoped repository", t => {
  const f = setup(t), a = f.open();
  a.propose(f.input);
  const approval = a.approve(f.approvalInput, f.session);
  f.kernel.revokeGrant("approval-grant", "issuer");
  assert.throws(() => f.open().start({proposalId: "proposal", proposalVersion: 1, approvalRef: approval.id, budget: 5, boundary: "INTERNAL", idempotencyKey: "x"}), /approval_authority_denied:REVOKED_AUTHORITY/);
  const repo = E.createFileExperimentRepository({filePath: f.filePath, organizationId: "other"});
  assert.throws(() => repo.transaction(() => {}), /scope_or_version/);
});
test("a fresh process reads committed state", t => {
  const f = setup(t);
  f.open().propose(f.input);
  const {execFileSync} = require("node:child_process");
  const script = 'const E=require(process.argv[1]);const repository=E.createFileExperimentRepository({filePath:process.argv[2],organizationId:process.argv[3]});const m=E.createExperimentManager({organizationId:process.argv[3],repository});process.stdout.write(m.getProposal("proposal",1).id);';
  assert.equal(execFileSync(process.execPath, ["-e", script, require.resolve("../src/business-os/experiment-manager"), f.filePath, f.organizationId], {encoding: "utf8"}), "proposal");
});
