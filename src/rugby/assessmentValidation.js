'use strict';
const allowed={sprint_10m:'seconds',sprint_20m:'seconds',ankle_knee_to_wall:'cm',agility_505_left:'seconds',agility_505_right:'seconds'};
function validateAssessment(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid assessment');
 const {type,value,date}=input;
 if(!Object.prototype.hasOwnProperty.call(allowed,type))throw Error('Invalid test type');
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1000)throw Error('Invalid measurement');
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid date');
 return {type,value,date,unit:allowed[type]};
}
module.exports={validateAssessment};
