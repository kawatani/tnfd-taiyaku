# TNFD 英日対訳サイト

TNFD の提言（2023年9月）、LEAPアプローチのガイダンス（第1.1版、2023年10月）、追加セクターガイダンス「技術・通信」（2026年9月）を、英語原文と日本語訳で段落ごとに並べて読める静的サイト。

- 提言・LEAPガイダンスの日本語：TNFD 公式日本語版をそのまま使用
- 技術・通信ガイダンスの日本語：独自翻訳（非公式）。用語は公式日本語版提言に合わせる（`work/glossary.md`）

## 見る

`site/index.html` をブラウザで開く（サーバー不要）。GitHub Pages などに置く場合は `site/` をそのまま公開する。

## 作り直す

```sh
node scripts/extract.mjs   # sources/*.pdf → work/pages/<doc>/NNN.txt（pdftotext が必要）
# work/aligned/<doc>-AAA-BBB.json を作成・修正（形式は work/SPEC.md）
node scripts/build.mjs     # → site/data/<doc>.js、PDF を site/pdf/ にコピー
```

訳文の修正は `work/aligned/*.json` を編集して `build.mjs` を再実行する。

## 構成

| パス | 内容 |
|---|---|
| `sources/` | 原文PDF（rec_en / rec_ja / leap_en / leap_ja / tc_en） |
| `work/pages/` | ページ単位の抽出テキスト |
| `work/aligned/` | 段落単位の対訳データ（編集対象） |
| `work/SPEC.md` | 対訳データの仕様 |
| `work/glossary.md` | 訳語集 |
| `site/` | 公開用の静的サイト |

## ライセンス

原文は TNFD の著作物で CC BY 4.0（各PDFに明記）。サイト上に出典・ライセンス・変更点・非公式翻訳である旨を表示している。

## GitHub Pages で公開する

`main` ブランチに push すると、GitHub Actions（`.github/workflows/pages.yml`）が `node scripts/build.mjs` を実行し、`site/` を GitHub Pages に公開する。`site/data/` と `site/pdf/` はビルド時に生成するのでリポジトリには含めない。

初回のみ：GitHub のリポジトリで **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする。
