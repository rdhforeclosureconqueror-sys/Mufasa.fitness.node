(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTMotionViewer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  return Object.freeze({
    createSession() {
      let mounted = false;
      return {
        async mount(root) {
          mounted = true;
          const message = root.ownerDocument.createElement("p");
          message.textContent = "Motion preview boundary verified (no 3D renderer loaded).";
          root.appendChild(message);
          return { status: "ready" };
        },
        dispose() { mounted = false; },
        get mounted() { return mounted; }
      };
    }
  });
});
