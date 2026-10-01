// 文書の見出し構成を表示する（要約作成の補助）。使い方: node scripts/outline.mjs <doc> [maxLevel]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [doc, maxLevel = "2"] = process.argv.slice(2);
const files = fs.readdirSync(path.join(root, "work", "aligned")).filter((f) => f.startsWith(doc + "-")).sort();
const segs = files.flatMap((f) => JSON.parse(fs.readFileSync(path.join(root, "work", "aligned", f), "utf8")).segments);
let count = 0;
for (const s of segs) {
  const m = /^h([1-4])$/.exec(s.type);
  if (m && Number(m[1]) <= Number(maxLevel)) {
    console.log(`${"  ".repeat(Number(m[1]) - 1)}[p.${s.page}] ${s.type} ${s.en}  ／ ${s.ja}`);
  }
  count++;
}
console.log(`(${count} segments)`);
