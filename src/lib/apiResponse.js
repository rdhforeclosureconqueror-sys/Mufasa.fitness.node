"use strict";

class ApiError extends Error {
  constructor(code, message, status = 400, details = null) {
    super(message);
    this.name = "ApiError";
    this.code = code || "BAD_REQUEST";
    this.status = status;
    this.details = details;
  }
}

function ok(res, requestId, data, status = 200) {
  return res.status(status).json({
    ok: true,
    data,
    error: null,
    requestId
  });
}

function fail(res, requestId, error, status = 400) {
  return res.status(status).json({
    ok: false,
    data: null,
    error,
    requestId
  });
}

module.exports = {
  ApiError,
  ok,
  fail
};
