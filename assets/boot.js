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
/* =============================================================================
   NGON NGU (EN / VI) — chay TRUOC moi thu khac trong file nay.

   - Chu tieng Viet nam ngay trong HTML, tren chinh phan tu do:
       data-vi="..."          -> thay noi dung (innerHTML) khi chon VI
       data-vi-desc="..."     -> thay data-desc (mo ta video trong lightbox)
       data-vi-content="..."  -> thay content cua the <meta>
       data-vi-aria="..."     -> thay aria-label
     Muon sua cau tieng Viet nao: tim cau tieng Anh trong HTML, sua data-vi
     ngay ben canh. Phan tu khong co data-vi thi 2 ngon ngu giong nhau.
   - Doi chu xong ROI bundle moi tach chu de chay animation (sau "cloud:enter"),
     nen hieu ung chu van chay dung o ca 2 ngon ngu.
   - Lan dau: lay theo ngon ngu trinh duyet (vi-* -> VI, con lai EN).
     Nguoi xem gat nut -> nho vao localStorage "cloud-lang".
   - 3 font goc (PP Eiko / Neue Montreal / Mono) KHONG co dau tieng Viet.
     Khi chon VI, file nay khai bao lai 3 ten font do tro sang font thay the
     (fonts/VI/): Cormorant Garamond Light, Inter Tight, Geist Mono.
     Ban EN khong tai them byte nao.
   ============================================================================= */
(function () {
  "use strict";

  var KEY = "cloud-lang";
  var me = document.currentScript;
  var FONT_DIR = new URL("../fonts/VI/", me && me.src ? me.src : location.href).href;
  var root = document.documentElement;

  function detect() {
    try {
      var s = localStorage.getItem(KEY);
      if (s === "vi" || s === "en") return s;
    } catch (e) { }
    var n = (navigator.languages && navigator.languages[0]) || navigator.language || "";
    return /^vi/i.test(n) ? "vi" : "en";
  }

  // ---- font thay the cho tieng Viet ----
  var LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
  var VIET = "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB";
  // [ten font goc, do dam goc, file thay the]
  var FONTS = [
    ["PP Eiko", 100, "cormorant-garamond-300"],
    ["PP Neue Montreal", 500, "inter-tight-500"],
    ["PP Neue Montreal Mono", 500, "geist-mono-500"]
  ];
  var fontStyle = null;
  function viFonts(on) {
    if (on && !fontStyle) {
      var css = "";
      FONTS.forEach(function (f) {
        [["latin", LATIN], ["vietnamese", VIET]].forEach(function (s) {
          css += "@font-face{font-family:'" + f[0] + "';font-weight:" + f[1] + ";font-display:swap;" +
            "src:url(" + FONT_DIR + f[2] + "-" + s[0] + ".woff2) format('woff2');unicode-range:" + s[1] + "}";
        });
      });
      fontStyle = document.createElement("style");
      fontStyle.id = "vi-fonts";
      fontStyle.textContent = css;
      (document.head || root).appendChild(fontStyle);
    } else if (!on && fontStyle) {
      fontStyle.parentNode.removeChild(fontStyle);
      fontStyle = null;
    }
  }

  // ---- doi chu ----
  function swapAttr(sel, attr) {
    [].forEach.call(document.querySelectorAll("[" + sel + "]"), function (el) {
      if (el["__en_" + attr] == null) el["__en_" + attr] = el.getAttribute(attr) || "";
      el.setAttribute(attr, cur === "vi" ? el.getAttribute(sel) : el["__en_" + attr]);
    });
  }
  var cur = "en";   // HTML goc la tieng Anh
  function apply(lang) {
    if (lang === cur) return;
    cur = lang;
    window.__lang = lang;
    root.lang = lang;
    root.classList.toggle("lang-vi", lang === "vi");
    viFonts(lang === "vi");
    [].forEach.call(document.querySelectorAll("[data-vi]"), function (el) {
      if (el.__en == null) el.__en = el.innerHTML;
      el.innerHTML = lang === "vi" ? el.getAttribute("data-vi") : el.__en;
    });
    swapAttr("data-vi-desc", "data-desc");
    swapAttr("data-vi-content", "content");
    swapAttr("data-vi-aria", "aria-label");
    window.dispatchEvent(new CustomEvent("cloud:lang", { detail: lang }));
  }

  window.__lang = "en";
  // __t("English", "Tieng Viet") -> chuoi theo ngon ngu dang chon (dung trong cac file JS)
  window.__t = function (en, vi) { return window.__lang === "vi" ? vi : en; };
  window.__setLang = function (lang, remember) {
    if (remember) { try { localStorage.setItem(KEY, lang); } catch (e) { } }
    apply(lang);
  };

  // ---- nut gat EN [ o ] VI (dung chung cho man mo dau va header) ----
  var swCss = "" +
    ".lsw{display:inline-flex;align-items:center;gap:.9em;margin:0;padding:.5em .25em;border:0;background:none;color:inherit;" +
      "font-weight:inherit;line-height:1;text-transform:uppercase;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none}" +
    ".lsw:not(.mono){font-family:inherit}.lsw:not(.text-sm){font-size:inherit}" +
    ".lsw:focus{outline:none}.lsw:focus-visible .lsw__track{box-shadow:0 0 0 2px rgba(255,255,255,.35)}" +
    ".lsw__opt{opacity:.38;transition:opacity .5s cubic-bezier(.4,0,.2,1)}" +
    ".lsw:not(.is-vi) .lsw__opt--en,.lsw.is-vi .lsw__opt--vi{opacity:1}" +
    ".lsw__track{position:relative;flex:none;width:38px;height:20px;border:1px solid rgba(255,255,255,.38);border-radius:20px;" +
      "transition:border-color .3s ease,box-shadow .3s ease}" +
    ".lsw:hover .lsw__track{border-color:rgba(255,255,255,.85)}" +
    ".lsw__knob{position:absolute;top:3px;left:3px;width:12px;height:12px;" +
      "transition:transform .6s cubic-bezier(.65,0,.25,1)}" +
    ".lsw.is-vi .lsw__knob{transform:translateX(18px)}" +
    ".lsw__knob::after{content:'';position:absolute;inset:0;border-radius:12px;background:#fff}" +
    // keo gian giot nuoc khi chay qua (2 ten keyframe de lan nao bam cung chay lai)
    ".lsw.go-r .lsw__knob::after{animation:lswR .6s cubic-bezier(.65,0,.25,1)}" +
    ".lsw.go-l .lsw__knob::after{animation:lswL .6s cubic-bezier(.65,0,.25,1)}" +
    "@keyframes lswR{0%{transform:none}45%{transform:scaleX(1.75)}100%{transform:none}}" +
    "@keyframes lswL{0%{transform:none}45%{transform:scaleX(1.75)}100%{transform:none}}" +
    // vi tri tren header: mobile/tablet -> goc trai, ngang hang logo; desktop -> dung truoc "Work"
    ".header__lang .lsw{color:#fff;font-size:.8125rem}" +
    "@media (max-width:1023.98px){.header__lang{position:absolute;top:20px;left:18px;height:32px;display:flex;align-items:center}}" +
    "@media (min-width:768px) and (max-width:1023.98px){.header__lang{left:45px}}" +
    "@media (min-width:1280px){.header__nav__el.header__lang{margin-right:-40px}}" +
    "@media (prefers-reduced-motion: reduce){.lsw__knob{transition-duration:.01s}.lsw .lsw__knob::after{animation:none!important}}";
  var st = document.createElement("style");
  st.textContent = swCss;
  (document.head || root).appendChild(st);

  // tao 1 nut gat; onChange(lang) duoc goi moi lan doi
  window.__langSwitch = function (extraClass, onChange) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "lsw" + (extraClass ? " " + extraClass : "");
    b.setAttribute("role", "switch");
    b.setAttribute("aria-label", "Language / Ngôn ngữ — English / Tiếng Việt");
    b.innerHTML = '<span class="lsw__opt lsw__opt--en" aria-hidden="true">EN</span>' +
      '<span class="lsw__track" aria-hidden="true"><span class="lsw__knob"></span></span>' +
      '<span class="lsw__opt lsw__opt--vi" aria-hidden="true">VI</span>';
    function paint(lang) {
      b.classList.toggle("is-vi", lang === "vi");
      b.setAttribute("aria-checked", lang === "vi" ? "true" : "false");
    }
    paint(window.__lang);
    // ngon ngu doi o noi khac (vd man mo dau) -> nut nay cap nhat theo, khong animation
    window.addEventListener("cloud:lang", function (e) { paint(e.detail); });
    b.set = function (lang) {
      if ((lang === "vi") === b.classList.contains("is-vi")) return;
      b.classList.remove("go-r", "go-l");
      void b.offsetWidth;                       // cho animation chay lai
      b.classList.add(lang === "vi" ? "go-r" : "go-l");
      paint(lang);
      if (onChange) onChange(lang);
    };
    b.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      b.set(b.classList.contains("is-vi") ? "en" : "vi");
    });
    b.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); b.set("vi"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); b.set("en"); }
      else if (e.key === " ") { e.preventDefault(); e.stopPropagation(); b.click(); }
    });
    return b;
  };

  apply(detect());
})();

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
    ".boot__foot{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:clamp(28px,3.6vw,46px);" +
      "display:flex;flex-direction:column;align-items:center;gap:clamp(18px,2.2vw,26px)}" +
    ".boot .boot__enter{position:static;padding-left:.22em}" +
    ".boot__enter__txt{display:inline-block;transition:opacity .26s ease,transform .26s ease,filter .26s ease}" +
    ".boot__enter__txt.is-swap{opacity:0;transform:translateY(4px);filter:blur(2px)}" +
    ".boot__lang{font-size:.6875rem;letter-spacing:.22em;color:#fff;padding:12px 16px;margin:-12px -16px;opacity:0;transform:translateY(6px);transition:opacity .7s ease .15s,transform .7s cubic-bezier(.2,.7,.2,1) .15s}" +
    ".boot__foot.is-on .boot__lang{opacity:1;transform:none}" +
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

    var T = window.__t || function (en) { return en; };
    var hint = document.createElement("p");
    hint.className = "boot__enter mono uppercase";
    hint.innerHTML = '<span class="boot__enter__txt">' + T("Click to enter", "Nhấn để vào") + "</span>";
    var hintTxt = hint.firstChild;
    boot.setAttribute("aria-label", T("Click to enter", "Nhấn để vào"));

    // Nut chon ngon ngu ngay duoi dong "Click to enter". Gat -> doi chu ca trang
    // (dang bi man nay che nen nguoi xem khong thay nhay) + doi dong goi y.
    var foot = document.createElement("div");
    foot.className = "boot__foot";
    foot.appendChild(hint);
    var swapTimer = null;
    if (window.__langSwitch) {
      var sw = window.__langSwitch("boot__lang mono text-sm", function (lang) {
        window.__setLang(lang, true);
        var txt = lang === "vi" ? "Nhấn để vào" : "Click to enter";
        boot.setAttribute("aria-label", txt);
        clearTimeout(swapTimer);
        hintTxt.classList.add("is-swap");
        swapTimer = setTimeout(function () {
          hintTxt.textContent = txt;
          hintTxt.classList.remove("is-swap");
        }, 260);
      });
      foot.appendChild(sw);
    }

    var wrap = document.createElement("div");
    wrap.className = "boot__inner";
    wrap.appendChild(svg);
    wrap.appendChild(foot);
    boot.appendChild(wrap);

    host.insertBefore(boot, host.firstChild);
    root.classList.add("is-booting");

    var hintTimer = setTimeout(function () { foot.classList.add("is-on"); hint.classList.add("is-on"); }, SLOW ? 300 : ASSEMBLE);

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
      if (e.key === "Shift") return;
      // Mui ten trai/phai: doi ngon ngu thay vi vao trang
      if (sw && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        sw.set(e.key === "ArrowRight" ? "vi" : "en");
        return;
      }
      e.preventDefault();
      open();
    }
    boot.addEventListener("click", open);
    window.addEventListener("keydown", onKey);
    try { boot.focus({ preventScroll: true }); } catch (e) { }
  }

  if (seen) fadeInPage(); else gate();

  /* =========================================================================
     NUT NGON NGU TREN HEADER: gat -> nut chay xong -> trang fade toi -> tai lai
     bang ngon ngu moi (tai lai de animation chu cua template tach chu lai tu dau).
     ========================================================================= */
  if (window.__langSwitch) {
    [].forEach.call(document.querySelectorAll(".header__nav__list"), function (list) {
      var li = document.createElement("li");
      li.className = "header__nav__el header__lang";
      var hsw = window.__langSwitch("", function (lang) {
        try { localStorage.setItem("cloud-lang", lang); } catch (e) { }
        if (leaving) return;
        setTimeout(function () {
          leaving = document.createElement("div");
          leaving.className = "pagefade is-clear is-leave";
          leaving.setAttribute("aria-hidden", "true");
          document.body.appendChild(leaving);
          nextFrame(function () { leaving.classList.remove("is-clear"); });
          setTimeout(function () { location.reload(); }, PAGE_OUT + 40);
        }, 380);   // cho nut chay xong roi moi toi man
      });
      li.appendChild(hsw);
      list.insertBefore(li, list.firstChild);
    });
  }

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
    var T = window.__t || function (en) { return en; };
    box.innerHTML =
      '<div class="zqr__box">' +
        '<div class="zqr__bar mono text-sm uppercase">' +
          '<p class="zqr__title serif uppercase">Zalo</p>' +
          '<button class="btn btn--sm zqr__close" type="button">' + T("Close ✕", "Đóng ✕") + '</button>' +
        '</div>' +
        '<div class="zqr__card"><img class="zqr__code" alt="Zalo QR code" width="240" height="240" src="' + QR_SRC + '"></div>' +
        '<p class="zqr__hint mono text-sm uppercase">' + T("Scan with the Zalo app", "Quét bằng app Zalo") + '</p>' +
        '<a class="btn mono text-sm uppercase zqr__open" href="' + ZALO_URL + '" target="_blank" rel="noreferrer">' + T("Open in Zalo", "Mở trong Zalo") + ' <span>→</span></a>' +
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
