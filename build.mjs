// Сборка статической главной на двух языках: dist/index.html (kk) и dist/ru/index.html (ru).
// Запуск: node build.mjs   (Node 18+, без зависимостей)
// Шаблон: src/template.html — {{key}} экранируется, {{&key}} вставляется как есть (HTML).
//
// Переключение языка без перезагрузки: сборка помечает каждый переводимый текст атрибутом
// data-i18n / data-i18n-html / data-i18n-attr, а оба словаря кладёт в dist/lp/i18n.js.
// site.js по клику «ҚАЗ | РУС» подставляет тексты из словаря прямо на странице.
import { readFile, writeFile, mkdir, cp, rm, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";

const root = path.dirname(fileURLToPath(import.meta.url));
const SITE = "https://eduapp.example.com/";

// Страницы сайта. path — адрес страницы относительно корня языка (kk: /, ru: /ru/).
//   base     — путь от страницы до корня сайта (для /lp/…)
//   href.*   — та же страница на другом языке (для переключателя ҚАЗ | РУС без JavaScript)
//   path.*   — ссылки шапки и футера: главная и страница тестов на текущем языке
const PAGES = [
  {
    tpl: "src/template.html", path: "",
    kk: { out: "dist/index.html", base: "", hrefKk: "./", hrefRu: "ru/" },
    ru: { out: "dist/ru/index.html", base: "../", hrefKk: "../", hrefRu: "./" },
    ctx: { "path.home": "", "path.tests": "tests/", "logo.href": "./", "logo.attr": "data-home" }
  },
  {
    tpl: "src/tests.html", path: "tests/",
    kk: { out: "dist/tests/index.html", base: "../", hrefKk: "./", hrefRu: "../ru/tests/" },
    ru: { out: "dist/ru/tests/index.html", base: "../../", hrefKk: "../../tests/", hrefRu: "./" },
    ctx: { "path.home": "../", "path.tests": "./", "logo.href": "../", "logo.attr": "" }
  }
];
const LOCALE = { kk: ["kk_KZ", "ru_RU"], ru: ["ru_RU", "kk_KZ"] };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr", "use"]);

function jsonLd(t, lang, url) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": SITE + "#org",
        name: "EduApp",
        alternateName: ["EduApp", "EduApp App", "EduApp Online"],
        legalName: "ТОО «EduApp Demo»",
        url: SITE,
        logo: SITE + "lp/eduapp-logo.svg",
        address: { "@type": "PostalAddress", streetAddress: "пр. Примерный, 1", addressLocality: "Астана", addressCountry: "KZ" },
        areaServed: { "@type": "Country", name: "Kazakhstan" },
        knowsLanguage: ["kk", "ru"],
        sameAs: [
          "https://www.instagram.com/eduapp_demo/",
          "https://www.tiktok.com/@eduapp_demo",
          "https://wa.me/77000000000"
        ]
      },
      { "@type": "WebSite", "@id": SITE + "#website", url: SITE, name: "EduApp", alternateName: "EduApp App", inLanguage: ["kk", "ru"], publisher: { "@id": SITE + "#org" } },
      { "@type": "WebPage", "@id": url + "#webpage", url, name: t["meta.title"], description: t["meta.desc"], inLanguage: lang, isPartOf: { "@id": SITE + "#website" }, about: { "@id": SITE + "#org" } },
      {
        "@type": "ItemList",
        name: t["programs.h2"],
        itemListElement: range(6).map((i) => ({
          "@type": "ListItem", position: i,
          item: { "@type": "Course", name: t[`prog.${i}.t`], description: t[`prog.${i}.d`], inLanguage: lang, provider: { "@id": SITE + "#org" } }
        }))
      },
      {
        "@type": "FAQPage",
        mainEntity: range(5).map((i) => ({ "@type": "Question", name: t[`faq.${i}.q`], acceptedAnswer: { "@type": "Answer", text: t[`faq.${i}.a`] } }))
      }
    ]
  };
}

// JSON-LD страницы тестов: раздел сайта + хлебные крошки
function jsonLdTests(t, lang, url) {
  const home = SITE + (lang === "ru" ? "ru/" : "");
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": url + "#webpage", url, name: t["tests.meta.title"], description: t["tests.meta.desc"], inLanguage: lang, isPartOf: { "@id": SITE + "#website" }, about: { "@id": SITE + "#org" } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: t["tests.crumbHome"], item: home },
        { "@type": "ListItem", position: 2, name: t["nav.tests"], item: url }
      ] }
    ]
  };
}

/**
 * Помечает переводимые места шаблона (только <body>, кроме <script>):
 *  - атрибут целиком из ключа:        aria-label="{{nav.home}}" → data-i18n-attr="aria-label:nav.home"
 *  - ключ — единственный текст тега:  <h3>{{prog.1.t}}</h3>      → <h3 data-i18n="prog.1.t">
 *  - ключ рядом с другими тегами:     <a><svg/>{{cta.main}}</a> → <span data-i18n="cta.main">…</span>
 */
function annotate(tpl, keys) {
  const bodyStart = tpl.indexOf("<body");
  const edits = []; // { pos, del, ins }
  const tagAttrs = new Map(); // позиция "<" тега → [["aria-label","nav.home"], …]
  const addTagAttr = (lt, attr) => {
    if (!tagAttrs.has(lt)) tagAttrs.set(lt, []);
    tagAttrs.get(lt).push(attr);
  };

  for (const m of tpl.matchAll(/\{\{(&?)([\w.\-]+)\}\}/g)) {
    const i = m.index, raw = m[1] === "&", key = m[2];
    if (i < bodyStart || !keys.has(key)) continue;
    const before = tpl.slice(0, i);
    if (before.lastIndexOf("<script") > before.lastIndexOf("</script>")) continue;
    const lt = before.lastIndexOf("<"), gt = before.lastIndexOf(">");

    if (lt > gt) {
      // внутри тега: значение атрибута
      const attr = tpl.slice(lt, i).match(/([\w:-]+)="$/);
      if (!attr || tpl[i + m[0].length] !== '"' || raw) throw new Error(`Ключ ${key} должен занимать атрибут целиком`);
      addTagAttr(lt, ["attr", `${attr[1]}:${key}`]);
      continue;
    }

    const end = i + m[0].length;
    const nextLt = tpl.indexOf("<", end);
    const parent = tpl.slice(lt, gt + 1);
    const parentName = (parent.match(/^<([\w:-]+)/) || [])[1];
    const sole =
      parentName && !VOID.has(parentName.toLowerCase()) && !parent.endsWith("/>") &&
      tpl.slice(gt + 1, i).trim() === "" && tpl.slice(end, nextLt).trim() === "" && tpl.startsWith("</", nextLt);

    if (sole) addTagAttr(lt, [raw ? "html" : "text", key]);
    else edits.push({ pos: i, del: m[0].length, ins: `<span data-i18n${raw ? "-html" : ""}="${key}">${m[0]}</span>` });
  }

  for (const [lt, list] of tagAttrs) {
    const name = tpl.slice(lt).match(/^<[\w:-]+/)[0];
    const attrs = list.filter((a) => a[0] === "attr").map((a) => a[1]);
    let ins = attrs.length ? ` data-i18n-attr="${attrs.join(";")}"` : "";
    for (const [type, key] of list) {
      if (type === "text") ins += ` data-i18n="${key}"`;
      if (type === "html") ins += ` data-i18n-html="${key}"`;
    }
    edits.push({ pos: lt + name.length, del: 0, ins });
  }

  edits.sort((a, b) => b.pos - a.pos);
  let out = tpl;
  for (const e of edits) out = out.slice(0, e.pos) + e.ins + out.slice(e.pos + e.del);
  return out;
}

const dicts = {};
for (const lang of ["kk", "ru"]) dicts[lang] = JSON.parse(await readFile(path.join(root, `src/i18n/${lang}.json`), "utf8"));
const kkKeys = Object.keys(dicts.kk), ruKeys = new Set(Object.keys(dicts.ru));
const notInRu = kkKeys.filter((k) => !ruKeys.has(k));
if (notInRu.length) throw new Error(`В ru.json нет ключей: ${notInRu.join(", ")}`);

// Общие части страниц: {{>header}} → src/partials/header.html
const partials = {};
for (const f of await readdir(path.join(root, "src/partials"))) partials[f.replace(/\.html$/, "")] = await readFile(path.join(root, "src/partials", f), "utf8");
const withPartials = (s) => s.replace(/\{\{>([\w-]+)\}\}/g, (_, name) => {
  if (!(name in partials)) throw new Error(`Нет файла src/partials/${name}.html`);
  return partials[name];
});

// Каталог тестов (снимок eduapp.example.com, обновляется tools/scrape-tests.mjs). Тесты-заглушки вроде «1» отбрасываем
const testsData = JSON.parse(await readFile(path.join(root, "src/tests-data.json"), "utf8"));
for (const pk of Object.values(testsData.packages)) for (const l of Object.values(pk)) {
  for (const s of l.sections) s.tests = s.tests.filter((x) => x.title.replace(/[\s\d.\-]/g, "").length >= 2);
  l.sections = l.sections.filter((s) => s.tests.length);
}
const allSections = Object.values(testsData.packages).flatMap((pk) => Object.values(pk).flatMap((l) => l.sections));
const stats = { tests: allSections.reduce((n, s) => n + s.tests.length, 0), sections: allSections.length };

// Функции отрисовки каталога из assets/tests.js — тот же код, что работает в браузере
const sandbox = { window: {} };
vm.runInNewContext(await readFile(path.join(root, "assets/tests.js"), "utf8"), sandbox);
const ZDTests = sandbox.window.ZDTests;

// Генерируемые файлы /lp/
const generated = {
  "i18n.js": `/* Сгенерировано build.mjs из src/i18n/*.json — не редактируйте вручную */\nwindow.EA_I18N=${JSON.stringify(dicts)};\n`,
  "tests-data.js": `/* Каталог тестов (снимок ${testsData.source} от ${testsData.updated}). Обновление: node tools/scrape-tests.mjs */\nwindow.EA_TESTS=${JSON.stringify(testsData)};\n`
};
// Версия каждого CSS/JS по содержимому: lp/site.css?v=1a2b3c4d. Браузер берёт новый файл сразу после правки,
// а не старый из кэша (раньше из-за кэша правки скорости не доходили до посетителей).
const version = {};
for (const f of await readdir(path.join(root, "assets"))) {
  if (/\.(css|js)$/.test(f)) version[f] = createHash("md5").update(await readFile(path.join(root, "assets", f))).digest("hex").slice(0, 8);
}
for (const [f, content] of Object.entries(generated)) version[f] = createHash("md5").update(content).digest("hex").slice(0, 8);
const withVersions = (html) => html.replace(/(lp\/)([\w.-]+\.(?:css|js))"/g, (m, dir, f) => (version[f] ? `${dir}${f}?v=${version[f]}"` : m));

const sources = await Promise.all(PAGES.map(async (p) => withPartials(await readFile(path.join(root, p.tpl), "utf8"))));
const used = new Set(sources.flatMap((s) => [...s.matchAll(/\{\{&?([\w.\-]+)\}\}/g)].map((m) => m[1])));
await rm(path.join(root, "dist"), { recursive: true, force: true });

for (const [i, page] of PAGES.entries()) {
  const tpl = annotate(sources[i], new Set(kkKeys));
  for (const lang of ["kk", "ru"]) {
    const cfg = page[lang], t = dicts[lang];
    const url = SITE + (lang === "ru" ? "ru/" : "") + page.path;
    const tf = (key, params) => String(t[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => (params && k in params ? params[k] : `{${k}}`));
    const ctx = {
      ...t,
      ...page.ctx,
      lang, base: cfg.base, "base.root": cfg.base || "./", "url.self": url, "og.locale": LOCALE[lang][0], "og.altLocale": LOCALE[lang][1],
      "href.kk": cfg.hrefKk, "href.ru": cfg.hrefRu,
      "stat.tests": stats.tests, "stat.sections": stats.sections,
      "tests.app": page.path === "tests/"
        ? ZDTests.renderApp({ lang, cls: lang, pk: "ubt", subject: 0, grade: 0, q: "", section: null }, testsData, tf, cfg.base)
        : "",
      jsonld: JSON.stringify(page.path === "tests/" ? jsonLdTests(t, lang, url) : jsonLd(t, lang, url)).replace(/</g, "\\u003c")
    };
    const missing = [...used].filter((k) => !(k in ctx));
    if (missing.length) throw new Error(`[${lang}] нет ключей: ${missing.join(", ")}`);

    const html = withVersions(tpl.replace(/\{\{(&?)([\w.\-]+)\}\}/g, (_, raw, key) => (raw ? String(ctx[key] ?? "") : esc(ctx[key] ?? ""))));
    const outFile = path.join(root, cfg.out);
    await mkdir(path.dirname(outFile), { recursive: true });
    await writeFile(outFile, html, "utf8");
    console.log(`✓ ${cfg.out}  (${(html.length / 1024).toFixed(1)} KB)`);
  }
}

// prog/faq идут в JSON-LD, trial/tests — тексты, которые подставляют trial.js и tests.js
const unused = kkKeys.filter((k) => !used.has(k) && !/^(prog|faq|trial|tests)\./.test(k));
if (unused.length) console.warn(`не используются: ${unused.join(", ")}`);

// Статика лендинга кладётся в /lp/, чтобы не смешиваться с /assets/ сборки Vue
await cp(path.join(root, "assets"), path.join(root, "dist/lp"), { recursive: true });
// Оба словаря — для мгновенного переключения языка, окна сынақ теста и каталога
for (const [f, content] of Object.entries(generated)) await writeFile(path.join(root, "dist/lp", f), content, "utf8");
console.log(`✓ dist/lp (+ i18n.js, tests-data.js: ${stats.tests} тест, ${stats.sections} бөлім)`);
