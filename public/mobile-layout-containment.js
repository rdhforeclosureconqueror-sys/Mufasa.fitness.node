(function installMobileLayoutContainmentProof(global) {
  'use strict';

  const stages = [];
  const px = (value) => Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
  const widthOf = (element) => element?.getBoundingClientRect ? px(element.getBoundingClientRect().width) : 'missing';
  const visible = (element) => {
    if (!element?.getBoundingClientRect) return false;
    const style = global.getComputedStyle?.(element);
    const rect = element.getBoundingClientRect();
    return style?.display !== 'none' && style?.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };

  function measure(label) {
    const document = global.document;
    const root = document?.documentElement;
    const body = document?.body;
    const viewportWidth = global.innerWidth || root?.clientWidth || 0;
    if (!root || !body || !viewportWidth) return;

    const offenders = Array.from(body.querySelectorAll('*')).filter(visible).map((element) => {
      const rect = element.getBoundingClientRect();
      return { element, rect, overflow: Math.max(0, rect.right - viewportWidth, -rect.left) };
    }).filter(({ rect }) => rect.left < -1 || rect.right > viewportWidth + 1);

    const lines = [
      `Measurement: ${label}`,
      `Viewport inner width: ${global.innerWidth}`,
      `Viewport inner height: ${global.innerHeight}`,
      `Document client width: ${root.clientWidth}`,
      `Document scroll width: ${root.scrollWidth}`,
      `Body scroll width: ${body.scrollWidth}`,
      `Horizontal overflow present: ${root.scrollWidth > viewportWidth + 1 || body.scrollWidth > viewportWidth + 1 ? 'YES' : 'NO'}`,
      '',
      `Workout root width: ${widthOf(document.getElementById('appShell'))}`,
      `Camera viewport/card width: ${widthOf(document.getElementById('workoutPresentation'))}`,
      `Production video width: ${widthOf(document.getElementById('video'))}`,
      `Pose Tracking Proof container width: ${widthOf(document.getElementById('poseTrackingProof'))}`,
      `Pose Bootstrap Trace container width: ${widthOf(document.getElementById('poseBootstrapTrace'))}`,
      `Any PRE/CODE diagnostics width: ${px(Math.max(0, ...Array.from(document.querySelectorAll('pre, code')).filter(visible).map((element) => element.getBoundingClientRect().width)))}`,
      `Any control-row width: ${px(Math.max(0, ...Array.from(document.querySelectorAll('.btn-row, .mobile-row, .hud-actions')).filter(visible).map((element) => element.getBoundingClientRect().width)))}`,
      '',
      `Overflow offender count: ${offenders.length}`
    ];
    offenders.forEach(({ element, rect, overflow }, index) => lines.push(
      '', `Offender ${index + 1}:`, `element: ${element.tagName}`, `id: ${element.id || '(none)'}`,
      `class: ${typeof element.className === 'string' ? element.className : '(none)'}`,
      `left: ${px(rect.left)}`, `right: ${px(rect.right)}`, `width: ${px(rect.width)}`,
      `viewport width: ${viewportWidth}`, `overflow amount: ${px(overflow)}px`
    ));
    stages.push(lines.join('\n'));
    if (stages.length > 4) stages.shift();
    const output = document.getElementById('mobileLayoutContainmentProofValues');
    if (output) output.textContent = stages.join('\n\n================================\n\n');
  }

  function cameraReadyMeasurements() {
    global.requestAnimationFrame?.(() => measure('immediately after camera ready'));
    global.setTimeout(() => measure('250 ms after camera ready'), 250);
    global.setTimeout(() => measure('1 second after camera ready'), 1000);
  }

  function bind() {
    measure('before Connect Camera');
    const video = global.document.getElementById('video');
    video?.addEventListener('playing', cameraReadyMeasurements);
  }
  if (global.document?.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})(window);
