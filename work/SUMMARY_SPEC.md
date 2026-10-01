# 日本語サマリ作成仕様

対訳データ（`work/aligned/<doc>-*.json`）を読み、文書の日本語サマリを作る。見出し構成は `node scripts/outline.mjs <doc> 2` で確認できる。

## 出力

`work/summaries/<doc>[-<part>].json`（UTF-8）：

```json
{
  "doc": "rec",
  "overview": ["文書全体の要点（1文〜2文）", "…"],
  "sections": [
    {
      "heading_en": "3. Recommendations & guidance",
      "summary": ["この章の要点（1〜2文）", "…"],
      "children": [
        { "heading_en": "3.3. Disclosure recommendations and guidance for all sectors", "summary": ["…"] }
      ]
    }
  ]
}
```

- `heading_en` … 対訳データ中の見出しセグメント（`h1`/`h2`）の `en` と **一字一句同じ文字列**（サイトで本文へリンクするために使う）。
- `overview` … 文書全体の要点を 5〜8 項目。分担して作る場合は前半担当だけが書き、後半担当は省略してよい（統合時に調整する）。
- `sections` … 本文の各章（`h1`）。`summary` は 3〜6 項目。
- `children` … 章の中の主な節（`h2`）。1〜3 項目。重要でない節（謝辞的なもの、短い導入）は省いてよい。
- 表紙・目次・謝辞・参考文献・略語一覧・メンバー一覧は、`sections` に含めないか、`summary` を 1 項目だけにする。
- 別紙（Annex）は 1〜3 項目で、何が載っているか・どう使うかを書く。

## 書き方

- 文体は「である調」。各項目は 1〜2 文、80〜120 字程度を目安に、具体的に書く（「〜について説明している」で終わらせず、中身を書く）。
- 開示提言の数（14 項目）、4 つの柱、LEAP の各フェーズ、中核指標、要注意地域の基準、セクター固有の論点（水、半導体、データセンター等）など、実務で重要な内容・数・名称を落とさない。
- 用語は公式日本語版の訳語（対訳データの `ja`、`work/glossary.md`）に合わせる。
- 原文にない評価・意見を加えない。原文の長い引用はしない（要約として自分の言葉で書く）。
- 書き出し後、`node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" <file>` で検証し、さらに各 `heading_en` が対訳データの見出しに存在することを確認する。
