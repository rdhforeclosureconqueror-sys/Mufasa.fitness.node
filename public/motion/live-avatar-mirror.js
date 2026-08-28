(function (root, factory) {
  const normalized = typeof module === "object" && module.exports ? require("./normalized-pose") : root.PocketPTNormalizedPose;
  const solverApi = typeof module === "object" && module.exports ? require("./avaturn-live-pose-solver") : root.PocketPTAvaturnLivePoseSolver;
  const api = factory(normalized, solverApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTLiveAvatarMirror = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (normalized, solverApi) {
  "use strict";
  class LiveAvatarMirror {
    constructor({ eventTarget, session, cameraState = () => ({}), now = () => Date.now(), solverOptions = {}, onPose = () => {} } = {}) {
      if (!eventTarget || !session?.avatar || !session?.THREE) throw new TypeError("eventTarget and a loaded motion session are required");
      this.eventTarget = eventTarget; this.session = session; this.cameraState = cameraState; this.onPose = onPose; this.disposed = false; this.poseFramesReceived = 0; this.retargetFramesExecuted = 0; this.lastRetargetAt = null;
      session.unloadMotion?.();
      this.solver = new solverApi.AvaturnLivePoseSolver({ THREE: session.THREE, avatar: session.avatar, now, ...solverOptions });
      this.onFrame = event => {
        const camera = this.cameraState() || {};
        const frame = normalized.fromMoveNetPosePacket(event?.detail?.posePacket, { cameraFacing: camera.facingMode, previewMirrored: camera.isMirrored });
        this.poseFramesReceived += 1; this.solver.observe(frame); this.onPose(frame, this.solver.diagnostics());
      };
      eventTarget.addEventListener("pose-runtime:frame", this.onFrame);
    }
    update(deltaSeconds, at) { const state = this.solver.update(deltaSeconds, at); if (this.solver.diagnostics().changedBones.length) { this.retargetFramesExecuted += 1; this.lastRetargetAt = Number(at || Date.now()); } return state; }
    diagnostics() { return Object.freeze({ ...this.solver.diagnostics(), poseFramesReceived: this.poseFramesReceived, retargetFramesExecuted: this.retargetFramesExecuted, lastRetargetAt: this.lastRetargetAt, avatarRoot: this.session.avatar }); }
    dispose() { if (this.disposed) return; this.eventTarget.removeEventListener("pose-runtime:frame", this.onFrame); this.solver.dispose(); this.disposed = true; }
  }
  return Object.freeze({ LiveAvatarMirror });
});
