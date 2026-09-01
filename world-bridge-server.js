"use strict";

const path = require("path");
const { createApp } = require("./server");
const { requireAuth } = require("./src/middleware/auth");
const { createUserStore } = require("./src/repositories/userStore");
const { createFreeRunClubCommunityService } = require("./src/services/freeRunClubCommunityService");
const { installFreeRunClubCommunityRoutes } = require("./src/routes/freeRunClubCommunityRoutes");
const { createWorldBridge } = require("./src/world/worldBridge");
const { createMembershipTierBridge } = require("./src/billing/membershipTierBridge");

function installFreeRunClub(app, options = {}) {
  const env = options.env || process.env;
  const rootDir = options.rootDir || process.cwd();
  const dataDir = path.resolve(options.dataDir || env.POCKET_PT_DATA_DIR || path.join(rootDir, "data"));
  const userStore = createUserStore({ userDir: path.join(dataDir, "users") });
  userStore.ensureDirs();
  const freeRunClubCommunityService = createFreeRunClubCommunityService({ userStore });
  const routes = installFreeRunClubCommunityRoutes({ app, requireAuth, userStore, freeRunClubCommunityService });
  app.locals.pocketPTFreeRunClub = { userStore, freeRunClubCommunityService, routes };
  return app.locals.pocketPTFreeRunClub;
}

function createWorldBridgeApp(options = {}) {
  const app = createApp(options);

  // Production entrypoint owns the final Free Run Club API hookup. The browser
  // surface and service already exist; these routes must be installed here or
  // the live page correctly reports profile_api -> HTTP 404 as first failure.
  installFreeRunClub(app, options);

  const bridge = createWorldBridge({
    rootDir: options.rootDir || process.cwd(),
    now: options.worldBridgeNow,
    ttlMs: options.worldBridgeTtlMs,
    secureCookie: options.worldBridgeSecureCookie,
    backendPublicUrl: options.backendPublicUrl
  });
  bridge.register(app);
  app.locals.pocketPTWorldBridge = bridge;

  const membershipTierBridge = createMembershipTierBridge({
    rootDir: options.rootDir || process.cwd(),
    dataDir: options.dataDir,
    env: options.env || process.env,
    stripeClient: options.stripeClient
  });
  membershipTierBridge.register(app);
  app.locals.pocketPTMembershipTierBridge = membershipTierBridge;

  return app;
}

if (require.main === module) {
  const app = createWorldBridgeApp();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`✅ mufasa-fitness-node + PocketPTWorldProtocol v1 + membership tiers + Free Run Club listening on :${PORT}`));
}

module.exports = { createWorldBridgeApp, installFreeRunClub };
