// Снимок каталога тестов eduapp.example.com → src/tests-data.json (+ иконки разделов в assets/tests/).
// Запуск: node tools/scrape-tests.mjs   (Node 18+). Повторяйте, когда на старом сайте появятся новые тесты.
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://eduapp.example.com";
// packageId старого сайта: kk — казахские классы, ru — русские классы
const PACKAGES = [
  { key: "ubt", kk: 3, ru: 1 },
  { key: "nis", kk: 4, ru: 2 },
  { key: "bil", kk: 8, ru: 7 },
  { key: "rfmm", kk: 6, ru: 5 },
  { key: "grades", kk: 10, ru: 9 }
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const clean = (s) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

async function get(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(SITE + url, { headers: { "User-Agent": "Mozilla/5.0 eduapp-catalog-snapshot" } });
      if (res.ok) return await res.text();
    } catch {}
    await sleep(800);
  }
  throw new Error("Не удалось загрузить " + url);
}

function options(html, name) {
  const select = (html.match(new RegExp(`<select name="${name}"[\\s\\S]*?<\\/select>`)) || [""])[0];
  return [...select.matchAll(/<option value="(\d+)">([^<]+)<\/option>/g)].map((m) => ({ id: +m[1], name: decode(m[2]).trim() })).filter((s) => s.id > 0);
}

function parsePackage(html) {
  const subjects = options(html, "subjectId");
  const sections = [...html.matchAll(/<a href="\/Tests\?packageId=\d+&(?:amp;)?subjectId=0&(?:amp;)?sectionId=(\d+)"[^>]*>\s*<img[^>]*src="([^"]*)"[^>]*>\s*<h4[^>]*>([\s\S]*?)<\/h4>/g)].map((m) => ({
    id: +m[1],
    img: (decode(m[2]).match(/fileId=([0-9a-f]+)/) || [])[1] || null,
    title: clean(m[3])
  }));
  const crumb = (html.match(/<li class="breadcrumb-item[^"]*"[^>]*>\s*<a[^>]*>[^<]*<\/a>\s*<\/li>\s*<li class="breadcrumb-item[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/) || [])[1];
  return { subjects, grades: options(html, "gradeId"), sections, crumb: crumb ? decode(crumb).trim() : null };
}

function parseSection(html) {
  const tests = [];
  // У тестов «по классам» между названием и описанием есть строка с классом: <p class="text-primary">4 сынып</p>
  const re = /<a href="\/Test\/Overview\/(\d+)" class="h5">([\s\S]*?)<\/a>\s*(?:<p class="text-primary">([\s\S]*?)<\/p>\s*)?<p class="my-3">([\s\S]*?)<\/p>[\s\S]*?<ul class="list-unstyled mb-0">([\s\S]*?)<\/ul>\s*<h4[^>]*>([\s\S]*?)<\/h4>/g;
  for (const m of html.matchAll(re)) {
    const meta = clean(m[5]);
    const minutes = (meta.match(/(\d+)\s*мин/) || [])[1];
    const questions = (meta.match(/(\d+)\s*(сұрақ|вопрос)/) || [])[1];
    const grade = m[3] ? (clean(m[3]).match(/(\d+)/) || [])[1] : null;
    const priceText = clean(m[6]);
    const price = (priceText.replace(/\s/g, "").match(/(\d+)тг/) || [])[1];
    tests.push({
      id: +m[1], title: clean(m[2]), desc: clean(m[4]), grade: grade ? +grade : null,
      minutes: minutes ? +minutes : null, questions: questions ? +questions : null, price: price ? +price : priceText ? 0 : null
    });
  }
  return tests;
}

const data = { source: SITE, updated: new Date().toISOString().slice(0, 10), packages: {} };
const images = new Set();

for (const p of PACKAGES) {
  data.packages[p.key] = {};
  for (const lang of ["kk", "ru"]) {
    const pid = p[lang];
    const pkg = parsePackage(await get(`/Tests?packageId=${pid}`));
    const sections = [];
    for (const s of pkg.sections) {
      await sleep(120);
      const tests = parseSection(await get(`/Tests?packageId=${pid}&subjectId=0&sectionId=${s.id}`));
      if (!tests.length) continue; // пустые разделы не показываем
      // Фильтр «Пәнді таңда» на старом сайте работает внутри раздела: какие тесты содержат этот предмет
      for (const t of tests) t.subjects = [];
      for (const subj of pkg.subjects) {
        await sleep(80);
        const ids = new Set(parseSection(await get(`/Tests?packageId=${pid}&subjectId=${subj.id}&sectionId=${s.id}`)).map((x) => x.id));
        for (const t of tests) if (ids.has(t.id)) t.subjects.push(subj.id);
      }
      if (s.img) images.add(s.img);
      sections.push({ ...s, tests });
    }
    data.packages[p.key][lang] = { packageId: pid, title: pkg.crumb, subjects: pkg.subjects, grades: pkg.grades.map((g) => g.id), sections };
    console.log(`✓ ${p.key}/${lang} (packageId=${pid}): ${sections.length} бөлім, ${sections.reduce((n, s) => n + s.tests.length, 0)} тест`);
  }
}

await mkdir(path.join(root, "assets/tests"), { recursive: true });
for (const id of images) {
  const res = await fetch(`${SITE}/Resources/ImageThumb?fileId=${id}`);
  if (!res.ok) continue;
  const type = res.headers.get("content-type") || "";
  const ext = type.includes("png") ? "png" : type.includes("svg") ? "svg" : type.includes("webp") ? "webp" : "jpg";
  await writeFile(path.join(root, "assets/tests", `${id}.${ext}`), Buffer.from(await res.arrayBuffer()));
  for (const pk of Object.values(data.packages)) for (const l of Object.values(pk)) for (const s of l.sections) if (s.img === id) s.img = `${id}.${ext}`;
}

await writeFile(path.join(root, "src/tests-data.json"), JSON.stringify(data, null, 1), "utf8");
console.log(`✓ src/tests-data.json, иконок: ${images.size}`);
