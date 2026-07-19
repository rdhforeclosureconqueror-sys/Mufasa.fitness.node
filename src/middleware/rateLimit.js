"use strict";

function createRateLimiter({ windowMs = 60_000, max = 30, key = (req) => req.auth?.userId || req.ip, name = "default" } = {}) {
  const buckets = new Map();
  return function rateLimit(req, res, next) {
    const now = Date.now();
    const bucketKey = `${name}:${key(req) || "unknown"}`;
    let bucket = buckets.get(bucketKey);
    if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    buckets.set(bucketKey, bucket);
    if (bucket.count <= max) return next();
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfter));
    return res.status(429).json({
      ok: false,
      requestId: req.requestId,
      error: { code: "RATE_LIMITED", message: "Too many requests; retry later", details: { policy: name } }
    });
  };
}

module.exports = { createRateLimiter };
