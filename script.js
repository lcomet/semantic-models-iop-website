(function () {
  'use strict';

  const els = {
    toc: document.getElementById('toc'),
    content: document.getElementById('content'),
    searchInput: document.getElementById('search-input'),
    searchCount: document.getElementById('search-count'),
    noResults: document.getElementById('no-results'),
    progress: document.getElementById('progress-bar'),
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('overlay'),
    menuBtn: document.getElementById('menu-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    backToTop: document.getElementById('back-to-top'),
    lightbox: document.getElementById('lightbox'),
    lightboxImg: document.getElementById('lightbox-img'),
    lightboxClose: document.getElementById('lightbox-close'),
  };

  let SECTIONS = [];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Lightly format inline text: wrap ontology-style CamelCase / dotted terms and
  // quoted phrases so long-form prose reads a bit richer, without being noisy.
  function formatInline(text) {
    let t = escapeHtml(text);
    // "quoted phrases" -> styled quotes
    t = t.replace(/&quot;([^&]{1,140}?)&quot;|"([^"]{1,140}?)"|\u201c([^\u201d]{1,140}?)\u201d/g,
      (m, a, b, c) => `<q>${a || b || c}</q>`);
    return t;
  }

  function figImg(page) {
    return `assets/pages/page-${String(page).padStart(2, '0')}.jpg`;
  }

  function renderBlock(b, sectionNumber) {
    switch (b.type) {
      case 'p':
        return `<p>${formatInline(b.text)}</p>`;
      case 'concept':
        return `<div class="concept">${formatInline(b.text)}</div>`;
      case 'callout': {
        const labels = { remark: 'Remark', note: 'Note', hint: 'Hint', example: b.label ? b.label : 'Example' };
        return `<div class="callout ${b.kind}"><span class="callout-label">${labels[b.kind] || b.kind}</span>${formatInline(b.text)}</div>`;
      }
      case 'ul':
        return `<ul>${b.items.map(i => `<li>${formatInline(i)}</li>`).join('')}</ul>`;
      case 'ol':
        return `<ol${b.start && b.start !== 1 ? ` start="${b.start}"` : ''}>${b.items.map(i => `<li>${formatInline(i)}</li>`).join('')}</ol>`;
      case 'ol_alpha':
        return `<ol class="alpha">${b.items.map(i => `<li>${formatInline(i)}</li>`).join('')}</ol>`;
      case 'figure':
        return `<figure class="fig-block">
          <div class="fig-frame"><img src="${figImg(b.page)}" alt="Figure ${b.num}: ${escapeHtml(b.caption)}" loading="lazy" data-lightbox="${figImg(b.page)}"></div>
          <p class="zoom-hint">Click to view full page (p. ${b.page})</p>
          <figcaption class="fig-caption"><span class="fig-num">Figure ${b.num}</span>${formatInline(b.caption)}</figcaption>
        </figure>`;
      case 'table':
        return `<figure class="fig-block">
          <div class="fig-frame"><img src="${figImg(b.page)}" alt="Table ${b.num}: ${escapeHtml(b.caption)}" loading="lazy" data-lightbox="${figImg(b.page)}"></div>
          <p class="zoom-hint">Click to view full page (p. ${b.page})</p>
          <figcaption class="fig-caption"><span class="fig-num">Table ${b.num}</span>${formatInline(b.caption)}</figcaption>
        </figure>`;
      case 'reflist':
        return `<ol class="reflist">${b.items.map(it => `<li id="ref-${sectionNumber}-${it.num}"><span class="ref-num">[${it.num}]</span><span>${formatInline(it.text)}</span></li>`).join('')}</ol>`;
      case 'ontology-matrix':
        return renderOntologyMatrix(b);
      default:
        return '';
    }
  }

  function renderOntologyMatrix(b) {
    const cols = b.columns;
    const rows = b.items;
    const wid = 'mtx-' + Math.random().toString(36).slice(2, 8);
    const header = cols.map(c => `<th class="mtx-col" data-col="${c.key}" title="${escapeHtml(c.full)}"><button class="mtx-col-btn" data-col="${c.key}">${c.key}</button></th>`).join('');
    const body = rows.map(r => {
      const cells = cols.map(c => {
        const has = r.domains.includes(c.key);
        return `<td class="mtx-cell ${has ? 'yes' : ''}" data-col="${c.key}">${has ? '<span class="mtx-dot" title="' + escapeHtml(c.full) + '"></span>' : ''}</td>`;
      }).join('');
      const typeLabel = r.classif.includes('SM') ? 'Semantic Model' : 'Ontology';
      const refLinks = (r.ref || '').replace(/[\[\]]/g, '').split(',').filter(Boolean)
        .map(n => `<a href="#ref-BIB2-${n.trim()}" class="mtx-ref">[${n.trim()}]</a>`).join(' ');
      return `<tr data-name="${escapeHtml(r.name.toLowerCase())}">
        <th class="mtx-rowhead" scope="row">${escapeHtml(r.name)}</th>
        ${cells}
        <td class="mtx-type"><span class="mtx-pill ${r.classif.includes('SM') ? 'sm' : 'o'}">${typeLabel === 'Semantic Model' ? 'SM' : 'O'}</span></td>
        <td class="mtx-refcell">${refLinks}</td>
      </tr>`;
    }).join('');

    return `<div class="mtx-wrap" id="${wid}">
      <div class="mtx-toolbar">
        <div class="mtx-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="mtx-search-input" placeholder="Filter by ontology name…">
        </div>
        <div class="mtx-hint">Click a domain column to filter · <span class="mtx-match-count"></span></div>
      </div>
      <div class="mtx-scroll">
        <table class="mtx-table">
          <thead><tr><th class="mtx-rowhead-h">Ontology / Model</th>${header}<th>Type</th><th>Ref.</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <p class="mtx-caption">Domain-ontology comparison, reconstructed from the source table on pp. ${b.sourcePages.join('–')}. <button class="mtx-viewsource" data-page="${b.sourcePages[0]}">View original page image</button></p>
    </div>`;
  }

  function headingTag(level) {
    return level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
  }

  function renderSection(s) {
    const tag = headingTag(s.level);
    const heading = `<${tag} id="${s.id}" class="section-heading"><span class="num">${s.number === 'A' || s.number === 'BIB' || s.number === 'BIB2' ? '' : s.number}</span>${escapeHtml(s.title)}<a class="anchor-link" href="#${s.id}" aria-label="Link to this section">#</a><span class="page-tag">p. ${s.page}</span></${tag}>`;
    const body = s.blocks.map(b => renderBlock(b, s.number)).join('\n');
    return `<section class="section section-l${s.level}" id="wrap-${s.id}">${heading}${body}</section>`;
  }

  function buildDocHeader() {
    return `
    <header class="doc-header">
      <p class="kicker">RWTH Aachen · Internet of Production</p>
      <h1>Guidelines for the Creation of Semantic&nbsp;Models in the&nbsp;IoP</h1>
      <p class="lede">A practical, unified guideline for Domain Experts and Knowledge Engineers on building, documenting, and publishing ontologies for manufacturing and production systems.</p>
      <div class="doc-meta">
        <span><strong>Author</strong> Lina Teresa Molinas&nbsp;Comet</span>
        <span><strong>Reviewers</strong> Patrick Sapel · Iraklis Dimitriadis</span>
        <span><strong>Source</strong> 43-page PDF, converted for the web</span>
      </div>
      <div class="doc-cards">
        <button class="doc-card" data-goto="sec-2">
          <div class="n">01</div>
          <h3>Fundamentals</h3>
          <p>Classes, properties, domains &amp; ranges — the core vocabulary of an ontology.</p>
        </button>
        <button class="doc-card" data-goto="sec-3-2-1">
          <div class="n">02</div>
          <h3>The workflow</h3>
          <p>An 11-step process from use case to a published, maintained ontology.</p>
        </button>
        <button class="doc-card" data-goto="sec-7">
          <div class="n">03</div>
          <h3>IoP ontologies</h3>
          <p>Upper, support and domain ontologies to reuse instead of starting from scratch.</p>
        </button>
      </div>
    </header>`;
  }

  function render(sections) {
    const html = sections.map(renderSection).join('\n');
    els.content.innerHTML = buildDocHeader() + html + buildPageNav();
    attachLightboxHandlers();
    attachMatrixHandlers();
  }

  function attachMatrixHandlers() {
    document.querySelectorAll('.mtx-wrap').forEach(wrap => {
      const table = wrap.querySelector('.mtx-table');
      const searchInput = wrap.querySelector('.mtx-search-input');
      const matchCount = wrap.querySelector('.mtx-match-count');
      const activeCols = new Set();
      const rows = Array.from(table.querySelectorAll('tbody tr'));

      function applyFilters() {
        const q = searchInput.value.trim().toLowerCase();
        let visible = 0;
        rows.forEach(row => {
          const nameMatch = !q || row.dataset.name.includes(q);
          let colMatch = true;
          if (activeCols.size > 0) {
            colMatch = Array.from(activeCols).every(col => row.querySelector(`.mtx-cell[data-col="${col}"]`).classList.contains('yes'));
          }
          const show = nameMatch && colMatch;
          row.style.display = show ? '' : 'none';
          if (show) visible++;
        });
        matchCount.textContent = `${visible} of ${rows.length} shown`;
      }

      searchInput.addEventListener('input', applyFilters);

      wrap.querySelectorAll('.mtx-col-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const col = btn.dataset.col;
          if (activeCols.has(col)) {
            activeCols.delete(col);
            btn.classList.remove('active');
          } else {
            activeCols.add(col);
            btn.classList.add('active');
          }
          applyFilters();
        });
      });

      const viewSourceBtn = wrap.querySelector('.mtx-viewsource');
      if (viewSourceBtn) {
        viewSourceBtn.addEventListener('click', () => {
          const page = viewSourceBtn.dataset.page;
          els.lightboxImg.src = figImg(page);
          els.lightboxImg.alt = 'Source page ' + page;
          els.lightbox.classList.add('show');
        });
      }

      applyFilters();
    });
  }

  function buildPageNav() {
    return `<nav class="pagenav" id="pagenav"></nav>`;
  }

  function updatePageNav(currentId) {
    const nav = document.getElementById('pagenav');
    if (!nav) return;
    const idx = SECTIONS.findIndex(s => s.id === currentId);
    const prev = idx > 0 ? SECTIONS[idx - 1] : null;
    const next = idx >= 0 && idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null;
    nav.innerHTML = `
      ${prev ? `<a class="prev" href="#${prev.id}"><div class="dir">Previous</div><div class="ttl">${escapeHtml(prev.title)}</div></a>` : '<span></span>'}
      ${next ? `<a class="next" href="#${next.id}"><div class="dir">Next</div><div class="ttl">${escapeHtml(next.title)}</div></a>` : '<span></span>'}
    `;
  }

  // -------- TOC --------
  function buildTOC(sections) {
    els.toc.innerHTML = sections.map(s => {
      const showNum = !['A', 'BIB', 'BIB2'].includes(s.number);
      return `<a class="toc-link level-${s.level}" data-target="${s.id}" data-text="${escapeHtml((s.number + ' ' + s.title).toLowerCase())}" href="#${s.id}">${showNum ? `<span class="num">${s.number}</span>` : ''}${escapeHtml(s.title)}</a>`;
    }).join('');
  }

  function setActiveTOC(id) {
    document.querySelectorAll('.toc-link').forEach(a => {
      a.classList.toggle('active', a.dataset.target === id);
    });
  }

  // -------- scroll spy + progress --------
  let sectionEls = [];
  function refreshSectionEls() {
    sectionEls = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean);
  }

  function onScroll() {
    const scrollTop = window.scrollY;
    const doc = document.documentElement;
    const total = doc.scrollHeight - doc.clientHeight;
    const pct = total > 0 ? Math.min(100, (scrollTop / total) * 100) : 0;
    els.progress.style.width = pct + '%';

    els.backToTop.classList.toggle('show', scrollTop > 800);

    let current = null;
    for (const el of sectionEls) {
      const rect = el.getBoundingClientRect();
      if (rect.top <= 120) current = el;
      else break;
    }
    if (current) setActiveTOC(current.id);
  }

  // -------- search --------
  let searchIndex = [];
  function buildSearchIndex() {
    searchIndex = SECTIONS.map(s => {
      const text = s.blocks.map(b => b.text || (b.items ? (Array.isArray(b.items) ? b.items.map(i => i.text || i).join(' ') : '') : '') || b.caption || '').join(' ');
      return { id: s.id, number: s.number, title: s.title, haystack: (s.number + ' ' + s.title + ' ' + text).toLowerCase() };
    });
  }

  function runSearch(q) {
    q = q.trim().toLowerCase();
    const links = document.querySelectorAll('.toc-link');
    if (!q) {
      links.forEach(a => { a.classList.remove('hidden'); a.innerHTML = a.innerHTML; });
      // restore original labels (rebuild without marks)
      buildTOC(SECTIONS);
      const active = document.querySelector('.toc-link.active');
      els.searchCount.textContent = '';
      els.noResults.classList.remove('show');
      return;
    }
    let matchCount = 0;
    const matchedIds = new Set(searchIndex.filter(s => s.haystack.includes(q)).map(s => s.id));
    matchCount = matchedIds.size;

    links.forEach(a => {
      const id = a.dataset.target;
      a.classList.toggle('hidden', !matchedIds.has(id));
    });

    els.searchCount.textContent = matchCount ? `${matchCount} section${matchCount === 1 ? '' : 's'} found` : '';
    els.noResults.classList.toggle('show', matchCount === 0);
  }

  // -------- lightbox --------
  function attachLightboxHandlers() {
    document.querySelectorAll('[data-lightbox]').forEach(img => {
      img.addEventListener('click', () => {
        els.lightboxImg.src = img.dataset.lightbox;
        els.lightboxImg.alt = img.alt;
        els.lightbox.classList.add('show');
      });
    });
  }
  els.lightbox.addEventListener('click', (e) => {
    if (e.target === els.lightbox || e.target === els.lightboxClose) {
      els.lightbox.classList.remove('show');
      els.lightboxImg.src = '';
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      els.lightbox.classList.remove('show');
      closeSidebar();
    }
  });

  // -------- mobile sidebar --------
  function openSidebar() {
    els.sidebar.classList.add('open');
    els.overlay.classList.add('show');
  }
  function closeSidebar() {
    els.sidebar.classList.remove('open');
    els.overlay.classList.remove('show');
  }
  els.menuBtn.addEventListener('click', openSidebar);
  els.overlay.addEventListener('click', closeSidebar);

  // -------- theme --------
  function applyTheme(t) {
    document.documentElement.classList.toggle('dark', t === 'dark');
    localStorage.setItem('iop-theme', t);
    els.themeToggle.setAttribute('aria-pressed', t === 'dark');
  }
  els.themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    applyTheme(isDark ? 'light' : 'dark');
  });
  (function initTheme() {
    const saved = localStorage.getItem('iop-theme');
    if (saved) { applyTheme(saved); return; }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  })();

  // -------- back to top --------
  els.backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // -------- doc-card jump buttons --------
  document.addEventListener('click', (e) => {
    const card = e.target.closest('[data-goto]');
    if (card) {
      const target = document.getElementById(card.dataset.goto);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const link = e.target.closest('.toc-link');
    if (link) {
      closeSidebar();
    }
  });

  // -------- init --------
  fetch('content.json')
    .then(r => r.json())
    .then(sections => {
      SECTIONS = sections;
      buildTOC(sections);
      render(sections);
      buildSearchIndex();
      refreshSectionEls();
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      // page nav updates on hash / scroll spy target change
      const observer = new MutationObserver(() => {});
      let lastActive = null;
      setInterval(() => {
        const active = document.querySelector('.toc-link.active');
        if (active && active.dataset.target !== lastActive) {
          lastActive = active.dataset.target;
          updatePageNav(lastActive);
        }
      }, 300);

      if (location.hash) {
        setTimeout(() => {
          const el = document.querySelector(location.hash);
          if (el) el.scrollIntoView({ block: 'start' });
        }, 60);
      }
    })
    .catch(err => {
      els.content.innerHTML = `<p style="padding:40px;color:#a33">Could not load content.json — ${escapeHtml(err.message)}. If you're opening this file directly from disk, serve it over a local web server (e.g. <code>python3 -m http.server</code>) since browsers block fetch() on file:// URLs.</p>`;
    });

  els.searchInput.addEventListener('input', (e) => runSearch(e.target.value));
})();
