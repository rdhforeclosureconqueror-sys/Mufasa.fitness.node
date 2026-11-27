'use strict';
(function exposeRugbyPolicyDiagnostics(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.RugbyPolicyDiagnostics=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 function result(boundary,code,message){return Object.freeze({boundary,code,message});}
 function classify(response){
  const diagnostics=response?.diagnostics||{};
  const error=response?.error||null;
  if(error?.code==='AUTH_NOT_READY')return result('SESSION','AUTH_NOT_READY','Your signed-in session is not ready. Sign in again, then retry.');
  if(diagnostics.dispatched!==true){
   if(diagnostics.failureClass==='timeout')return result('TRANSPORT','REQUEST_TIMEOUT','The owner-preview request timed out before the server responded.');
   return result('TRANSPORT','REQUEST_NOT_DISPATCHED','The owner-preview request did not leave this device.');
  }
  const status=Number(diagnostics.status||response?.response?.status||0);
  if(status===401)return result('HTTP_AUTHENTICATION','HTTP_401','The server did not accept the current signed-in session.');
  if(status===403)return result('HTTP_AUTHORIZATION','HTTP_403','The signed-in account is not recognized as the verified bootstrap owner.');
  if(!response?.ok)return result('HTTP_RESPONSE','HTTP_'+(status||'UNKNOWN'),'The server rejected the owner-preview request.');
  if(response?.payload?.ok!==true||!response?.payload?.data)return result('RESPONSE_SHAPE','INVALID_RESPONSE','The server response was not a valid owner-preview result.');
  return result('NONE','PASS','Owner-preview acceptance request completed.');
 }
 function format(report){return 'First failing boundary: '+report.boundary+'\nCode: '+report.code+'\n'+report.message;}
 return Object.freeze({classify,format});
});
