/* EduApp — «Тегін сынақ тест»: отдельная страница внутри сайта (полноэкранное окно, адрес #sinaq-test).
   Шаги: Формат → Пән → Тест → Нәтиже.
     • Оффлайн → кнопка «Instagram-ға жазу» (OFFLINE_URL; позже можно заменить, например, на WhatsApp или форму).
     • Онлайн  → выбор предмета → 8 вопросов → результат по темам → «Тестті жалғастыру — тіркелу» (REGISTER_URL).
   Открывается любой ссылкой с атрибутом data-trial. Тексты — в src/i18n/*.json (ключи trial.*), вопросы — в BANK ниже. */
(function () {
  "use strict";
  var REGISTER_URL = "https://eduapp.example.com/register";
  var OFFLINE_URL = "https://ig.me/m/eduapp_demo"; // личные сообщения Instagram @eduapp_demo
  var HASH = "#sinaq-test";

  var d = document, root = d.documentElement;
  var box = d.getElementById("trial");
  var I18N = window.EA_I18N;
  if (!box || !I18N) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Банк вопросов: 4 предмета × 8 вопросов (4 темы × 2). c — индекс правильного ответа ---------- */
  var SUBJECTS = [
    { id: "math", icon: "calc", name: { kk: "Математика", ru: "Математика" }, topics: [
      ["arith", "Арифметика", "Арифметика"],
      ["fractions", "Бөлшектер мен пайыздар", "Дроби и проценты"],
      ["equations", "Теңдеулер және мәтінді есептер", "Уравнения и текстовые задачи"],
      ["geometry", "Геометрия", "Геометрия"]] },
    { id: "english", icon: "lang", name: { kk: "Ағылшын тілі", ru: "Английский язык" }, topics: [
      ["tenses", "Шақтар (Tenses)", "Времена (Tenses)"],
      ["vocab", "Лексика", "Лексика"],
      ["preps", "Предлогтар", "Предлоги"],
      ["reading", "Мәтінді түсіну", "Понимание текста"]] },
    { id: "logic", icon: "puzzle", name: { kk: "Логика", ru: "Логика" }, topics: [
      ["patterns", "Сандық заңдылықтар", "Числовые закономерности"],
      ["analogies", "Аналогиялар", "Аналогии"],
      ["reasoning", "Логикалық тұжырымдар", "Логические выводы"],
      ["spatial", "Кеңістіктік ойлау", "Пространственное мышление"]] },
    { id: "kazakh", icon: "book", name: { kk: "Қазақ тілі", ru: "Казахский язык" }, topics: [
      ["phonetics", "Фонетика", "Фонетика"],
      ["lexicon", "Лексика", "Лексика"],
      ["morphology", "Морфология (сөз таптары)", "Морфология (части речи)"],
      ["syntax", "Синтаксис", "Синтаксис"]] }
  ];

  // q и a: строка/массив (одинаково на обоих языках) или { kk, ru }
  var BANK = {
    math: [
      { t: "arith", q: { kk: "Есепте: 125 · 8 − 999", ru: "Вычисли: 125 · 8 − 999" }, a: ["0", "1", "11", "101"], c: 1 },
      { t: "fractions", q: { kk: "Есепте: 3/4 + 1/6", ru: "Вычисли: 3/4 + 1/6" }, a: ["4/10", "11/12", "1/2", "5/6"], c: 1 },
      { t: "equations", q: { kk: "Теңдеуді шеш: 5(x − 2) = 3x + 4", ru: "Реши уравнение: 5(x − 2) = 3x + 4" }, a: ["3", "5", "7", "9"], c: 2 },
      { t: "geometry", q: { kk: "Тіктөртбұрыштың периметрі 30 см, ұзындығы 9 см. Оның ауданы қанша?", ru: "Периметр прямоугольника 30 см, длина 9 см. Чему равна его площадь?" }, a: ["36 см²", "45 см²", "54 см²", "63 см²"], c: 2 },
      { t: "arith", q: { kk: "36 және 48 сандарының ең үлкен ортақ бөлгіші (ЕҮОБ) неге тең?", ru: "Чему равен наибольший общий делитель (НОД) чисел 36 и 48?" }, a: ["6", "8", "12", "24"], c: 2 },
      { t: "fractions", q: { kk: "Кітаптың бағасы 2 000 ₸. 15% жеңілдікпен ол қанша тұрады?", ru: "Книга стоит 2 000 ₸. Сколько она будет стоить со скидкой 15%?" }, a: ["1 700 ₸", "1 850 ₸", "1 500 ₸", "300 ₸"], c: 0 },
      { t: "equations", q: { kk: "Әкесі ұлынан 4 есе үлкен. 20 жылдан кейін ол ұлынан 2 есе үлкен болады. Ұлы қазір нешеде?", ru: "Отец в 4 раза старше сына. Через 20 лет он будет старше сына в 2 раза. Сколько лет сыну сейчас?" }, a: ["8", "10", "12", "15"], c: 1 },
      { t: "geometry", q: { kk: "Үшбұрыштың екі бұрышы 47° және 68°. Үшінші бұрышы неге тең?", ru: "Два угла треугольника равны 47° и 68°. Чему равен третий угол?" }, a: ["55°", "65°", "75°", "115°"], c: 1 }
    ],
    english: [
      { t: "tenses", q: "She ___ to school every day.", a: ["go", "goes", "is go", "going"], c: 1 },
      { t: "vocab", q: "Choose the opposite of «ancient».", a: ["old", "modern", "huge", "famous"], c: 1 },
      { t: "preps", q: "My birthday is ___ May.", a: ["on", "at", "in", "by"], c: 2 },
      { t: "reading", q: "«Aru gets up at 7. She has breakfast and walks to school with her brother.» How does Aru get to school?", a: ["By bus", "On foot", "By car", "By bike"], c: 1 },
      { t: "tenses", q: "Yesterday we ___ a great film.", a: ["watch", "watches", "watched", "have watch"], c: 2 },
      { t: "vocab", q: "A person who repairs cars is a ___.", a: ["mechanic", "cashier", "pilot", "dentist"], c: 0 },
      { t: "preps", q: "The cat is hiding ___ the bed.", a: ["under", "between", "during", "since"], c: 0 },
      { t: "reading", q: "«The museum opens at 10 a.m. and closes at 6 p.m. It is closed on Mondays.» When can you NOT visit the museum?", a: ["Saturday at 11 a.m.", "Monday at noon", "Friday at 5 p.m.", "Sunday at 2 p.m."], c: 1 }
    ],
    logic: [
      { t: "patterns", q: { kk: "Қатарды жалғастыр: 3, 6, 12, 24, …", ru: "Продолжи ряд: 3, 6, 12, 24, …" }, a: ["30", "36", "48", "50"], c: 2 },
      { t: "analogies", q: { kk: "Дәрігер : аурухана = мұғалім : ?", ru: "Врач : больница = учитель : ?" }, a: { kk: ["оқушы", "кітап", "мектеп", "сабақ"], ru: ["ученик", "книга", "школа", "урок"] }, c: 2 },
      { t: "reasoning", q: { kk: "Барлық мысықтың құйрығы бар. Мұрқа — мысық. Демек…", ru: "У всех кошек есть хвост. Мурка — кошка. Значит…" }, a: { kk: ["Мұрқаның құйрығы жоқ", "Мұрқаның құйрығы бар", "Барлық жануар — мысық", "Мұрқа — ит"], ru: ["У Мурки нет хвоста", "У Мурки есть хвост", "Все животные — кошки", "Мурка — собака"] }, c: 1 },
      { t: "spatial", q: { kk: "Текшенің неше қыры бар?", ru: "Сколько рёбер у куба?" }, a: ["6", "8", "12", "24"], c: 2 },
      { t: "patterns", q: { kk: "Қатарды жалғастыр: 1, 4, 9, 16, 25, …", ru: "Продолжи ряд: 1, 4, 9, 16, 25, …" }, a: ["35", "36", "40", "49"], c: 1 },
      { t: "analogies", q: { kk: "Аяқ : бәтеңке = қол : ?", ru: "Нога : ботинок = рука : ?" }, a: { kk: ["саусақ", "қолғап", "сағат", "жең"], ru: ["палец", "перчатка", "часы", "рукав"] }, c: 1 },
      { t: "reasoning", q: { kk: "Асан Бекеттен ұзын, Бекет Динадан ұзын. Кім ең аласа?", ru: "Асан выше Бекета, Бекет выше Дины. Кто самый низкий?" }, a: { kk: ["Асан", "Бекет", "Дина", "Анықтау мүмкін емес"], ru: ["Асан", "Бекет", "Дина", "Определить нельзя"] }, c: 2 },
      { t: "spatial", q: { kk: "Сағат 3:00-де сағат пен минут тілдерінің арасындағы бұрыш қанша?", ru: "Какой угол между часовой и минутной стрелками в 3:00?" }, a: ["30°", "90°", "120°", "180°"], c: 1 }
    ],
    kazakh: [
      { t: "phonetics", q: { kk: "Жуан дауысты дыбыстар қатарын тап.", ru: "Найди ряд твёрдых (жуан) гласных." }, a: ["а, о, ұ, ы", "ә, ө, ү, і", "е, і, ү, ө", "и, у, ю, я"], c: 0 },
      { t: "lexicon", q: { kk: "«Батыл» сөзінің синонимін тап.", ru: "Найди синоним к слову «батыл» (смелый)." }, a: ["қорқақ", "ержүрек", "жалқау", "ақылды"], c: 1 },
      { t: "morphology", q: { kk: "Сын есімді тап.", ru: "Найди имя прилагательное (сын есім)." }, a: ["жүгірді", "әдемі", "кітап", "бес"], c: 1 },
      { t: "syntax", q: { kk: "«Оқушылар кітапханадан жаңа кітап алды» сөйлеміндегі бастауышты тап.", ru: "Найди подлежащее (бастауыш) в предложении «Оқушылар кітапханадан жаңа кітап алды»." }, a: ["кітапханадан", "жаңа", "Оқушылар", "алды"], c: 2 },
      { t: "phonetics", q: { kk: "Қай сөз жіңішке дауыстылардан тұрады?", ru: "Какое слово состоит из мягких гласных?" }, a: ["бала", "қала", "мектеп", "орман"], c: 2 },
      { t: "lexicon", q: { kk: "«Ыстық» сөзінің антонимін тап.", ru: "Найди антоним к слову «ыстық» (горячий)." }, a: ["жылы", "ащы", "суық", "күшті"], c: 2 },
      { t: "morphology", q: { kk: "«Кітаптарымыздан» сөзіндегі көптік жалғауды тап.", ru: "Найди окончание множественного числа в слове «кітаптарымыздан»." }, a: ["-тар", "-ымыз", "-дан", "-ым"], c: 0 },
      { t: "syntax", q: { kk: "Сұраулы сөйлемді тап.", ru: "Найди вопросительное предложение." }, a: ["Бүгін күн жылы.", "Сен ертең келесің бе?", "Терезені аш.", "Қандай тамаша күн!"], c: 1 }
    ]
  };

  /* ---------- Иконки (инлайн SVG) ---------- */
  var SVG = function (body, cls) { return '<svg class="' + (cls || "ti") + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + body + "</svg>"; };
  var ICON = {
    x: SVG('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    back: SVG('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>'),
    next: SVG('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'),
    check: SVG('<path d="M20 6 9 17l-5-5"/>'),
    laptop: SVG('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>'),
    school: SVG('<path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 3.4 1.7a1 1 0 0 1 .6.9V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7.4a1 1 0 0 1 .6-.9L6 10"/><path d="M18 5v17"/><path d="m4 6 7.1-3.6a2 2 0 0 1 1.8 0L20 6"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/>'),
    calc: SVG('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M16 14v4"/><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/>'),
    lang: SVG('<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>'),
    puzzle: SVG('<path d="M19.4 14.4a2.5 2.5 0 1 1 0 3.2L17 20H13.5a2.5 2.5 0 1 0-3 0H7a3 3 0 0 1-3-3v-3.5a2.5 2.5 0 1 0 0-3V7a3 3 0 0 1 3-3h3.5a2.5 2.5 0 1 1 3 0H17l2.4 2.4"/>'),
    book: SVG('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
    clock: SVG('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
    lock: SVG('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    insta: SVG('<rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r=".6" fill="currentColor"/>', "zt-insta"),
    redo: SVG('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'),
    strong: SVG('<path d="M21.8 10A10 10 0 1 1 17 3.34"/><path d="m9 11 3 3L22 4"/>', "ts"),
    medium: SVG('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>', "ts"),
    weak: SVG('<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>', "ts")
  };
  // Цвет статуса всегда идёт вместе с иконкой и подписью
  var STATUS_COLOR = { strong: "#0ca30c", medium: "#fab219", weak: "#d03b3b" };
  var statusOf = function (p) { return p >= 80 ? "strong" : p >= 50 ? "medium" : "weak"; };

  /* ---------- Состояние ---------- */
  var S = { step: "format", format: null, subject: null, i: 0, picked: null, answers: [], times: [], elapsed: 0, qStart: 0 };
  var isOpen = false, pushed = false, openLang = null, lastFocus = null, timer = 0;

  var lang = function () { return root.lang === "ru" ? "ru" : "kk"; };
  var t = function (key, params) {
    var s = I18N[lang()][key] || I18N.kk[key] || key;
    if (params) s = s.replace(/\{(\w+)\}/g, function (_, k) { return k in params ? params[k] : "{" + k + "}"; });
    return s;
  };
  var tr = function (v) { return v && typeof v === "object" && !Array.isArray(v) ? v[lang()] : v; };
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var subj = function () { for (var k = 0; k < SUBJECTS.length; k++) if (SUBJECTS[k].id === S.subject) return SUBJECTS[k]; return null; };
  var topicName = function (s, id) { for (var k = 0; k < s.topics.length; k++) if (s.topics[k][0] === id) return s.topics[k][lang() === "ru" ? 2 : 1]; return id; };
  var mmss = function (sec) { return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); };
  var logoSrc = (function () { var img = d.querySelector(".hdr-logo img"); return img ? img.src : ""; })();

  /* ---------- Отрисовка ---------- */
  function stepIndex() { return { format: 0, offline: 0, subject: 1, test: 2, result: 3 }[S.step]; }

  function stepper() {
    var cur = stepIndex(), html = "";
    for (var k = 0; k < 4; k++) {
      var st = k < cur ? "done" : k === cur ? "cur" : "todo";
      html += '<li class="zt-st zt-st-' + st + '"' + (st === "cur" ? ' aria-current="step"' : "") + '><span class="zt-st-n">' + (st === "done" ? ICON.check : k + 1) + '</span><span class="zt-st-t">' + esc(t("trial.step" + (k + 1))) + "</span></li>";
    }
    return '<ol class="zt-steps" aria-label="' + esc(t("trial.title")) + '">' + html + "</ol>";
  }

  function choice(act, value, icon, title, desc, cls) {
    return '<button type="button" class="zt-choice ' + (cls || "") + '" data-act="' + act + '" data-v="' + value + '">' +
      '<span class="zt-choice-ico">' + ICON[icon] + "</span>" +
      '<span class="zt-choice-txt"><b>' + esc(title) + "</b>" + (desc ? "<span>" + esc(desc) + "</span>" : "") + "</span>" +
      '<span class="zt-choice-go">' + ICON.next + "</span></button>";
  }

  function viewFormat() {
    return '<h2 class="zt-h" tabindex="-1">' + esc(t("trial.f.h")) + '</h2><p class="zt-sub">' + esc(t("trial.f.sub")) + "</p>" +
      '<div class="zt-choices">' +
      choice("format", "online", "laptop", t("trial.f.online"), t("trial.f.onlineD"), "zt-choice-main") +
      choice("format", "offline", "school", t("trial.f.offline"), t("trial.f.offlineD")) +
      "</div>";
  }

  function viewOffline() {
    return '<div class="zt-off"><span class="zt-off-ico">' + ICON.insta + "</span>" +
      '<h2 class="zt-h" tabindex="-1">' + esc(t("trial.off.h")) + '</h2><p class="zt-sub">' + esc(t("trial.off.text")) + "</p>" +
      '<div class="zt-actions"><a class="btn btn-gold btn-lg" href="' + OFFLINE_URL + '" target="_blank" rel="noopener">' + esc(t("trial.off.btn")) + ICON.next + "</a>" +
      '<button type="button" class="btn btn-outline btn-lg" data-act="goto" data-v="subject">' + esc(t("trial.off.alt")) + "</button></div>" +
      '<p class="zt-off-handle">@eduapp_demo</p></div>';
  }

  function viewSubject() {
    var html = "";
    SUBJECTS.forEach(function (s) {
      html += choice("subject", s.id, s.icon, s.name[lang()], s.topics.map(function (x) { return x[lang() === "ru" ? 2 : 1]; }).join(" · "));
    });
    return '<h2 class="zt-h" tabindex="-1">' + esc(t("trial.s.h")) + '</h2><p class="zt-sub">' + ICON.clock + esc(t("trial.s.sub")) + "</p>" +
      '<div class="zt-choices zt-choices-2">' + html + "</div>";
  }

  function viewTest() {
    var s = subj(), qs = BANK[S.subject], q = qs[S.i], letters = ["A", "B", "C", "D"], opts = "";
    tr(q.a).forEach(function (ans, k) {
      var on = S.picked === k;
      opts += '<button type="button" class="zt-opt' + (on ? " is-on" : "") + '" role="radio" aria-checked="' + on + '" data-act="pick" data-v="' + k + '"><span class="zt-opt-l">' + letters[k] + "</span>" + esc(ans) + "</button>";
    });
    var last = S.i === qs.length - 1;
    return '<div class="zt-test-top"><span class="zt-chip">' + esc(s.name[lang()]) + '</span><span class="zt-timer" title="' + esc(t("trial.r.time")) + '"><i></i>' + ICON.clock + '<b data-timer>' + mmss(S.elapsed) + "</b></span></div>" +
      '<div class="zt-prog-row"><span>' + esc(t("trial.t.q")) + " " + (S.i + 1) + " / " + qs.length + "</span><span>" + esc(t("trial.t.topic")) + ": " + esc(topicName(s, q.t)) + "</span></div>" +
      '<div class="zt-prog" role="progressbar" aria-valuemin="0" aria-valuemax="' + qs.length + '" aria-valuenow="' + (S.i + 1) + '"><i style="width:' + ((S.i + 1) / qs.length) * 100 + '%"></i></div>' +
      '<div class="zt-qcard"><h2 class="zt-q" id="zt-q" tabindex="-1">' + esc(tr(q.q)) + '</h2><div class="zt-opts" role="radiogroup" aria-labelledby="zt-q">' + opts + '</div><p class="zt-hint">' + esc(t("trial.t.hint")) + "</p></div>" +
      '<div class="zt-foot"><button type="button" class="zt-link" data-act="goto" data-v="subject">' + ICON.back + "<span>" + esc(t("trial.back")) + "</span></button>" +
      '<span class="zt-foot-r"><button type="button" class="zt-skip" data-act="skip">' + esc(t("trial.t.skip")) + "</button>" +
      '<button type="button" class="btn btn-gold" data-act="next"' + (S.picked === null ? " disabled" : "") + ">" + esc(t(last ? "trial.t.finish" : "trial.t.next")) + ICON.next + "</button></span></div>";
  }

  function report() {
    var s = subj(), qs = BANK[S.subject], correct = 0, topics = {};
    s.topics.forEach(function (x) { topics[x[0]] = { ok: 0, n: 0 }; });
    qs.forEach(function (q, k) { var ok = S.answers[k] === q.c; if (ok) correct++; topics[q.t].n++; if (ok) topics[q.t].ok++; });
    var percent = Math.round((correct / qs.length) * 100);
    return {
      correct: correct, total: qs.length, percent: percent, level: statusOf(percent),
      time: S.times.reduce(function (a, b) { return a + b; }, 0),
      topics: s.topics.map(function (x) { var v = topics[x[0]], p = v.n ? Math.round((v.ok / v.n) * 100) : 0; return { id: x[0], p: p, ok: v.ok, n: v.n, st: statusOf(p) }; })
    };
  }

  function chip(st) {
    return '<span class="zt-status">' + ICON[st].replace('class="ts"', 'class="ts" style="color:' + STATUS_COLOR[st] + '"') + esc(t("trial.st." + st)) + "</span>";
  }

  function viewResult() {
    var r = report(), s = subj(), rows = "";
    r.topics.forEach(function (x) {
      rows += '<li class="zt-bar-row"><div class="zt-bar-h"><span>' + esc(topicName(s, x.id)) + "</span>" + chip(x.st) + "</div>" +
        '<div class="zt-bar" role="img" aria-label="' + esc(topicName(s, x.id) + ": " + x.ok + " / " + x.n + " · " + x.p + "% · " + t("trial.st." + x.st)) + '">' +
        '<span class="zt-bar-track"><i style="width:' + x.p + "%;background:" + STATUS_COLOR[x.st] + '"></i><b style="left:' + x.p + '%">' + x.p + "%</b></span></div></li>";
    });
    var locks = "";
    for (var k = 1; k <= 4; k++) locks += "<li>" + ICON.lock + "<span>" + esc(t("trial.r.lock" + k)) + "</span></li>";
    var offline = S.format === "offline"
      ? '<a class="btn btn-outline btn-lg" href="' + OFFLINE_URL + '" target="_blank" rel="noopener">' + esc(t("trial.r.insta")) + "</a>" : "";

    return '<p class="zt-kicker">' + esc(t("trial.r.kicker")) + " · " + esc(s.name[lang()]) + "</p>" +
      '<div class="zt-res-grid">' +
        '<section class="zt-score">' +
          '<h2 class="zt-h zt-score-n" tabindex="-1">' + r.correct + "<small>/" + r.total + "</small></h2>" +
          '<p class="zt-score-l">' + esc(t("trial.r.correct", { c: r.correct, t: r.total })) + " · " + r.percent + "%</p>" +
          chip(r.level).replace(esc(t("trial.st." + r.level)), esc(t("trial.r." + r.level))) +
          '<p class="zt-score-t">' + esc(t("trial.r." + r.level + "T")) + "</p>" +
          '<p class="zt-score-time">' + ICON.clock + esc(t("trial.r.time")) + ": <b>" + mmss(r.time) + "</b></p>" +
        "</section>" +
        '<section class="zt-topics"><h3>' + esc(t("trial.r.topics")) + '</h3><ul class="zt-bars">' + rows + "</ul></section>" +
      "</div>" +
      '<section class="zt-lock fx-galaxy"><div class="zt-lock-in"><h3>' + ICON.lock + esc(t("trial.r.lockH")) + '</h3><ul class="zt-lock-list">' + locks + "</ul>" +
        '<div class="zt-actions"><a class="btn btn-gold btn-lg" href="' + REGISTER_URL + '" data-act="register">' + esc(t("trial.r.cta")) + ICON.next + "</a>" + offline + "</div>" +
        '<p class="zt-lock-note">' + esc(t("trial.r.ctaNote")) + "</p></div></section>" +
      '<div class="zt-again"><button type="button" class="zt-link" data-act="again">' + ICON.redo + "<span>" + esc(t("trial.r.again")) + "</span></button>" +
        '<button type="button" class="zt-link" data-act="goto" data-v="subject">' + ICON.book + "<span>" + esc(t("trial.r.other")) + "</span></button></div>" +
      '<p class="zt-note">' + esc(t("trial.r.note")) + "</p>";
  }

  function render(focus) {
    var views = { format: viewFormat, offline: viewOffline, subject: viewSubject, test: viewTest, result: viewResult };
    var canBack = S.step === "offline" || S.step === "subject";
    box.innerHTML =
      '<div class="zt-bar-top">' +
        '<a class="zt-logo" href="#" data-act="close" aria-label="' + esc(t("trial.close")) + '"><img src="' + logoSrc + '" alt="EduApp" width="797" height="300"></a>' +
        '<p class="zt-title" id="trial-title">' + esc(t("trial.title")) + "</p>" +
        '<div class="lang-tg" role="group" aria-label="' + esc(t("lang.group")) + '"><a class="lang-opt" href="#" data-lang="kk" lang="kk" aria-label="Қазақша">ҚАЗ</a><a class="lang-opt" href="#" data-lang="ru" lang="ru" aria-label="Русский">РУС</a></div>' +
        '<button type="button" class="zt-x" data-act="close" aria-label="' + esc(t("trial.close")) + '">' + ICON.x + "</button>" +
      "</div>" +
      '<div class="zt-scroll" data-scroll><div class="zt-wrap">' + stepper() +
        (canBack ? '<button type="button" class="zt-link zt-back" data-act="back">' + ICON.back + "<span>" + esc(t("trial.back")) + "</span></button>" : "") +
        '<div class="zt-body zt-body-' + S.step + '">' + views[S.step]() + "</div>" +
      "</div></div>";
    if (focus !== false) {
      var sc = box.querySelector("[data-scroll]");
      if (sc) sc.scrollTop = 0;
      var h = box.querySelector(".zt-body [tabindex='-1']");
      if (h) h.focus({ preventScroll: true });
    }
  }

  /* ---------- Логика шагов ---------- */
  function startTest(id) {
    S.subject = id; S.i = 0; S.picked = null; S.answers = []; S.times = []; S.elapsed = 0; S.qStart = 0;
    S.step = "test";
    render();
    runTimer();
  }

  function runTimer() {
    clearInterval(timer);
    if (!isOpen || S.step !== "test") return;
    timer = setInterval(function () {
      S.elapsed++;
      var el = box.querySelector("[data-timer]");
      if (el) el.textContent = mmss(S.elapsed);
    }, 1000);
  }

  function answer(skip) {
    S.answers.push(skip ? null : S.picked);
    S.times.push(Math.max(1, S.elapsed - S.qStart));
    S.qStart = S.elapsed;
    S.picked = null;
    if (S.i + 1 < BANK[S.subject].length) { S.i++; render(); return; }
    clearInterval(timer);
    S.step = "result";
    render();
    track("trial_complete", { subject: S.subject, format: S.format, percent: report().percent });
  }

  // События для Google Tag Manager / Яндекс Метрики (если счётчик установлен)
  function track(event, params) {
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(Object.assign({ event: event }, params || {}));
  }

  box.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]");
    if (!el) return;
    var act = el.getAttribute("data-act"), v = el.getAttribute("data-v");
    if (act === "register") { track("trial_register", { subject: S.subject, format: S.format }); return; }
    e.preventDefault();
    if (act === "close") close();
    else if (act === "format") {
      S.format = v; track("trial_format", { value: v });
      S.step = v === "offline" ? "offline" : "subject"; render();
    } else if (act === "subject") { track("trial_subject", { value: v }); startTest(v); }
    else if (act === "goto") { clearInterval(timer); S.step = v; render(); }
    else if (act === "back") { S.step = S.step === "subject" && S.format === "offline" ? "offline" : "format"; render(); }
    else if (act === "pick") {
      S.picked = +v;
      box.querySelectorAll(".zt-opt").forEach(function (b, k) { b.classList.toggle("is-on", k === S.picked); b.setAttribute("aria-checked", String(k === S.picked)); });
      var next = box.querySelector('[data-act="next"]');
      if (next) next.disabled = false;
    } else if (act === "next") { if (S.picked !== null) answer(false); }
    else if (act === "skip") answer(true);
    else if (act === "again") startTest(S.subject);
  });

  /* ---------- Открыть / закрыть ---------- */
  function open(push) {
    if (isOpen) return;
    isOpen = true;
    openLang = root.lang;
    lastFocus = d.activeElement;
    box.hidden = false;
    root.classList.add("trial-open");
    render();
    requestAnimationFrame(function () { box.classList.add("is-in"); });
    if (push !== false && location.hash !== HASH) {
      history.pushState({ lang: root.lang, trial: true }, "", location.pathname + location.search + HASH);
      pushed = true;
    }
    runTimer();
    track("trial_open");
  }

  function close(fromHistory) {
    if (!isOpen) return;
    // Обычно закрываем через «Назад» в истории (popstate закроет окно). Если внутри окна сменили язык,
    // так не делаем: предыдущая запись в истории — на старом языке, и он бы вернулся.
    if (!fromHistory && pushed && location.hash === HASH && root.lang === openLang) { history.back(); return; }
    isOpen = false; pushed = false;
    clearInterval(timer);
    box.classList.remove("is-in");
    root.classList.remove("trial-open");
    setTimeout(function () { if (!isOpen) { box.hidden = true; box.innerHTML = ""; } }, reduce ? 0 : 250);
    if (location.hash === HASH) history.replaceState({ lang: root.lang, trial: false }, "", location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  d.addEventListener("click", function (e) {
    var a = e.target.closest("[data-trial]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
    e.preventDefault();
    open(true);
  });
  window.addEventListener("popstate", function () {
    if (location.hash === HASH) open(false); else close(true);
  });
  d.addEventListener("zd:lang", function () { if (isOpen) render(false); });

  // Клавиатура: Esc — закрыть, 1–4 — выбрать ответ, Tab не выходит за окно
  d.addEventListener("keydown", function (e) {
    if (!isOpen) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (S.step === "test" && /^[1-4]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var b = box.querySelectorAll(".zt-opt")[+e.key - 1];
      if (b) { e.preventDefault(); b.click(); }
      return;
    }
    if (e.key !== "Tab") return;
    var items = [].filter.call(box.querySelectorAll("a[href], button:not([disabled])"), function (x) { return x.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Прямая ссылка eduapp.example.com/#sinaq-test сразу открывает тест (удобно для рекламы и Instagram)
  if (location.hash === HASH) open(false);
})();
