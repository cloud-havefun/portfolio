/* =============================================================================
   strip-gl.js — Dai keo ngang bang WebGL (be cong theo van toc keo)

   Cach hoat dong:
   - KHONG dung lai carousel cua template (danh sach anh cua no hard-code trong
     bundle da minify). Day la mot lop rieng, dung chung cho MOI ".hstrip".
   - DOM cua dai giu nguyen 100%: no van la ban du phong, va van la noi duy nhat
     quyet dinh kich thuoc. Module do lai vi tri/co cua tung o bang
     getBoundingClientRect roi dung lai y het bang WebGL -> sua CSS la GL doi theo,
     khong phai khai bao so o hai noi.
   - Moi o duoc ve san ra mot canvas 2D (nen + anh + vien + caption) roi nap len
     GPU lam texture. Nho vay caption/vien be cong CUNG voi anh, khong bi lech
     nhu khi de chung o lop DOM.
   - Bam vao o -> goi thang el.click() tren phan tu DOM goc, nen toan bo logic
     lightbox san co duoc dung lai nguyen ven, khong viet lai dong nao.

   An toan:
   - prefers-reduced-motion, khong co WebGL, CDN hong, anh bi chan CORS
     -> tu dong tra ve dai CSS cu. Trang khong bao gio trang.
   ============================================================================= */
(function () {
  "use strict";

  var THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";

  var strips = document.querySelectorAll(".hstrip");
  if (!strips.length) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!hasWebGL()) return;

  function hasWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
        (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  // Font phai nap xong TRUOC khi do chu, khong thi caption ve sai be ngang.
  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();

  // Doi man mo dau (boot.js) thoat HAN roi moi dung WebGL: measure() ben duoi
  // goi getBoundingClientRect() cho tung o + caption -> forced layout, con
  // build() thi compile shader/tao canvas -> deu nang. Chay dung luc boot.js
  // dang mo logo hoac wipe la dam vao main thread cua nhau, giat ca hai ben.
  // Mang (font/THREE) van cho tai ngam song song, chi hoan phan DUNG WebGL.
  function afterBoot(cb) {
    if (!document.querySelector(".boot")) { cb(); return; } // boot.js khong chay/da xong roi
    var done = false;
    function go() { if (done) return; done = true; obs.disconnect(); cb(); }
    var obs = new MutationObserver(function () {
      if (!document.querySelector(".boot")) go();
    });
    obs.observe(document.body, { childList: true });
    setTimeout(go, 4000); // an toan: boot.js loi/khong co thi cung dung cho mai
  }

  Promise.all([fontsReady, import(THREE_URL)]).then(function (res) {
    var THREE = res[1];
    afterBoot(function () {
      [].forEach.call(strips, function (el) {
        try { new GLStrip(THREE, el); } catch (e) { /* o nay giu nguyen dai CSS */ }
      });
    });
  })["catch"](function () { /* CDN hong -> giu nguyen dai CSS */ });

  /* --------------------------------------------------------------------------
     Shader
     Song be cong tinh theo toa do NGANG TREN MAN HINH, khong theo uv cua tung o
     -> ca hang cong thanh mot vong cung lien tuc, dung kieu template goc.
     -------------------------------------------------------------------------- */
  var VERT = [
    "uniform float uStrength;",
    "uniform float uViewW;",
    "varying vec2 vUv;",
    "void main(){",
    "  vUv = uv;",
    "  vec4 w = modelMatrix * vec4(position, 1.0);",
    "  float t = clamp(w.x / uViewW, -0.5, 0.5);",
    "  w.z += cos(t * 3.141592653589793) * -uStrength;",
    "  gl_Position = projectionMatrix * viewMatrix * w;",
    "}"
  ].join("\n");

  var FRAG = [
    "uniform sampler2D uTex;",
    "varying vec2 vUv;",
    "void main(){",
    "  vec4 c = texture2D(uTex, vUv);",
    "  if (c.a < 0.02) discard;",
    "  gl_FragColor = c;",
    "}"
  ].join("\n");

  /* -------------------------------------------------------------------------- */

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function roundRect(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    if (g.roundRect) { g.beginPath(); g.roundRect(x, y, w, h, r); return; }
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function drawCover(g, img, w, h) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var s = Math.max(w / iw, h / ih);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(img, (w - iw * s) / 2, (h - ih * s) / 2, iw * s, ih * s);
  }

  /* ========================================================================== */

  function GLStrip(THREE, strip) {
    this.T = THREE;
    this.strip = strip;
    this.items = [].slice.call(strip.querySelectorAll(".hstrip__item"));
    if (!this.items.length) throw new Error("hstrip rong");

    this.scroll = 0; this.target = 0; this.last = 0;
    this.inertia = 0; this.vel = 0; this.strength = 0;
    this.hover = -1; this.down = false; this.moved = 0; this.px = 0;
    this.dirty = true; this.raf = 0; this.running = false;

    this.tickBound = this.tick.bind(this);
    this.build();
  }

  var P = GLStrip.prototype;

  P.build = function () {
    var T = this.T, self = this;

    // Go src khoi <img> trong DOM: chi tai MOT lan, va tai o che do CORS.
    // Thieu buoc nay thi anh cross-origin lam canvas 2D bi "tainted" -> khong
    // dua len GPU duoc (SecurityError). Src duoc giu lai de con tra ve neu hong.
    this.cards = this.items.map(function (el) {
      var im = el.querySelector("img");
      var src = im ? (im.currentSrc || im.getAttribute("src") || "") : "";
      if (im && src) { im.setAttribute("data-gl-src", src); im.removeAttribute("src"); }
      return { el: el, dom: im, src: src, img: null, tainted: false, checked: false };
    });

    this.strip.classList.add("is-gl");
    this.strip.scrollLeft = 0;

    this.renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    this.renderer.setClearAlpha(0);
    if (T.LinearSRGBColorSpace) this.renderer.outputColorSpace = T.LinearSRGBColorSpace;
    this.canvas = this.renderer.domElement;
    this.canvas.className = "stripgl__canvas";
    this.strip.appendChild(this.canvas);

    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(45, 1, 1, 8000);
    this.geo = new T.PlaneGeometry(1, 1, 26, 18);
    this.ray = new T.Raycaster();
    this.pointer = new T.Vector2();
    this.maxAniso = this.renderer.capabilities.getMaxAnisotropy ? this.renderer.capabilities.getMaxAnisotropy() : 1;

    this.measure();

    // Texture rong dung chung: o nao chua toi luot ve thi deo tam nay, khong ton VRAM.
    var blank = document.createElement("canvas");
    blank.width = blank.height = 2;
    this.blank = new T.CanvasTexture(blank);

    this.meshes = this.cards.map(function (c, i) {
      c.i = i;
      var mat = new T.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { uTex: { value: self.blank }, uStrength: { value: 0 }, uViewW: { value: 1 } },
        transparent: true, depthTest: false, depthWrite: false, side: T.DoubleSide
      });
      var m = new T.Mesh(self.geo, mat);
      self.scene.add(m);
      return m;
    });

    this.applySize();
    this.lazy();
    this.place();
    this.events();
    this.watch();
  };

  /* ---------- Do lai moi thu tu DOM (CSS van la nguon duy nhat) ---------- */
  P.measure = function () {
    var strip = this.strip;
    var sr = strip.getBoundingClientRect();
    var sl = strip.scrollLeft;
    this.W = Math.max(1, strip.clientWidth);
    this.H = Math.max(1, strip.clientHeight);
    var padR = parseFloat(getComputedStyle(strip).paddingRight) || 0;
    var right = 0;

    this.cards.forEach(function (c) {
      var r = c.el.getBoundingClientRect();
      var st = getComputedStyle(c.el);
      c.x = r.left - sr.left + sl;
      c.y = r.top - sr.top;
      c.w = Math.max(1, r.width);
      c.h = Math.max(1, r.height);
      c.radius = parseFloat(st.borderTopLeftRadius) || 0;
      c.border = st.borderTopColor || "#4A4A4A";
      right = Math.max(right, c.x + c.w);

      var cap = c.el.querySelector(".hstrip__cap");
      c.cap = null;
      if (cap) {
        var cr = cap.getBoundingClientRect();
        var cst = getComputedStyle(cap);
        var sp = cap.querySelectorAll("span");
        c.cap = {
          x: cr.left - r.left, y: cr.top - r.top, w: cr.width, h: cr.height,
          font: cst.fontWeight + " " + cst.fontSize + " " + cst.fontFamily,
          ls: cst.letterSpacing === "normal" ? "0px" : cst.letterSpacing,
          color: cst.color || "#fff",
          left: sp[0] ? sp[0].textContent.trim() : "",
          right: sp[1] ? sp[1].textContent.trim() : ""
        };
      }
    });

    this.contentW = right + padR;
    this.maxScroll = Math.max(0, this.contentW - this.W);
    this.target = clamp(this.target, 0, this.maxScroll);
    this.scroll = clamp(this.scroll, 0, this.maxScroll);
  };

  /* ---------- Ve mot o ra canvas 2D roi nap len GPU ---------- */
  P.paint = function (c, hovered) {
    var T = this.T;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cap = window.innerWidth < 700 ? 700 : 1000;   // be ngang toi da cua texture
    var s = Math.max(1, Math.min(dpr, cap / c.w));
    var cw = Math.max(2, Math.round(c.w * s));
    var ch = Math.max(2, Math.round(c.h * s));

    if (!c.canvas) c.canvas = document.createElement("canvas");
    if (c.canvas.width !== cw || c.canvas.height !== ch) { c.canvas.width = cw; c.canvas.height = ch; }
    var g = c.canvas.getContext("2d");
    g.setTransform(s, 0, 0, s, 0, 0);
    g.clearRect(0, 0, c.w, c.h);

    // nen + anh (bo goc bo tron)
    g.save();
    roundRect(g, 0.5, 0.5, c.w - 1, c.h - 1, c.radius);
    g.clip();
    g.fillStyle = "#1b1b1b";
    g.fillRect(0, 0, c.w, c.h);
    if (c.img && !c.tainted) drawCover(g, c.img, c.w, c.h);
    g.restore();

    // Anh cross-origin khong duoc phep -> canvas nhiem doc, doc pixel se nem loi.
    // Kiem tra dung mot lan, neu dinh thi bo anh va ve lai phan con lai.
    if (c.img && !c.checked) {
      c.checked = true;
      try { g.getImageData(0, 0, 1, 1); }
      catch (e) { c.tainted = true; return this.paint(c, hovered); }
    }

    // vien
    g.lineWidth = 1;
    g.strokeStyle = hovered ? "#fff" : c.border;
    roundRect(g, 0.5, 0.5, c.w - 1, c.h - 1, c.radius);
    g.stroke();

    // caption
    if (c.cap) {
      var cp = c.cap;
      g.font = cp.font;
      if ("letterSpacing" in g) g.letterSpacing = cp.ls;
      g.textBaseline = "middle";
      g.fillStyle = cp.color;
      g.shadowColor = "rgba(0,0,0,.75)";   // giong text-shadow cua .hstrip__cap
      g.shadowBlur = 6;
      g.shadowOffsetY = 1;
      var my = cp.y + cp.h / 2;
      if (cp.left) { g.textAlign = "left"; g.fillText(cp.left, cp.x, my); }
      if (cp.right) { g.textAlign = "right"; g.fillText(cp.right, cp.x + cp.w, my); }
      g.shadowColor = "transparent";
      g.shadowBlur = 0;
      g.shadowOffsetY = 0;
    }

    if (!c.tex) {
      c.tex = new T.CanvasTexture(c.canvas);
      c.tex.minFilter = T.LinearFilter;
      c.tex.magFilter = T.LinearFilter;
      c.tex.generateMipmaps = false;
      c.tex.anisotropy = this.maxAniso;
      if (this.meshes && this.meshes[c.i]) this.meshes[c.i].material.uniforms.uTex.value = c.tex;
    } else {
      c.tex.needsUpdate = true;
    }
    this.dirty = true;
  };

  /* ---------- Nap anh (chi nap o nao sap vao tam nhin) ---------- */
  P.load = function (c) {
    if (c.loading || c.img || !c.src) return;
    c.loading = true;
    var self = this;
    var im = new Image();
    // BAT BUOC dat truoc src.
    im.crossOrigin = "anonymous";
    im.onload = function () {
      c.img = im;
      self.paint(c, self.cards.indexOf(c) === self.hover);
    };
    im.onerror = function () { self.corsProbe(c); };
    im.src = c.src;
  };

  // Anh tai khong duoc o che do CORS: neu tai KHONG CORS lai duoc thi loi la do
  // server khong cho phep -> tra ca dai ve ban CSS thay vi de trong.
  P.corsProbe = function (c) {
    var self = this;
    var probe = new Image();
    probe.onload = function () { self.destroy(); };
    probe.onerror = function () { /* file that su khong ton tai -> de o trong */ };
    probe.src = c.src;
  };

  /* ---------- Kich thuoc / vi tri ---------- */
  P.applySize = function () {
    var fov = 45;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.W, this.H, false);
    this.camZ = (this.H / 2) / Math.tan((fov * Math.PI) / 360);   // 1 don vi = 1 px tai z=0
    this.camera.fov = fov;
    this.camera.aspect = this.W / this.H;
    this.camera.position.z = this.camZ;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  };

  P.place = function () {
    var W = this.W, H = this.H;
    for (var i = 0; i < this.meshes.length; i++) {
      var c = this.cards[i], m = this.meshes[i];
      m.scale.set(c.w, c.h, 1);
      m.position.x = c.x + c.w / 2 - W / 2 - this.scroll;
      m.position.y = -(c.y + c.h / 2 - H / 2);
      m.visible = (m.position.x + c.w / 2 > -W * 0.6) && (m.position.x - c.w / 2 < W * 1.6);
      m.material.uniforms.uStrength.value = this.strength;
      m.material.uniforms.uViewW.value = W;
    }
  };

  P.lazy = function () {
    for (var i = 0; i < this.cards.length; i++) {
      var c = this.cards[i];
      var left = c.x - this.scroll;
      if (left > this.W * 1.8 || left + c.w < -this.W * 0.8) continue;
      if (!c.tex) this.paint(c, false);
      this.load(c);
    }
  };

  /* ---------- Vong lap ---------- */
  P.tick = function () {
    this.raf = requestAnimationFrame(this.tickBound);

    if (this.inertia) {
      this.target = clamp(this.target + this.inertia, 0, this.maxScroll);
      this.inertia *= 0.93;
      if (Math.abs(this.inertia) < 0.2) this.inertia = 0;
    }

    this.scroll += (this.target - this.scroll) * 0.095;
    var v = this.scroll - this.last;
    this.last = this.scroll;

    // Do cong = van toc keo. Chan tren ~12% khoang cach camera, qua nguong nay
    // o giua phong to lo lieu chu khong con ra hieu ung chieu sau.
    var max = this.camZ * 0.12;
    var want = clamp(v * 2.6, -max, max);
    this.strength += (want - this.strength) * 0.25;
    if (Math.abs(this.strength) < 0.03 && Math.abs(want) < 0.03) this.strength = 0;

    var moving = Math.abs(this.target - this.scroll) > 0.03 || this.strength !== 0;
    if (!moving && !this.dirty) return;
    this.dirty = false;

    this.lazy();
    this.place();
    this.renderer.render(this.scene, this.camera);
  };

  P.start = function () {
    if (this.running || this.dead) return;
    this.running = true;
    this.last = this.scroll;
    this.dirty = true;
    this.raf = requestAnimationFrame(this.tickBound);
  };

  P.stop = function () {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  /* ---------- Tuong tac ---------- */
  P.ndc = function (e) {
    var r = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  };

  P.hit = function (e) {
    this.ndc(e);
    this.ray.setFromCamera(this.pointer, this.camera);
    var hits = this.ray.intersectObjects(this.meshes, false);
    return hits.length ? this.meshes.indexOf(hits[0].object) : -1;
  };

  P.setHover = function (i) {
    if (i === this.hover) return;
    var old = this.hover;
    this.hover = i;
    if (old > -1 && this.cards[old] && this.cards[old].tex) this.paint(this.cards[old], false);
    if (i > -1 && this.cards[i] && this.cards[i].tex) this.paint(this.cards[i], true);
    this.canvas.classList.toggle("is-over", i > -1);
  };

  P.events = function () {
    var self = this, cv = this.canvas;
    this.fine = !window.matchMedia || window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    // stopPropagation: khong de doan keo chuot cua dai CSS (gan tren .hstrip)
    // chay song song, no se gan class .is-dragging -> tat pointer-events cua canvas.
    cv.addEventListener("pointerdown", function (e) {
      e.stopPropagation();
      self.down = true; self.moved = 0; self.px = e.clientX;
      self.vel = 0; self.inertia = 0;
      if (cv.setPointerCapture) { try { cv.setPointerCapture(e.pointerId); } catch (err) { } }
      cv.classList.add("is-grabbing");
    });

    cv.addEventListener("pointermove", function (e) {
      e.stopPropagation();
      if (!self.down) { if (self.fine) self.setHover(self.hit(e)); return; }
      var dx = e.clientX - self.px;
      self.px = e.clientX;
      self.moved += Math.abs(dx);
      if (self.moved > 6 && e.cancelable) e.preventDefault();
      self.target = clamp(self.target - dx, 0, self.maxScroll);
      self.vel = -dx;
    });

    function up(e) {
      if (!self.down) return;
      e.stopPropagation();
      self.down = false;
      cv.classList.remove("is-grabbing");
      if (self.moved < 6) {
        // Goi thang click tren phan tu DOM goc -> dung lai nguyen logic lightbox.
        var i = self.hit(e);
        if (i > -1) self.cards[i].el.click();
      } else {
        self.inertia = clamp(self.vel * 6, -600, 600);
      }
    }
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", function () {
      self.down = false;
      cv.classList.remove("is-grabbing");
    });
    cv.addEventListener("pointerleave", function () { if (!self.down) self.setHover(-1); });
    cv.addEventListener("dragstart", function (e) { e.preventDefault(); });

    // Chi an cuon khi la cu cuon NGANG (hoac giu Shift). Cuon doc de trang tu lo.
    cv.addEventListener("wheel", function (e) {
      var dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      if (!dx) return;
      e.preventDefault();
      e.stopPropagation();
      self.inertia = 0;
      self.target = clamp(self.target + dx, 0, self.maxScroll);
    }, { passive: false });
  };

  /* ---------- Theo doi tam nhin + doi co man hinh ---------- */
  P.watch = function () {
    var self = this;

    this.inView = true;
    if ("IntersectionObserver" in window) {
      this.io = new IntersectionObserver(function (en) {
        self.inView = en[0].isIntersecting;
        if (self.inView && !document.hidden) self.start(); else self.stop();
      }, { rootMargin: "200px 0px" });
      this.io.observe(this.strip);
    } else {
      this.start();
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) self.stop();
      else if (self.inView) self.start();
    });

    var t = 0;
    this.onResize = function () {
      clearTimeout(t);
      t = setTimeout(function () { self.resize(); }, 150);
    };
    window.addEventListener("resize", this.onResize);
    if ("ResizeObserver" in window) {
      this.ro = new ResizeObserver(this.onResize);
      this.ro.observe(this.strip);
    }
  };

  P.resize = function () {
    if (this.dead) return;
    this.measure();
    this.applySize();
    for (var i = 0; i < this.cards.length; i++) {
      if (this.cards[i].tex) this.paint(this.cards[i], i === this.hover);
    }
    this.lazy();
    this.place();
    this.dirty = true;
    if (!this.running) this.renderer.render(this.scene, this.camera);
  };

  /* ---------- Tra ve dai CSS ---------- */
  P.destroy = function () {
    if (this.dead) return;
    this.dead = true;
    this.stop();
    if (this.io) this.io.disconnect();
    if (this.ro) this.ro.disconnect();
    window.removeEventListener("resize", this.onResize);
    this.cards.forEach(function (c) {
      if (c.dom && c.src) { c.dom.setAttribute("src", c.src); c.dom.removeAttribute("data-gl-src"); }
      if (c.tex) c.tex.dispose();
    });
    this.meshes.forEach(function (m) { m.material.dispose(); });
    if (this.blank) this.blank.dispose();
    this.geo.dispose();
    this.renderer.dispose();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.strip.classList.remove("is-gl");
  };
})();
