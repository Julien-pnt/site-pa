/* =============================================================================
 *  Disclaimer LSPD — briefing affiché à chaque connexion.
 *  - Floute l'arrière-plan tant qu'il n'est pas validé.
 *  - Case 1 : débloque le bouton « Valider » -> ferme la pop-up.
 *  - Case 2 (Ignacio) : IMPOSSIBLE à cocher, par quelque moyen que ce soit.
 *  Pas de localStorage : la pop-up réapparaît à chaque chargement de page.
 * ========================================================================== */
(function () {
  'use strict';

  var overlay  = document.getElementById('disclaimer');
  if (!overlay) return;
  var agree    = document.getElementById('discAgree');
  var validate = document.getElementById('discValidate');
  var ignacio  = document.getElementById('discIgnacio');
  var ignLabel = document.getElementById('discIgnacioLabel');

  // Verrou de scroll tant que le briefing est affiché.
  document.body.classList.add('disc-lock');

  /* ---- Case 1 : active le bouton « Valider » -------------------------------- */
  function sync() { validate.disabled = !agree.checked; }
  agree.addEventListener('change', sync);
  sync();

  /* ---- « Valider » : ferme la pop-up et retire le flou --------------------- */
  function dismiss() {
    if (!agree.checked) return;
    overlay.classList.add('dismissed');
    document.body.classList.remove('disc-lock');
    if (rafId) cancelAnimationFrame(rafId);
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 400);
  }
  validate.addEventListener('click', dismiss);

  /* ---- Case 2 « Ignacio » : impossible à cocher, peu importe le moyen ------ */
  // 1) Annule la bascule sur tout clic / activation clavier (souris, label, Espace).
  function block(e) { e.preventDefault(); nope(); }
  ignacio.addEventListener('click', block);
  ignLabel.addEventListener('click', block);

  // 2) Rend la propriété .checked impossible à forcer depuis un script / la console.
  try {
    Object.defineProperty(ignacio, 'checked', {
      get: function () { return false; },
      set: function () {},
      configurable: false
    });
  } catch (e) { /* certains navigateurs refusent : la suite couvre le cas */ }

  // 3) Ceinture + bretelles : force l'état « décoché » à chaque frame via le
  //    setter natif (neutralise dispatchEvent, .click() programmatique, etc.).
  var nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked').set;
  var rafId;
  (function enforce() {
    try { nativeSet.call(ignacio, false); } catch (e) {}
    rafId = requestAnimationFrame(enforce);
  })();

  // 4) Nettoie tout attribut "checked" injecté via les DevTools.
  if (window.MutationObserver) {
    new MutationObserver(function () { ignacio.removeAttribute('checked'); })
      .observe(ignacio, { attributes: true, attributeFilter: ['checked'] });
  }

  // Petit feedback : la case tremble quand on essaie de la cocher.
  var nopeT;
  function nope() {
    ignLabel.classList.remove('nope');
    void ignLabel.offsetWidth;            // relance l'animation
    ignLabel.classList.add('nope');
    clearTimeout(nopeT);
    nopeT = setTimeout(function () { ignLabel.classList.remove('nope'); }, 450);
  }

  /* ---- Focus piégé dans le briefing (impossible de l'ignorer) -------------- */
  agree.focus();
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); return; }   // pas d'échappatoire
    if (e.key !== 'Tab') return;
    var focusables = [agree];
    if (!validate.disabled) focusables.push(validate);
    var first = focusables[0];
    var last  = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
