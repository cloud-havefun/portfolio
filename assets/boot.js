/* =============================================================================
   boot.js — Man mo dau: 7 manh logo bay ve rap lai + timecode chay 24fps.

   Vi sao lam kieu nay:
   - Logo cua Cloud von la 7 manh roi. Cho chung bay ve khop lai chinh la
     an du cua nghe dung phim: tung mieng footage rap thanh ban final.
   - Toa do 7 manh o duoi da duoc BUNG PHANG san tu file SVG goc (file do long
     2 tang transform: mot translate ngoai + mot matrix scale 2.595391 moi manh).
     Nho vay moi manh xoay/tinh tien quanh TAM RIENG cua no duoc.
     Sua logo -> phai chay lai buoc bung phang, dung sua tay chuoi path.

   Cach ghep vao site (KHONG dung toi bundle da minify cua template):
   - Module tu chen overlay .boot roi tu go, khong cham vao .loading cua template.
   - .loading van nam nguyen trong DOM (bundle van querySelector thay) nhung
     phan ruot bi an bang CSS; nen cua no duoc dung lam lop phu chong nhay trang
     ngay tu khung hinh dau, vi CSS chan render con JS thi khong.
   - Luc thoat, CA HAI cung an mot kieu wipe cheo -> nhin nhu mot mat phang duy nhat.

   CHONG GIAT (do duoc bang cach dem delta requestAnimationFrame):
   - Ban truoc don het vao MOT lan doi class: go lop chong nhay, mo logo, khoi
     dong clip-path wipe, dong bo .loading — nen rot dung 1 khung hinh (33ms)
     ngay luc bat dau wipe, ro nhat tren may con chay WebGL nen.
   - Nay tach lam 3 khung hinh rieng, moi khung chi lam MOT viec, va logo mo
     xong TRUOC roi moi wipe (luc do nen chi con mau phang, ve lai rat re):
       Khung 1: go lop chong nhay (".boot" van che kin, khong ai thay)
       Khung 2: mo logo di (".boot__inner.is-gone")
       Khung 3: wipe nen + soi chi (".boot.is-out")
   - will-change khai bao san o rule goc trong CSS de trinh duyet kip dung
     lop truoc, khong phai dung lop giua chung animation.

   An toan:
   - prefers-reduced-motion -> chi mo dan, khong bay nhay.
   - Bam / go phim bat ky -> bo qua ngay.
   - sessionStorage: chi dien full o lan dau moi phien. Neu Barba khong chay
     (moi lan bam la reload that) thi tu lan 2 chi con mo dan 0.3s, khong tra tan.
   - Khong co JS -> CSS de .boot an san, .loading giu nguyen hanh vi cu cua template.
   ============================================================================= */
(function () {
  "use strict";

  var SHARDS = [{"d":"M512.35,-0.00 L219.02,335.77 L29.67,396.33 L319.52,18.34 L512.35,-0.00 Z","tx":-192.9,"ty":-425.0,"rot":7.0,"delay":0},{"d":"M276.80,431.48 L1.44,637.02 L543.84,477.34 L466.06,407.37 L276.80,431.48 Z","tx":-142.9,"ty":247.0,"rot":-8.4,"delay":70},{"d":"M219.31,337.85 L29.74,398.07 L-0.00,635.07 L275.37,429.77 L219.31,337.85 Z","tx":-542.8,"ty":161.7,"rot":8.5,"delay":140},{"d":"M547.33,478.78 L729.60,472.63 L282.64,882.23 L547.33,478.78 Z","tx":339.7,"ty":497.8,"rot":-8.8,"delay":210},{"d":"M666.37,141.57 L547.33,476.56 L729.60,470.05 L666.37,141.57 Z","tx":639.7,"ty":-58.4,"rot":9.3,"delay":280},{"d":"M467.85,405.98 L544.95,475.47 L664.47,140.97 L467.85,405.98 Z","tx":459.2,"ty":-113.9,"rot":-10.5,"delay":350},{"d":"M400.17,334.16 L514.56,1.48 L420.00,109.35 L400.17,334.16 Z","tx":190.3,"ty":-591.7,"rot":11.2,"delay":420}];

  var KEY = "cloud-booted";
  var SLOW = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var seen = false;
  try { seen = sessionStorage.getItem(KEY) === "1"; } catch (e) { }

  var ASSEMBLE = SHARDS[SHARDS.length - 1].delay + 850;  // luc manh cuoi khop xong
  var HOLD  = 160;                                        // giu mot nhip cho mat kip doc
  var LIFT  = 460;                                        // logo mo di TRUOC khi wipe
  var BEAT  = 60;                                         // nghi giua hai nhip (mo logo -> wipe)
  var OUT   = 820;                                        // thoi gian wipe cheo
  if (seen) { HOLD = 80; LIFT = 220; BEAT = 30; OUT = 420; } // vao lai trong phien thi cat ngan
  var FPS = 24;

  var root = document.documentElement;

  // ---------- stub tuong thich voi bundle template ----------
  // Markup .loading cua template da duoc xoa khoi cac file HTML. Bundle da minify
  // van co the goi querySelector(".loading") / (".loading__digits"); tra ve null la
  // no nem loi va chet ca cum (Lenis, splitting, tilt, barba). Nen dung lai mot ban
  // rong, AN hoan toan, dung cau truc cu — khong ai thay, ma bundle van tim duoc.
  // Stub tao SAU khi bundle da chay xong (DOMContentLoaded), khong tao ngay:
  // bundle template chay luc load va hoi ".loading" ngay lap tuc. Khong co thi no
  // vao thang trang; co thi no chay bo dem 0-100% roi tre khoi dong ~1s.
  // Giu y nhu hien tai (bundle thay khong co) du boot.js dung truoc hay sau bundle.
  var loading = null, stubDone = false;
  function ensureStub() {
    if (stubDone) return;
    stubDone = true;
    loading = document.querySelector(".loading");
    if (!loading) {
      loading = document.createElement("div");
      loading.className = "loading is-stub";
      loading.setAttribute("aria-hidden", "true");
      var lc = document.createElement("div");
      lc.className = "loading__content";
      lc.innerHTML = '<p class="loading__digits"><span>0</span>%</p>' +
        '<svg class="loading__logo" viewBox="0 0 730 883" width="26" height="32" fill="none"></svg>' +
        '<p class="loading__digits"><span>0</span>%</p>';
      loading.appendChild(lc);
      (document.body || root).appendChild(loading);
    }
  }
  if (document.readyState === "complete") ensureStub();
  else {
    document.addEventListener("DOMContentLoaded", ensureStub);
    window.addEventListener("load", ensureStub);   // du phong neu DCL da qua
  }

  // ---------- tu lan 2 trong phien: KHONG logo, chi fade nhe ----------
  // Logo chi chay lan dau mo web. Bam sang trang khac (hoac reload trong cung tab)
  // thi bo han overlay, go lop chong nhay ngay, de CSS fade noi dung vao.
  if (seen) {
    root.classList.add("boot-done", "soft-in");
    root.classList.remove("is-booting");
    return;
  }

  // ---------- dung overlay ----------
  var boot = document.createElement("div");
  boot.className = "boot";
  boot.setAttribute("aria-hidden", "true");

  var svgNS = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 730 883");
  svg.setAttribute("class", "boot__mark");
  svg.setAttribute("fill", "none");

  SHARDS.forEach(function (s, i) {
    var p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", s.d);
    p.setAttribute("class", "boot__shard");
    p.style.setProperty("--tx", s.tx + "px");
    p.style.setProperty("--ty", s.ty + "px");
    p.style.setProperty("--rot", s.rot + "deg");
    p.style.setProperty("--d", (seen ? 0 : s.delay) + "ms");
    svg.appendChild(p);
  });

  var meter = document.createElement("div");
  meter.className = "boot__meter";
  var tc = document.createElement("p");
  tc.className = "boot__tc mono uppercase";
  tc.textContent = "00:00:00:00";
  var rule = document.createElement("span");
  rule.className = "boot__rule";
  meter.appendChild(rule);
  meter.appendChild(tc);

  var wrap = document.createElement("div");
  wrap.className = "boot__inner";
  wrap.appendChild(svg);
  wrap.appendChild(meter);
  boot.appendChild(wrap);

  // chen ngay dau body de no nam tren moi thu ngay tu dau
  // Soi chi sang phai nam NGOAI .boot: de ben trong thi chinh clip-path se cat mat no.
  var edge = document.createElement("div");
  edge.className = "boot__edge";
  edge.setAttribute("aria-hidden", "true");

  var host = document.body || root;
  host.insertBefore(boot, host.firstChild);
  host.insertBefore(edge, boot.nextSibling);
  root.classList.add("is-booting");

  // ---------- timecode 24fps ----------
  // Dem theo dong ho that chu khong theo so khung da ve -> may yeu van ra dung so.
  var t0 = performance.now();
  var span = SLOW || seen ? 300 : ASSEMBLE;
  var raf = 0;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function tick(now) {
    var ms = Math.min(now - t0, span);
    var f = Math.round(ms / 1000 * FPS);
    tc.textContent = "00:00:" + pad(Math.floor(f / FPS)) + ":" + pad(f % FPS);
    if (ms < span) raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  // ---------- thoat: moi khung hinh chi lam MOT viec ----------
  // "nextFrame" doi DU HAI lan rAF: 1 rAF co the van rot vao dung khung dang
  // ve do (trinh duyet chua chot xong thay doi truoc), 2 rAF moi chac chan la
  // khung KE TIEP thuc su, sau khi khung truoc da paint xong.
  function nextFrame(cb) {
    requestAnimationFrame(function () { requestAnimationFrame(cb); });
  }

  var gone = false;
  function finish() {
    if (gone) return;
    gone = true;
    if (raf) cancelAnimationFrame(raf);
    try { sessionStorage.setItem(KEY, "1"); } catch (e) { }
    if (seen) { boot.classList.add("boot--quick"); edge.classList.add("boot--quick"); }

    // Khung 1 — go lop chong nhay. .boot van che kin nen khong ai thay gi ca.
    // Go overflow:hidden luon tu day (khong doi den luc wipe): .boot van
    // dang phu kin man hinh nen thanh cuon co hien lai cung khong ai thay,
    // tranh de layout do "roi" dung vao khung bat dau wipe ben duoi.
    root.classList.add("boot-done");
    root.classList.remove("is-booting");

    nextFrame(function () {
      // Khung 2 — chi mo logo di, chua dong gi den lop nen/wipe.
      wrap.classList.add("is-gone");

      setTimeout(function () {
        nextFrame(function () {
          // Khung 3 — nen gio la mau phang, wipe re va muot.
          if (loading) {
            // Bundle template co transition rieng tren .loading; tat di roi cho
            // no wipe cung nhip voi .boot, neu khong hai lop se roi lech nhau.
            loading.style.transition = "none";
            loading.classList.add("is-out");
          }
          boot.classList.add("is-out");
          edge.classList.add("is-out");

          setTimeout(function () {
            if (boot.parentNode) boot.parentNode.removeChild(boot);
            if (edge.parentNode) edge.parentNode.removeChild(edge);
            // KHONG go .loading khoi DOM: bundle da minify van co the truy no,
            // querySelector tra null la vo ca bundle (Lenis, splitting, tilt, barba).
            if (loading) { loading.style.opacity = "0"; loading.style.pointerEvents = "none"; }
          }, OUT + 60);
        });
      }, LIFT + BEAT);
    });
  }

  // LUOI AN TOAN CUOI (khong phu thuoc requestAnimationFrame): neu chuoi thoat bi
  // treo (tab chay nen, may yeu, rAF bi bop) thi overlay full-man hinh se che trang
  // va chan moi cu bam -> "phai reload moi bam duoc". Qua moc nay go han, idempotent.
  setTimeout(function () {
    if (raf) cancelAnimationFrame(raf);
    if (boot.parentNode) boot.parentNode.removeChild(boot);
    if (edge.parentNode) edge.parentNode.removeChild(edge);
    root.classList.remove("is-booting");
    root.classList.add("boot-done");
  }, 9500);

  function skip() { if (!gone) finish(); }
  boot.addEventListener("click", skip);
  window.addEventListener("keydown", skip, { once: true });

  // Cho CA hai: anh/font tai xong, VA du mot nhip toi thieu cho animation chay het.
  var minWait = (SLOW || seen) ? 300 : ASSEMBLE + HOLD;
  var loaded = document.readyState === "complete";
  if (!loaded) window.addEventListener("load", function () { loaded = true; });
  var started = performance.now();
  (function poll() {
    var waited = performance.now() - started;
    if (loaded && waited >= minWait) return finish();
    if (waited > 6000) return finish();               // mang qua cham thi thoi, vao luon
    setTimeout(poll, 60);
  })();
})();

/* thumb-fit: khung anh hover (.thumbgrid__item) tu co theo ti le anh that.
   Chi dat bien --ar (rong/cao) cho moi o; CSS lo phan kich thuoc. Khong co JS
   thi CSS roi ve 4:3 nhu cu (da co no-repeat nen khong con bi lap anh). */
(function () {
  "use strict";
  function fit(img) {
    if (img.__fit) return; img.__fit = true;
    var m = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(img).backgroundImage || "");
    if (!m || !m[1]) return;
    var im = new Image();
    im.onload = function () {
      if (im.naturalWidth && im.naturalHeight && img.parentNode)
        img.parentNode.style.setProperty("--ar", (im.naturalWidth / im.naturalHeight).toFixed(4));
    };
    im.src = m[1];
  }
  function scan(root) {
    if (!root.querySelectorAll) return;
    if (root.matches && root.matches(".thumbgrid__item-img")) fit(root);
    [].forEach.call(root.querySelectorAll(".thumbgrid__item-img"), fit);
  }
  function start() {
    scan(document);
    // Barba chen trang moi vao DOM -> quet them phan tu moi
    new MutationObserver(function (list) {
      list.forEach(function (r) { [].forEach.call(r.addedNodes, scan); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();

/* avatar-fit: khung anh About tu theo ti le that cua anh -> anh nam TRON trong
   khung, khong bi cat. Chi dat bien --ar (rong/cao) tren .about__img; CSS lo
   phan kich thuoc (fallback 306/373 nhu cu neu JS khong chay). Bao window
   "resize" sau khi doi khung de lop WebGL (neu con) do lai kich thuoc canvas. */
(function () {
  "use strict";
  function fit(box) {
    if (box.__fit) return;
    var img = box.querySelector("img");
    if (!img) return;
    box.__fit = true;
    function apply() {
      if (!img.naturalWidth || !img.naturalHeight) return;
      box.style.setProperty("--ar", (img.naturalWidth / img.naturalHeight).toFixed(4));
      requestAnimationFrame(function () { window.dispatchEvent(new Event("resize")); });
    }
    if (img.complete) apply(); else img.addEventListener("load", apply);
  }
  function scan(root) {
    if (!root.querySelectorAll) return;
    if (root.matches && root.matches(".about__img")) fit(root);
    [].forEach.call(root.querySelectorAll(".about__img"), fit);
  }
  function start() {
    scan(document);
    new MutationObserver(function (list) {
      list.forEach(function (r) { [].forEach.call(r.addedNodes, scan); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();

/* img-retry: anh bi loi hoac dung giua chung thi TU TAI LAI.
   Van de: CSS giu anh trong dai o opacity:0 cho den khi anh bao "load" thanh cong.
   Anh nao loi mang / treo thi khong bao gio co "load" -> o do trong den, dung nguyen
   cho den khi reload trang. Module nay bat su kien "error" + canh anh bi treo, roi:
     lan 1: tai lai dung URL do      lan 2: them tham so chong cache
     lan 3: neu ca 2 lan truoc deu LOI (khong phai treo) -> bo "tr=" dung anh goc
   Toi da 3 lan, het thi danh dau .img-failed (o van bam duoc, chi la nen toi + caption). */
(function () {
  "use strict";
  var MAX = 3, STALL = 9000;

  function noTr(u) {
    return u.replace(/([?&])tr=[^&]*(&|$)/, function (m, a, b) { return b ? a : ""; });
  }
  function bust(u, n) {
    return u + (u.indexOf("?") === -1 ? "?" : "&") + "_r=" + n + "-" + Date.now().toString(36);
  }
  function ok(img) { return img.complete && img.naturalWidth > 0; }
  function state(img) {
    if (img.__rt) return img.__rt;
    var src = img.getAttribute("src") || "";
    if (!src || src.indexOf("data:") === 0) return null;   // o chua co anh: bo qua
    return (img.__rt = { base: src, n: 0, errs: 0, t: 0 });
  }

  function arm(img) {                       // canh anh treo: 9s ma chua xong thi tai lai
    var st = state(img); if (!st) return;
    clearTimeout(st.t);
    st.t = setTimeout(function () { if (!ok(img)) retry(img, "stall"); }, STALL);
  }
  function retry(img, why) {
    var st = state(img); if (!st || ok(img)) return;
    clearTimeout(st.t);
    if (why === "error") st.errs++;
    if (st.n >= MAX) { img.classList.add("img-failed"); return; }
    st.n++;
    var url = st.base;
    if (st.n === 2) url = bust(st.base, st.n);
    if (st.n >= 3) url = bust(st.errs >= 2 ? noTr(st.base) : st.base, st.n);
    st.t = setTimeout(function () { img.src = url; arm(img); }, 500 * st.n);
  }

  // "error" / "load" khong noi bot len -> bat o pha capture tren document
  document.addEventListener("error", function (e) {
    var el = e.target; if (el && el.tagName === "IMG") retry(el, "error");
  }, true);
  document.addEventListener("load", function (e) {
    var el = e.target; if (!el || el.tagName !== "IMG") return;
    if (el.__rt) clearTimeout(el.__rt.t);
    el.classList.remove("img-failed");
    // index.html danh dau o Project la "is-empty" neu anh loi luc load -> go di khi anh ve duoc
    var slot = el.closest && el.closest(".is-empty");
    if (slot && el.naturalWidth) slot.classList.remove("is-empty");
  }, true);

  var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (list) {
    list.forEach(function (x) {
      if (!x.isIntersecting) return;
      io.unobserve(x.target);
      if (!ok(x.target)) arm(x.target);
    });
  }, { rootMargin: "300px" }) : null;

  function watch(img) {
    if (img.__w) return;
    img.__w = 1;
    if (!state(img) || ok(img)) return;
    if (io) io.observe(img); else arm(img);
  }
  function scan(root) {
    if (root.tagName === "IMG") watch(root);
    else if (root.querySelectorAll) [].forEach.call(root.querySelectorAll("img"), watch);
  }
  function start() {
    scan(document.documentElement);
    new MutationObserver(function (list) {           // barba chen trang moi vao DOM
      list.forEach(function (r) {
        [].forEach.call(r.addedNodes, function (n) { if (n.nodeType === 1) scan(n); });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
