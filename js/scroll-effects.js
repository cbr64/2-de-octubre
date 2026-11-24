(function (window, document) {
  'use strict';

  function ScrollEffects() {
    this.tracks = document.querySelectorAll('[data-scroll-track]');
    this.sections = document.querySelectorAll('main > section');
    this.links = document.querySelectorAll('.navigation a');
    this.progress = document.getElementById('scroll-progress');
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.enabled = false;
    this.dirty = true;
    this.bind();
  }

  ScrollEffects.prototype.bind = function () {
    var self = this;
    var markDirty = function () { self.dirty = true; };
    window.addEventListener('scroll', markDirty, { passive: true });
    window.addEventListener('resize', markDirty);
    this.reduced.addEventListener('change', function () {
      self.configure();
      self.dirty = true;
    });
  };

  ScrollEffects.prototype.configure = function () {
    var supported = 'getAnimations' in document.documentElement;
    document.documentElement.classList.toggle('has-motion', this.enabled && !this.reduced.matches && supported);
  };

  ScrollEffects.prototype.start = function () {
    this.enabled = true;
    this.configure();
    this.dirty = true;
  };

  ScrollEffects.prototype.update = function () {
    var height;
    var scroll;
    var limit;
    var active;
    var rect;
    var target;
    var animations;
    var animation;
    var progress;
    var i;
    if (!this.enabled || !this.dirty) { return; }
    this.dirty = false;
    height = window.innerHeight;
    scroll = window.pageYOffset;
    limit = document.documentElement.scrollHeight - height;
    this.progress.value = limit > 0 ? Math.min(1, Math.max(0, scroll / limit)) : 0;
    active = this.sections[0].id;
    for (i = 0; i < this.sections.length; i += 1) {
      if (this.sections[i].getBoundingClientRect().top <= height * 0.4) { active = this.sections[i].id; }
    }
    for (i = 0; i < this.links.length; i += 1) {
      if (this.links[i].getAttribute('href') === '#' + active) { this.links[i].setAttribute('aria-current', 'location'); }
      else { this.links[i].removeAttribute('aria-current'); }
    }
    if (this.reduced.matches || !document.documentElement.classList.contains('has-motion')) { return; }
    for (i = 0; i < this.tracks.length; i += 1) {
      rect = this.tracks[i].getBoundingClientRect();
      target = this.tracks[i].querySelector('[data-motion]');
      if (!target || rect.top > height * 1.15 || rect.bottom < -height * 0.15) { continue; }
      if (target.getAttribute('data-motion') === 'reveal') {
        if (rect.top < height * 0.9) { target.classList.add('is-visible'); }
      } else {
        animations = target.getAnimations();
        animation = animations[0];
        if (animation) {
          progress = Math.min(1, Math.max(0, (height - rect.top) / (height + rect.height)));
          animation.currentTime = progress * animation.effect.getTiming().duration;
        }
      }
    }
  };

  window.ScrollEffects = ScrollEffects;
}(window, document));
