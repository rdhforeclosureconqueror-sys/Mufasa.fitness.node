'use strict';
// Compatibility export: Yoga and fitness consume the shared geometry primitive.
const { calculateJointAngle } = require('../../../public/body-intelligence');
module.exports = { jointAngle: calculateJointAngle, calculateJointAngle };
