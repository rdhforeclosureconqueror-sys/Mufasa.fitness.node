"use strict";

const { createApp } = require("./server");
const { createWorldBridge } = require("./src/world/worldBridge");

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
  return app;
}

if (require.main === module) {
  const app = createWorldBridgeApp();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`✅ mufasa-fitness-node + PocketPTWorldProtocol v1 listening on :${PORT}`));
}

module.exports = { createWorldBridgeApp };
