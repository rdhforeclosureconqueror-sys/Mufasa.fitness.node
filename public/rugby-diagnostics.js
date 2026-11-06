(function(global){
'use strict';
const checks=[
 ['Profile read','/api/me/rugby/profile',data=>data===null||(typeof data==='object'&&!Array.isArray(data))],
 ['Assessment history read','/api/me/rugby/assessments',Array.isArray],
 ['Daily check-in history read','/api/me/rugby/checkins',Array.isArray]
];
function init(){
 const button=document.getElementById('rugby-diagnostic-run'),output=document.getElementById('rugby-diagnostic-result');
 if(!button||!output)return;
 button.addEventListener('click',async()=>{
  button.disabled=true;output.textContent='Checking authenticated read access…';
  try{
   if(!global.MaatApiClient?.isAuthenticated?.())throw Error('FIRST FAILURE: Not authenticated. Sign in to your Milele Fit account.');
   for(const [name,path,valid] of checks){
    const result=await global.MaatApiClient.request(path);
    if(!result.ok){
     const status=result.response?.status;
     throw Error('FIRST FAILURE: '+name+' — '+(status?'HTTP '+status:'network/authentication request failed')+'.');
    }
    if(result.response?.headers?.get('cache-control')?.toLowerCase().includes('no-store')!==true)throw Error('FIRST FAILURE: '+name+' — missing private no-store response header.');
    if(result.payload?.ok!==true||!valid(result.payload.data))throw Error('FIRST FAILURE: '+name+' — unexpected response format.');
   }
   output.textContent='PASS: All three authenticated read endpoints returned expected data formats and no-store headers. Save/reload and cross-account checks still require controlled verification.';
  }catch(error){output.textContent=error.message?.startsWith('FIRST FAILURE:')?error.message:'FIRST FAILURE: Diagnostic could not finish. Please retry.';}
  finally{button.disabled=false;}
 });
}
global.RugbyDiagnostics={init};
})(window);
