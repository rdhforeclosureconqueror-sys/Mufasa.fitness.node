'use strict';

const classifications = require('./classifications');
const models = require('./models');
const { evidenceSources } = require('./sources');
const { youthFitnessRules } = require('./rules');
const claimsPolicy = require('./claimsPolicy');

module.exports = { ...classifications, ...models, ...claimsPolicy, evidenceSources, youthFitnessRules };
