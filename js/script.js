(function (window, document) {
  'use strict';

  var dialog = document.getElementById('preloader');
  var introScene = document.getElementById('intro-scene');
  var editPhoto = document.getElementById('edit-photo');
  var heroVideo = document.getElementById('hero-video');
  var soundToggle = document.getElementById('sound-toggle');
  var effects = new window.ScrollEffects();
  var gate;
  var lenis = null;
  var entered = false;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function finishIntro(event) {
    if (event && (event.target !== introScene || event.animationName !== 'intro-scene-exit')) { return; }
    if (!introScene) { return; }
    introScene.remove();
    dialog.classList.remove('is-intro');
    if (heroVideo) { playHeroVideo(); }
  }

  function sizeHeroVideo() {
    var header = document.querySelector('.site-header');
    var hero = document.getElementById('inicio');
    if (header && hero) { hero.style.setProperty('--header-height', header.offsetHeight + 'px'); }
  }

  function moveHeroVideo(toGate) {
    var hero = document.getElementById('inicio');
    var target = toGate ? dialog : hero;
    if (!heroVideo || !target) { return; }
    target.appendChild(heroVideo);
    heroVideo.classList.toggle('gate-video', toGate);
    heroVideo.classList.toggle('hero-video', !toGate);
  }

  function moveSoundToggle(toGate) {
    var target = toGate ? dialog : document.querySelector('.site-header');
    if (soundToggle && target) { target.appendChild(soundToggle); }
  }

  function playHeroVideo(userInitiated) {
    var soundEnabled = soundToggle.getAttribute('aria-pressed') === 'true';
    var playRequest;
    if (!heroVideo.paused) {
      heroVideo.muted = !soundEnabled;
      return;
    }
    heroVideo.muted = soundEnabled && !userInitiated;
    playRequest = heroVideo.play();
    if (playRequest && typeof playRequest.then === 'function') {
      playRequest.then(function () {
        if (soundEnabled && soundToggle.getAttribute('aria-pressed') === 'true') { heroVideo.muted = false; }
      }).catch(function (error) {
        if (!document.hidden && error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
          console.error('No se pudo reproducir el video de inicio.', error);
        }
      });
    } else if (soundEnabled) {
      heroVideo.muted = false;
    }
  }

  if (heroVideo && soundToggle) {
    heroVideo.volume = 1;
    heroVideo.muted = true;
    heroVideo.addEventListener('pause', function () {
      if (!document.hidden) {
        window.requestAnimationFrame(function () { playHeroVideo(); });
      }
    });
    heroVideo.addEventListener('error', function () {
      if (heroVideo.error) { console.error('No se pudo cargar el video de inicio.', heroVideo.error); }
    });
    heroVideo.addEventListener('contextmenu', function (event) { event.preventDefault(); });
    soundToggle.addEventListener('click', function () {
      var soundEnabled = soundToggle.getAttribute('aria-pressed') !== 'true';
      heroVideo.muted = !soundEnabled;
      soundToggle.setAttribute('aria-pressed', String(soundEnabled));
      soundToggle.setAttribute('aria-label', soundEnabled ? 'Desactivar sonido' : 'Activar sonido');
      if (soundEnabled && heroVideo.paused) { playHeroVideo(true); }
    });
  }

  function resumeHeroVideo(event) {
    if (!heroVideo || heroVideo.muted || !heroVideo.paused) { return; }
    if (soundToggle && event.target.closest && event.target.closest('#sound-toggle')) { return; }
    playHeroVideo(true);
  }
  document.addEventListener('pointerdown', resumeHeroVideo);
  document.addEventListener('keydown', resumeHeroVideo);

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
    if (heroVideo) {
      moveHeroVideo(true);
      playHeroVideo();
    }
    if (soundToggle) { moveSoundToggle(true); }
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && entered && heroVideo) { playHeroVideo(); }
  });
  document.addEventListener('gate:close', function () {
    if (lenis) { lenis.start(); lenis.resize(); }
    if (heroVideo) {
      moveHeroVideo(false);
      playHeroVideo();
    }
    if (soundToggle) { moveSoundToggle(false); }
    if (entered) { effects.start(); }
  });
  document.addEventListener('profile:ready', function (event) {
    var closing = document.getElementById('closing-photo');
    document.getElementById('profile-photo').src = event.detail.url;
    closing.src = event.detail.url;
    closing.hidden = false;
    editPhoto.hidden = false;
    document.querySelector('.site-header').classList.add('has-profile');
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
  sizeHeroVideo();
  window.addEventListener('resize', sizeHeroVideo);
  window.addEventListener('load', sizeHeroVideo);
  setupScroll();

  if (typeof dialog.showModal === 'function') {
    gate = new window.PhotoGate(dialog);
    editPhoto.addEventListener('click', function () { gate.open(); });
    if (introScene) {
      dialog.classList.add('is-intro');
      introScene.addEventListener('animationend', finishIntro);
      gate.open();
      window.setTimeout(finishIntro, 3200);
    } else {
      gate.open();
    }
  } else {
    /* Preserve access to the static document in unsupported browsers. */
    entered = true;
    if (lenis) { lenis.start(); }
    effects.start();
    if (heroVideo) {
      moveHeroVideo(false);
      playHeroVideo();
    }
    if (soundToggle) { moveSoundToggle(false); }
  }

  function frame(time) {
    if (lenis) { lenis.raf(time); }
    effects.update();
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
}(window, document));
