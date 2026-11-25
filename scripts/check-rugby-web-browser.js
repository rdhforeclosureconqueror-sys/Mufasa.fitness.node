'use strict';
require('./check-rugby-checkpoint-browser').run({modes:['desktop']}).catch(e=>{console.error(e);process.exitCode=1;});
