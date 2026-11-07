// Generates a RANDOM demo snapshot of the test catalog (src/tests-data.json) and simple SVG
// section icons (assets/tests/*.svg). Same schema as the real platform API snapshot,
// but every section, test, price and duration here is synthetic.
//
//   node tools/generate-demo-catalog.mjs [--seed 42] [--out src/tests-data.json] [--img assets/tests]
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};
const OUT = path.resolve(root, arg("out", "src/tests-data.json"));
const IMG = path.resolve(root, arg("img", "assets/tests"));
let seed = Number(arg("seed", 42));

// mulberry32 — deterministic PRNG so the committed output is reproducible
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const PRICES = [0, 0, 300, 500, 500, 800, 800, 1200, 1800];
const COLORS = [["#14b8a6", "#0ea5e9"], ["#8b5cf6", "#6366f1"], ["#f59e0b", "#ef4444"], ["#22c55e", "#14b8a6"], ["#ec4899", "#8b5cf6"], ["#0ea5e9", "#2563eb"]];

const SUBJECTS = {
  ubt: {
    kk: ["Математика", "Қазақ тілі", "Математикалық сауаттылық", "Қазақстан тарихы", "Дүниежүзі тарихы", "География", "Физика", "Химия", "Ағылшын тілі", "Биология", "Информатика", "Оқу сауаттылығы"],
    ru: ["Математика", "Казахский язык", "Математическая грамотность", "История Казахстана", "Всемирная история", "География", "Физика", "Химия", "Английский язык", "Информатика"],
  },
  nis: { kk: ["Математика", "Сандық сипаттамалар", "Қазақ тілі", "Орыс тілі", "Ағылшын тілі"], ru: ["Математика", "Числовые характеристики", "Казахский язык", "Русский язык", "Английский язык"] },
  bil: { kk: ["Математика", "Қазақ тілі", "Қазақстан тарихы"], ru: ["Математика", "Казахский язык", "История Казахстана"] },
  rfmm: { kk: ["Математика"], ru: ["Математика"] },
  grades: {
    kk: ["Математика", "Қазақ тілі", "Орыс тілі", "Ағылшын тілі", "Қазақстан тарихы", "Жаратылыстану", "Физика", "Химия", "Биология", "География"],
    ru: ["Математика", "Казахский язык", "Русский язык", "Английский язык", "История Казахстана", "Естествознание", "Физика", "Химия", "Биология", "География"],
  },
};

const PKG = {
  ubt: { kk: [3, "ҰБТ (қазақ сыныптары)"], ru: [1, "ЕНТ (русские классы)"] },
  nis: { kk: [4, "НЗМ (қазақ сыныптары)"], ru: [2, "НИШ (русские классы)"] },
  bil: { kk: [8, "БИЛ (қазақ сыныптары)"], ru: [7, "БИЛ (русские классы)"] },
  rfmm: { kk: [6, "РФММ (қазақ сыныптары)"], ru: [5, "РФМШ (русские классы)"] },
  grades: { kk: [10, "Сыныптар бойынша (қазақ сыныптары)"], ru: [9, "По классам (русские классы)"] },
};

const V = { kk: (n) => `${n}-нұсқа`, ru: (n) => `${n}-вариант` };
const MONTHS = { kk: ["ҚЫРКҮЙЕК", "ҚАЗАН", "ҚАРАША", "ЖЕЛТОҚСАН", "АҚПАН", "НАУРЫЗ"], ru: ["СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ", "ФЕВРАЛЬ", "МАРТ"] };

// Section templates: [title, label for the icon, subject indexes, minutes options, grade]
function sectionsFor(pkg, lang) {
  const kk = lang === "kk";
  switch (pkg) {
    case "ubt": {
      const combos = kk
        ? [["МАТЕМАТИКА+ФИЗИКА", [0, 6]], ["МАТЕМАТИКА+ИНФОРМАТИКА", [0, 10]], ["БИОЛОГИЯ+ХИМИЯ", [9, 7]], ["ДҮНИЕЖҮЗІ ТАРИХЫ+АҒЫЛШЫН ТІЛІ", [4, 8]], ["ГЕОГРАФИЯ+МАТЕМАТИКА", [5, 0]], ["ҚАЗАҚ ТІЛІ+ДҮНИЕЖҮЗІ ТАРИХЫ", [1, 4]]]
        : [["МАТЕМАТИКА+ФИЗИКА", [0, 5]], ["МАТЕМАТИКА+ИНФОРМАТИКА", [0, 9]], ["ХИМИЯ+ФИЗИКА", [6, 5]], ["ВСЕМИРНАЯ ИСТОРИЯ+АНГЛИЙСКИЙ", [4, 8]]];
      const must = kk ? [2, 3, 11] : [2, 3];
      return combos.map(([t, s]) => ({ title: kk ? `${t} (+3 міндетті пән «ҰБТ»)` : `${t} (+3 обязательных предмета «ЕНТ»)`, label: kk ? "ҰБТ" : "ЕНТ", subj: [...s, ...must], minutes: [240], tests: int(4, 9), names: "months" }));
    }
    case "nis":
      return (kk ? ["математика", "сандық сипаттамалар", "тілдер", "жаратылыстану"] : ["математика", "числовые характеристики", "языки", "естествознание"]).map((x, i) => ({
        title: `${kk ? "НЗМ" : "НИШ"} (${x} 6 ${kk ? "сынып" : "класс"})`, label: kk ? "НЗМ" : "НИШ", subj: [[0], [1], [2, 3, 4], [0]][i], minutes: [60, 100, 120], tests: int(6, 14), names: "variants",
      }));
    case "bil":
      return (kk ? ["I ТУР", "II ТУР", "МАТЕМАТИКА (КУРС)"] : ["I ТУР", "II ТУР"]).map((x, i) => ({ title: x, label: "БИЛ", subj: i === 2 ? [0] : [0, 1, 2], minutes: [60, 120], tests: int(2, 5), names: "variants" }));
    case "rfmm":
      return [{ title: kk ? "Республикалық физика-математика мектебі" : "РФМШ", label: kk ? "РФММ" : "РФМШ", subj: [0], minutes: [90, 135], tests: int(3, 6), names: "variants" }];
    case "grades":
      return [2, 3, 4, 5, 6, 7].slice(0, kk ? 6 : 3).map((g) => ({
        title: kk ? `ДАЙЫНДЫҚ БӨЛІМІ (${g}-сынып)` : `ПОДГОТОВИТЕЛЬНЫЙ ОТДЕЛ (${g} класс)`, label: String(g), subj: [0, 1, 3], minutes: [60, 100], tests: int(4, 10), names: "variants", grade: g,
      }));
  }
}

function icon(label, [c1, c2]) {
  const size = label.length > 2 ? 22 : 30;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 112 112">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="112" height="112" rx="24" fill="url(#g)"/>
  <circle cx="92" cy="20" r="26" fill="#fff" opacity=".12"/>
  <text x="56" y="${56 + size / 3}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="${size}" font-weight="800" fill="#fff">${label}</text>
</svg>
`;
}

await fs.rm(IMG, { recursive: true, force: true });
await fs.mkdir(IMG, { recursive: true });

let sectionId = 100, testId = 1000, subjectId = 200;
const packages = {};
for (const pkg of Object.keys(PKG)) {
  packages[pkg] = {};
  for (const lang of ["kk", "ru"]) {
    const subjects = SUBJECTS[pkg][lang].map((name) => ({ id: ++subjectId, name }));
    const sections = [];
    for (const tpl of sectionsFor(pkg, lang)) {
      const id = ++sectionId;
      const hasImg = rnd() > 0.15;
      if (hasImg) await fs.writeFile(path.join(IMG, `sec-${id}.svg`), icon(tpl.label, pick(COLORS)));
      const tests = [];
      for (let n = 1; n <= tpl.tests; n++) {
        const title = tpl.names === "months" ? `${tpl.title.split(" (")[0]} ${MONTHS[lang][(n - 1) % 6]}${n > 6 ? ` ${V[lang](2)}` : ""}` : V[lang](n);
        tests.push({
          id: ++testId,
          title,
          desc: title,
          grade: tpl.grade ?? null,
          minutes: pick(tpl.minutes),
          questions: rnd() > 0.5 ? pick([20, 30, 40, 60]) : null,
          price: pick(PRICES),
          subjects: tpl.subj.filter((i) => subjects[i]).map((i) => subjects[i].id),
        });
      }
      sections.push({ id, img: hasImg ? `sec-${id}.svg` : null, title: tpl.title, tests });
    }
    packages[pkg][lang] = {
      packageId: PKG[pkg][lang][0],
      title: PKG[pkg][lang][1],
      subjects,
      grades: pkg === "grades" ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [],
      sections,
    };
  }
}

const data = { source: "demo (randomly generated)", updated: new Date().toISOString().slice(0, 10), packages };
await fs.writeFile(OUT, JSON.stringify(data, null, 1) + "\n", "utf8");
const count = Object.values(packages).flatMap((p) => Object.values(p)).reduce((n, l) => n + l.sections.reduce((m, s) => m + s.tests.length, 0), 0);
console.log(`✓ ${path.relative(root, OUT)}: ${count} demo tests; icons in ${path.relative(root, IMG)}`);
