'use strict';

function enumValues(values) {
  return Object.freeze(Object.fromEntries(values.map((value) => [value, value])));
}

const MOVEMENT_FAMILIES = enumValues(['SQUAT', 'HINGE', 'PUSH', 'PULL', 'SINGLE_LEG', 'TRUNK', 'CARRY', 'LOCOMOTION', 'JUMP_LAND', 'MOBILITY', 'CONDITIONING', 'BREATHING_RECOVERY', 'MOVEMENT_GAME']);
const TRAINING_LEVELS = enumValues(['FOUNDATION', 'DEVELOPMENT', 'PROGRESSION']);
const AGE_PRESENTATION_BANDS = enumValues(['10_12', '13_15', '16_17']);
const EQUIPMENT = enumValues(['BODYWEIGHT', 'WALL', 'BOX_OR_BENCH', 'BANDS', 'CONES', 'MAT', 'OPEN_SPACE', 'SUSPENSION_TRAINER', 'LIGHT_DUMBBELL', 'LIGHT_KETTLEBELL', 'CABLE_OR_MACHINE', 'PULLUP_BAR']);
const IMPACT_LEVELS = enumValues(['NONE', 'LOW', 'MODERATE', 'HIGH']);
const ACTIVITY_TYPES = enumValues(['EXERCISE', 'GAME']);
const APPROVAL_STATUSES = enumValues(['DRAFT', 'APPROVED', 'RETIRED']);

function isEnumValue(enumeration, value) {
  return Object.values(enumeration).includes(value);
}

module.exports = { MOVEMENT_FAMILIES, TRAINING_LEVELS, AGE_PRESENTATION_BANDS, EQUIPMENT, IMPACT_LEVELS, ACTIVITY_TYPES, APPROVAL_STATUSES, isEnumValue };
