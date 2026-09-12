(function installPushUpReleaseWorldBridge(global) {
  'use strict';

  const bridge = global.PocketPTWorldLaunch;
  if (!bridge?.createArenaSession || bridge.__mileleFitReleaseWrapped) return;

  const originalCreateArenaSession = bridge.createArenaSession.bind(bridge);

  async function createArenaSession(...args) {
    const session = await originalCreateArenaSession(...args);
    if (!session?.launchUrl) return session;
    const launch = new URL(session.launchUrl, global.location.href);
    launch.searchParams.set('entry', 'release');
    return { ...session, launchUrl: launch.href };
  }

  global.PocketPTWorldLaunch = {
    ...bridge,
    createArenaSession,
    __mileleFitReleaseWrapped: true
  };
})(window);
