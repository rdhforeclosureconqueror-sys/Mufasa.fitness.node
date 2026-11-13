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
  // Old journeys stored opt-in dates on the public site's browser origin.
  // Import them before navigating to the backend; never auto-start a journey.
  const legacy={};
  try{
   const combined=localStorage.getItem("milele-eight-limbs-start-v1");
   const pillars=localStorage.getItem("milele-eight-pillars-start-v1");
   if(/^\d{4}-\d{2}-\d{2}$/.test(combined||""))legacy.combinedEightLimbsStart=combined;
   if(/^\d{4}-\d{2}-\d{2}$/.test(pillars||""))legacy.eightPillarsStart=pillars;
  }catch(_){}
  if(Object.keys(legacy).length){
   status.textContent="Preserving your existing journey dates…";
   const saved=await fetch(backendOrigin+"/api/me/pan-african/import-legacy-progress",{
    method:"POST",headers:{authorization:"Bearer "+token,"content-type":"application/json"},
    credentials:"omit",body:JSON.stringify(legacy)
   });
   if(!saved.ok)throw Error("Could not preserve your existing journey dates. Please try again before proceeding.");
  }
  const response=await fetch(backendOrigin+"/api/me/pan-african/browse-session",{
   method:"POST",headers:{authorization:"Bearer "+token},credentials:"omit"
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
   const code=typeof data.error==="string"?data.error:typeof data.error?.code==="string"?data.error.code:"UNKNOWN";
   throw Error(response.status===403?"Your account does not have permission to enter this community.":response.status===401?"Please sign in again.":"Could not open the protected journey (HTTP "+response.status+" · "+code+").");
  }
  const entry=new URL(data.enterUrl);
  if(entry.origin!==new URL(backendOrigin).origin||entry.pathname!=="/api/pan-african/enter")throw Error("Unexpected secure journey destination.");
  window.location.assign(entry.href);
 }catch(error){status.textContent=error.message;button.disabled=false;}
});
})();