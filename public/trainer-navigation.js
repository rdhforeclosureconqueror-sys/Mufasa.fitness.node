"use strict";
(() => {
  const link = document.getElementById("trainerWorkspaceNav");
  if (!link) return;
  const token = localStorage.getItem("mufasa_auth_token") || sessionStorage.getItem("mufasa_auth_token") || localStorage.getItem("authToken");
  if (!token) return;
  fetch("/api/me", { headers: { authorization: `Bearer ${token}` } })
    .then((response) => response.ok ? response.json() : null)
    .then((value) => { link.hidden = value?.data?.role !== "trainer" && value?.data?.role !== "admin" && value?.data?.role !== "super_admin"; })
    .catch(() => { link.hidden = true; });
})();
