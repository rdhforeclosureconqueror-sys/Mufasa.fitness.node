'use strict';

function jointAngle(a, vertex, c) {
  if (![a, vertex, c].every(Boolean)) return null;
  const u = { x: a.x - vertex.x, y: a.y - vertex.y, z: (a.z || 0) - (vertex.z || 0) };
  const v = { x: c.x - vertex.x, y: c.y - vertex.y, z: (c.z || 0) - (vertex.z || 0) };
  const dot = u.x * v.x + u.y * v.y + u.z * v.z;
  const lengths = Math.hypot(u.x, u.y, u.z) * Math.hypot(v.x, v.y, v.z);
  if (lengths === 0) return null;
  return Math.acos(Math.max(-1, Math.min(1, dot / lengths))) * 180 / Math.PI;
}

module.exports = { jointAngle };
