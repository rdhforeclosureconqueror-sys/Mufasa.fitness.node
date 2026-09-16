(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTLowerBodySpatialPolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "1.1.0-body-relative-wide-lunge-knee-guidance";
  const OPERATOR = "standing-asymmetric-wide-lunge-v1";
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const point = value => ({ x: finite(value?.x, 0), y: finite(value?.y, 0), z: finite(value?.z, 0) });
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

  function degreesAtJoint(a, joint, b) {
    const u = { x:a.x-joint.x, y:a.y-joint.y, z:a.z-joint.z };
    const v = { x:b.x-joint.x, y:b.y-joint.y, z:b.z-joint.z };
    const ul = Math.hypot(u.x,u.y,u.z), vl = Math.hypot(v.x,v.y,v.z);
    if (!(ul > 0 && vl > 0)) return null;
    return Math.acos(clamp((u.x*v.x+u.y*v.y+u.z*v.z)/(ul*vl), -1, 1))*180/Math.PI;
  }

  function jointDistance(length1, length2, angleDegrees) {
    const radians = clamp(finite(angleDegrees, 170), 1, 179.5) * Math.PI / 180;
    return Math.sqrt(Math.max(0, length1*length1 + length2*length2 - 2*length1*length2*Math.cos(radians)));
  }

  function fail(code, constraint, diagnostics = {}) {
    return Object.freeze({ status:"failed", code, ...diagnostics, firstFailedSemanticConstraint:constraint });
  }

  function resolve(input = {}) {
    const left = input.left || {}, right = input.right || {}, classification = input.classification || {};
    const range = classification.stanceWidthLegLengthRatio || {};
    const leadRange = classification.leadKneeAngleDegrees || {};
    const trailRange = classification.trailingKneeAngleDegrees || {};
    const leftLength = finite(left.upperLength,0) + finite(left.lowerLength,0);
    const rightLength = finite(right.upperLength,0) + finite(right.lowerLength,0);
    if (!(leftLength > 0 && rightLength > 0)) return fail("LOWER_BODY_LEG_LENGTH_UNAVAILABLE", "stance_width_scales_from_leg_length");

    const effectiveLegLength = (leftLength + rightLength) / 2;
    const minimumRatio = finite(range.minimum, 1.35);
    const maximumRatio = finite(range.maximum, 1.7);
    const requestedRatio = finite(range.preferred, 1.55);
    if (requestedRatio < minimumRatio || requestedRatio > maximumRatio) {
      return fail("LOWER_BODY_STANCE_RATIO_OUT_OF_RANGE", "stance_width_scales_from_leg_length");
    }

    const leadLeg = classification.leadLeg === "right" ? "right" : "left";
    const trailLeg = leadLeg === "left" ? "right" : "left";
    const lead = leadLeg === "left" ? left : right;
    const trail = trailLeg === "left" ? left : right;
    const sign = leadLeg === "left" ? 1 : -1;
    const leadUpper = finite(lead.upperLength,0), leadLower = finite(lead.lowerLength,0);
    const trailUpper = finite(trail.upperLength,0), trailLower = finite(trail.lowerLength,0);
    const leadHipCurrent = point(lead.hip), trailHipCurrent = point(trail.hip);
    const centerX = finite(input.center?.x,0), centerZ = finite(input.center?.z,0), groundY = finite(input.groundY,0);
    const leadKneeRequested = finite(leadRange.preferred, 90);
    const trailKneeRequested = finite(trailRange.preferred, 170);

    // Derive the stance from both leg lengths and the avatar's real hip breadth.
    // Omitting hip breadth made the original operator fold the rear knee to ~104°.
    const pelvisWidthAlongStance = Math.max(0, sign * (leadHipCurrent.x - trailHipCurrent.x));
    const trailReach = jointDistance(trailUpper, trailLower, trailKneeRequested);
    const pelvisHeight = groundY + leadLower;
    const trailVerticalReach = pelvisHeight - groundY;
    const trailHorizontalSquared = trailReach*trailReach - trailVerticalReach*trailVerticalReach;
    if (!(trailHorizontalSquared > 0)) {
      return fail("LOWER_BODY_TRAILING_LEG_GEOMETRY_UNAVAILABLE", "trailing_leg_remains_long_and_straight", { leftLegLength:leftLength, rightLegLength:rightLength });
    }
    const trailHorizontalReach = Math.sqrt(trailHorizontalSquared);
    const requiredStanceWidth = leadUpper + pelvisWidthAlongStance + trailHorizontalReach;
    const requiredRatio = requiredStanceWidth / effectiveLegLength;
    if (requiredRatio < minimumRatio || requiredRatio > maximumRatio) {
      return fail("LOWER_BODY_REQUIRED_STANCE_OUT_OF_RANGE", "stance_width_scales_from_leg_length", {
        requestedStanceWidthRatio:requestedRatio,
        requiredStanceWidthRatio:requiredRatio,
        allowedStanceWidthRatio:Object.freeze({ minimum:minimumRatio, maximum:maximumRatio }),
        leftLegLength:leftLength,
        rightLegLength:rightLength,
        pelvisWidthAlongStance
      });
    }

    const stanceWidth = requiredStanceWidth;
    const leadAnchor = Object.freeze({ x:centerX+sign*stanceWidth/2, y:groundY, z:centerZ });
    const trailAnchor = Object.freeze({ x:centerX-sign*stanceWidth/2, y:groundY, z:centerZ });
    const leadKneeHint = Object.freeze({ x:leadAnchor.x, y:groundY+leadLower, z:centerZ });
    const leadHip = Object.freeze({ x:leadKneeHint.x-sign*leadUpper, y:leadKneeHint.y, z:centerZ });
    const rootDelta = Object.freeze({ x:leadHip.x-leadHipCurrent.x, y:leadHip.y-leadHipCurrent.y, z:leadHip.z-leadHipCurrent.z });
    const translatedTrailHip = Object.freeze({ x:trailHipCurrent.x+rootDelta.x, y:trailHipCurrent.y+rootDelta.y, z:trailHipCurrent.z+rootDelta.z });
    const translatedTrailKnee = point(trail.knee);
    translatedTrailKnee.x += rootDelta.x;
    translatedTrailKnee.y += rootDelta.y;
    translatedTrailKnee.z += rootDelta.z;
    const resolvedTrailReach = distance(translatedTrailHip, trailAnchor);
    if (resolvedTrailReach > trailUpper + trailLower + 1e-6) {
      return fail("LOWER_BODY_TRAILING_LEG_UNREACHABLE", "trailing_leg_remains_long_and_straight", {
        requestedStanceWidthRatio:requestedRatio,
        requiredStanceWidthRatio:requiredRatio,
        resolvedStanceWidth:stanceWidth,
        leftLegLength:leftLength,
        rightLegLength:rightLength,
        pelvisWidthAlongStance
      });
    }

    return Object.freeze({
      status:"ready", operator:OPERATOR, scaleReference:"effective-leg-length", leadLeg, trailLeg,
      leftLegLength:leftLength, rightLegLength:rightLength, effectiveLegLength, pelvisWidthAlongStance,
      requestedStanceWidthRatio:requestedRatio, requiredStanceWidthRatio:requiredRatio,
      resolvedStanceWidthRatio:requiredRatio, resolvedStanceWidth:stanceWidth,
      actualHeelToHeelDistance:null,
      leadKneeAngleRequestedDegrees:leadKneeRequested,
      leadKneeAngleMeasuredDegrees:null,
      leadKneeToAnkleHorizontalError:null,
      trailingKneeAngleRequestedDegrees:trailKneeRequested,
      trailingKneeAngleDegrees:null,
      leftFootContact:null, rightFootContact:null,
      pelvisHeightSource:"lead-leg-geometry:knee-over-ankle-and-thigh-horizontal",
      leadAnchor, trailAnchor, leadKneeHint, trailKneeHint:Object.freeze(translatedTrailKnee), rootDelta,
      firstFailedSemanticConstraint:null
    });
  }

  return Object.freeze({ VERSION, OPERATOR, resolve, degreesAtJoint, jointDistance });
});
