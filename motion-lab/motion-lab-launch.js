(function () {
  "use strict";
  const status = document.getElementById("status");
  let accepted = false;
  const fail = (code) => {
    const safeCode = ["motion_lab_session_unavailable", "motion_lab_session_cookie_rejected"].includes(code) ? code : "motion_lab_session_unavailable";
    status.textContent = safeCode;
    window.opener?.postMessage({ type: "pocketpt:motion-lab-error", code: safeCode }, "*");
  };
  window.addEventListener("message", async (event) => {
    if (accepted || event.source !== window.opener || event.data?.type !== "pocketpt:motion-lab-auth") return;
    if (typeof event.data.token !== "string" || !event.data.token) return fail("motion_lab_session_unavailable");
    accepted = true;
    try {
      const response = await fetch("/api/dev/motion-lab/session", {
        method: "POST", headers: { Authorization: `Bearer ${event.data.token}` },
        credentials: "same-origin", cache: "no-store"
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.data?.navigateTo !== "/dev/motion-lab") return fail("motion_lab_session_unavailable");
      const readiness = await fetch(body.data.navigateTo, { credentials: "same-origin", cache: "no-store" });
      if (!readiness.ok) return fail("motion_lab_session_cookie_rejected");
      window.opener?.postMessage({ type: "pocketpt:motion-lab-launched" }, "*");
      window.location.replace(body.data.navigateTo);
    } catch (_) { fail("motion_lab_session_unavailable"); }
  });
  if (!window.opener) return fail("motion_lab_session_unavailable");
  window.opener.postMessage({ type: "pocketpt:motion-lab-ready" }, "*");
}());
