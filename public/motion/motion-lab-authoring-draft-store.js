(function initMotionLabAuthoringDraftStore(root, document) {
  'use strict';

  const VERSION = '1.0.0-authoring-draft-store';
  const PREFIX = 'pocketpt.motionLab.authoringDraft.v1:';
  let lastSnapshot = Object.freeze({ status: 'idle', motionId: null, savedAt: null, firstFailingBoundary: null });

  function publish(patch) { lastSnapshot = Object.freeze({ ...lastSnapshot, ...patch }); }
  function el(id) { return document.getElementById(id); }
  function status(message, kind = 'ready') {
    const node = el('poseEditorSaveStatus');
    if (node) { node.textContent = message; node.dataset.status = kind; }
  }
  function editor() { return root.PocketPTMotionLabPoseEditor; }
  function session() { return editor()?.getActiveSession?.() || null; }
  function motionId() { return session()?.motionSpec?.motionId || editor()?.exportAdjustment?.()?.motionId || null; }
  function key(id) { return `${PREFIX}${encodeURIComponent(String(id || ''))}`; }

  function readRecord(id) {
    if (!id) return null;
    try {
      const raw = root.localStorage?.getItem?.(key(id));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.schemaVersion !== 1 || parsed?.motionId !== id || !parsed?.clip) return null;
      return parsed;
    } catch (_) { return null; }
  }

  function updateButtons() {
    const id = motionId();
    const hasSaved = Boolean(readRecord(id));
    const save = el('poseEditorSaveDraft');
    const load = el('poseEditorLoadDraft');
    const remove = el('poseEditorDeleteDraft');
    if (save) save.disabled = !id;
    if (load) load.disabled = !id || !hasSaved;
    if (remove) remove.disabled = !id || !hasSaved;
    const label = el('poseEditorSavedDraftState');
    if (label) label.textContent = hasSaved ? 'SAVED' : 'NONE';
  }

  function serializeClip(THREE, clip) {
    if (clip?.toJSON) return clip.toJSON();
    if (THREE?.AnimationClip?.toJSON) return THREE.AnimationClip.toJSON(clip);
    return null;
  }

  function saveDraft() {
    const api = editor();
    const active = session();
    const id = motionId();
    if (!api || !active || !id) {
      status('Load a generated motion before saving.', 'failed');
      publish({ status: 'failed', firstFailingBoundary: 'active_motion_available' });
      return { status: 'failed', code: 'active_motion_required' };
    }
    const adjustment = api.exportAdjustment?.();
    if (!Array.isArray(adjustment?.edits) || adjustment.edits.length === 0) {
      status('Make at least one pose adjustment before saving.', 'failed');
      publish({ status: 'failed', motionId: id, firstFailingBoundary: 'authoring_edits_available' });
      return { status: 'failed', code: 'authoring_edits_required' };
    }
    const built = api.playAdjustedPreview?.();
    if (built?.status !== 'ready') {
      status(`Could not build the adjusted motion (${built?.code || 'preview_failed'}).`, 'failed');
      publish({ status: 'failed', motionId: id, firstFailingBoundary: 'adjusted_preview_build' });
      return built || { status: 'failed', code: 'preview_failed' };
    }
    active.pause?.();
    const clipJson = serializeClip(active.THREE, active.sessionClip);
    if (!clipJson) {
      status('Adjusted clip could not be serialized.', 'failed');
      publish({ status: 'failed', motionId: id, firstFailingBoundary: 'clip_serialization' });
      return { status: 'failed', code: 'clip_serialization_failed' };
    }
    const savedAt = new Date().toISOString();
    const record = Object.freeze({
      schemaVersion: 1,
      storeVersion: VERSION,
      motionId: id,
      exerciseId: adjustment.exerciseId || active.motionSpec?.exerciseId || null,
      savedAt,
      adjustment,
      clip: clipJson
    });
    try {
      root.localStorage?.setItem?.(key(id), JSON.stringify(record));
    } catch (error) {
      status('Browser storage rejected the authored motion.', 'failed');
      publish({ status: 'failed', motionId: id, firstFailingBoundary: 'browser_storage_write' });
      return { status: 'failed', code: 'browser_storage_write_failed', cause: String(error?.message || error) };
    }
    status(`Saved authored motion draft for ${id}.`);
    publish({ status: 'saved', motionId: id, savedAt, firstFailingBoundary: null });
    updateButtons();
    return { status: 'ready', motionId: id, savedAt };
  }

  function loadDraft() {
    const active = session();
    const id = motionId();
    const record = readRecord(id);
    if (!active || !id || !record) {
      status('No saved authored motion exists for the loaded motion.', 'failed');
      publish({ status: 'failed', motionId: id, firstFailingBoundary: 'saved_draft_available' });
      return { status: 'failed', code: 'saved_draft_missing' };
    }
    const THREE = active.THREE;
    if (!THREE?.AnimationClip?.parse || !active.motionSpec) {
      status('Motion runtime cannot restore the saved draft.', 'failed');
      publish({ status: 'failed', motionId: id, firstFailingBoundary: 'clip_parse_available' });
      return { status: 'failed', code: 'clip_parse_unavailable' };
    }
    let clip;
    try { clip = THREE.AnimationClip.parse(record.clip); }
    catch (error) {
      status('Saved authored motion is unreadable.', 'failed');
      publish({ status: 'failed', motionId: id, firstFailingBoundary: 'saved_clip_parse' });
      return { status: 'failed', code: 'saved_clip_parse_failed', cause: String(error?.message || error) };
    }
    clip.name = `${active.motionSpec.motionId} [SAVED AUTHORING DRAFT]`;
    const compiler = Object.freeze({
      compile() {
        return Object.freeze({
          status: 'ready',
          clip,
          diagnostics: Object.freeze({
            authoredDraft: true,
            authoredDraftSavedAt: record.savedAt,
            authoredDraftStoreVersion: record.storeVersion || null,
            authoredDraftEditCount: record.adjustment?.edits?.length || 0
          })
        });
      }
    });
    active.stop?.();
    const out = active.loadMotionSpec(active.motionSpec, compiler);
    if (out?.status !== 'ready') {
      status(`Saved draft could not be loaded (${out?.code || 'load_failed'}).`, 'failed');
      publish({ status: 'failed', motionId: id, firstFailingBoundary: 'saved_draft_load' });
      return out || { status: 'failed', code: 'saved_draft_load_failed' };
    }
    active.play?.();
    status(`Loaded saved authored motion from ${record.savedAt}. You can keep editing from this draft.`);
    publish({ status: 'loaded', motionId: id, savedAt: record.savedAt, firstFailingBoundary: null });
    updateButtons();
    return { status: 'ready', motionId: id, savedAt: record.savedAt };
  }

  function deleteDraft() {
    const id = motionId();
    if (!id) return { status: 'failed', code: 'active_motion_required' };
    try { root.localStorage?.removeItem?.(key(id)); }
    catch (_) {}
    status('Saved authored motion draft deleted. Canonical Motion Spec was not changed.');
    publish({ status: 'deleted', motionId: id, savedAt: null, firstFailingBoundary: null });
    updateButtons();
    return { status: 'ready', motionId: id };
  }

  function install() {
    const save = el('poseEditorSaveDraft');
    if (!save || !editor()?.getActiveSession) return null;
    if (save.dataset.authoringDraftStoreWired !== '1') {
      save.dataset.authoringDraftStoreWired = '1';
      save.addEventListener('click', saveDraft);
      el('poseEditorLoadDraft')?.addEventListener('click', loadDraft);
      el('poseEditorDeleteDraft')?.addEventListener('click', deleteDraft);
    }
    updateButtons();
    if (!root.__motionLabAuthoringDraftTimer) root.__motionLabAuthoringDraftTimer = root.setInterval?.(updateButtons, 1000);
    publish({ status: 'installed', firstFailingBoundary: null });
    return root.PocketPTMotionLabAuthoringDraftStore;
  }

  root.PocketPTMotionLabAuthoringDraftStore = Object.freeze({
    VERSION,
    install,
    saveDraft,
    loadDraft,
    deleteDraft,
    hasDraft: id => Boolean(readRecord(id)),
    readDraft: readRecord,
    snapshot: () => lastSnapshot
  });

  function autoInstall(attempt = 0) {
    if (install()) return;
    if (attempt < 80) root.setTimeout?.(() => autoInstall(attempt + 1), 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => autoInstall(), { once: true });
  else autoInstall();
})(window, document);
