/* ES5 application code. Camera/image APIs require a modern browser. */
(function (window, document) {
  'use strict';

  function PhotoGate(dialog) {
    this.dialog = dialog;
    this.form = document.getElementById('photo-form');
    this.input = document.getElementById('photo-input');
    this.nameInput = document.getElementById('credential-name');
    this.birthInput = document.getElementById('credential-birth');
    this.preview = document.getElementById('photo-preview');
    this.placeholder = document.getElementById('portrait-placeholder');
    this.video = document.getElementById('camera-preview');
    this.cameraButton = document.getElementById('camera-button');
    this.captureButton = document.getElementById('capture-button');
    this.stopButton = document.getElementById('stop-camera-button');
    this.enterButton = document.getElementById('enter-button');
    this.skipButton = document.getElementById('skip-profile-button');
    this.cancelButton = document.getElementById('cancel-button');
    this.status = document.getElementById('photo-status');
    this.fallbackPhoto = 'img/sinfoto.png';
    this.currentPhoto = null;
    this.pendingPhoto = null;
    this.stream = null;
    this.request = 0;
    this.busy = false;
    this.entered = false;
    this.bind();
  }

  PhotoGate.prototype.message = function (message, error) {
    this.status.textContent = message;
    this.status.classList.toggle('is-error', Boolean(error));
  };

  PhotoGate.prototype.updateEnterButton = function () {
    this.enterButton.disabled = this.busy || !(this.currentPhoto || this.pendingPhoto) || !this.form.checkValidity();
  };

  PhotoGate.prototype.fitName = function () {
    var value = this.nameInput.value.replace(/[\r\n]+/g, ' ');
    var fontSize;
    var contentHeight;
    var verticalPadding;
    this.nameInput.value = value;
    this.nameInput.style.fontSize = '';
    this.nameInput.style.height = '';
    this.nameInput.style.paddingTop = '0';
    this.nameInput.style.paddingBottom = '0';
    fontSize = parseFloat(window.getComputedStyle(this.nameInput).fontSize);
    while (this.nameInput.scrollHeight > this.nameInput.clientHeight + 1 && fontSize > 1) {
      fontSize = Math.max(1, fontSize - 0.5);
      this.nameInput.style.fontSize = fontSize + 'px';
    }
    this.nameInput.style.height = '0px';
    contentHeight = this.nameInput.scrollHeight;
    this.nameInput.style.height = '';
    verticalPadding = Math.max(0, (this.nameInput.clientHeight - contentHeight) / 2);
    this.nameInput.style.paddingTop = verticalPadding + 'px';
    this.nameInput.style.paddingBottom = verticalPadding + 'px';
  };

  PhotoGate.prototype.bind = function () {
    var self = this;
    this.input.addEventListener('change', function () {
      var file = self.input.files[0];
      if (file) { self.loadFile(file); }
      self.input.value = '';
    });
    this.nameInput.addEventListener('input', function () {
      self.fitName();
      self.updateEnterButton();
    });
    this.birthInput.addEventListener('input', function () { self.updateEnterButton(); });
    this.birthInput.addEventListener('change', function () { self.updateEnterButton(); });
    window.addEventListener('resize', function () { self.fitName(); });
    this.cameraButton.addEventListener('click', function () { self.startCamera(); });
    this.captureButton.addEventListener('click', function () { self.capture(); });
    this.stopButton.addEventListener('click', function () {
      self.stopCamera();
      self.message('Cámara cerrada. Puedes elegir una foto o volver a abrirla.');
    });
    this.cancelButton.addEventListener('click', function () { self.dialog.close(); });
    this.skipButton.addEventListener('click', function () { self.continueWithoutProfile(); });
    this.form.addEventListener('submit', function (event) {
      event.preventDefault();
      self.enter();
    });
    this.dialog.addEventListener('cancel', function (event) {
      if (!self.entered) { event.preventDefault(); }
    });
    this.dialog.addEventListener('close', function () {
      self.stopCamera();
      self.discardPending();
      self.busy = false;
      document.body.classList.remove('is-gated');
      document.dispatchEvent(new CustomEvent('gate:close'));
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { self.stopCamera(); }
    });
    window.addEventListener('pagehide', function () { self.stopCamera(); });
  };

  PhotoGate.prototype.open = function () {
    this.busy = false;
    this.pendingPhoto = null;
    this.showPreview();
    this.cancelButton.hidden = !this.entered;
    this.enterButton.textContent = this.entered ? 'Guardar foto y volver' : 'Comenzar recorrido';
    this.updateEnterButton();
    this.message('');
    document.body.classList.add('is-gated');
    this.dialog.showModal();
    this.fitName();
    document.dispatchEvent(new CustomEvent('gate:open'));
  };

  PhotoGate.prototype.showPreview = function () {
    var url = this.pendingPhoto || this.currentPhoto;
    this.preview.hidden = !url;
    this.placeholder.hidden = Boolean(url);
    if (url) { this.preview.src = url; }
    else { this.preview.removeAttribute('src'); }
  };

  PhotoGate.prototype.discardPending = function () {
    if (this.pendingPhoto) { URL.revokeObjectURL(this.pendingPhoto); }
    this.pendingPhoto = null;
  };

  PhotoGate.prototype.loadFile = function (file) {
    var self = this;
    var image;
    var source;
    var ticket;
    this.stopCamera();
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      this.message('Elige una imagen JPG, PNG o WebP.', true);
      return;
    }
    if (!file.size || file.size > 10 * 1024 * 1024) {
      this.message('La imagen debe pesar entre 1 byte y 10 MB.', true);
      return;
    }
    ticket = ++this.request;
    this.busy = true;
    this.updateEnterButton();
    this.message('Preparando tu foto…');
    source = URL.createObjectURL(file);
    image = new Image();
    image.onload = function () {
      URL.revokeObjectURL(source);
      if (ticket === self.request && self.dialog.open) {
        self.processPhoto(image, image.naturalWidth, image.naturalHeight, ticket, false);
      }
    };
    image.onerror = function () {
      URL.revokeObjectURL(source);
      if (ticket !== self.request || !self.dialog.open) { return; }
      self.busy = false;
      self.updateEnterButton();
      self.message('No pudimos leer esta imagen. Prueba con otra foto.', true);
    };
    image.src = source;
  };

  PhotoGate.prototype.processPhoto = function (source, width, height, ticket, mirror) {
    var self = this;
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var size = Math.min(width, height);
    if (!size || !context) {
      this.busy = false;
      this.updateEnterButton();
      this.message('No se pudo preparar la imagen. Elige otra foto.', true);
      return;
    }
    canvas.width = 640;
    canvas.height = 640;
    if (mirror) { context.translate(640, 0); context.scale(-1, 1); }
    context.drawImage(source, (width - size) / 2, (height - size) / 2, size, size, 0, 0, 640, 640);
    canvas.toBlob(function (blob) {
      if (ticket !== self.request || !self.dialog.open) { return; }
      self.busy = false;
      if (!blob) {
        self.updateEnterButton();
        self.message('No se pudo preparar la imagen. Prueba con otra.', true);
        return;
      }
      self.discardPending();
      self.pendingPhoto = URL.createObjectURL(blob);
      self.showPreview();
      self.updateEnterButton();
      self.message(self.form.checkValidity()
        ? 'Tu foto está lista. Ya puedes continuar.'
        : 'Foto lista. Completa tu nombre y fecha de nacimiento para continuar.');
    }, 'image/jpeg', 0.85);
  };

  PhotoGate.prototype.startCamera = function () {
    var self = this;
    var ticket;
    this.stopCamera();
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.message('La cámara necesita HTTPS o localhost y un navegador compatible. Puedes elegir una foto.', true);
      return;
    }
    ticket = ++this.request;
    this.busy = true;
    this.updateEnterButton();
    this.cameraButton.disabled = true;
    this.stopButton.hidden = false;
    this.message('Esperando acceso a la cámara…');
    navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } } }).then(function (stream) {
      if (ticket !== self.request || !self.dialog.open || document.hidden) {
        stream.getTracks().forEach(function (track) { track.stop(); });
        return;
      }
      self.stream = stream;
      self.video.srcObject = stream;
      self.video.hidden = false;
      self.preview.hidden = true;
      self.placeholder.hidden = true;
      self.captureButton.hidden = false;
      self.cameraButton.hidden = true;
      self.message('Encuadra tu rostro y toma la foto.');
    }).catch(function () {
      if (ticket !== self.request || !self.dialog.open) { return; }
      self.stopCamera();
      self.message('No se pudo acceder a la cámara. Revisa sus permisos o elige una foto.', true);
    });
  };

  PhotoGate.prototype.stopCamera = function (preserveRequest) {
    if (!preserveRequest) { this.request += 1; }
    if (this.stream) {
      this.stream.getTracks().forEach(function (track) { track.stop(); });
      this.stream = null;
    }
    this.video.srcObject = null;
    this.video.hidden = true;
    this.captureButton.hidden = true;
    this.stopButton.hidden = true;
    this.cameraButton.hidden = false;
    this.cameraButton.disabled = false;
    this.busy = false;
    this.updateEnterButton();
    this.showPreview();
  };

  PhotoGate.prototype.capture = function () {
    var ticket;
    if (!this.video.videoWidth || !this.video.videoHeight) {
      this.message('La cámara aún se está preparando. Intenta de nuevo.', true);
      return;
    }
    ticket = ++this.request;
    this.busy = true;
    this.processPhoto(this.video, this.video.videoWidth, this.video.videoHeight, ticket, true);
    /* Release hardware now; keep the image conversion ticket valid. */
    this.stopCamera(true);
    this.busy = true;
    this.updateEnterButton();
    this.message('Preparando tu foto…');
  };

  PhotoGate.prototype.continueWithoutProfile = function () {
    var previous = this.currentPhoto;
    this.stopCamera();
    this.discardPending();
    if (previous && previous !== this.fallbackPhoto) { URL.revokeObjectURL(previous); }
    this.currentPhoto = this.fallbackPhoto;
    this.nameInput.value = '';
    this.birthInput.value = '';
    this.fitName();
    this.entered = true;
    this.showPreview();
    this.updateEnterButton();
    document.dispatchEvent(new CustomEvent('profile:ready', {
      detail: { url: this.currentPhoto, anonymous: true }
    }));
    this.dialog.close();
  };

  PhotoGate.prototype.enter = function () {
    var previous = this.currentPhoto;
    if (this.busy || !(this.pendingPhoto || this.currentPhoto) || !this.form.checkValidity()) { return; }
    this.currentPhoto = this.pendingPhoto || this.currentPhoto;
    this.pendingPhoto = null;
    this.entered = true;
    document.dispatchEvent(new CustomEvent('profile:ready', { detail: { url: this.currentPhoto } }));
    if (previous && previous !== this.currentPhoto && previous !== this.fallbackPhoto) { URL.revokeObjectURL(previous); }
    this.dialog.close();
  };

  PhotoGate.prototype.destroy = function () {
    this.stopCamera();
    this.discardPending();
    if (this.currentPhoto && this.currentPhoto !== this.fallbackPhoto) { URL.revokeObjectURL(this.currentPhoto); }
    this.currentPhoto = null;
  };

  window.PhotoGate = PhotoGate;
}(window, document));
