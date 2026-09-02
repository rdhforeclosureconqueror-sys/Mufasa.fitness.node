"use strict";

const path = require("path");
const { createApp } = require("./server");
const { requireAuth } = require("./src/middleware/auth");
const { createUserStore } = require("./src/repositories/userStore");
const { createFreeRunClubCommunityService } = require("./src/services/freeRunClubCommunityService");
const { installFreeRunClubCommunityRoutes } = require("./src/routes/freeRunClubCommunityRoutes");
const { createPrivateCoachingQuoteService } = require("./src/services/privateCoachingQuoteService");
const { installPrivateCoachingQuoteRoutes } = require("./src/routes/privateCoachingQuoteRoutes");
const { createClientTransformationService } = require("./src/services/clientTransformationService");
const { installClientTransformationRoutes } = require("./src/routes/clientTransformationRoutes");
const { createPrivateClientGettingStartedService } = require("./src/services/privateClientGettingStartedService");
const { installPrivateClientGettingStartedRoutes } = require("./src/routes/privateClientGettingStartedRoutes");
const { createWorldBridge } = require("./src/world/worldBridge");
const { createMembershipTierBridge } = require("./src/billing/membershipTierBridge");

function createCanonicalUserStore(options = {}) {
  const env = options.env || process.env;
  const rootDir = options.rootDir || process.cwd();
  const dataDir = path.resolve(options.dataDir || env.POCKET_PT_DATA_DIR || path.join(rootDir, "data"));
  const userStore = createUserStore({ userDir: path.join(dataDir, "users") });
  userStore.ensureDirs();
  return userStore;
}

function installDeploymentIdentity(app, options = {}) {
  const env = options.env || process.env;
  app.get("/api/deployment/identity", (req, res) => {
    res.set("Cache-Control", "no-store");
    return res.status(200).json({ ok:true, data:{ service:"backend", commit:String(env.RENDER_GIT_COMMIT||env.GIT_COMMIT||"unknown"), runtime:"node", startCommand:"node world-bridge-server.js" } });
  });
}

function installFreeRunClub(app, options = {}) {
  const userStore = createCanonicalUserStore(options);
  const freeRunClubCommunityService = createFreeRunClubCommunityService({ userStore });
  const routes = installFreeRunClubCommunityRoutes({ app, requireAuth, userStore, freeRunClubCommunityService });
  app.use((err, req, res, next) => {
    if (!String(req.path || "").startsWith("/api/me/run-club/")) return next(err);
    if (res.headersSent) return next(err);
    const status = Number.isInteger(err?.status) ? err.status : 400;
    return res.status(status).json({ ok:false, requestId:req.requestId||null, error:{ code:err?.code||"RUN_CLUB_REQUEST_FAILED", message:err?.message||"Free Run Club request failed" } });
  });
  app.locals.pocketPTFreeRunClub = { userStore, freeRunClubCommunityService, routes };
  return app.locals.pocketPTFreeRunClub;
}

function installPrivateCoaching(app, options = {}) {
  const userStore = createCanonicalUserStore(options);
  const service = createPrivateCoachingQuoteService({ userStore });
  installPrivateCoachingQuoteRoutes({ app, requireAuth, service });
  app.use((err, req, res, next) => {
    if (!String(req.path || "").startsWith("/api/me/private-coaching/")) return next(err);
    if (res.headersSent) return next(err);
    const status = Number.isInteger(err?.status) ? err.status : 400;
    return res.status(status).json({ ok:false, requestId:req.requestId||null, error:{ code:err?.code||"PRIVATE_COACHING_REQUEST_FAILED", message:err?.message||"Private coaching request failed", ...(err?.details?{details:err.details}:{}) } });
  });
  app.locals.pocketPTPrivateCoaching = { userStore, service };
  return app.locals.pocketPTPrivateCoaching;
}

function installClientTransformation(app, options = {}) {
  const userStore = createCanonicalUserStore(options);
  const service = createClientTransformationService({ userStore });
  installClientTransformationRoutes({ app, requireAuth, service });
  app.use((err, req, res, next) => {
    if (!String(req.path || "").startsWith("/api/me/transformation-profile")) return next(err);
    if (res.headersSent) return next(err);
    const status = Number.isInteger(err?.status) ? err.status : 400;
    return res.status(status).json({ ok:false, requestId:req.requestId||null, error:{ code:err?.code||"TRANSFORMATION_PROFILE_REQUEST_FAILED", message:err?.message||"Transformation profile request failed" } });
  });
  app.locals.pocketPTClientTransformation = { userStore, service };
  return app.locals.pocketPTClientTransformation;
}

function installPrivateClientGettingStarted(app, options = {}) {
  const userStore = createCanonicalUserStore(options);
  const service = createPrivateClientGettingStartedService({ userStore });
  installPrivateClientGettingStartedRoutes({ app, requireAuth, service });
  app.locals.pocketPTPrivateClientGettingStarted = { userStore, service };
  return app.locals.pocketPTPrivateClientGettingStarted;
}

function createWorldBridgeApp(options = {}) {
  const app = createApp(options);
  installDeploymentIdentity(app, options);
  installFreeRunClub(app, options);
  installPrivateCoaching(app, options);
  installClientTransformation(app, options);
  installPrivateClientGettingStarted(app, options);

  const bridge = createWorldBridge({ rootDir:options.rootDir||process.cwd(), now:options.worldBridgeNow, ttlMs:options.worldBridgeTtlMs, secureCookie:options.worldBridgeSecureCookie, backendPublicUrl:options.backendPublicUrl });
  bridge.register(app);
  app.locals.pocketPTWorldBridge = bridge;

  const membershipTierBridge = createMembershipTierBridge({ rootDir:options.rootDir||process.cwd(), dataDir:options.dataDir, env:options.env||process.env, stripeClient:options.stripeClient });
  membershipTierBridge.register(app);
  app.locals.pocketPTMembershipTierBridge = membershipTierBridge;
  return app;
}

if (require.main === module) {
  const app = createWorldBridgeApp();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`✅ mufasa-fitness-node + PocketPTWorldProtocol v1 + membership tiers + Free Run Club + Private Coaching + Transformation Profile + Getting Started listening on :${PORT}`));
}

module.exports = { createWorldBridgeApp, installDeploymentIdentity, installFreeRunClub, installPrivateCoaching, installClientTransformation, installPrivateClientGettingStarted };
