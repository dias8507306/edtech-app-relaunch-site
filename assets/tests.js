/* EduApp — страница «Тесттер»: каталог сынақ тестов (данные — window.EA_TESTS из lp/tests-data.js).
   Сыныптар (қазақ / орыс) → бағыт (ҰБТ, НЗМ, БИЛ, РФММ, сыныптар бойынша) → бөлім → тесттер.
   Фильтры: пән, сынып (для «Сыныптар бойынша»), поиск по названию. Адрес: #kk/ubt или #kk/ubt/112 (открытый раздел).
   Функции отрисовки чистые: build.mjs вызывает их в Node, чтобы готовый HTML каталога видели поисковики. */
(function (global) {
  "use strict";

  // Куда ведёт «Бастау». Сейчас тесты проходят на eduapp.example.com. Когда тесты переедут на платформу
  // eduapp.example.com, поменяйте адрес здесь — больше ничего менять не нужно.
  var TEST_URL = function (id) { return "https://eduapp.example.com/Test/Overview/" + id; };

  var PACKAGES = ["ubt", "nis", "bil", "rfmm", "grades"];
  // Названия предметов: на старом сайте у казахских классов они на казахском, у русских — на русском
  var SUBJ_RU = {
    "Ағылшын тілі": "Английский язык", "Оқу сауаттылығы": "Грамотность чтения", "Қазақ әдебиеті": "Казахская литература",
    "Сандық сипаттамалар": "Числовые характеристики", "Орыс тілі": "Русский язык", "Қазақстан тарихы": "История Казахстана",
    "Қазақ тілі": "Казахский язык", "Дүниежүзі тарихы": "Всемирная история", "Адам және құқық": "Человек и право",
    "Математикалық сауаттылық": "Математическая грамотность"
  };
  var SUBJ_KK = {};
  Object.keys(SUBJ_RU).forEach(function (k) { SUBJ_KK[SUBJ_RU[k]] = k; });

  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var subjName = function (name, lang) { return (lang === "ru" ? SUBJ_RU[name] : SUBJ_KK[name]) || name; };
  // «МАТЕМАТИКА+ФИЗИКА» — разрешаем перенос строки после «+»
  var escT = function (s) { return esc(s).replace(/\+/g, "+<wbr>"); };
  var norm = function (s) { return String(s).toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim(); };

  var ICON = {
    clock: '<svg class="ti" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    cap: '<svg class="ti" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>',
    list: '<svg class="ti" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>',
    search: '<svg class="ti" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    next: '<svg class="ti" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>',
    back: '<svg class="ti" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
    book: '<svg class="ti" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'
  };

  function pkgData(data, st) { return data.packages[st.pk] && data.packages[st.pk][st.cls]; }

  // Тест подходит под фильтры?
  function match(test, st) {
    if (st.subject && (!test.subjects || test.subjects.indexOf(st.subject) < 0)) return false;
    if (st.grade && test.grade !== st.grade) return false;
    if (st.q && norm(test.title + " " + (test.desc || "")).indexOf(norm(st.q)) < 0) return false;
    return true;
  }

  function countAll(p) { return p ? p.sections.reduce(function (n, s) { return n + s.tests.length; }, 0) : 0; }

  /* ---------- Панель: сыныптар, бағыттар, фильтры ---------- */
  function renderToolbar(st, data, t) {
    var tabs = PACKAGES.map(function (k) {
      var on = st.pk === k, n = countAll(data.packages[k] && data.packages[k][st.cls]);
      return '<button type="button" class="ts-tab" role="tab" aria-selected="' + on + '" data-pk="' + k + '"><span>' + esc(t("pk." + k)) + "</span><b>" + n + "</b></button>";
    }).join("");
    var p = pkgData(data, st);
    var subjects = (p ? p.subjects : []).map(function (s) {
      return '<option value="' + s.id + '"' + (st.subject === s.id ? " selected" : "") + ">" + esc(subjName(s.name, st.lang)) + "</option>";
    }).join("");
    var grades = p && p.grades && p.grades.length
      ? '<label class="ts-field"><span>' + esc(t("tests.gradeL")) + '</span><select data-f="grade"><option value="0">' + esc(t("tests.allGrades")) + "</option>" +
        p.grades.map(function (g) { return '<option value="' + g + '"' + (st.grade === g ? " selected" : "") + ">" + esc(t("tests.gradeN", { n: g })) + "</option>"; }).join("") + "</select></label>"
      : "";
    return '<div class="ts-cls" role="group" aria-label="' + esc(t("tests.cls")) + '"><span class="ts-cls-l">' + esc(t("tests.cls")) + ":</span>" +
        '<span class="ts-seg"><button type="button" data-cls="kk" aria-pressed="' + (st.cls === "kk") + '">' + esc(t("tests.clsKk")) + "</button>" +
        '<button type="button" data-cls="ru" aria-pressed="' + (st.cls === "ru") + '">' + esc(t("tests.clsRu")) + "</button></span></div>" +
      '<div class="ts-tabs" role="tablist" aria-label="' + esc(t("tests.pkL")) + '">' + tabs + "</div>" +
      '<form class="ts-filters" role="search" onsubmit="return false">' +
        '<label class="ts-field"><span>' + esc(t("tests.subjectL")) + '</span><select data-f="subject"><option value="0">' + esc(t("tests.allSubjects")) + "</option>" + subjects + "</select></label>" +
        grades +
        '<label class="ts-field ts-search"><span>' + esc(t("tests.searchL")) + "</span>" + ICON.search + '<input type="search" data-f="q" value="' + esc(st.q) + '" placeholder="' + esc(t("tests.searchPh")) + '" autocomplete="off"></label>' +
      "</form>";
  }

  /* ---------- Карточки ---------- */
  function testCard(test, st, t, p, sectionTitle) {
    var subj = (test.subjects || []).map(function (id) {
      for (var k = 0; k < p.subjects.length; k++) if (p.subjects[k].id === id) return subjName(p.subjects[k].name, st.lang);
      return null;
    }).filter(Boolean);
    var chips = subj.slice(0, 3).map(function (s) { return "<span>" + esc(s) + "</span>"; }).join("") + (subj.length > 3 ? "<span>+" + (subj.length - 3) + "</span>" : "");
    var meta = (test.minutes ? "<li>" + ICON.clock + esc(test.minutes + " " + t("tests.min")) + "</li>" : "") +
      (test.grade ? "<li>" + ICON.cap + esc(t("tests.gradeN", { n: test.grade })) + "</li>" : "") +
      (test.questions ? "<li>" + ICON.list + esc(test.questions + " " + t("tests.q")) + "</li>" : "");
    var price = test.price === 0 ? '<b class="ts-price ts-free">' + esc(t("tests.freePrice")) + "</b>"
      : test.price ? '<b class="ts-price">' + esc(String(test.price).replace(/\B(?=(\d{3})+(?!\d))/g, " ")) + " ₸</b>" : "<b></b>";
    return '<article class="ts-test">' +
      (sectionTitle ? '<p class="ts-test-sec">' + esc(sectionTitle) + "</p>" : "") +
      "<h3>" + escT(test.title) + "</h3>" +
      (test.desc && norm(test.desc) !== norm(test.title) ? '<p class="ts-test-d">' + esc(test.desc) + "</p>" : "") +
      (meta ? '<ul class="ts-meta">' + meta + "</ul>" : "") +
      (chips ? '<p class="ts-chips">' + chips + "</p>" : "") +
      '<div class="ts-foot">' + price + '<a class="btn btn-gold btn-sm" href="' + TEST_URL(test.id) + '">' + esc(t("tests.start")) + ICON.next + "</a></div></article>";
  }

  function sectionCard(sec, n, free, st, t, base) {
    var ico = sec.img ? '<img src="' + base + "lp/tests/" + esc(sec.img) + '" alt="" width="56" height="56" loading="lazy">' : ICON.book;
    return '<a class="ts-sec" href="#' + st.cls + "/" + st.pk + "/" + sec.id + '" data-sec="' + sec.id + '">' +
      '<span class="ts-sec-ico">' + ico + "</span>" +
      '<span class="ts-sec-t"><b>' + escT(sec.title) + "</b><span>" + esc(t("tests.count", { n: n })) + (free ? ' · <em>' + esc(t("tests.freeN", { n: free })) + "</em>" : "") + "</span></span>" +
      '<span class="ts-sec-go">' + ICON.next + "</span></a>";
  }

  /* ---------- Содержимое: бөлімдер / тесты раздела / результаты поиска ---------- */
  function renderContent(st, data, t, base) {
    var p = pkgData(data, st);
    if (!p || !p.sections.length) return '<p class="ts-empty">' + esc(t("tests.empty")) + "</p>";

    if (st.section) {
      var sec = null;
      p.sections.forEach(function (s) { if (s.id === st.section) sec = s; });
      if (sec) {
        var list = sec.tests.filter(function (x) { return match(x, st); });
        return '<div class="ts-head"><a class="ts-back" href="#' + st.cls + "/" + st.pk + '" data-back>' + ICON.back + "<span>" + esc(t("tests.back")) + "</span></a>" +
          '<h2 class="ts-h2" tabindex="-1">' + escT(sec.title) + "</h2><p class=\"ts-sum\">" + esc(t("tests.found", { n: list.length })) + "</p></div>" +
          (list.length ? '<div class="ts-grid">' + list.map(function (x) { return testCard(x, st, t, p); }).join("") + "</div>" : '<p class="ts-empty">' + esc(t("tests.empty")) + "</p>");
      }
    }

    if (st.q) {
      var found = [];
      p.sections.forEach(function (s) { s.tests.forEach(function (x) { if (match(x, st)) found.push([x, s.title]); }); });
      return '<div class="ts-head"><h2 class="ts-h2" tabindex="-1">' + esc(t("tests.results")) + '</h2><p class="ts-sum">' + esc(t("tests.found", { n: found.length })) + "</p></div>" +
        (found.length ? '<div class="ts-grid">' + found.map(function (f) { return testCard(f[0], st, t, p, f[1]); }).join("") + "</div>" : '<p class="ts-empty">' + esc(t("tests.empty")) + "</p>");
    }

    var total = 0, cards = "";
    p.sections.forEach(function (s) {
      var list = s.tests.filter(function (x) { return match(x, st); });
      if (!list.length) return;
      total += list.length;
      cards += sectionCard(s, list.length, list.filter(function (x) { return x.price === 0; }).length, st, t, base);
    });
    return '<div class="ts-head"><h2 class="ts-h2" tabindex="-1">' + esc(t("pk." + st.pk) + " · " + t(st.cls === "kk" ? "tests.clsKk" : "tests.clsRu")) + '</h2><p class="ts-sum">' + esc(t("tests.found", { n: total })) + "</p></div>" +
      (cards ? '<div class="ts-secs">' + cards + "</div>" : '<p class="ts-empty">' + esc(t("tests.empty")) + "</p>");
  }

  function renderApp(st, data, t, base) {
    return '<div class="ts-bar" data-ts-bar>' + renderToolbar(st, data, t) + '</div><div class="ts-content" data-ts-content aria-live="polite">' + renderContent(st, data, t, base) + "</div>";
  }

  var api = { renderApp: renderApp, PACKAGES: PACKAGES };
  global.ZDTests = api;

  /* ================= Браузер ================= */
  if (typeof document === "undefined" || !document.querySelector) return;
  var d = document, root = d.documentElement;
  var app = d.querySelector("[data-tests]");
  var DATA = global.EA_TESTS, I18N = global.EA_I18N;
  if (!app || !DATA || !I18N) return;
  var base = new URL(root.getAttribute("data-base") || "./", location.href).href;
  var reduce = global.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var lang = function () { return root.lang === "ru" ? "ru" : "kk"; };
  var t = function (key, params) {
    var s = I18N[lang()][key] || I18N.kk[key] || key;
    if (params) s = s.replace(/\{(\w+)\}/g, function (_, k) { return k in params ? params[k] : "{" + k + "}"; });
    return s;
  };

  var st = { lang: lang(), cls: lang(), pk: "ubt", subject: 0, grade: 0, q: "", section: null };
  var clsChosen = false; // пока пользователь сам не выбрал классы, они следуют за языком сайта

  function fromHash() {
    var m = location.hash.match(/^#(kk|ru)\/(ubt|nis|bil|rfmm|grades)(?:\/(\d+))?$/);
    if (!m) return false;
    if (m[1] !== st.cls || m[2] !== st.pk) { st.subject = 0; st.grade = 0; st.q = ""; }
    st.cls = m[1]; st.pk = m[2]; st.section = m[3] ? +m[3] : null;
    clsChosen = true;
    return true;
  }

  function setHash(push) {
    var h = "#" + st.cls + "/" + st.pk + (st.section ? "/" + st.section : "");
    if (location.hash === h) return;
    if (push) history.pushState(history.state, "", h); else history.replaceState(history.state, "", h);
  }

  function renderAll() { st.lang = lang(); app.innerHTML = renderApp(st, DATA, t, base); }
  function renderContentOnly() { app.querySelector("[data-ts-content]").innerHTML = renderContent(st, DATA, t, base); }
  // Прокрутка к списку: к началу каталога (при смене бағыт из меню) или к результатам (при открытии раздела)
  function toTop(toContent) {
    var el = toContent ? app.querySelector("[data-ts-content]") : app;
    var y = el.getBoundingClientRect().top + global.scrollY - 100;
    if (Math.abs(global.scrollY - y) > 40) global.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  }

  app.addEventListener("click", function (e) {
    var b = e.target.closest("[data-cls],[data-pk]");
    if (b) {
      clsChosen = true; // начал выбирать в каталоге — смена языка сайта больше не сбрасывает его выбор
      if (b.hasAttribute("data-cls")) st.cls = b.getAttribute("data-cls");
      else st.pk = b.getAttribute("data-pk");
      st.subject = 0; st.grade = 0; st.q = ""; st.section = null;
      setHash(false);
      renderAll();
      return;
    }
    var link = e.target.closest("a[data-sec],a[data-back]");
    if (link && !(e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0)) {
      e.preventDefault();
      clsChosen = true;
      st.section = link.hasAttribute("data-sec") ? +link.getAttribute("data-sec") : null;
      setHash(!!st.section);
      renderContentOnly();
      toTop(true);
      var h = app.querySelector(".ts-h2");
      if (h) h.focus({ preventScroll: true });
    }
  });

  app.addEventListener("change", function (e) {
    var f = e.target.getAttribute("data-f");
    if (f === "subject" || f === "grade") { st[f] = +e.target.value; renderContentOnly(); }
  });
  var typing = 0;
  app.addEventListener("input", function (e) {
    if (e.target.getAttribute("data-f") !== "q") return;
    clearTimeout(typing);
    var v = e.target.value;
    typing = setTimeout(function () { st.q = v.trim(); if (st.q) st.section = null; renderContentOnly(); }, 160);
  });

  // Ссылки из меню «Тесттер» (#kk/ubt …) и кнопки «Назад» в браузере
  global.addEventListener("hashchange", function () { if (fromHash()) { renderAll(); toTop(); } });
  global.addEventListener("popstate", function () { if (fromHash()) renderAll(); });
  // Сменили язык сайта: переводим интерфейс; если классы не выбраны вручную — переключаем и их
  d.addEventListener("zd:lang", function () {
    if (!clsChosen) { st.cls = lang(); st.subject = 0; st.grade = 0; st.section = null; }
    renderAll();
  });

  fromHash();
  renderAll();
})(typeof window !== "undefined" ? window : globalThis);
