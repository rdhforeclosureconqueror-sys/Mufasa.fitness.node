(()=>{"use strict";
const button=document.getElementById("open"),status=document.getElementById("status");
button.addEventListener("click",async()=>{
 button.disabled=true;status.textContent="Verifying membership…";
 try{
  await window.AuthStateRuntime?.whenReady?.();
  const token=window.AuthStateRuntime?.getAuthToken?.();
  if(!token)throw Error("Please sign in to access this community.");
  const backendOrigin=window.MAAT_BACKEND_ORIGIN;
  if(!backendOrigin||!/^https:\/\//.test(backendOrigin))throw Error("Secure membership service is not configured.");
  const response=await fetch(backendOrigin+"/api/me/pan-african/browse-session",{
   method:"POST",headers:{authorization:"Bearer "+token},credentials:"omit"
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(response.status===403?"Your Pan-African community membership has not been approved yet.":response.status===401?"Please sign in again.":"Could not open the protected journey.");
  const entry=new URL(data.enterUrl);
  if(entry.origin!==new URL(backendOrigin).origin||entry.pathname!=="/api/pan-african/enter")throw Error("Unexpected secure journey destination.");
  window.location.assign(entry.href);
 }catch(error){status.textContent=error.message;button.disabled=false;}
});
})();