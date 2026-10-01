// 対訳ビューア。doc.html?d=<id> で data/<id>.js を読み込み描画する。
(function () {
  "use strict";

  // 作業上の記録にすぎず、読者に「要確認」として示す必要のないフラグ
  const INFO_FLAGS = new Set(["no-ja-match", "ja-rows-reordered", "ja-row-order-differs", "header-row-supplied", "ja-quote-glyphs-restored"]);
  const params = new URLSearchParams(location.search);
  const docId = params.get("d") || "rec";
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* 保存できなくても動作は継続 */ } },
  };

  const tabSummary = document.getElementById("tab-summary");
  if (tabSummary) tabSummary.href = `summary.html?d=${encodeURIComponent(docId)}`;

  const script = document.createElement("script");
  script.src = `data/${encodeURIComponent(docId)}.js`;
  script.onload = () => {
    const doc = window.TNFD_DOCS && window.TNFD_DOCS[docId];
    if (!doc) return fail();
    render(doc);
  };
  script.onerror = fail;
  document.head.appendChild(script);

  function fail() {
    document.getElementById("content").innerHTML =
      `<p class="notice warn">文書データ（data/${escapeHtml(docId)}.js）を読み込めませんでした。<code>node scripts/build.mjs</code> を実行してください。</p>`;
  }

  // ---------- 描画 ----------
  function render(doc) {
    document.title = `${doc.titleJa} | TNFD 対訳`;
    document.getElementById("doc-title").textContent = doc.titleJa;
    document.getElementById("title-ja").textContent = doc.titleJa;
    document.getElementById("title-en").textContent = `${doc.titleEn}（${doc.date}）`;
    document.getElementById("col-ja").textContent = `日本語（${doc.jaSourceLabel}）`;

    const notice = document.getElementById("notice");
    const pdfLinks = [`<a href="${doc.pdfEn}" target="_blank" rel="noopener">英語版PDF</a>`];
    if (doc.pdfJa) pdfLinks.push(`<a href="${doc.pdfJa}" target="_blank" rel="noopener">公式日本語版PDF</a>`);
    notice.className = "notice" + (doc.jaSource === "unofficial" ? " warn" : "");
    notice.innerHTML =
      (doc.jaSource === "official"
        ? `<p>日本語は TNFD 公式日本語版の訳文です。段落の対応付けとPDF抽出に伴う空白・改行の整形のみを行っています。</p>`
        : `<p><strong>日本語訳は本サイトによる非公式の翻訳です。</strong>TNFD による公式翻訳ではありません。用語は TNFD 公式日本語版提言に合わせています。正確な内容は英語原文を参照してください。</p>`) +
      `<p>出典：TNFD「<a href="${doc.sourceUrl}" target="_blank" rel="noopener">${escapeHtml(doc.titleEn)}</a>」（${doc.date}）CC BY 4.0。${pdfLinks.join(" ／ ")}</p>` +
      (doc.complete ? "" : `<p><strong>作業中：</strong>一部のページはまだ収録されていません。</p>`);

    const frag = document.createDocumentFragment();
    const toc = [];
    let lastPage = 0;
    for (const s of doc.segments) {
      const row = document.createElement("div");
      row.className = `row t-${s.type}`;
      row.id = s.id;
      const pageStart = s.page !== lastPage;
      if (pageStart) row.classList.add("page-start");
      lastPage = s.page;

      const pg = document.createElement("a");
      pg.className = "pg";
      pg.href = `${doc.pdfEn}#page=${s.page}`;
      pg.target = "_blank";
      pg.rel = "noopener";
      pg.title = "英語版PDFのこのページを開く";
      pg.textContent = `p.${s.page}`;
      row.appendChild(pg);

      const en = document.createElement("div");
      en.className = "en";
      en.lang = "en";
      en.innerHTML = formatText(s.en, s.type);
      const ja = document.createElement("div");
      ja.className = "ja";
      ja.lang = "ja";
      ja.innerHTML = s.ja ? formatText(s.ja, s.type) : `<span class="empty-ja">（対応する日本語なし）</span>`;
      if (s.flag && !INFO_FLAGS.has(s.flag)) ja.insertAdjacentHTML("beforeend", `<span class="flag" title="${escapeHtml(s.flag)}">要確認</span>`);
      row.append(en, ja);
      frag.appendChild(row);

      if (s.type === "h1" || s.type === "h2" || s.type === "h3") toc.push(s);
    }
    const content = document.getElementById("content");
    content.innerHTML = "";
    content.appendChild(frag);

    renderToc(toc);
    setupMode();
    setupSearch(doc);
    setupScrollSpy(toc);
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }

  function renderToc(items) {
    const ol = document.getElementById("toc-list");
    ol.innerHTML = items
      .map((s) => `<li class="l${s.type.slice(1)}"><a href="#${s.id}" data-id="${s.id}">${escapeHtml(s.ja || s.en)}${s.ja ? `<span class="en">${escapeHtml(s.en)}</span>` : ""}</a></li>`)
      .join("");
    ol.addEventListener("click", (e) => {
      if (e.target.closest("a")) document.body.classList.remove("toc-open");
    });
    document.getElementById("toc-toggle").addEventListener("click", () => document.body.classList.toggle("toc-open"));
  }

  // ---------- 表示モード（対訳／英語／日本語） ----------
  function setupMode() {
    const buttons = document.querySelectorAll("[data-mode]");
    const apply = (m) => {
      document.body.classList.remove("mode-both", "mode-en", "mode-ja");
      document.body.classList.add(`mode-${m}`);
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
      store.set("tnfd-mode", m);
    };
    buttons.forEach((b) => b.addEventListener("click", () => apply(b.dataset.mode)));
    apply(["both", "en", "ja"].includes(store.get("tnfd-mode")) ? store.get("tnfd-mode") : "both");

    const themeBtn = document.getElementById("theme");
    const setTheme = (t) => {
      if (t) document.documentElement.dataset.theme = t;
      else delete document.documentElement.dataset.theme;
      store.set("tnfd-theme", t || "");
    };
    setTheme(store.get("tnfd-theme") || "");
    themeBtn.addEventListener("click", () => {
      const dark = document.documentElement.dataset.theme
        ? document.documentElement.dataset.theme === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(dark ? "light" : "dark");
    });
  }

  // ---------- 検索 ----------
  function setupSearch(doc) {
    const input = document.getElementById("q");
    const status = document.getElementById("search-status");
    const prev = document.getElementById("prev");
    const next = document.getElementById("next");
    let hits = [];
    let cur = -1;
    let timer;

    const clear = () => {
      document.querySelectorAll(".row mark").forEach((m) => m.replaceWith(...m.childNodes));
      document.querySelectorAll(".row.hit-current").forEach((r) => r.classList.remove("hit-current"));
      document.querySelectorAll(".row .en, .row .ja").forEach((el) => el.normalize());
    };

    const run = () => {
      clear();
      const q = input.value.trim();
      hits = [];
      cur = -1;
      if (!q) { status.textContent = ""; prev.hidden = next.hidden = true; return; }
      const ql = q.toLowerCase();
      for (const s of doc.segments) {
        if (s.en.toLowerCase().includes(ql) || s.ja.toLowerCase().includes(ql)) hits.push(s.id);
      }
      for (const id of hits) {
        document.getElementById(id).querySelectorAll(".en, .ja").forEach((el) => highlight(el, ql));
      }
      prev.hidden = next.hidden = hits.length === 0;
      if (hits.length) go(0);
      else status.textContent = "該当なし";
    };

    const go = (i) => {
      if (!hits.length) return;
      document.querySelector(".row.hit-current")?.classList.remove("hit-current");
      cur = (i + hits.length) % hits.length;
      const row = document.getElementById(hits[cur]);
      row.classList.add("hit-current");
      row.scrollIntoView({ block: "center" });
      status.textContent = `${cur + 1} / ${hits.length} 件`;
    };

    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, 250); });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(cur + (e.shiftKey ? -1 : 1)); } });
    prev.addEventListener("click", () => go(cur - 1));
    next.addEventListener("click", () => go(cur + 1));
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== input) { e.preventDefault(); document.body.classList.add("toc-open"); input.focus(); }
    });
  }

  function highlight(el, ql) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue;
      const lower = text.toLowerCase();
      let idx = lower.indexOf(ql);
      if (idx < 0) continue;
      const f = document.createDocumentFragment();
      let pos = 0;
      while (idx >= 0) {
        f.append(text.slice(pos, idx));
        const m = document.createElement("mark");
        m.textContent = text.slice(idx, idx + ql.length);
        f.append(m);
        pos = idx + ql.length;
        idx = lower.indexOf(ql, pos);
      }
      f.append(text.slice(pos));
      node.replaceWith(f);
    }
  }

  // ---------- 目次のスクロール追従 ----------
  function setupScrollSpy(toc) {
    if (!toc.length || !("IntersectionObserver" in window)) return;
    const links = new Map([...document.querySelectorAll("#toc-list a")].map((a) => [a.dataset.id, a]));
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          links.forEach((a) => a.classList.remove("active"));
          const a = links.get(e.target.id);
          if (a) { a.classList.add("active"); a.scrollIntoView({ block: "nearest" }); }
        }
      },
      { rootMargin: "-60px 0px -75% 0px" }
    );
    toc.forEach((s) => obs.observe(document.getElementById(s.id)));
  }

  // ---------- テキスト整形 ----------
  function formatText(text, type) {
    if (type === "table") return renderTable(text);
    return escapeHtml(text);
  }

  // パイプ区切りの Markdown 表を HTML に変換（セル内の <br> のみ許可）
  function renderTable(md) {
    const lines = md.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows = lines
      .filter((l) => !/^\|?\s*:?-{2,}/.test(l))
      .map((l) => l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
    if (!rows.length) return escapeHtml(md);
    const cell = (c, tag) => `<${tag}>${escapeHtml(c).replace(/&lt;br\s*\/?&gt;/gi, "<br>")}</${tag}>`;
    const [head, ...body] = rows;
    return `<div class="tbl"><table><thead><tr>${head.map((c) => cell(c, "th")).join("")}</tr></thead><tbody>${body
      .map((r) => `<tr>${r.map((c) => cell(c, "td")).join("")}</tr>`)
      .join("")}</tbody></table></div>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
})();
