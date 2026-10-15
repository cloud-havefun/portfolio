/* =============================================================================
   boot.js — Man mo dau "Click to enter" + fade khi chuyen trang.

   Vi sao lam kieu nay:
   - Barba (thu vien chuyen trang AJAX cua template) DA BI TAT trong bundle
     (global-*.js, them data-barba-prevent="all"). Ly do: Barba chi thay phan
     container, KHONG chay lai cac <script> inline cuoi trang (lightbox, keo dai
     anh, danh sach anh, reveal Overview) va giu nguyen header cua trang dau tien
     -> anh trong, bam video khong an, link header bi lech duong dan -> 404.
     Gio moi lan bam link la tai trang that, file nay lo phan fade cho mem.

   Luong chay:
   - LAN DAU MOI PHIEN (trang nao cung vay, ke ca mo thang link project):
       7 manh logo bay ve rap lai -> hien "Click to enter"
       -> nguoi xem bam (hoac go phim bat ky) -> logo mo di -> ca man mo dan
       -> vao trang.
   - CAC LAN SAU TRONG PHIEN: trang moi hien ra bang mot cu fade nhe.
   - ROI TRANG: bam link noi bo -> man toi fade len (ca header) -> moi chuyen trang.

   Noi voi bundle template:
   - Bundle KHONG tu khoi dong animation chu cua no nua, ma doi su kien
     "cloud:enter" do file nay phat ra (luc nguoi xem bam vao, hoac ngay lap tuc
     o cac lan sau). Nho vay animation chu khong chay mat sau man mo dau.
   - window.__cloudBoot = 1 bao cho bundle biet file nay co chay. Neu file nay
     loi/khong tai duoc, bundle tu khoi dong o DOMContentLoaded -> trang van dung.

   Chinh toc do: xem khoi TIMING ngay ben duoi.
   ============================================================================= */
(function () {
  "use strict";

  window.__cloudBoot = 1;

  var SHARDS = [{"d":"M512.35,-0.00 L219.02,335.77 L29.67,396.33 L319.52,18.34 L512.35,-0.00 Z","tx":-192.9,"ty":-425.0,"rot":7.0,"delay":0},{"d":"M276.80,431.48 L1.44,637.02 L543.84,477.34 L466.06,407.37 L276.80,431.48 Z","tx":-142.9,"ty":247.0,"rot":-8.4,"delay":70},{"d":"M219.31,337.85 L29.74,398.07 L-0.00,635.07 L275.37,429.77 L219.31,337.85 Z","tx":-542.8,"ty":161.7,"rot":8.5,"delay":140},{"d":"M547.33,478.78 L729.60,472.63 L282.64,882.23 L547.33,478.78 Z","tx":339.7,"ty":497.8,"rot":-8.8,"delay":210},{"d":"M666.37,141.57 L547.33,476.56 L729.60,470.05 L666.37,141.57 Z","tx":639.7,"ty":-58.4,"rot":9.3,"delay":280},{"d":"M467.85,405.98 L544.95,475.47 L664.47,140.97 L467.85,405.98 Z","tx":459.2,"ty":-113.9,"rot":-10.5,"delay":350},{"d":"M400.17,334.16 L514.56,1.48 L420.00,109.35 L400.17,334.16 Z","tx":190.3,"ty":-591.7,"rot":11.2,"delay":420}];

  var KEY = "cloud-booted";
  var SLOW = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var seen = false;
  try { seen = sessionStorage.getItem(KEY) === "1"; } catch (e) { }

  // ---------- TIMING (ms) ----------
  var ASSEMBLE  = SHARDS[SHARDS.length - 1].delay + 850; // manh cuoi khop xong -> hien "Click to enter"
  var LOGO_OUT  = SLOW ? 250 : 600;   // logo mo di sau khi bam
  var GATE_OUT  = SLOW ? 300 : 900;   // ca man mo dan ra trang chu
  var PAGE_IN   = SLOW ? 250 : 700;   // fade vao moi trang (cac lan sau)
  var PAGE_OUT  = SLOW ? 200 : 500;   // fade toi khi roi trang

  var root = document.documentElement;
  var host = document.body || root;

  // ---------- CSS rieng cua file nay ----------
  // De o day thay vi file CSS chinh de khoi phai sua 6 file HTML.
  // Lop chong nhay trang (html::before) van nam trong CSS chinh vi no can co
  // ngay tu khung hinh dau tien, truoc khi JS kip chay.
  var css = "" +
    ".boot{transition:opacity " + GATE_OUT + "ms cubic-bezier(.4,0,.2,1)}" +
    ".boot.is-fading{opacity:0;pointer-events:none}" +
    ".boot:focus{outline:none}" +
    // Chi con logo + dong chu. Dong chu duoc dat bang absolute ngay duoi logo,
    // nen logo nam DUNG TAM man hinh (khong bi day len vi co chu ben duoi).
    ".boot .boot__inner{position:relative;display:block;gap:0}" +
    ".boot .boot__enter{position:absolute;left:50%;top:100%;transform:translateX(-50%);" +
      "margin-top:clamp(28px,3.6vw,46px);padding-left:.22em}" +
    ".boot .boot__inner.is-gone{animation:none;opacity:0;transition:opacity " + LOGO_OUT + "ms ease}" +
    ".boot__enter{margin:0;color:#fff;font-size:.6875rem;letter-spacing:.22em;white-space:nowrap;opacity:0;transition:opacity .6s ease}" +
    ".boot__enter.is-on{opacity:.9;animation:bootPulse 2.4s ease-in-out .6s infinite}" +
    "@keyframes bootPulse{50%{opacity:.35}}" +
    ".pagefade{position:fixed;inset:0;z-index:3000000;background:#161616;pointer-events:none;opacity:1;" +
      "transition:opacity " + PAGE_IN + "ms cubic-bezier(.4,0,.2,1)}" +
    ".pagefade.is-clear{opacity:0}" +
    ".pagefade.is-leave{transition-duration:" + PAGE_OUT + "ms;pointer-events:all}" +
    "@media (prefers-reduced-motion: reduce){.boot__enter.is-on{animation:none}}";
  var style = document.createElement("style");
  style.textContent = css;
  (document.head || root).appendChild(style);

  // ---------- phat tin hieu cho bundle khoi dong animation ----------
  var entered = false;
  function enter() {
    if (entered) return;
    entered = true;
    window.dispatchEvent(new Event("cloud:enter"));
  }

  // Go lop chong nhay (html::before) + mo lai thanh cuon.
  function release() {
    root.classList.add("boot-done");
    root.classList.remove("is-booting");
  }

  function nextFrame(cb) {
    requestAnimationFrame(function () { requestAnimationFrame(cb); });
  }

  /* =========================================================================
     CAC LAN SAU TRONG PHIEN: chi fade nhe vao trang
     ========================================================================= */
  function fadeInPage() {
    var veil = document.createElement("div");
    veil.className = "pagefade";
    veil.setAttribute("aria-hidden", "true");
    host.appendChild(veil);
    release();          // veil da che kin, go lop chong nhay khong ai thay
    enter();            // bundle bat dau animation chu ngay duoi lop fade
    nextFrame(function () {
      veil.classList.add("is-clear");
      setTimeout(function () { if (veil.parentNode) veil.parentNode.removeChild(veil); }, PAGE_IN + 60);
    });
  }

  /* =========================================================================
     LAN DAU MOI PHIEN: logo rap lai + "Click to enter"
     ========================================================================= */
  function gate() {
    var boot = document.createElement("div");
    boot.className = "boot";
    boot.setAttribute("role", "button");
    boot.setAttribute("tabindex", "0");
    boot.setAttribute("aria-label", "Click to enter");

    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 730 883");
    svg.setAttribute("class", "boot__mark");
    svg.setAttribute("fill", "none");
    svg.setAttribute("aria-hidden", "true");
    SHARDS.forEach(function (s) {
      var p = document.createElementNS(svgNS, "path");
      p.setAttribute("d", s.d);
      p.setAttribute("class", "boot__shard");
      p.style.setProperty("--tx", s.tx + "px");
      p.style.setProperty("--ty", s.ty + "px");
      p.style.setProperty("--rot", s.rot + "deg");
      p.style.setProperty("--d", s.delay + "ms");
      svg.appendChild(p);
    });

    var hint = document.createElement("p");
    hint.className = "boot__enter mono uppercase";
    hint.textContent = "Click to enter";

    var wrap = document.createElement("div");
    wrap.className = "boot__inner";
    wrap.appendChild(svg);
    wrap.appendChild(hint);
    boot.appendChild(wrap);

    host.insertBefore(boot, host.firstChild);
    root.classList.add("is-booting");

    var hintTimer = setTimeout(function () { hint.classList.add("is-on"); }, SLOW ? 300 : ASSEMBLE);

    // ---------- bam de vao ----------
    var gone = false;
    function open() {
      if (gone) return;
      gone = true;
      clearTimeout(hintTimer);
      window.removeEventListener("keydown", onKey);
      try { sessionStorage.setItem(KEY, "1"); } catch (e) { }

      // Lop chong nhay go luon: .boot van che kin nen khong ai thay.
      release();
      // Bundle bat dau ngay; no tre .6s truoc khi chay chu, trung luc man dang mo.
      enter();

      // Nhip 1: logo mo di.
      wrap.classList.add("is-gone");
      // Nhip 2: ca man mo dan.
      setTimeout(function () {
        nextFrame(function () {
          boot.classList.add("is-fading");
          setTimeout(function () {
            if (boot.parentNode) boot.parentNode.removeChild(boot);
          }, GATE_OUT + 60);
        });
      }, Math.round(LOGO_OUT * 0.7));
    }
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;   // Ctrl+R, Cmd+L... de trinh duyet tu lo
      if (e.key === "Tab") return;                       // de focus vao nut binh thuong
      e.preventDefault();
      open();
    }
    boot.addEventListener("click", open);
    window.addEventListener("keydown", onKey);
    try { boot.focus({ preventScroll: true }); } catch (e) { }
  }

  if (seen) fadeInPage(); else gate();

  /* =========================================================================
     ROI TRANG: fade toi roi moi chuyen
     ========================================================================= */
  function isInternal(a, e) {
    if (!a || e.defaultPrevented) return false;               // bundle da chan (vd bam Work khi dang o Work)
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false; // mo tab moi...
    if (a.target && a.target !== "_self") return false;
    if (a.hasAttribute("download")) return false;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#") return false;
    if (a.protocol !== "http:" && a.protocol !== "https:" && a.protocol !== "file:") return false; // mailto, tel...
    if (a.origin !== location.origin) return false;
    // Cung trang, chi khac #hash -> de trinh duyet cuon binh thuong.
    if (a.pathname === location.pathname && a.search === location.search) return false;
    return true;
  }

  var leaving = null;
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a") : null;
    if (!isInternal(a, e)) return;
    e.preventDefault();
    if (leaving) return;
    var url = a.href;
    leaving = document.createElement("div");
    leaving.className = "pagefade is-clear is-leave";
    leaving.setAttribute("aria-hidden", "true");
    document.body.appendChild(leaving);
    nextFrame(function () { leaving.classList.remove("is-clear"); });
    setTimeout(function () { location.href = url; }, PAGE_OUT + 40);
  });

  // Bam Back/Forward: trinh duyet co the tra lai trang tu bo nho dem (bfcache)
  // y nguyen luc roi di, tuc la dang toi den. Go lop toi ra cho trang hien lai.
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted || !leaving) return;
    var veil = leaving;
    leaving = null;
    veil.classList.remove("is-leave");
    nextFrame(function () { veil.classList.add("is-clear"); });
    setTimeout(function () { if (veil.parentNode) veil.parentNode.removeChild(veil); }, PAGE_IN + 60);
  });
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

/* =============================================================================
   ZALO: bam chu "Zalo" -> hien popup ma QR thay vi mo link.
   - Link trong HTML la link QR ca nhan cua Zalo (zaloapp.com/qr/p/...), KHONG
     chua so dien thoai. JS hong thi bam van mo duoc Zalo.
   - Anh QR nam o assets/zalo-qr.svg. Neu doi ma QR trong app Zalo:
     thay file svg do + sua ZALO_URL ben duoi + sua href cac the a[data-zalo].
   ============================================================================= */
(function () {
  "use strict";

  var ZALO_URL = "https://zaloapp.com/qr/p/14ocmv5q8kl5";
  var me = document.currentScript;
  var QR_SRC = new URL("zalo-qr.svg", me && me.src ? me.src : location.href).href;

  var box = null, lastFocus = null;

  function build() {
    if (box) return;
    box = document.createElement("div");
    box.className = "zqr";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Zalo");
    box.setAttribute("data-lenis-prevent", "");
    box.innerHTML =
      '<div class="zqr__box">' +
        '<div class="zqr__bar mono text-sm uppercase">' +
          '<p class="zqr__title serif uppercase">Zalo</p>' +
          '<button class="btn btn--sm zqr__close" type="button">Close ✕</button>' +
        '</div>' +
        '<div class="zqr__card"><img class="zqr__code" alt="Zalo QR code" width="240" height="240" src="' + QR_SRC + '"></div>' +
        '<p class="zqr__hint mono text-sm uppercase">Scan with the Zalo app</p>' +
        '<a class="btn mono text-sm uppercase zqr__open" href="' + ZALO_URL + '" target="_blank" rel="noreferrer">Open in Zalo <span>→</span></a>' +
      '</div>';
    document.body.appendChild(box);

    box.addEventListener("click", function (e) {
      if (e.target === box || e.target.closest(".zqr__close")) close();
    });
  }

  function isOpen() { return box && box.classList.contains("is-open"); }

  function open() {
    build();
    lastFocus = document.activeElement;
    // ep trinh duyet ve trang thai dong truoc roi moi bat -> transition chay ca lan dau
    box.getBoundingClientRect();
    box.classList.add("is-open");
    document.body.style.overflow = "hidden";
    var btn = box.querySelector(".zqr__close");
    try { btn.focus({ preventScroll: true }); } catch (e) { }
  }

  function close() {
    if (!isOpen()) return;
    box.classList.remove("is-open");
    // lightbox / luoi anh dang mo thi giu khoa cuon cho chung
    var other = document.querySelector(".vlb.is-open, .pgrid.is-open");
    if (!other) document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { } }
  }

  // capture: chay truoc moi handler khac (hieu ung link, Barba...) de chan mo link
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[data-zalo]") : null;
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // mo tab moi thi de mo link
    e.preventDefault();
    e.stopPropagation();
    open();
  }, true);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen()) close();
  });
})();
