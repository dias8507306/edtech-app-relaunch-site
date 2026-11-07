/* EduApp — сайт: язык без перезагрузки, меню, «Жоғарыға», появление блоков, счётчики, демо кабинета,
   sticky CTA. Анимации за пределами экрана ставятся на паузу — прокрутка не тормозит. */
(function () {
  "use strict";
  var d = document, root = d.documentElement;
  root.classList.add("js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;
  var isHttp = /^https?:$/.test(location.protocol);
  var plainClick = function (e) { return !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0); };
  var smooth = function () { return reduce ? "auto" : "smooth"; };

  /* При открытии с диска (file://) ссылки на папки ведут в index.html: "../#programs" → "../index.html#programs" */
  if (location.protocol === "file:") {
    d.querySelectorAll("a[data-local-index]").forEach(function (a) {
      a.setAttribute("href", a.getAttribute("href").replace(/^([^#?]*\/)(?=[#?]|$)/, "$1index.html"));
    });
  }

  /* ---------- Язык: ҚАЗ | РУС без перезагрузки ----------
     Тексты помечены сборкой (data-i18n / data-i18n-html / data-i18n-attr), словари — в lp/i18n.js.
     Адрес меняется на / или /ru/ (history.pushState), кнопка «Назад» тоже работает. */
  var I18N = window.EA_I18N || null;
  var SITE = "https://eduapp.example.com/";
  var siteRoot = new URL(root.getAttribute("data-base") || "./", location.href).href;
  var pagePath = root.getAttribute("data-page") || "";        // "" — главная, "tests/" — тесты
  var metaKey = root.getAttribute("data-meta") || "meta";     // ключи title/desc этой страницы в словаре

  // Пути к картинкам и стилям делаем абсолютными: после смены адреса / ↔ /ru/ они не «сломаются»
  d.querySelectorAll("img[src], link[rel=stylesheet][href]").forEach(function (el) {
    var attr = el.tagName === "IMG" ? "src" : "href";
    if (!/^(https?:|data:|\/\/)/.test(el.getAttribute(attr))) el.setAttribute(attr, el[attr]);
  });

  function setMeta(sel, attr, val) { var el = d.querySelector(sel); if (el) el.setAttribute(attr, val); }

  function applyLang(lang, push) {
    if (!I18N || !I18N[lang] || lang === root.lang) return;
    var t = I18N[lang];
    root.lang = lang;
    d.querySelectorAll("[data-i18n]").forEach(function (el) { var v = t[el.getAttribute("data-i18n")]; if (v != null) el.textContent = v; });
    d.querySelectorAll("[data-i18n-html]").forEach(function (el) { var v = t[el.getAttribute("data-i18n-html")]; if (v != null) el.innerHTML = v; });
    d.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":"), v = t[p[1]];
        if (v != null) el.setAttribute(p[0], v);
      });
    });
    var url = SITE + (lang === "ru" ? "ru/" : "") + pagePath;
    d.title = t[metaKey + ".title"];
    setMeta('meta[name="description"]', "content", t[metaKey + ".desc"]);
    setMeta('meta[property="og:title"]', "content", t[metaKey + ".title"]);
    setMeta('meta[property="og:description"]', "content", t[metaKey + ".desc"]);
    setMeta('meta[property="og:locale"]', "content", lang === "ru" ? "ru_RU" : "kk_KZ");
    setMeta('meta[property="og:locale:alternate"]', "content", lang === "ru" ? "kk_KZ" : "ru_RU");
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('link[rel="canonical"]', "href", url);
    try { localStorage.setItem("zd-lang", lang); } catch (e) { /* приватный режим */ }
    if (push && isHttp) {
      var next = siteRoot + (lang === "ru" ? "ru/" : "") + pagePath + location.hash;
      var state = { lang: lang, trial: root.classList.contains("trial-open") };
      // Пока открыт сынақ тест, не плодим записи в истории — «Назад» должен закрыть окно
      if (state.trial) history.replaceState(state, "", next); else history.pushState(state, "", next);
    }
    if (demoRefresh) demoRefresh();
    d.dispatchEvent(new CustomEvent("zd:lang", { detail: lang }));
  }
  window.ZD = { setLang: function (l) { applyLang(l, true); } };

  if (isHttp) history.replaceState({ lang: root.lang, trial: false }, "");
  d.addEventListener("click", function (e) {
    var a = e.target.closest("[data-lang]");
    if (!a || !I18N || !plainClick(e)) return;
    e.preventDefault();
    applyLang(a.getAttribute("data-lang"), true);
  });
  window.addEventListener("popstate", function (e) {
    var lang = e.state && e.state.lang;
    if (!lang && isHttp) lang = location.href.indexOf(siteRoot + "ru/") === 0 ? "ru" : "kk";
    if (lang) applyLang(lang, false);
  });

  /* ---------- Логотип и «Жоғарыға»: плавно наверх ---------- */
  function toTop() { window.scrollTo({ top: 0, behavior: smooth() }); }
  d.querySelectorAll("[data-home]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (!plainClick(e)) return;
      e.preventDefault();
      setDrawer(false);
      toTop();
      if (location.hash && isHttp) history.replaceState(history.state, "", location.pathname + location.search);
    });
  });

  var totop = d.querySelector("[data-totop]");
  var totopVal = totop && totop.querySelector(".totop-val");

  /* ---------- Header + прогресс прокрутки (один обработчик, не чаще кадра) ---------- */
  var hdr = d.querySelector("[data-hdr]");
  var scrollRaf = 0;
  function onScrollFrame() {
    scrollRaf = 0;
    var y = window.scrollY;
    hdr.classList.toggle("is-scrolled", y > 8);
    if (totop) {
      var show = y > 300;
      totop.classList.toggle("show", show);
      totop.tabIndex = show ? 0 : -1;
      var max = root.scrollHeight - window.innerHeight;
      if (totopVal) totopVal.style.strokeDashoffset = String(100 - (max > 0 ? Math.min(100, (y / max) * 100) : 0));
    }
  }
  onScrollFrame();
  window.addEventListener("scroll", function () { if (!scrollRaf) scrollRaf = requestAnimationFrame(onScrollFrame); }, { passive: true });
  if (totop) totop.addEventListener("click", toTop);

  /* ---------- Mobile drawer ---------- */
  var burger = d.querySelector(".burger");
  var drawer = d.getElementById("drawer");
  var sticky = d.querySelector("[data-sticky-cta]");
  function setDrawer(open) {
    drawer.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
    root.classList.toggle("no-scroll", open);
    if (open) drawer.removeAttribute("inert"); else drawer.setAttribute("inert", "");
    if (sticky) sticky.style.visibility = open ? "hidden" : "";
  }
  burger.addEventListener("click", function () { setDrawer(!drawer.classList.contains("open")); });
  drawer.addEventListener("click", function (e) { if (e.target.closest("a")) setDrawer(false); });
  window.addEventListener("keydown", function (e) { if (e.key === "Escape") setDrawer(false); });
  window.matchMedia("(min-width:1100px)").addEventListener("change", function (e) { if (e.matches) setDrawer(false); });

  /* ---------- Count-up (в DOM всегда финальное число — его видят поисковики) ---------- */
  function count(el) {
    if (el.dataset.counting) return;
    var target = +el.dataset.count;
    if (reduce) { el.textContent = String(target); return; }
    el.dataset.counting = "1";
    var t0 = performance.now(), dur = 1500;
    (function tick(t) {
      // rAF-время кадра может быть чуть раньше t0 — без нижней границы на старте мелькали отрицательные числа
      var p = Math.max(0, Math.min(1, (t - t0) / dur));
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(tick); else delete el.dataset.counting;
    })(t0);
  }

  /* ---------- Demo кабинета: сайдбар с плавным индикатором, авто-показ вкладок ---------- */
  var demo = d.querySelector("[data-demo]");
  var demoStart = function () {};
  var demoRefresh = null;
  if (demo) {
    var nav = demo.querySelector(".app-nav");
    var ind = demo.querySelector(".app-ind");
    var tabs = [].slice.call(demo.querySelectorAll("[role=tab]"));
    var auto = null, interacted = false, started = false;

    var moveInd = function (btn) {
      ind.style.width = btn.offsetWidth + "px";
      ind.style.height = btn.offsetHeight + "px";
      ind.style.transform = "translate(" + btn.offsetLeft + "px," + btn.offsetTop + "px)";
    };
    var current = function () {
      for (var i = 0; i < tabs.length; i++) if (tabs[i].getAttribute("aria-selected") === "true") return i;
      return 0;
    };
    var select = function (btn, focus) {
      tabs.forEach(function (t) {
        var on = t === btn;
        var panel = d.getElementById(t.getAttribute("aria-controls"));
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        if (on) {
          panel.hidden = false;
          panel.classList.remove("play");
          void panel.offsetWidth; // перезапуск анимаций панели
          panel.classList.add("play");
          panel.querySelectorAll("[data-count]").forEach(count);
        } else {
          panel.hidden = true;
          panel.classList.remove("play");
        }
      });
      moveInd(btn);
      var urlEl = demo.querySelector("[data-demo-url]");
      if (urlEl && btn.dataset.url) urlEl.textContent = btn.dataset.url;
      if (nav.scrollWidth > nav.clientWidth) {
        nav.scrollTo({ left: btn.offsetLeft - nav.clientWidth / 2 + btn.offsetWidth / 2, behavior: smooth() });
      }
      if (focus) btn.focus();
    };
    var stopAuto = function () { clearInterval(auto); auto = null; };
    var startAuto = function () {
      if (reduce || interacted || auto || !started) return;
      auto = setInterval(function () { select(tabs[(current() + 1) % tabs.length]); }, 4200);
    };

    tabs.forEach(function (t) {
      t.addEventListener("click", function () { interacted = true; stopAuto(); select(t); });
    });
    nav.addEventListener("keydown", function (e) {
      var i = tabs.indexOf(d.activeElement);
      if (i < 0) return;
      var n = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") n = (i + 1) % tabs.length;
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
      if (e.key === "Home") n = 0;
      if (e.key === "End") n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); interacted = true; stopAuto(); select(tabs[n], true); }
    });
    demo.addEventListener("pointerenter", stopAuto);
    demo.addEventListener("pointerleave", startAuto);
    demo.addEventListener("focusin", stopAuto);
    if (hasIO) new IntersectionObserver(function (en) { if (en[0].isIntersecting) startAuto(); else stopAuto(); }).observe(demo);
    window.addEventListener("resize", function () { moveInd(tabs[current()]); });
    moveInd(tabs[0]);
    demoStart = function () {
      if (started) return;
      started = true;
      select(tabs[current()]);
      startAuto();
    };
    // Подписи вкладок другой длины на другом языке — индикатор подстраиваем
    demoRefresh = function () { moveInd(tabs[current()]); };
  }

  /* ---------- Появление блоков при прокрутке ---------- */
  var reveals = d.querySelectorAll(".reveal");
  function onIn(el) {
    el.classList.add("in");
    el.querySelectorAll("[data-count]").forEach(function (c) { if (!c.closest(".app-panel")) count(c); });
    if (el.hasAttribute("data-demo")) demoStart();
  }
  if (hasIO && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        onIn(en.target);
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(onIn);
  }

  /* ---------- Режим «идёт прокрутка» ----------
     Пока страницу прокручивают, на <html> висит класс is-scrolling: CSS ставит анимации карты на паузу и
     выключает размытие стекла (его пересчёт на каждом кадре — самое дорогое). Через 180 мс после остановки всё возвращается. */
  var onScrollState = [];
  var scrollStop = 0;
  window.addEventListener("scroll", function () {
    if (!root.classList.contains("is-scrolling")) {
      root.classList.add("is-scrolling");
      onScrollState.forEach(function (fn) { fn(); });
    }
    clearTimeout(scrollStop);
    scrollStop = setTimeout(function () {
      root.classList.remove("is-scrolling");
      onScrollState.forEach(function (fn) { fn(); });
    }, 180);
  }, { passive: true });

  /* ---------- «Оқу орбитасы»: SMIL-комета на паузе вне экрана и при прокрутке, 3D-наклон узлов ---------- */
  var orbit = d.querySelector("[data-orbit]");
  if (orbit) {
    var osvg = orbit.querySelector("svg");
    var orbitVisible = true;
    var syncComet = function () {
      if (!osvg || !osvg.pauseAnimations) return;
      if (orbitVisible && !reduce && !root.classList.contains("is-scrolling")) osvg.unpauseAnimations(); else osvg.pauseAnimations();
    };
    onScrollState.push(syncComet);
    if (hasIO) new IntersectionObserver(function (en) { orbitVisible = en[0].isIntersecting; syncComet(); }).observe(orbit);
    syncComet();

    // 3D-наклон шара к курсору (переменные --rx/--ry читает CSS)
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduce) {
      orbit.querySelectorAll(".ob-node").forEach(function (n) {
        var orb = n.querySelector(".ob-orb");
        n.addEventListener("pointermove", function (e) {
          var r = orb.getBoundingClientRect();
          var x = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
          var y = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
          orb.style.setProperty("--ry", (x * 34).toFixed(1) + "deg");
          orb.style.setProperty("--rx", (-y * 34).toFixed(1) + "deg");
        });
        n.addEventListener("pointerleave", function () { orb.style.removeProperty("--rx"); orb.style.removeProperty("--ry"); });
      });
    }
  }

  /* ---------- Пауза анимаций вне экрана ----------
     Бесконечные анимации (монеты, свечения) работают только в видимых блоках.
     Раньше они крутились по всей странице сразу, и прокрутка вверх «застревала» на слабых ноутбуках. */
  if (hasIO) {
    var offIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle("is-off", !en.isIntersecting); });
    }, { rootMargin: "120px 0px" });
    d.querySelectorAll("main > section, .footer").forEach(function (s) { offIO.observe(s); });
  }

  /* ---------- Sticky CTA на мобильном: после первого экрана и до футера ---------- */
  var heroCta = d.querySelector("[data-hero-cta]");
  var footer = d.querySelector(".footer");
  if (sticky && heroCta && footer && hasIO) {
    var pastHero = false, atFooter = false;
    var upd = function () { sticky.classList.toggle("show", pastHero && !atFooter); };
    new IntersectionObserver(function (en) {
      pastHero = !en[0].isIntersecting && en[0].boundingClientRect.top < 0; upd();
    }).observe(heroCta);
    new IntersectionObserver(function (en) { atFooter = en[0].isIntersecting; upd(); }).observe(footer);
  }

  d.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
