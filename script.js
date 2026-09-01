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

  function renderBlock(b) {
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
        return `<ol class="reflist">${b.items.map(it => `<li><span class="ref-num">[${it.num}]</span><span>${formatInline(it.text)}</span></li>`).join('')}</ol>`;
      default:
        return '';
    }
  }

  function headingTag(level) {
    return level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
  }

  function renderSection(s) {
    const tag = headingTag(s.level);
    const heading = `<${tag} id="${s.id}" class="section-heading"><span class="num">${s.number === 'A' || s.number === 'BIB' || s.number === 'BIB2' ? '' : s.number}</span>${escapeHtml(s.title)}<a class="anchor-link" href="#${s.id}" aria-label="Link to this section">#</a><span class="page-tag">p. ${s.page}</span></${tag}>`;
    const body = s.blocks.map(renderBlock).join('\n');
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
