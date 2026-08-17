'use strict';

const fs = require('node:fs');
const path = require('node:path');

const EMPTY = Object.freeze({ schema_version: 1, programs: {}, sessions: {} });

function createYouthProgramRepository({ filePath }) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, `${JSON.stringify(EMPTY, null, 2)}\n`, { flag: 'wx' });
  const read = () => {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return { schema_version: 1, programs: value.programs || {}, sessions: value.sessions || {} };
  };
  const write = (value) => {
    const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
    fs.renameSync(temporary, filePath);
  };
  const transact = (operation) => { const value = read(); const result = operation(value); write(value); return result; };
  return {
    filePath,
    getProgram(subject) { return read().programs[subject] || null; },
    saveProgram(subject, program) { return transact((db) => (db.programs[subject] = program)); },
    getSession(subject, sessionRef) { const item = read().sessions[sessionRef]; return item?.owner_subject === subject ? item : null; },
    getSessionForProgram(subject, programId, week, code) { return Object.values(read().sessions).find((item) => item.owner_subject === subject && item.program_id === programId && item.week_number === week && item.session_code === code) || null; },
    saveSession(subject, session) { if (session.owner_subject !== subject) throw new Error('session_owner_mismatch'); return transact((db) => (db.sessions[session.session_ref] = session)); },
    updateSession(subject, sessionRef, operation) { return transact((db) => { const item = db.sessions[sessionRef]; if (!item || item.owner_subject !== subject) return null; return operation(item, db); }); },
    sessionsForProgram(subject, programId) { return Object.values(read().sessions).filter((item) => item.owner_subject === subject && item.program_id === programId); },
  };
}

module.exports = { createYouthProgramRepository };
