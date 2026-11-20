(function () {
  'use strict';
  const host = document.getElementById('quins-structure-lesson');
  if (!host) return;
  const stage = document.createElement('div');
  stage.className = 'card';
  stage.setAttribute('aria-label', 'Structure and Chaos lesson');
  stage.innerHTML = "<h3>01 · Read the picture</h3><p class=\"muted\">Tap a mindset to see how the attacking picture changes.</p><svg class=\"quins-field\" viewBox=\"0 0 360 205\" role=\"img\" aria-label=\"Simplified training field: three attackers, two defenders, and an attacking passing option\" xmlns=\"http://www.w3.org/2000/svg\"><defs><pattern id=\"quins-grass\" width=\"36\" height=\"36\" patternUnits=\"userSpaceOnUse\"><path d=\"M36 0H0V36\" fill=\"none\" stroke=\"#39634b\" stroke-width=\".5\"/></pattern></defs><rect width=\"360\" height=\"205\" rx=\"12\" fill=\"url(#quins-grass)\"/><path d=\"M15 20H345M15 185H345M90 20V185M270 20V185\" fill=\"none\" stroke=\"#87b594\" stroke-opacity=\".65\" stroke-dasharray=\"4 6\"/><g fill=\"#dfc480\" stroke=\"#14241b\" stroke-width=\"2\"><circle cx=\"70\" cy=\"105\" r=\"15\"/><circle cx=\"135\" cy=\"70\" r=\"15\"/><circle cx=\"135\" cy=\"140\" r=\"15\"/></g><g fill=\"#f3f6f2\" font-family=\"sans-serif\" font-size=\"12\" text-anchor=\"middle\" font-weight=\"bold\"><text x=\"70\" y=\"109\" fill=\"#173024\">9</text><text x=\"135\" y=\"74\" fill=\"#173024\">10</text><text x=\"135\" y=\"144\" fill=\"#173024\">12</text></g><g fill=\"#c45b58\" stroke=\"#fff\" stroke-width=\"1.5\"><circle cx=\"232\" cy=\"75\" r=\"13\"/><circle id=\"quins-defender\" cx=\"232\" cy=\"137\" r=\"13\"/></g><path id=\"quins-route\" d=\"M88 105 L122 76 L200 75\" stroke=\"#f6e4a8\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-dasharray=\"7 7\" fill=\"none\"/><path id=\"quins-option\" d=\"M144 140 L203 160\" stroke=\"#f6e4a8\" stroke-width=\"3\" stroke-dasharray=\"5 7\" fill=\"none\" opacity=\".3\"/><text x=\"18\" y=\"195\" fill=\"#e6f0e8\" font-family=\"sans-serif\" font-size=\"11\">ATTACK →</text><text x=\"277\" y=\"195\" fill=\"#e6f0e8\" font-family=\"sans-serif\" font-size=\"11\">DEFENSE</text></svg><div class=\"quins-scene-controls\"><button type=\"button\" id=\"quins-structure\">STRUCTURE</button><button type=\"button\" id=\"quins-chaos\">CHAOS</button></div><p class=\"quins-scene-note\" id=\"quins-lesson-feedback\" role=\"status\" aria-live=\"polite\">Choose a mindset to explore the decision.</p><fieldset><legend>Rugby IQ · A defender unexpectedly shoots up. What should you do?</legend><label><input type=\"radio\" name=\"quins-iq\" value=\"a\"> Ignore the defender and run the original line regardless</label><label><input type=\"radio\" name=\"quins-iq\" value=\"b\"> Scan, communicate, and select an option consistent with the attacking principles</label><button type=\"button\" id=\"quins-iq-check\">Check answer</button></fieldset><p id=\"quins-iq-feedback\" role=\"status\" aria-live=\"polite\"></p>";
  host.appendChild(stage);
  const output = document.getElementById('quins-lesson-feedback');
  document.getElementById('quins-structure').addEventListener('click', function () {
    document.getElementById('quins-route').setAttribute('d','M88 105 L122 76 L200 75');
    document.getElementById('quins-option').setAttribute('opacity','.3');
    document.getElementById('quins-defender').setAttribute('cy','137');
    output.textContent = 'STRUCTURE: apply pressure through precision. Rehearse roles, positioning, timing, communication, and execution until the shape is instinctive.';
  });
  document.getElementById('quins-chaos').addEventListener('click', function () {
    document.getElementById('quins-route').setAttribute('d','M88 105 L122 76');
    document.getElementById('quins-option').setAttribute('opacity','1');
    document.getElementById('quins-defender').setAttribute('cy','100');
    output.textContent = 'CHAOS: apply pressure at pace. Scan changing pictures, adapt, communicate, solve problems, and learn from mistakes.';
  });
  document.getElementById('quins-iq-check').addEventListener('click', function () {
    const selected = stage.querySelector('input[name="quins-iq"]:checked');
    document.getElementById('quins-iq-feedback').textContent = !selected ? 'Choose an answer first.' : selected.value === 'b' ? 'Correct. Read the picture and adapt with purpose. Structure protects the player; chaos develops the player.' : 'Try again. Structure is a foundation, not a reason to ignore a changing defensive picture.';
  });
})();
