"use strict";
const { ApiError } = require("../lib/apiResponse");
const { asyncHandler } = require("../middleware/requestContext");
const { createRateLimiter } = require("../middleware/rateLimit");
const { ok } = require("../lib/apiResponse");

// Routes are installed only when a durable catalog is explicitly configured.
// Co-hosts are not platform admins and cannot use these endpoints.
function requireEventAdmin(req,_res,next) {\n if (!req.auth?.userId) throw new ApiError("UNAUTHENTICATED","Authentication required",401);\n if (!["admin","super_admin"].includes(req.authz?.role)) throw new ApiError("FORBIDDEN","Administrator access required",403);\n next();\n}\nfunction installCommunityEventCatalogRoutes({ app, requireAuth, catalog }) {
 if (!app || !requireAuth || !catalog) throw new Error("Event catalog route dependencies required");
 const write = createRateLimiter({ name:"community-event-catalog-write", windowMs:60_000, max:15 });
 app.get("/api/community/events",asyncHandler(async(req,res)=>{
   res.set("Cache-Control","no-store");
   return ok(res,req.requestId,{events:catalog.list({publicOnly:true}).map(({createdBy,updatedBy,...publicEvent})=>publicEvent)});
 }));
 app.get("/api/admin/community/events",requireAuth,requireEventAdmin,asyncHandler(async(req,res)=>{
   res.set("Cache-Control","private, no-store");
   return ok(res,req.requestId,{events:catalog.list()});
 }));
 app.post("/api/admin/community/events",requireAuth,requireEventAdmin,write,asyncHandler(async(req,res)=>
   ok(res,req.requestId,{event:catalog.create(req.body||{},req.auth.userId)},201)));
 app.patch("/api/admin/community/events/:eventId",requireAuth,requireEventAdmin,write,asyncHandler(async(req,res)=>
   ok(res,req.requestId,{event:catalog.update(req.params.eventId,req.body||{},req.auth.userId)})));
}
module.exports={installCommunityEventCatalogRoutes,requireEventAdmin};
