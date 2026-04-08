"use strict";

const { randomUUID } = require("crypto");

function requestContext(req, res, next) {
  const incomingId = req.get("x-request-id");
  const requestId = (incomingId && String(incomingId).trim()) || randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}

function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  requestContext,
  asyncHandler
};
