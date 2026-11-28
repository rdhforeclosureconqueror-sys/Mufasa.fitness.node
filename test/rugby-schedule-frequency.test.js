'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {scheduleWeeks}=require('../src/program-engine/scheduleEngine');
const {generateProgram}=require('../src/program-engine/programGenerator');
const base={startDate:'2026-11-28',durationWeeks:4,availableDays:[1,3,5,2,4,6,0],trainingDays:3,deloadWeeks:[4],workoutFactory:({date,week,deload})=>({date,week,deload,type:'workout'})};
test('direct scheduler caps workouts to requested frequency across all weeks',()=>{for(let n=1;n<=6;n++){const weeks=scheduleWeeks({...base,trainingDays:n});for(const w of weeks){const workouts=w.sessions.filter(s=>s.type==='workout');assert.equal(workouts.length,n);assert.equal(w.sessions.length,7);assert.ok(workouts.every(s=>base.availableDays.slice(0,n).includes(new Date(s.date+'T00:00:00Z').getUTCDay())));assert.ok(workouts.every(s=>s.deload===(w.week===4)));}}});
test('scheduler rejects insufficient or invalid days',()=>{for(const x of [{trainingDays:0},{trainingDays:7},{availableDays:[1,1,1]},{availableDays:[1,3,8]}])assert.throws(()=>scheduleWeeks({...base,...x}));});
test('canonical generator retains caller day preference and exact weekly frequency',()=>{const p=generateProgram({startDate:base.startDate,durationWeeks:4,trainingDays:3,availableDays:base.availableDays});assert.deepEqual(p.weeklySchedule.availableDays,[1,3,5]);for(const w of p.microcycles)assert.equal(w.sessions.filter(s=>s.type==='workout').length,3);});
