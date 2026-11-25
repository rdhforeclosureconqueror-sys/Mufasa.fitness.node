'use strict';
require('./check-rugby-checkpoint-browser').run({modes:['landscape','portrait']}).catch(e=>{console.error(e);process.exitCode=1;});
