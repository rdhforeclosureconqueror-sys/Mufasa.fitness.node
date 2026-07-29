"use strict";

const TRAIL_SEARCH_PATH = "/api/me/greatness/nearby-trails/search";

function chunkBytes(chunk, encoding) {
  if (chunk == null) return 0;
  return Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk), encoding);
}

function createTrailResponseDiagnostics({ logger = console } = {}) {
  return function trailResponseDiagnostics(req, res, next) {
    if (req.path !== TRAIL_SEARCH_PATH) return next();

    const state = { bytesWritten: 0, jsonExecuted: false, endExecuted: false, finished: false, closedEarly: false };
    req.trailResponseDiagnostics = state;
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const context = () => ({
      requestId: req.requestId || null,
      userId: req.auth?.userId || null,
      userAgent: req.get("user-agent") || null,
      hostname: req.hostname || req.get("host") || null,
      bytesWritten: state.bytesWritten,
      contentType: res.getHeader("content-type") || null,
      contentLength: res.getHeader("content-length") || null,
      resJsonExecuted: state.jsonExecuted,
      resEndExecuted: state.endExecuted,
      headersSent: res.headersSent,
      compressionEnabled: Boolean(res.getHeader("content-encoding")),
      contentEncoding: res.getHeader("content-encoding") || null,
      responseStreamClosedEarly: state.closedEarly
    });

    res.json = function instrumentedJson(body) {
      state.jsonExecuted = true;
      return originalJson(body);
    };
    res.send = function instrumentedSend(body) {
      logger.info?.("[nearby-trails-response]", { event: "before_send", ...context(), preparedBodyBytes: chunkBytes(body) });
      return originalSend(body);
    };
    res.write = function instrumentedWrite(chunk, encoding, callback) {
      state.bytesWritten += chunkBytes(chunk, encoding);
      return originalWrite(chunk, encoding, callback);
    };
    res.end = function instrumentedEnd(chunk, encoding, callback) {
      state.endExecuted = true;
      state.bytesWritten += chunkBytes(chunk, encoding);
      return originalEnd(chunk, encoding, callback);
    };
    res.on("finish", () => {
      state.finished = true;
      logger.info?.("[nearby-trails-response]", { event: "finish", ...context(), statusCode: res.statusCode });
    });
    res.on("close", () => {
      state.closedEarly = !state.finished;
      logger.info?.("[nearby-trails-response]", { event: "close", ...context(), statusCode: res.statusCode });
    });
    next();
  };
}

function logTrailResponseException(req, res, error, logger = console) {
  if (req.path !== TRAIL_SEARCH_PATH) return;
  logger.error?.("[nearby-trails-response]", {
    event: "exception",
    requestId: req.requestId || null,
    userId: req.auth?.userId || null,
    headersSent: res.headersSent,
    exceptionAfterHeadersSent: res.headersSent,
    errorName: error?.name || "Error",
    errorMessage: error?.message || String(error)
  });
}

module.exports = { TRAIL_SEARCH_PATH, createTrailResponseDiagnostics, logTrailResponseException };
