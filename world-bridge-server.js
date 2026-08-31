"use strict";

const { createApp } = require("./server");
const { createWorldBridge } = require("./src/world/worldBridge");
const { createMembershipTierBridge } = require("./src/billing/membershipTierBridge");

function createWorldBridgeApp(options = {}) {
  const app = createApp(options);
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
  app.listen(PORT, () => console.log(`✅ mufasa-fitness-node + PocketPTWorldProtocol v1 + membership tiers listening on :${PORT}`));
}

module.exports = { createWorldBridgeApp };
