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

  function stripTags(html) {
    return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function renderListItem(it) {
    const nested = it.blocks && it.blocks.length ? it.blocks.map(renderBlock).join('\n') : '';
    return `<li>${it.html}${nested}</li>`;
  }

  function renderBlock(b) {
    switch (b.type) {
      case 'p':
        return `<p>${b.html}</p>`;
      case 'concept':
        return `<div class="concept">${b.html}${b.image ? `<img class="concept-img" src="${b.image}" alt="">` : ''}</div>`;
      case 'callout': {
        const labels = { remark: 'Remark', note: 'Note', hint: 'Hint', facts: 'Facts' };
        const label = labels[b.kind] || (b.kind ? b.kind[0].toUpperCase() + b.kind.slice(1) : 'Note');
        return `<div class="callout ${b.kind}"><span class="callout-label">${label}</span>${b.html}</div>`;
      }
      case 'callout-blocks': {
        const labels = { facts: 'Facts' };
        const label = labels[b.kind] || 'Note';
        const inner = b.blocks.map(renderBlock).join('\n');
        return `<div class="callout ${b.kind}"><span class="callout-label">${label}</span>${inner}</div>`;
      }
      case 'ul':
        return `<ul>${b.items.map(renderListItem).join('')}</ul>`;
      case 'ol':
        return `<ol${b.start && b.start !== 1 ? ` start="${b.start}"` : ''}>${b.items.map(renderListItem).join('')}</ol>`;
      case 'figure':
        return `<figure class="fig-block">
          <div class="fig-frame"><img src="${b.src}" alt="Figure ${b.num}" loading="lazy" data-lightbox="${b.src}"></div>
          <figcaption class="fig-caption"><span class="fig-num" id="figure-${b.num}">Figure ${b.num}</span>${b.caption}</figcaption>
        </figure>`;
      case 'figure-group': {
        const imgs = b.images.map(im => `
          <div class="fig-frame"><img src="${im.src}" alt="" loading="lazy" data-lightbox="${im.src}"></div>
          <p class="fig-subcaption">${im.caption}</p>`).join('');
        return `<figure class="fig-block fig-group">
          <div class="fig-group-imgs">${imgs}</div>
          <figcaption class="fig-caption"><span class="fig-num" id="figure-${b.num}">Figure ${b.num}</span>${b.caption}</figcaption>
        </figure>`;
      }
      case 'inline-image':
        return `<div class="inline-img-wrap"><img class="inline-img" src="${b.src}" alt="" loading="lazy" data-lightbox="${b.src}"></div>`;
      case 'table': {
        const hasHeader = b.header && b.header.length;
        const singleCol = hasHeader && b.header.length === 1;
        if (singleCol) {
          const rows = b.rows.map(r => `<li>${r[0]}</li>`).join('');
          return `<div class="reslist-wrap">
            ${b.caption ? `<p class="table-caption"><span class="fig-num" id="table-${b.num}">Table ${b.num}</span>${b.caption}</p>` : ''}
            <ul class="reslist">${rows}</ul>
          </div>`;
        }
        const headHtml = hasHeader ? `<thead><tr>${b.header.map(c => `<th>${c}</th>`).join('')}</tr></thead>` : '';
        const bodyHtml = `<tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
        return `<div class="datatable-wrap">
          ${b.caption ? `<p class="table-caption"><span class="fig-num" id="table-${b.num}">Table ${b.num}</span>${b.caption}</p>` : ''}
          <div class="datatable-scroll"><table class="datatable">${headHtml}${bodyHtml}</table></div>
        </div>`;
      }
      case 'abbreviations':
        return `<dl class="abbrev-list">${b.items.map(it => `<div class="abbrev-row"><dt>${it.abbr}</dt><dd>${it.full}</dd></div>`).join('')}</dl>`;
      case 'reflist':
        return `<ol class="reflist">${b.items.map(it => `<li id="ref-${it.key}"><span class="ref-num">[${it.num}]</span><span>${it.text}${it.url ? ` <a href="${it.url}" target="_blank" rel="noopener" class="ref-link">↗</a>` : ''}</span></li>`).join('')}</ol>`;
      case 'ontology-matrix':
        return renderOntologyMatrix(b);
      case 'raw':
        return b.blocks.map(renderBlock).join('\n');
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
        .map(n => `<a href="#ref-domtab-${n.trim()}" class="mtx-ref">[${n.trim()}]</a>`).join(' ');
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
      <p class="mtx-caption">${b.sourceNote || 'Domain-ontology comparison table.'}</p>
    </div>`;
  }

  function headingTag(level) {
    return level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
  }

  // -------- breadcrumbs (ancestor chain for the current page) --------
  function breadcrumbFor(s) {
    if (!s.number) return '';
    const parts = String(s.number).split('.');
    const crumbs = [];
    for (let i = 1; i < parts.length; i++) {
      const anc = parts.slice(0, i).join('.');
      const ancSec = SECTIONS.find(x => x.number === anc);
      if (ancSec) crumbs.push(`<a href="#${ancSec.id}">${stripTags(ancSec.title)}</a>`);
    }
    if (!crumbs.length) return '';
    return `<div class="breadcrumb">${crumbs.join(' <span class="sep">/</span> ')}</div>`;
  }

  // -------- children of a chapter/section (for empty "divider" pages) --------
  function directChildren(s) {
    if (!s.number) return [];
    const prefix = s.number + '.';
    const depth = String(s.number).split('.').length + 1;
    return SECTIONS.filter(x => x.number && String(x.number).startsWith(prefix) && String(x.number).split('.').length === depth);
  }

  function childIndexHtml(s) {
    const children = directChildren(s);
    if (!children.length) return '';
    const cards = children.map(c => {
      const preview = stripTags((c.blocks.find(b => b.type === 'p') || {}).html || '').slice(0, 110);
      return `<a class="child-card" href="#${c.id}">
        <span class="child-num">${escapeHtml(c.number)}</span>
        <span class="child-title">${stripTags(c.title)}</span>
        ${preview ? `<span class="child-preview">${escapeHtml(preview)}${preview.length >= 110 ? '…' : ''}</span>` : ''}
      </a>`;
    }).join('');
    return `<div class="child-index"><p class="child-index-label">In this chapter</p><div class="child-grid">${cards}</div></div>`;
  }

  // -------- render a single section as its own page --------
  function renderSectionPage(s) {
    const numHtml = s.number ? `<span class="num">${escapeHtml(s.number)}</span>` : '';
    const crumb = breadcrumbFor(s);
    const body = s.blocks.length
      ? s.blocks.map(renderBlock).join('\n')
      : childIndexHtml(s) || '<p class="empty-note">This section has no content of its own — use the sidebar to browse its subsections.</p>';
    return `<article class="page">
      ${crumb}
      <h1 class="page-title" id="${s.id}">${numHtml}${s.title}<a class="anchor-link" href="#${s.id}" aria-label="Link to this section">#</a></h1>
      <div class="section">${body}</div>
      ${buildPageNav(s)}
    </article>`;
  }

  function buildPageNav(s) {
    const idx = SECTIONS.findIndex(x => x.id === s.id);
    const prev = idx > 0 ? SECTIONS[idx - 1] : null;
    const next = idx >= 0 && idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null;
    return `<nav class="pagenav">
      ${prev ? `<a class="prev" href="#${prev.id}"><div class="dir">Previous</div><div class="ttl">${stripTags(prev.title)}</div></a>` : '<span></span>'}
      ${next ? `<a class="next" href="#${next.id}"><div class="dir">Next</div><div class="ttl">${stripTags(next.title)}</div></a>` : '<span></span>'}
    </nav>`;
  }

  // -------- TOC --------
  function buildTOC(sections) {
    const home = `<a class="toc-link toc-home" data-target="" data-text="overview home" href="#">Overview</a>`;
    els.toc.innerHTML = home + sections.map(s => {
      const plainTitle = stripTags(s.title);
      return `<a class="toc-link level-${s.level}" data-target="${s.id}" data-text="${escapeHtml(((s.number || '') + ' ' + plainTitle).toLowerCase())}" href="#${s.id}">${s.number ? `<span class="num">${escapeHtml(s.number)}</span>` : ''}${plainTitle}</a>`;
    }).join('');
  }

  function setActiveTOC(id) {
    document.querySelectorAll('.toc-link').forEach(a => {
      a.classList.toggle('active', a.dataset.target === (id || ''));
    });
    const activeEl = document.querySelector('.toc-link.active');
    if (activeEl && activeEl.scrollIntoView) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  // -------- anchor -> owning-section map (for figures/tables/citations) --------
  let ANCHOR_MAP = {};
  function buildAnchorMap() {
    const map = {};
    function walk(blocks, sectionId) {
      (blocks || []).forEach(b => {
        if ((b.type === 'figure' || b.type === 'figure-group') && b.num) map['figure-' + b.num] = sectionId;
        if (b.type === 'table' && b.num) map['table-' + b.num] = sectionId;
        if (b.type === 'reflist') (b.items || []).forEach(it => { map['ref-' + it.key] = sectionId; });
        if (b.type === 'ul' || b.type === 'ol') (b.items || []).forEach(it => walk(it.blocks, sectionId));
        if (b.type === 'callout-blocks' || b.type === 'raw') walk(b.blocks, sectionId);
      });
    }
    SECTIONS.forEach(s => walk(s.blocks, s.id));
    return map;
  }

  // -------- navigation / routing --------
  let currentSectionId = null;

  function updateSectionProgress() {
    if (!currentSectionId) { els.progress.style.width = '0%'; return; }
    const idx = SECTIONS.findIndex(s => s.id === currentSectionId);
    const pct = idx >= 0 ? ((idx + 1) / SECTIONS.length) * 100 : 0;
    els.progress.style.width = pct + '%';
  }

  function showSection(id, scrollToAnchor) {
    currentSectionId = id || null;
    if (!id) {
      els.content.innerHTML = buildDocHeader();
      document.title = 'Guidelines for the Creation of Semantic Models in the IoP';
    } else {
      const s = SECTIONS.find(x => x.id === id);
      if (!s) { showSection(null); return; }
      els.content.innerHTML = renderSectionPage(s);
      document.title = stripTags(s.title) + ' · Semantic Models in the IoP';
    }
    setActiveTOC(currentSectionId);
    attachLightboxHandlers();
    attachMatrixHandlers();
    updateSectionProgress();

    if (scrollToAnchor) {
      requestAnimationFrame(() => {
        const el = document.getElementById(scrollToAnchor);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('flash-highlight');
          setTimeout(() => el.classList.remove('flash-highlight'), 1600);
        } else {
          window.scrollTo(0, 0);
        }
      });
    } else {
      window.scrollTo(0, 0);
    }
  }

  function navigateToHash(hash) {
    if (!hash) { showSection(null); return; }
    const target = SECTIONS.find(s => s.id === hash);
    if (target) { showSection(hash); return; }
    const owner = ANCHOR_MAP[hash];
    if (owner) { showSection(owner, hash); return; }
    showSection(null);
  }

  function buildDocHeader() {
    return `
    <header class="doc-header">
      <p class="kicker">RWTH Aachen · Internet of Production</p>
      <h1>Guidelines for the Creation of Semantic&nbsp;Models in the&nbsp;IoP</h1>
      <p class="lede">A practical, unified guideline for Domain Experts and Knowledge Engineers on building, documenting, and publishing ontologies for manufacturing and production systems.</p>
      <div class="doc-meta">
        <span><strong>Author</strong> Lina Teresa Molinas&nbsp;Comet</span>
      </div>
      <a class="start-reading" href="#sec-1">Start reading — 1. Introduction <span aria-hidden="true">→</span></a>
      <p class="doc-cards-label">Or jump straight to a topic</p>
      <div class="doc-cards">
        <button class="doc-card" data-goto="sec-2">
          <div class="n">2</div>
          <h3>Fundamentals</h3>
          <p>Classes, properties, domains &amp; ranges — the core vocabulary of an ontology.</p>
        </button>
        <button class="doc-card" data-goto="sec-3-2-1">
          <div class="n">3.2.1</div>
          <h3>The workflow</h3>
          <p>An 11-step process from use case to a published, maintained ontology.</p>
        </button>
        <button class="doc-card" data-goto="sec-7">
          <div class="n">7</div>
          <h3>IoP ontologies</h3>
          <p>Upper, support and domain ontologies to reuse instead of starting from scratch.</p>
        </button>
      </div>
    </header>`;
  }

  function render(sections) {
    // kept for API compatibility; actual rendering now happens per-page via showSection
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
          els.lightboxImg.src = page;
          els.lightboxImg.alt = 'Source page';
          els.lightbox.classList.add('show');
        });
      }

      applyFilters();
    });
  }

  function onScroll() {
    els.backToTop.classList.toggle('show', window.scrollY > 600);
  }

  // -------- search --------
  let searchIndex = [];
  function blockText(b) {
    let out = '';
    if (b.html) out += stripTags(b.html) + ' ';
    if (b.caption) out += stripTags(b.caption) + ' ';
    if (b.items) {
      b.items.forEach(it => {
        if (typeof it === 'string') out += stripTags(it) + ' ';
        else if (it.html) { out += stripTags(it.html) + ' '; if (it.blocks) out += it.blocks.map(blockText).join(' '); }
        else if (it.text) out += stripTags(it.text) + ' ';
        else if (it.full) out += stripTags(it.abbr + ' ' + it.full) + ' ';
        else if (it.name) out += it.name + ' ';
      });
    }
    if (b.blocks) out += b.blocks.map(blockText).join(' ');
    if (b.images) out += b.images.map(im => stripTags(im.caption || '')).join(' ');
    return out;
  }
  function buildSearchIndex() {
    searchIndex = SECTIONS.map(s => {
      const text = s.blocks.map(blockText).join(' ');
      const plainTitle = stripTags(s.title);
      return { id: s.id, number: s.number, title: plainTitle, haystack: ((s.number || '') + ' ' + plainTitle + ' ' + text).toLowerCase() };
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
      e.preventDefault();
      const target = card.dataset.goto;
      if (location.hash === '#' + target) {
        navigateToHash(target);
      } else {
        location.hash = target;
      }
    }
    const link = e.target.closest('.toc-link');
    if (link) {
      closeSidebar();
    }
    const brand = e.target.closest('.sidebar-header');
    if (brand) {
      if (location.hash && location.hash !== '#') {
        location.hash = '';
      } else {
        navigateToHash(null);
      }
    }
  });

  // -------- init --------
  fetch('content.json')
    .then(r => r.json())
    .then(sections => {
      SECTIONS = sections;
      buildTOC(sections);
      buildSearchIndex();
      ANCHOR_MAP = buildAnchorMap();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('hashchange', () => {
        navigateToHash(decodeURIComponent(location.hash.slice(1)));
      });
      navigateToHash(decodeURIComponent(location.hash.slice(1)));
    })
    .catch(err => {
      els.content.innerHTML = `<p style="padding:40px;color:#a33">Could not load content.json — ${escapeHtml(err.message)}. If you're opening this file directly from disk, serve it over a local web server (e.g. <code>python3 -m http.server</code>) since browsers block fetch() on file:// URLs.</p>`;
    });

  els.searchInput.addEventListener('input', (e) => runSearch(e.target.value));
})();
