'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createPostgresAssignmentStore}=require('../src/program-engine/postgresAssignmentStore');
test('isolated PostgreSQL serializes competing assignment writes',{skip:!process.env.RUGBY_TEST_DATABASE_URL&&!process.env.RUGBY_REQUIRE_POSTGRES},async()=>{
 const url=new URL(process.env.RUGBY_TEST_DATABASE_URL);
 assert.equal(url.pathname,'/rugby_policy_test');assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
 const {Pool}=require('pg');const admin=new Pool({connectionString:url.toString()});
 const runtimeUrl=new URL(url);runtimeUrl.username='rugby_assignment_runtime';runtimeUrl.password='ci_assignment_only';
 const pool=new Pool({connectionString:runtimeUrl.toString()});
 try{
  await admin.query("CREATE SCHEMA rugby_intelligence; CREATE TABLE rugby_intelligence.program_assignments (user_id text PRIMARY KEY, assignment jsonb NOT NULL CHECK (assignment->>'userId'=user_id)); CREATE TABLE rugby_intelligence.program_assignment_history (history_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, user_id text NOT NULL, assignment jsonb NOT NULL CHECK (assignment->>'userId'=user_id)); CREATE ROLE rugby_assignment_runtime LOGIN PASSWORD 'ci_assignment_only' NOSUPERUSER NOCREATEDB NOCREATEROLE; GRANT USAGE ON SCHEMA rugby_intelligence TO rugby_assignment_runtime; GRANT SELECT, INSERT, UPDATE ON rugby_intelligence.program_assignments TO rugby_assignment_runtime; GRANT SELECT, INSERT ON rugby_intelligence.program_assignment_history TO rugby_assignment_runtime");
  const a=createPostgresAssignmentStore(pool),b=createPostgresAssignmentStore(pool);
  const first={userId:'athlete-a',assignmentId:'x',version:1};
  const initial=await Promise.allSettled([a.saveIfVersion('athlete-a',null,first),b.saveIfVersion('athlete-a',null,first)]);
  assert.equal(initial.filter(x=>x.status==='fulfilled').length,1);assert.match(initial.find(x=>x.status==='rejected').reason.message,/Assignment changed/);
  const expected={assignmentId:'x',version:1};
  const outcomes=await Promise.allSettled([a.saveIfVersion('athlete-a',expected,{...first,version:2,marker:'a'}),b.saveIfVersion('athlete-a',expected,{...first,version:2,marker:'b'})]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.match(outcomes.find(x=>x.status==='rejected').reason.message,/Assignment changed/);
  assert.deepEqual(await b.read('athlete-a'),outcomes.find(x=>x.status==='fulfilled').value);
  assert.equal(await b.read('athlete-b'),null);
  const history=await pool.query('SELECT assignment FROM rugby_intelligence.program_assignment_history WHERE user_id=$1 ORDER BY history_id',['athlete-a']);assert.deepEqual(history.rows.map(r=>r.assignment),[first]);
  await assert.rejects(pool.query('DELETE FROM rugby_intelligence.program_assignment_history'),e=>e.code==='42501');
  await assert.rejects(pool.query('UPDATE rugby_intelligence.program_assignment_history SET assignment=assignment'),e=>e.code==='42501');
  await assert.rejects(pool.query('DELETE FROM rugby_intelligence.program_assignments'),e=>e.code==='42501');
 }finally{await pool.end();await admin.end();}
});
