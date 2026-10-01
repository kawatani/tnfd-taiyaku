// PDF → ページ単位テキスト（work/pages/<doc>/NNN.txt）。pdftotext（poppler）が必要。
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docs = { rec: "rec_en.pdf", rec_ja: "rec_ja.pdf", leap: "leap_en.pdf", leap_ja: "leap_ja.pdf", tc: "tc_en.pdf" };

for (const [id, file] of Object.entries(docs)) {
  const text = execFileSync("pdftotext", ["-enc", "UTF-8", path.join(root, "sources", file), "-"], { maxBuffer: 1 << 28 }).toString("utf8");
  const pages = text.split("\f");
  if (pages.at(-1).trim() === "") pages.pop();
  const dir = path.join(root, "work", "pages", id);
  fs.mkdirSync(dir, { recursive: true });
  pages.forEach((t, i) => fs.writeFileSync(path.join(dir, `${String(i + 1).padStart(3, "0")}.txt`), t));
  console.log(`${id}: ${pages.length} pages`);
}
