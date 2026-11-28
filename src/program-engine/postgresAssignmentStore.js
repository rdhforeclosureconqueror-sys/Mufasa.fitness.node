'use strict';
// Unwired adapter. Requires separately approved schema and canonical writer cutover.
function createPostgresAssignmentStore(pool){
 async function read(userId){const {rows}=await pool.query('SELECT assignment FROM rugby_intelligence.program_assignments WHERE user_id=$1',[userId]);return rows[0]?.assignment??null;}
 async function saveIfVersion(userId,expected,next){
  if(!userId||next?.userId!==userId||typeof next.assignmentId!=='string'||!next.assignmentId||!Number.isSafeInteger(next.version)||next.version<1)throw Error('Invalid assignment');
  if(expected!==null&&(!expected?.assignmentId||!Number.isSafeInteger(expected.version)||expected.version<1))throw Error('Invalid expected version');
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('SELECT pg_advisory_xact_lock(1381320538, hashtext($1))',[userId]);
   const {rows}=await client.query('SELECT assignment FROM rugby_intelligence.program_assignments WHERE user_id=$1 FOR UPDATE',[userId]);
   const current=rows[0]?.assignment??null;
   if(expected===null?current!==null:(!current||current.userId!==userId||current.assignmentId!==expected.assignmentId||current.version!==expected.version))throw Error('Assignment changed');
   if(next.version!==(current?.assignmentId===next.assignmentId?current.version+1:1))throw Error('Invalid version transition');
   if(current)await client.query('INSERT INTO rugby_intelligence.program_assignment_history (user_id,assignment) VALUES ($1,$2::jsonb)',[userId,JSON.stringify(current)]);
   await client.query('INSERT INTO rugby_intelligence.program_assignments (user_id,assignment) VALUES ($1,$2::jsonb) ON CONFLICT (user_id) DO UPDATE SET assignment=EXCLUDED.assignment',[userId,JSON.stringify(next)]);
   await client.query('COMMIT');return structuredClone(next);
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
 return Object.freeze({read,saveIfVersion});
}
module.exports={createPostgresAssignmentStore};
