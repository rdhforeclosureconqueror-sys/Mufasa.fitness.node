'use strict';
function validateCheckin(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid check-in');
 const {date,readiness,teamHighLoad=false,injuryConcern=false,week=1}=input;
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid date');
 if(!['fresh','normal','fatigued','pain'].includes(readiness))throw Error('Invalid readiness');
 if(typeof teamHighLoad!=='boolean'||typeof injuryConcern!=='boolean')throw Error('Invalid readiness flags');
 if(!Number.isInteger(week)||week<1||week>8)throw Error('Invalid program week');
 return {date,readiness,teamHighLoad,injuryConcern,week};
}
module.exports={validateCheckin};
