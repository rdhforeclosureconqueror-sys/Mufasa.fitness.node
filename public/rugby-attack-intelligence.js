(function () {
  'use strict';
  const host = document.getElementById('attack-intelligence');
  if (!host) return;
  const stage = document.createElement('div');
  stage.className = 'card';
  stage.setAttribute('aria-label', 'Structure and Chaos lesson');
  stage.innerHTML = '<h3>Lesson 01 · Structure &amp; Chaos</h3><p class="muted">Choose a practice mindset. Both matter: structure builds repeatable execution; chaos develops decisions when the picture changes.</p><div class="grid"><button type="button" id="quins-structure">STRUCTURE</button><button type="button" id="quins-chaos">CHAOS</button></div><div id="quins-lesson-feedback" role="status" aria-live="polite"></div><fieldset><legend>Rugby IQ check: A defender unexpectedly shoots up. What should you do?</legend><label><input type="radio" name="quins-iq" value="a"> Ignore the defender and run the original line regardless</label><label><input type="radio" name="quins-iq" value="b"> Scan, communicate, and select an option consistent with the attacking principles</label><button type="button" id="quins-iq-check">Check answer</button></fieldset><p id="quins-iq-feedback" role="status" aria-live="polite"></p>';
  host.appendChild(stage);
  const output = document.getElementById('quins-lesson-feedback');
  document.getElementById('quins-structure').addEventListener('click', function () {
    output.textContent = 'STRUCTURE: apply pressure through precision. Rehearse roles, positioning, timing, communication, and execution until the shape is instinctive.';
  });
  document.getElementById('quins-chaos').addEventListener('click', function () {
    output.textContent = 'CHAOS: apply pressure at pace. Scan changing pictures, adapt, communicate, solve problems, and learn from mistakes.';
  });
  document.getElementById('quins-iq-check').addEventListener('click', function () {
    const selected = stage.querySelector('input[name="quins-iq"]:checked');
    document.getElementById('quins-iq-feedback').textContent = !selected ? 'Choose an answer first.' : selected.value === 'b' ? 'Correct. Read the picture and adapt with purpose. Structure protects the player; chaos develops the player.' : 'Try again. Structure is a foundation, not a reason to ignore a changing defensive picture.';
  });
})();
