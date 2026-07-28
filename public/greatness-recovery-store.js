const SESSION_KEY="greatness-active-session-v2";
export function createRecoveryStore({indexedDB=globalThis.indexedDB,localStorage=globalThis.localStorage}={}){
  const fallbackKey=`${SESSION_KEY}-fallback`;
  function fallbackWrite(session){localStorage?.setItem(fallbackKey,JSON.stringify(session));return{storage:"localStorage"};}
  async function save(session){if(!indexedDB)return fallbackWrite(session);try{return await new Promise((resolve,reject)=>{const request=indexedDB.open("greatness",2);request.onerror=()=>reject(request.error||new Error("IndexedDB open failed"));request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("sessions"))request.result.createObjectStore("sessions");};request.onsuccess=()=>{const transaction=request.result.transaction("sessions","readwrite");transaction.onerror=()=>reject(transaction.error||new Error("IndexedDB write failed"));transaction.oncomplete=()=>{localStorage?.removeItem(fallbackKey);resolve({storage:"indexedDB"});};transaction.objectStore("sessions").put(session,session.clientSessionId);};});}catch{return fallbackWrite(session);}}
  function loadFallback(){const value=localStorage?.getItem(fallbackKey);return value?JSON.parse(value):null;}
  function discard(){localStorage?.removeItem(SESSION_KEY);localStorage?.removeItem(fallbackKey);}
  return{save,loadFallback,discard,SESSION_KEY};
}
