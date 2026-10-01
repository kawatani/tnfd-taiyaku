// work/aligned/<doc>-AAA-BBB.json を統合して site/data/<doc>.js を生成し、PDF を site/pdf/ にコピーする。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const alignedDir = path.join(root, "work", "aligned");
const TYPES = new Set(["h1", "h2", "h3", "h4", "p", "li", "quote", "caption", "figure", "table", "footnote"]);

const DOCS = {
  rec: {
    id: "rec",
    titleEn: "Recommendations of the Taskforce on Nature-related Financial Disclosures",
    titleJa: "自然関連財務情報開示タスクフォースの提言",
    date: "September 2023",
    dateJa: "2023年9月",
    pageCount: 154,
    jaSource: "official",
    jaSourceLabel: "TNFD公式日本語版",
    sourceUrl: "https://tnfd.global/publication/recommendations-of-the-taskforce-on-nature-related-financial-disclosures/",
    pdfEn: "pdf/rec_en.pdf",
    pdfJa: "pdf/rec_ja.pdf",
  },
  leap: {
    id: "leap",
    titleEn: "Guidance on the identification and assessment of nature-related issues: The TNFD LEAP approach",
    titleJa: "自然関連課題の特定と評価に関するガイダンス：TNFD LEAPアプローチ",
    date: "Version 1.1, October 2023",
    dateJa: "第1.1版、2023年10月",
    pageCount: 277,
    jaSource: "official",
    jaSourceLabel: "TNFD公式日本語版",
    sourceUrl: "https://tnfd.global/publication/additional-guidance-on-assessment-of-nature-related-issues-the-leap-approach/",
    pdfEn: "pdf/leap_en.pdf",
    pdfJa: "pdf/leap_ja.pdf",
  },
  tc: {
    id: "tc",
    titleEn: "Additional sector guidance – Technology and communications",
    titleJa: "追加セクターガイダンス – 技術・通信",
    date: "September 2026",
    dateJa: "2026年9月",
    pageCount: 135,
    jaSource: "unofficial",
    jaSourceLabel: "本サイトによる翻訳（非公式）",
    sourceUrl: "https://tnfd.global/publication/additional-sector-guidance-technology-and-communications/",
    pdfEn: "pdf/tc_en.pdf",
    pdfJa: null,
  },
};

const CJK = "\\u3000-\\u30ff\\u3400-\\u9fff\\uff01-\\uff60";
// PDF 抽出由来の、日本語文字の前後の半角空白を除去する
function normalizeJa(s) {
  return s
    .replace(new RegExp(`([${CJK}])[ \\t]+(?=[${CJK}])`, "g"), "$1")
    .replace(new RegExp(`([${CJK}])[ \\t]+(?=[A-Za-z0-9(])`, "g"), "$1")
    .replace(new RegExp(`([A-Za-z0-9%)])[ \\t]+(?=[${CJK}])`, "g"), "$1")
    .trim();
}

const problems = [];
for (const doc of Object.values(DOCS)) {
  const files = fs.existsSync(alignedDir)
    ? fs.readdirSync(alignedDir).filter((f) => f.startsWith(doc.id + "-") && f.endsWith(".json")).sort()
    : [];
  const segments = [];
  const covered = new Set();
  for (const f of files) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(alignedDir, f), "utf8"));
    } catch (e) {
      problems.push(`${f}: JSON parse error: ${e.message}`);
      continue;
    }
    for (let p = data.pages[0]; p <= data.pages[1]; p++) covered.add(p);
    for (const s of data.segments) {
      if (!TYPES.has(s.type)) problems.push(`${f}: unknown type "${s.type}" (p.${s.page})`);
      const seg = { page: s.page, type: TYPES.has(s.type) ? s.type : "p", en: (s.en ?? "").trim(), ja: normalizeJa(s.ja ?? "") };
      if (s.flag) seg.flag = s.flag;
      segments.push(seg);
    }
  }
  segments.forEach((s, i) => (s.id = `${doc.id}-${i + 1}`));

  const missing = [];
  for (let p = 1; p <= doc.pageCount; p++) if (!covered.has(p)) missing.push(p);
  const flagged = segments.filter((s) => s.flag).length;
  const noJa = segments.filter((s) => !s.ja).length;
  console.log(`${doc.id}: ${files.length} files, ${segments.length} segments, flagged ${flagged}, empty ja ${noJa}, uncovered pages: ${missing.length ? compress(missing) : "none"}`);

  const out = `window.TNFD_DOCS = window.TNFD_DOCS || {};\nwindow.TNFD_DOCS[${JSON.stringify(doc.id)}] = ${JSON.stringify({ ...doc, built: new Date().toISOString().slice(0, 10), complete: missing.length === 0, segments })};\n`;
  fs.writeFileSync(path.join(root, "site", "data", `${doc.id}.js`), out);
  buildSummary(doc, segments);
}

// work/summaries/<doc>[-part].json を統合し、見出しを本文のセグメントIDに結び付けて site/data/<doc>.summary.js に書き出す
function buildSummary(doc, segments) {
  const dir = path.join(root, "work", "summaries");
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => (f === `${doc.id}.json` || f.startsWith(`${doc.id}-`)) && f.endsWith(".json")).sort()
    : [];
  if (!files.length) return;
  const headings = new Map();
  for (const s of segments) if ((s.type === "h1" || s.type === "h2") && !headings.has(s.en)) headings.set(s.en, s);
  const order = new Map(segments.map((s, i) => [s.id, i]));

  const overview = [];
  const sections = [];
  const resolve = (sec, f) => {
    const h = headings.get(sec.heading_en);
    if (!h) problems.push(`${f}: heading not found: "${sec.heading_en}"`);
    return {
      id: h?.id ?? null,
      page: h?.page ?? null,
      titleJa: h?.ja || sec.heading_en,
      titleEn: sec.heading_en,
      summary: sec.summary ?? [],
      children: (sec.children ?? []).map((c) => resolve(c, f)),
    };
  };
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    if (data.overview?.length && !overview.length) overview.push(...data.overview);
    for (const sec of data.sections ?? []) sections.push(resolve(sec, f));
  }
  sections.sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));
  const out = `window.TNFD_SUMMARIES = window.TNFD_SUMMARIES || {};\nwindow.TNFD_SUMMARIES[${JSON.stringify(doc.id)}] = ${JSON.stringify({ overview, sections })};\n`;
  fs.writeFileSync(path.join(root, "site", "data", `${doc.id}.summary.js`), out);
  console.log(`  summary: ${files.join(", ")} → ${sections.length} sections`);
}

fs.mkdirSync(path.join(root, "site", "pdf"), { recursive: true });
for (const f of ["rec_en.pdf", "rec_ja.pdf", "leap_en.pdf", "leap_ja.pdf", "tc_en.pdf"]) fs.copyFileSync(path.join(root, "sources", f), path.join(root, "site", "pdf", f));

if (problems.length) {
  console.log("\nProblems:\n" + problems.join("\n"));
  process.exitCode = 1;
}

function compress(nums) {
  const r = [];
  for (let i = 0; i < nums.length; i++) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    r.push(i === j ? `${nums[i]}` : `${nums[i]}-${nums[j]}`);
    i = j;
  }
  return r.join(",");
}
