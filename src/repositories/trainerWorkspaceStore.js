"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ApiError } = require("../lib/apiResponse");

function createTrainerWorkspaceStore({ filePath, now = () => new Date().toISOString() }) {
  function read() {
    if (!fs.existsSync(filePath)) return { assignments: [], notes: [] };
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return { assignments: Array.isArray(value.assignments) ? value.assignments : [], notes: Array.isArray(value.notes) ? value.notes : [] };
  }
  function write(value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temporary = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2));
    fs.renameSync(temporary, filePath);
  }
  function createAssignment({ trainerUserId, clientUserId, assignedByUserId }) {
    const data = read();
    const existing = data.assignments.find((item) => item.trainerUserId === trainerUserId && item.clientUserId === clientUserId && item.status === "active");
    if (existing) return { assignment: existing, created: false };
    const at = now();
    const assignment = { id: crypto.randomUUID(), trainerUserId, clientUserId, status: "active", assignedByUserId,
      assignedAt: at, deactivatedAt: null, deactivatedByUserId: null, createdAt: at, updatedAt: at };
    data.assignments.push(assignment); write(data); return { assignment, created: true };
  }
  function deactivateAssignment(id, actorUserId) {
    const data = read();
    const assignment = data.assignments.find((item) => item.id === id);
    if (!assignment) throw new ApiError("ASSIGNMENT_NOT_FOUND", "Assignment not found", 404);
    if (assignment.status === "inactive") return assignment;
    assignment.status = "inactive"; assignment.deactivatedAt = now(); assignment.deactivatedByUserId = actorUserId; assignment.updatedAt = assignment.deactivatedAt;
    write(data); return assignment;
  }
  const listByTrainer = (id, activeOnly = false) => read().assignments.filter((a) => a.trainerUserId === id && (!activeOnly || a.status === "active"));
  const listByClient = (id, activeOnly = false) => read().assignments.filter((a) => a.clientUserId === id && (!activeOnly || a.status === "active"));
  const getAssignment = (id) => read().assignments.find((a) => a.id === id) || null;
  const hasActiveAccess = (trainerUserId, clientUserId) => listByTrainer(trainerUserId, true).some((a) => a.clientUserId === clientUserId);
  function createNote({ trainerUserId, clientUserId, body }) {
    const data = read(), at = now();
    const note = { id: crypto.randomUUID(), clientUserId, trainerUserId, body, createdAt: at, updatedAt: at, deletedAt: null };
    data.notes.push(note); write(data); return note;
  }
  const listNotes = (trainerUserId, clientUserId) => read().notes.filter((n) => n.trainerUserId === trainerUserId && n.clientUserId === clientUserId && !n.deletedAt);
  return { createAssignment, deactivateAssignment, getAssignment, listAssignments: () => read().assignments,
    listByTrainer, listByClient, hasActiveAccess, createNote, listNotes };
}

module.exports = { createTrainerWorkspaceStore };
