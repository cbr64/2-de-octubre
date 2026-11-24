(function (window, document) {
  'use strict';

  var dialog = document.getElementById('preloader');
  var editPhoto = document.getElementById('edit-photo');
  var effects = new window.ScrollEffects();
  var gate;
  var lenis = null;
  var entered = false;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setupScroll() {
    if (lenis) { lenis.destroy(); lenis = null; }
    if (window.Lenis && !reduced.matches) {
      lenis = new window.Lenis({ autoRaf: false, anchors: false, duration: 1.15 });
      if (dialog.open) { lenis.stop(); }
    }
    effects.dirty = true;
  }

  document.addEventListener('gate:open', function () {
    if (lenis) { lenis.stop(); }
  });
  document.addEventListener('gate:close', function () {
    if (lenis) { lenis.start(); lenis.resize(); }
    if (entered) { effects.start(); }
  });
  document.addEventListener('profile:ready', function (event) {
    var closing = document.getElementById('closing-photo');
    document.getElementById('profile-photo').src = event.detail.url;
    closing.src = event.detail.url;
    closing.hidden = false;
    editPhoto.hidden = false;
    if (!entered) {
      entered = true;
      window.requestAnimationFrame(function () {
        window.scrollTo(0, 0);
        document.getElementById('inicio').focus({ preventScroll: true });
        effects.dirty = true;
      });
    }
  });
  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="#"]');
    var target;
    var focusTarget;
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) { return; }
    target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target || !entered) { return; }
    event.preventDefault();
    focusTarget = function () {
      if (!target.hasAttribute('tabindex')) { target.setAttribute('tabindex', '-1'); }
      target.focus({ preventScroll: true });
    };
    window.history.replaceState(null, '', '#' + target.id);
    if (lenis) {
      lenis.scrollTo(target, { offset: -document.querySelector('.site-header').offsetHeight, onComplete: focusTarget });
    } else {
      target.scrollIntoView({ behavior: 'instant' });
      focusTarget();
    }
  });

  reduced.addEventListener('change', setupScroll);
  setupScroll();

  if (typeof dialog.showModal === 'function') {
    gate = new window.PhotoGate(dialog);
    editPhoto.addEventListener('click', function () { gate.open(); });
    gate.open();
  } else {
    /* Preserve access to the static document in unsupported browsers. */
    entered = true;
    if (lenis) { lenis.start(); }
    effects.start();
  }

  function frame(time) {
    if (lenis) { lenis.raf(time); }
    effects.update();
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
}(window, document));
