"use strict";

const http = require("node:http");
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
const { createArenaCoachVoiceBridge } = require("./src/world/arenaCoachVoiceBridge");
const { createLobbyBridge } = require("./src/world/lobbyBridge");
const { createGymMappingBridge } = require("./src/world/gymMappingBridge");
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

function installGymMapping(app, options = {}) {
  const userStore = createCanonicalUserStore(options);
  const gymMappingBridge = createGymMappingBridge({ userStore, now: options.gymMappingNow });
  gymMappingBridge.registerMemberRoutes(app, requireAuth);
  app.use((err, req, res, next) => {
    if (!String(req.path || "").startsWith("/api/me/gym-mapping-profile")) return next(err);
    if (res.headersSent) return next(err);
    const status = Number.isInteger(err?.status) ? err.status : 400;
    return res.status(status).json({ ok:false, requestId:req.requestId||null, error:{ code:err?.code||"GYM_MAPPING_REQUEST_FAILED", message:err?.message||"Gym mapping profile request failed" } });
  });
  app.locals.pocketPTGymMapping = { userStore, gymMappingBridge };
  return gymMappingBridge;
}

function createWorldBridgeApp(options = {}) {
  const app = createApp(options);
  installDeploymentIdentity(app, options);
  installFreeRunClub(app, options);
  installPrivateCoaching(app, options);
  installClientTransformation(app, options);
  installPrivateClientGettingStarted(app, options);
  const gymMappingBridge = installGymMapping(app, options);

  const bridge = createWorldBridge({ rootDir:options.rootDir||process.cwd(), now:options.worldBridgeNow, ttlMs:options.worldBridgeTtlMs, secureCookie:options.worldBridgeSecureCookie, backendPublicUrl:options.backendPublicUrl, avatarAssets:app.locals.pocketPTAvatarAssets, gymMappingBridge });
  bridge.register(app);
  app.locals.pocketPTWorldBridge = bridge;

  const arenaCoachVoiceBridge = createArenaCoachVoiceBridge({ worldBridge:bridge, env:options.env||process.env, fetchImpl:options.fetch, now:options.worldBridgeNow });
  arenaCoachVoiceBridge.register(app);
  app.locals.pocketPTArenaCoachVoiceBridge = arenaCoachVoiceBridge;

  const backendPublicUrl = String(options.backendPublicUrl || process.env.BACKEND_PUBLIC_URL || "").replace(/\/$/, "");
  const frontendPublicUrl = String(options.frontendPublicUrl || process.env.FRONTEND_PUBLIC_URL || "").replace(/\/$/, "");
  const lobbyBridge = createLobbyBridge({
    worldBridge: bridge,
    avatarAssets: app.locals.pocketPTAvatarAssets,
    publicOrigins: [backendPublicUrl, frontendPublicUrl].filter(Boolean),
    now: options.lobbyNow,
    heartbeatMs: options.lobbyHeartbeatMs
  });
  lobbyBridge.registerHttp(app);
  app.locals.pocketPTLobbyBridge = lobbyBridge;

  const membershipTierBridge = createMembershipTierBridge({ rootDir:options.rootDir||process.cwd(), dataDir:options.dataDir, env:options.env||process.env, stripeClient:options.stripeClient });
  membershipTierBridge.register(app);
  app.locals.pocketPTMembershipTierBridge = membershipTierBridge;
  return app;
}

function createWorldBridgeHttpServer(options = {}) {
  const app = createWorldBridgeApp(options);
  const server = http.createServer(app);
  app.locals.pocketPTLobbyBridge.attach(server);
  return { app, server, lobbyBridge: app.locals.pocketPTLobbyBridge };
}

if (require.main === module) {
  const { server } = createWorldBridgeHttpServer();
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`✅ mufasa-fitness-node + PocketPTWorldProtocol v1 + Living Lobby + membership tiers + Free Run Club + Private Coaching + Transformation Profile + Getting Started + Gym Mapping listening on :${PORT}`));
}

module.exports = { createWorldBridgeApp, createWorldBridgeHttpServer, installDeploymentIdentity, installFreeRunClub, installPrivateCoaching, installClientTransformation, installPrivateClientGettingStarted, installGymMapping };
