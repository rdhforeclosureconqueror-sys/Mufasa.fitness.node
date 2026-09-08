(function initMotionLabAuthoringAdapter(root) {
  'use strict';

  const base = root.PocketPTMotionLabIntelligenceAdapter;
  if (!base?.solvePhaseContacts) return;

  function solveAuthoringChain(options = {}) {
    const THREE = options.THREE;
    const avatar = options.avatar;
    const chain = options.chain;
    const bodyScale = Number(options.bodyScale);
    if (!THREE || !avatar || !chain?.endNode || !chain?.anchor) {
      return Object.freeze({ status: 'failed', code: 'authoring_chain_invalid' });
    }

    // Authoring moves should solve the selected limb toward the requested endpoint
    // without translating the avatar root. Give the shared solver an isolated root
    // correction target so contact/IK validation remains shared while pelvis/root
    // authority stays untouched by the editor.
    const isolatedRoot = {
      position: new THREE.Vector3(),
      parent: null,
      getWorldPosition(target) { return target.set(0, 0, 0); }
    };
    const current = chain.contactNode.getWorldPosition(new THREE.Vector3());
    const out = base.solvePhaseContacts({
      THREE,
      avatar,
      rootNode: isolatedRoot,
      bodyScale,
      contacts: [Object.freeze({
        id: chain.contactId || chain.id,
        node: chain.contactNode,
        current,
        anchor: chain.anchor.clone()
      })],
      chains: [chain]
    });
    if (out?.status !== 'ready') return out;
    return Object.freeze({
      status: 'ready',
      diagnostics: Object.freeze({
        ...(out.diagnostics || {}),
        authoringRootTranslationSuppressed: true
      })
    });
  }

  root.PocketPTMotionLabIntelligenceAdapter = Object.freeze({
    ...base,
    solveAuthoringChain,
    AUTHORING_VERSION: '1.0.0-pose-editor-adapter'
  });
})(window);
