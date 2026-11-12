(()=>{"use strict";
const button=document.getElementById("open"),status=document.getElementById("status");
button.addEventListener("click",async()=>{
 button.disabled=true;status.textContent="Checking your community membership…";
 try{
  await window.AuthStateRuntime?.whenReady?.();
  const token=window.AuthStateRuntime?.getAuthToken?.();
  if(!token)throw Error("Please sign in to access this community.");
  const origin=window.MAAT_BACKEND_ORIGIN||location.origin;
  // Browser grants must be issued by the SAME origin that serves the protected
  // HTML. An API on a different origin cannot set this site's HTTP-only cookie.
  const response=await fetch("/api/me/pan-african/browse-session",{
   method:"POST",headers:{authorization:"Bearer "+token},credentials:"same-origin"
  });
  if(!response.ok)throw Error(response.status===403?"Your Pan-African community membership has not been approved yet.":response.status===401?"Please sign in again.":"Could not open the protected journey.");
  window.location.assign("/eight-limbs-adinkra.html");
 }catch(error){status.textContent=error.message;button.disabled=false;}
});
})();