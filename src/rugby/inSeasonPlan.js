'use strict';
// Pure educational decision helper. No health diagnosis, data persistence, or return-to-play clearance.
const WEEKS = Object.freeze([
  'Baseline and readiness','Ankle and hip mobility','Single-leg control','Recheck and adjust',
  'Deceleration mechanics','Agility maintenance','Individual focus','Review and next phase'
]);
const RECOVERY = Object.freeze([
  'Gentle pain-free mobility, adequate sleep, hydration and nutrition',
  'Comfortable ankle and hip movement, gentle breathing',
  'Supported balance and comfortable trunk mobility',
  'Repeat comparable movement screens only if recovered',
  'Comfortable hip and ankle mobility, no forced end-range stretching',
  'Short recovery yoga and relaxed breathing',
  'Comfortable mobility tailored to observed limitations',
  'Review recovery habits and plan the next training block'
]);
function assertDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value + 'T12:00:00Z'))) throw new TypeError('invalid_date');
  const date = new Date(value + 'T12:00:00Z');
  if (date.toISOString().slice(0,10) !== value) throw new TypeError('invalid_date');
  return date;
}
function dayDistance(from,to) { return Math.round((assertDate(to)-assertDate(from))/86400000); }
function makePlan({week=1,today,matchDates=[],readiness='normal',injuryConcern=false,teamHighLoad=false}={}) {
  if (!Number.isInteger(week)||week<1||week>8) throw new RangeError('week_must_be_1_to_8');
  assertDate(today);
  if (!Array.isArray(matchDates)||matchDates.length>100) throw new TypeError('invalid_match_dates');
  if (!['fresh','normal','fatigued','pain'].includes(readiness)) throw new TypeError('invalid_readiness');
  const distances=matchDates.map(date=>dayDistance(today,date));
  const daysToMatch=distances.filter(d=>d>=0).sort((a,b)=>a-b)[0]??null;
  const daysSinceMatch=distances.filter(d=>d<0).map(d=>-d).sort((a,b)=>a-b)[0]??null;
  const stop=injuryConcern===true||readiness==='pain';
  const congested=(daysToMatch!==null&&daysToMatch<=2)||(daysSinceMatch!==null&&daysSinceMatch<=2);
  const recoveryOnly=stop||readiness==='fatigued'||teamHighLoad===true||congested;
  const phase=stop?'stop_and_refer':congested?'match_window':recoveryOnly?'recovery_priority':daysToMatch!==null&&daysToMatch<=6?'match_week':'maintenance_window';
  return {
    week,theme:WEEKS[week-1],phase,daysToMatch,daysSinceMatch,
    mobility:stop?'Do not exercise through pain; obtain appropriate medical assessment.':RECOVERY[week-1],
    saq:stop?'No SAQ activity until appropriately evaluated.':recoveryOnly?'No additional SAQ workload recommended by this guide.':phase==='match_week'?'Optional brief low-volume technique only if cleared by team coaching staff and fully recovered.':'Optional brief high-quality SAQ skill exposure coordinated with existing team training; no extra conditioning.',
    warning:'Educational guidance only. Not a diagnosis, training clearance, or substitute for team coaching. Stop painful activities.'
  };
}
module.exports={makePlan,dayDistance};
