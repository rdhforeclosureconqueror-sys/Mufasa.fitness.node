(function exposeAvatarUploadContract(root, factory) {
  const contract = factory();
  if (typeof module === "object" && module.exports) module.exports = contract;
  else root.PocketPTAvatarUploadContract = contract;
})(typeof globalThis !== "undefined" ? globalThis : this, function buildContract() {
  "use strict";
  return Object.freeze({
    version: 1,
    discoveryPath: "/api/avatar/upload-contract",
    path: "/api/avatar/upload",
    method: "POST",
    field: "avatar"
  });
});
