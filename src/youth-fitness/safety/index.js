'use strict';

const { planYouthFitnessSession } = require('../sessions');
const { validateYouthFitnessSessionSafety } = require('./validator');

function planAndValidateYouthFitnessSession(profile, program, sessionSlot, options = {}) {
  const planned = planYouthFitnessSession(profile, program, sessionSlot, options.sessionPlanner);
  if (!planned.ok) return { ok: false, planning: planned, validation: validateYouthFitnessSessionSafety(profile, program, null, options.validation) };
  const validation = validateYouthFitnessSessionSafety(profile, program, planned.session_blueprint, options.validation);
  return { ok: validation.ok, session_blueprint: planned.session_blueprint, validation };
}

module.exports = { ...require('./constants'), ...require('./validator'), planAndValidateYouthFitnessSession };
