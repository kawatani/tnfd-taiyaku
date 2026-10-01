// 要約ページ。summary.html?d=<id> で data/<id>.js（文書情報）と data/<id>.summary.js を読み込む。
(function () {
  "use strict";

  const docId = new URLSearchParams(location.search).get("d") || "rec";
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* 保存できなくても動作は継続 */ } },
  };

  setupTheme();
  document.getElementById("toc-toggle").addEventListener("click", () => document.body.classList.toggle("toc-open"));
  document.getElementById("tab-full").href = `doc.html?d=${encodeURIComponent(docId)}`;

  load(`data/${encodeURIComponent(docId)}.js`)
    .then(() => load(`data/${encodeURIComponent(docId)}.summary.js`))
    .then(() => {
      const doc = window.TNFD_DOCS?.[docId];
      const sum = window.TNFD_SUMMARIES?.[docId];
      if (!doc || !sum) throw new Error("missing");
      render(doc, sum);
    })
    .catch(() => {
      document.getElementById("sections").innerHTML =
        `<p class="notice warn">要約データ（data/${escapeHtml(docId)}.summary.js）を読み込めませんでした。<code>node scripts/build.mjs</code> を実行してください。</p>`;
    });

  function load(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function render(doc, sum) {
    document.title = `要約：${doc.titleJa} | TNFD 対訳`;
    document.getElementById("doc-title").textContent = doc.titleJa;
    document.getElementById("title-ja").textContent = doc.titleJa;
    document.getElementById("title-en").textContent = `${doc.titleEn}（${doc.date}）`;
    document.getElementById("notice").innerHTML =
      `<p>この要約は本サイトが作成した非公式のものです。TNFD による公式の要約ではありません。正確な内容は各章の「全文で読む」から原文・日本語訳を確認してください。</p>` +
      `<p>出典：TNFD「<a href="${doc.sourceUrl}" target="_blank" rel="noopener">${escapeHtml(doc.titleEn)}</a>」（${doc.date}）CC BY 4.0</p>`;

    if (sum.overview.length) {
      document.getElementById("overview").hidden = false;
      document.getElementById("overview-list").innerHTML = sum.overview.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
    }

    const fullLink = (sec) =>
      sec.id ? `<a class="read-full" href="doc.html?d=${encodeURIComponent(docId)}#${sec.id}">全文で読む<span class="pg-note">p.${sec.page}〜</span></a>` : "";
    const bullets = (items) => (items.length ? `<ul>${items.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` : "");

    document.getElementById("sections").innerHTML = sum.sections
      .map(
        (sec, i) => `
      <section class="sum-sec" id="s${i}">
        <header>
          <h2>${escapeHtml(sec.titleJa)}</h2>
          <p class="en" lang="en">${escapeHtml(sec.titleEn)}</p>
          ${fullLink(sec)}
        </header>
        ${bullets(sec.summary)}
        ${sec.children
          .map(
            (c) => `
          <div class="sum-sub">
            <div class="sum-sub-head"><h3>${escapeHtml(c.titleJa)}</h3>${fullLink(c)}</div>
            ${bullets(c.summary)}
          </div>`
          )
          .join("")}
      </section>`
      )
      .join("");

    const toc = [];
    if (sum.overview.length) toc.push(`<li class="l1"><a href="#overview">全体の要点</a></li>`);
    sum.sections.forEach((sec, i) => toc.push(`<li class="l1"><a href="#s${i}">${escapeHtml(sec.titleJa)}</a></li>`));
    const ol = document.getElementById("toc-list");
    ol.innerHTML = toc.join("");
    ol.addEventListener("click", (e) => {
      if (e.target.closest("a")) document.body.classList.remove("toc-open");
    });
  }

  function setupTheme() {
    const setTheme = (t) => {
      if (t) document.documentElement.dataset.theme = t;
      else delete document.documentElement.dataset.theme;
      store.set("tnfd-theme", t || "");
    };
    setTheme(store.get("tnfd-theme") || "");
    document.getElementById("theme").addEventListener("click", () => {
      const dark = document.documentElement.dataset.theme
        ? document.documentElement.dataset.theme === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(dark ? "light" : "dark");
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
})();
