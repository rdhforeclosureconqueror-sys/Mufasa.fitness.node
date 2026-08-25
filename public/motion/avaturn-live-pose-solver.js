(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTAvaturnLivePoseSolver = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULTS = Object.freeze({ minimumConfidence: 0.5, holdMs: 250, smoothingLambda: 12, minimumDirectionLength: 1e-4 });
  const STATES = Object.freeze({ WAITING: "WAITING", TRACKING: "TRACKING", HELD: "HELD", LOST: "LOST" });

  class AvaturnLivePoseSolver {
    constructor({ THREE, avatar, now = () => Date.now(), ...options } = {}) {
      if (!THREE || !avatar) throw new TypeError("THREE and avatar are required");
      this.THREE = THREE; this.avatar = avatar; this.now = now; this.options = { ...DEFAULTS, ...options };
      this.state = STATES.WAITING; this.lastGoodAt = null; this.targetQuaternion = null; this.disposed = false;
      const nodes = new Map(); avatar.traverse(object => { if (object.name) nodes.set(object.name, object); });
      this.rightShoulder = nodes.get("RightShoulder"); this.rightArm = nodes.get("RightArm"); this.rightForeArm = nodes.get("RightForeArm"); this.rightHand = nodes.get("RightHand");
      if (!this.rightShoulder || !this.rightArm || !this.rightForeArm || !this.rightHand || this.rightArm.parent !== this.rightShoulder || this.rightForeArm.parent !== this.rightArm) throw new Error("avaturn_right_arm_chain_missing");
      avatar.updateMatrixWorld(true);
      this.rest = Object.freeze({
        position: this.rightArm.position.clone(), quaternion: this.rightArm.quaternion.clone(), scale: this.rightArm.scale.clone(),
        childLocalDirection: this.rightForeArm.position.clone().normalize(),
        parentDirection: this.rightForeArm.position.clone().normalize().applyQuaternion(this.rightArm.quaternion).normalize()
      });
      this.currentQuaternion = this.rest.quaternion.clone();
      this.targetQuaternion = this.rest.quaternion.clone();
    }

    observe(frame) {
      if (this.disposed) return this.state;
      const confidence = Math.min(Number(frame?.rightShoulder?.confidence || 0), Number(frame?.rightElbow?.confidence || 0));
      const direction = frame?.rightUpperArmDirection;
      const length = direction ? Math.hypot(direction.x, direction.y, direction.z || 0) : 0;
      if (confidence < this.options.minimumConfidence || !Number.isFinite(length) || length < this.options.minimumDirectionLength) return this.updateTrackingState(frame?.timestamp);
      this.avatar.updateMatrixWorld(true);
      const parentWorld = new this.THREE.Quaternion(); this.rightShoulder.getWorldQuaternion(parentWorld);
      const targetWorld = new this.THREE.Vector3(direction.x / length, direction.y / length, 0).normalize();
      const targetParent = targetWorld.applyQuaternion(parentWorld.invert()).normalize();
      const deltaParent = new this.THREE.Quaternion().setFromUnitVectors(this.rest.parentDirection, targetParent);
      this.targetQuaternion.copy(deltaParent).multiply(this.rest.quaternion).normalize();
      this.lastGoodAt = Number(frame?.timestamp || this.now()); this.state = STATES.TRACKING;
      return this.state;
    }

    updateTrackingState(at = this.now()) {
      const now = Number(at || this.now());
      if (this.lastGoodAt == null) this.state = STATES.WAITING;
      else if (now - this.lastGoodAt <= this.options.holdMs) this.state = STATES.HELD;
      else { this.state = STATES.LOST; this.targetQuaternion.copy(this.rest.quaternion); }
      return this.state;
    }

    update(deltaSeconds, at = this.now()) {
      if (this.disposed) return this.state;
      if (this.state === STATES.TRACKING && this.lastGoodAt != null && Number(at) - this.lastGoodAt > this.options.holdMs) this.updateTrackingState(at);
      if (this.state === STATES.HELD) this.updateTrackingState(at);
      const dt = Math.max(0, Math.min(0.1, Number(deltaSeconds) || 0));
      const alpha = 1 - Math.exp(-this.options.smoothingLambda * dt);
      this.currentQuaternion.slerp(this.targetQuaternion, alpha).normalize();
      this.rightArm.quaternion.copy(this.currentQuaternion);
      this.rightArm.updateMatrix?.(); this.avatar.updateMatrixWorld(true);
      return this.state;
    }

    restore() {
      this.rightArm.position.copy(this.rest.position); this.rightArm.quaternion.copy(this.rest.quaternion); this.rightArm.scale.copy(this.rest.scale);
      this.currentQuaternion.copy(this.rest.quaternion); this.targetQuaternion.copy(this.rest.quaternion);
      this.rightArm.updateMatrix?.(); this.avatar.updateMatrixWorld(true); this.state = STATES.WAITING; this.lastGoodAt = null;
    }
    dispose() { if (this.disposed) return; this.restore(); this.disposed = true; }
    diagnostics() { return Object.freeze({ state: this.state, minimumConfidence: this.options.minimumConfidence, holdMs: this.options.holdMs, smoothingLambda: this.options.smoothingLambda, targetBone: "RightArm", lastGoodAt: this.lastGoodAt }); }
  }

  return Object.freeze({ AvaturnLivePoseSolver, DEFAULTS, STATES });
});
