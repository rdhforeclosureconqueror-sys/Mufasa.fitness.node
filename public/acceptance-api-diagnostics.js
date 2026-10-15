"use strict";
(function(global){
 function describe(result){
  const d=result?.diagnostics||{},error=result?.payload?.error||{};
  const code=error.firstFailure||error.code||result?.error?.code||result?.error?.message||"REQUEST_FAILED";
  const parts=["First failure: "+String(code),"HTTP: "+(d.status??"no response"),"Boundary: "+(d.failureClass||"unknown"),"Request dispatched: "+String(d.dispatched??"unknown"),"Cross-origin: "+String(d.crossOrigin??"unknown"),"Preflight required: "+String(d.preflightRequired??"unknown")];
  if(d.apiOrigin)parts.push("API origin: "+d.apiOrigin);
  return parts.join(" · ");
 }
 global.MileleAcceptanceDiagnostics=Object.freeze({describe});
})(typeof window!=="undefined"?window:globalThis);
