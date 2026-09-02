"use strict";
const { asyncHandler } = require("../middleware/requestContext");
const { ok } = require("../lib/apiResponse");
function installPrivateClientGettingStartedRoutes({ app, requireAuth, service }) {
  app.get("/api/me/getting-started", requireAuth, asyncHandler(async (req,res)=>{res.set("Cache-Control","private, no-store");return ok(res,req.requestId,service.read(req.auth.userId));}));
  app.put("/api/me/getting-started/preferences", requireAuth, asyncHandler(async (req,res)=>{res.set("Cache-Control","private, no-store");return ok(res,req.requestId,service.savePreferences(req.auth.userId,req.body||{}));}));
}
module.exports={installPrivateClientGettingStartedRoutes};
