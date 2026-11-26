'use strict';
const {initialLedger}=require('./beastModePolicyLedger');
const {validatePolicy}=require('./beastModePolicy');
// Inject the existing trusted database pool. No migration or runtime activation here.
function createPostgresPolicyStore(pool){
 async function read(){
  const {rows}=await pool.query('SELECT version, policy, actor, reason, published_at FROM rugby_beast_mode_policy_versions ORDER BY version');
  if(!rows.length)return initialLedger();
  const ledger=rows.map(r=>({version:r.version,policy:validatePolicy(r.policy),actor:r.actor,reason:r.reason,publishedAt:r.published_at===null?null:new Date(r.published_at).toISOString()}));
  if(ledger.some((r,i)=>r.version!==i+1))throw Error('Invalid persisted ledger');
  return ledger;
 }
 async function compareAndSwap(expectedVersion,next){
  if(!Number.isInteger(expectedVersion)||expectedVersion<1||next.length!==expectedVersion+1||next.at(-1).version!==expectedVersion+1)throw Error('Invalid version transition');
  const client=await pool.connect();
  try{
   await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
   // All cooperating writers use this reserved policy-ledger lock key.
   await client.query('SELECT pg_advisory_xact_lock(1381320537, 1)');
   const {rows}=await client.query('SELECT MAX(version) AS version FROM rugby_beast_mode_policy_versions');
   const current=rows[0].version;
   if((current??1)!==expectedVersion){await client.query('ROLLBACK');return false;}
   const insert=async r=>client.query('INSERT INTO rugby_beast_mode_policy_versions (version,policy,actor,reason,published_at) VALUES ($1,$2::jsonb,$3,$4,$5)',[r.version,JSON.stringify(validatePolicy(r.policy)),r.actor,r.reason,r.publishedAt]);
   if(current===null)await insert(initialLedger()[0]);
   await insert(next.at(-1));
   await client.query('COMMIT');return true;
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
 return {read,compareAndSwap};
}
module.exports={createPostgresPolicyStore};
