'use strict';

const fs = require('node:fs');
const path = require('node:path');

const EMPTY = Object.freeze({ schema_version: 1, mappings: {}, assignments: {}, credits: {}, audit_events: [] });

function createLeaderWithinBridgeRepository({ filePath }) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, `${JSON.stringify(EMPTY, null, 2)}\n`, { flag: 'wx' });
  const read = () => ({ ...EMPTY, ...JSON.parse(fs.readFileSync(filePath, 'utf8')) });
  const write = (value) => {
    const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
    fs.renameSync(temporary, filePath);
  };
  const transact = (operation) => { const data = read(); const result = operation(data); write(data); return result; };
  return {
    getMappingByEnrollment(enrollmentId) { return Object.values(read().mappings).find((item) => item.leader_within_enrollment_id === enrollmentId) || null; },
    saveMapping(mapping) { return transact((data) => { data.mappings[mapping.integration_id] = mapping; return mapping; }); },
    getAssignment(enrollmentId, missionId) { return read().assignments[`${enrollmentId}:${missionId}`] || null; },
    saveAssignment(assignment) { return transact((data) => { data.assignments[`${assignment.leader_within_enrollment_id}:${assignment.mission_id}`] = assignment; return assignment; }); },
    saveCreditOnce(credit) { return transact((data) => { const existing = data.credits[credit.assignment_id]; if (existing) return existing; data.credits[credit.assignment_id] = credit; return credit; }); },
    getCredit(assignmentId) { return read().credits[assignmentId] || null; },
    audit(event) { return transact((data) => { data.audit_events.push(event); return event; }); },
    snapshot() { return read(); },
  };
}

module.exports = { createLeaderWithinBridgeRepository };
