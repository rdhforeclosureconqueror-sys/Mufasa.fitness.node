'use strict';
require('./check-rugby-checkpoint-browser').run().catch(e=>{console.error(e);process.exitCode=1;});
