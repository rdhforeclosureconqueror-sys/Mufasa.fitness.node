const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/workout-presentation-state.js'), 'utf8');

function fixture({ profile = null, runtime = null } = {}) {
  const elements = new Map();
  const listeners = new Map();
  const window = {
    document: { getElementById(id) { return elements.get(id) || null; } },
    __avatarRuntimeStatus: runtime,
    addEventListener(name, listener) {
      const group = listeners.get(name) || [];
      group.push(listener);
      listeners.set(name, group);
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) || []) listener(event);
    }
  };
  const modes = [];
  const labels = [];
  vm.runInNewContext(source, { window });
  window.WorkoutPresentationState.configure({
    getProfile: () => profile,
    getAvatarRuntimeState: () => window.__avatarRuntimeStatus,
    getRenderMode: () => modes.at(-1) || 'camera',
    applyRenderMode(mode) { modes.push(mode); return mode; },
    setAvatarLabel(label) { labels.push(label); }
  });
  return { window, modes, labels, setProfile(next) { profile = next; } };
}

const savedProfile = { avatar: { avatarModelUrl: '/api/me/avatar/assets/member-glb' } };

test('canonical saved avatar drives label and active presentation promotes camera', () => {
  const f = fixture({ profile: savedProfile });
  assert.equal(f.labels.at(-1), 'Avatar saved.');
  f.window.WorkoutPresentationState.consumePresentation({ savedAvatarState: 'active', presentationMode: 'avatar_overlay' });
  assert.equal(f.modes.at(-1), 'avatar_overlay');
  assert.equal(f.window.WorkoutPresentationState.getState().visibleAvatarLabelState, 'saved');
});

test('profile without avatar stays on camera and reports no saved avatar', () => {
  const f = fixture({ profile: {} });
  assert.equal(f.modes.at(-1), 'camera');
  assert.equal(f.labels.at(-1), 'No avatar saved.');
});

test('profile reload and backend sync reach terminal visible lifecycle states', () => {
  const f = fixture();
  f.window.WorkoutPresentationState.setCanonicalProfile(savedProfile, 'ready');
  f.window.WorkoutPresentationState.setSyncState('synced');
  const state = f.window.WorkoutPresentationState.getState();
  assert.equal(state.profilePanelState, 'ready');
  assert.equal(state.syncState, 'synced');
});

test('listener-before-event and already-active-before-listener converge', () => {
  const before = fixture({ profile: savedProfile });
  before.window.dispatchEvent({ type: 'avatar-runtime:presentation-state', detail: { savedAvatarState: 'active', presentationMode: 'avatar_overlay' } });
  const after = fixture({
    profile: savedProfile,
    runtime: { savedAvatarState: 'active', presentationMode: 'avatar_overlay' }
  });
  assert.equal(
    JSON.stringify(before.window.WorkoutPresentationState.getState()),
    JSON.stringify(after.window.WorkoutPresentationState.getState())
  );
});

test('refresh restores saved active avatar and later initializer cannot overwrite it', () => {
  const f = fixture({
    profile: savedProfile,
    runtime: { savedAvatarState: 'active', presentationMode: 'avatar_overlay' }
  });
  f.window.WorkoutPresentationState.configure({});
  const state = f.window.WorkoutPresentationState.getState();
  assert.equal(state.visibleAvatarLabelState, 'saved');
  assert.equal(state.appliedRenderMode, 'avatar_overlay');
  assert.equal(state.profilePanelState, 'ready');
  assert.notEqual(f.labels.at(-1), 'No avatar saved.');
});
