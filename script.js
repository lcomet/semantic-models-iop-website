(function () {
  'use strict';

  const els = {
    toc: document.getElementById('toc'),
    content: document.getElementById('content'),
    searchInput: document.getElementById('search-input'),
    searchCount: document.getElementById('search-count'),
    progress: document.getElementById('progress-bar'),
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('overlay'),
    menuBtn: document.getElementById('menu-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    backToTop: document.getElementById('back-to-top'),
    lightbox: document.getElementById('lightbox'),
    lightboxImg: document.getElementById('lightbox-img'),
    lightboxClose: document.getElementById('lightbox-close'),
    pageProgress: document.getElementById('page-progress'),
    toast: document.getElementById('toast'),
    cmdkOverlay: document.getElementById('cmdk-overlay'),
    cmdkInput: document.getElementById('cmdk-input'),
    cmdkResults: document.getElementById('cmdk-results'),
    pageOutline: document.getElementById('page-outline'),
    main: document.getElementById('main'),
    displaySettingsBtn: document.getElementById('display-settings-btn'),
    displaySettingsPanel: document.getElementById('display-settings-panel'),
    askFab: document.getElementById('ask-fab'),
    askPanel: document.getElementById('ask-panel'),
    askClose: document.getElementById('ask-close'),
    askMessages: document.getElementById('ask-messages'),
    askForm: document.getElementById('ask-form'),
    askInput: document.getElementById('ask-input'),
  };

  let SECTIONS = [];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
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
      case 'citation':
        return `<div class="citation-block">
          <div class="citation-tabs">
            <span class="citation-label">BibTeX</span>
            <button class="toolbar-btn citation-copy" data-copy="bibtex">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16v16H4z"/><path d="M8 16v-6l3 3 3-3v6M17 9v6"/></svg>
              Copy BibTeX
            </button>
          </div>
          <pre class="citation-pre"><code>${escapeHtml(b.bibtex)}</code></pre>
          <p class="citation-plain-label">Or cite in plain text:</p>
          <p class="citation-plain">${escapeHtml(b.plain)}</p>
        </div>`;
      case 'reflist':
        return `<ol class="reflist">${b.items.map(it => `<li id="ref-${it.key}"><span class="ref-num">[${it.num}]</span><span>${it.text}${it.url ? ` <a href="${it.url}" target="_blank" rel="noopener" class="ref-link">↗</a>` : ''}</span></li>`).join('')}</ol>`;
      case 'template-table':
        return renderTemplateTable(b);
      case 'template-form':
        return renderTemplateForm(b);
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

  // -------- on-this-page outline (figures/tables on the current page) --------
  function buildPageOutline(s) {
    const items = [];
    function walk(blocks) {
      (blocks || []).forEach(b => {
        if ((b.type === 'figure' || b.type === 'figure-group') && b.num) items.push({ anchor: 'figure-' + b.num, label: 'Figure ' + b.num });
        if (b.type === 'table' && b.num) items.push({ anchor: 'table-' + b.num, label: 'Table ' + b.num });
        if (b.type === 'ul' || b.type === 'ol') (b.items || []).forEach(it => walk(it.blocks));
        if (b.type === 'callout-blocks' || b.type === 'raw') walk(b.blocks);
      });
    }
    walk(s.blocks);
    return items;
  }

  function renderPageOutline(s) {
    const items = buildPageOutline(s);
    if (items.length < 2) {
      els.pageOutline.innerHTML = '';
      els.main.classList.remove('has-outline');
      return;
    }
    els.main.classList.add('has-outline');
    els.pageOutline.innerHTML = `
      <p class="page-outline-label">On this page</p>
      <nav class="page-outline-list">
        ${items.map(it => `<a href="#${it.anchor}"><span class="ol-num">${it.label}</span></a>`).join('')}
      </nav>`;
  }

  // -------- ontology graph explorer --------
  let d3LoadPromise = null;
  function loadD3() {
    if (window.d3) return Promise.resolve();
    if (d3LoadPromise) return d3LoadPromise;
    d3LoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'assets/vendor/d3.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return d3LoadPromise;
  }

  function renderGraphPage() {
    return `<article class="page graph-page">
      <p class="breadcrumb">Interactive</p>
      <h1 class="page-title">Ontology Graph Explorer</h1>
      <p class="graph-intro" id="graph-intro-text">The classes and relations from the guideline's running example (sections 2.3–2.4), as an interactive graph. Drag nodes, scroll or pinch to zoom, and click any node to see how it connects — with a link straight to where it's explained in the text.</p>
      <div class="graph-tabs">
        <button class="graph-tab active" data-view="classes">Chapter 2 example</button>
        <button class="graph-tab" data-view="landscape">Domain ontologies landscape (Appendix)</button>
      </div>
      <div class="graph-toolbar">
        <div class="graph-legend" id="graph-legend">
          <span class="legend-item"><span class="legend-dot"></span>Class</span>
          <span class="legend-item"><span class="legend-line hierarchy-line"></span>subClassOf</span>
          <span class="legend-item"><span class="legend-line property-line"></span>object property</span>
        </div>
        <div class="graph-controls">
          <input id="graph-filter" class="graph-filter-input" type="text" placeholder="Filter by name…" hidden>
          <button id="graph-zoom-out" class="icon-btn" aria-label="Zoom out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
          <button id="graph-zoom-in" class="icon-btn" aria-label="Zoom in">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
          <button id="graph-reset" class="toolbar-btn">Reset view</button>
        </div>
      </div>
      <div id="graph-canvas-wrap">
        <p id="graph-loading">Loading graph…</p>
        <svg id="graph-svg"></svg>
        <div id="graph-infocard" class="graph-infocard" hidden></div>
      </div>
    </article>`;
  }

  const GRAPH_INTRO_TEXT = {
    classes: "The classes and relations from the guideline's running example (sections 2.3–2.4), as an interactive graph. Drag nodes, scroll or pinch to zoom, and click any node to see how it connects — with a link straight to where it's explained in the text.",
    landscape: "The 42 domain ontologies from Appendix A.2, connected to the 15 manufacturing domains they cover. Click a domain to see which ontologies address it, click an ontology to see what it covers, or filter by name — then jump to the full comparison table.",
  };
  const GRAPH_LEGEND_HTML = {
    classes: `<span class="legend-item"><span class="legend-dot"></span>Class</span>
      <span class="legend-item"><span class="legend-line hierarchy-line"></span>subClassOf</span>
      <span class="legend-item"><span class="legend-line property-line"></span>object property</span>`,
    landscape: `<span class="legend-item"><span class="legend-dot domain-dot"></span>Domain</span>
      <span class="legend-item"><span class="legend-dot"></span>Ontology / Semantic Model</span>
      <span class="legend-item"><span class="legend-line property-line"></span>covers</span>`,
  };

  let currentGraphView = 'classes';

  function switchGraphView(view) {
    currentGraphView = view;
    document.querySelectorAll('.graph-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
    document.getElementById('graph-intro-text').textContent = GRAPH_INTRO_TEXT[view];
    document.getElementById('graph-legend').innerHTML = GRAPH_LEGEND_HTML[view];
    const filterInput = document.getElementById('graph-filter');
    filterInput.hidden = view !== 'landscape';
    filterInput.value = '';
    loadAndBuildGraph(view);
  }

  let graphDataCache = {};

  async function initOntologyGraph() {
    currentGraphView = 'classes';
    document.querySelectorAll('.graph-tab').forEach(t => {
      t.addEventListener('click', () => switchGraphView(t.dataset.view));
    });
    const filterInput = document.getElementById('graph-filter');
    filterInput.addEventListener('input', (e) => filterLandscapeNodes(e.target.value));
    await loadAndBuildGraph('classes');
  }

  async function loadAndBuildGraph(view) {
    const loadingEl = document.getElementById('graph-loading');
    const file = view === 'landscape' ? 'ontology-landscape.json' : 'ontology-graph.json';
    if (loadingEl) { loadingEl.style.display = 'block'; loadingEl.textContent = 'Loading graph…'; }
    try {
      await loadD3();
      if (!graphDataCache[view]) {
        const res = await fetch(file);
        graphDataCache[view] = await res.json();
      }
      if (!document.getElementById('graph-svg')) return; // navigated away already
      if (loadingEl) loadingEl.style.display = 'none';
      if (view === 'landscape') buildLandscapeGraph(graphDataCache[view]);
      else buildForceGraph(graphDataCache[view]);
      window.addEventListener('resize', onGraphResize);
    } catch (err) {
      if (loadingEl) loadingEl.textContent = 'Could not load the graph — try refreshing the page.';
    }
  }

  let graphResizeTimer = null;
  function onGraphResize() {
    clearTimeout(graphResizeTimer);
    graphResizeTimer = setTimeout(() => {
      if (document.getElementById('graph-svg') && graphDataCache[currentGraphView]) {
        if (currentGraphView === 'landscape') buildLandscapeGraph(graphDataCache.landscape);
        else buildForceGraph(graphDataCache.classes);
      } else {
        window.removeEventListener('resize', onGraphResize);
      }
    }, 250);
  }

  function buildForceGraph(data) {
    const svgEl = document.getElementById('graph-svg');
    const wrap = document.getElementById('graph-canvas-wrap');
    if (!svgEl || !wrap) return;
    const d3sel = window.d3;
    const width = wrap.clientWidth;
    const height = wrap.clientHeight || 560;

    const svg = d3sel.select(svgEl).attr('viewBox', [0, 0, width, height]).attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    svg.append('defs').append('marker')
      .attr('id', 'graph-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 24)
      .attr('refY', 0)
      .attr('markerWidth', 6.5)
      .attr('markerHeight', 6.5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('class', 'graph-arrowhead');

    const zoomLayer = svg.append('g').attr('class', 'zoom-layer');
    const nodes = data.nodes.map(d => Object.assign({}, d));
    const links = data.edges.map(d => Object.assign({}, d));

    const sim = d3sel.forceSimulation(nodes)
      .force('link', d3sel.forceLink(links).id(d => d.id).distance(l => l.kind === 'hierarchy' ? 75 : 115).strength(0.65))
      .force('charge', d3sel.forceManyBody().strength(-340))
      .force('center', d3sel.forceCenter(width / 2, height / 2))
      .force('collide', d3sel.forceCollide().radius(40));

    const linkGroup = zoomLayer.append('g').attr('class', 'links')
      .selectAll('g').data(links).join('g').attr('class', d => 'link-group ' + d.kind);

    linkGroup.append('line')
      .attr('class', d => 'link-line ' + d.kind)
      .attr('marker-end', 'url(#graph-arrow)');

    linkGroup.append('line')
      .attr('class', 'link-hitbox')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 14);

    linkGroup.append('text')
      .attr('class', 'link-label')
      .attr('text-anchor', 'middle')
      .text(d => d.label);

    linkGroup.style('cursor', 'pointer').on('click', (event, d) => {
      event.stopPropagation();
      showGraphInfo({ id: d.label, kind: 'property', section: d.section, isEdge: true, from: d.source.id || d.source, to: d.target.id || d.target }, nodeGroup, linkGroup);
    });

    const nodeGroup = zoomLayer.append('g').attr('class', 'nodes')
      .selectAll('g').data(nodes).join('g').attr('class', 'node-group')
      .call(dragBehavior(sim));

    nodeGroup.append('circle').attr('r', 27).attr('class', 'node-circle');
    nodeGroup.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.32em')
      .text(d => d.id.length > 11 ? d.id.slice(0, 10) + '…' : d.id);

    nodeGroup.style('cursor', 'pointer').on('click', (event, d) => {
      event.stopPropagation();
      showGraphInfo(d, nodeGroup, linkGroup);
    });

    svg.on('click', () => { hideGraphInfo(); clearHighlight(nodeGroup, linkGroup); });

    sim.on('tick', () => {
      linkGroup.selectAll('line')
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      linkGroup.select('text')
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 4);
      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragBehavior(sim) {
      function started(event, d) {
        if (!event.active) sim.alphaTarget(0.25).restart();
        d.fx = d.x; d.fy = d.y;
      }
      function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
      function ended(event, d) {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null; d.fy = null;
      }
      return d3sel.drag().on('start', started).on('drag', dragged).on('end', ended);
    }

    const zoomBehavior = d3sel.zoom().scaleExtent([0.4, 3]).on('zoom', (event) => {
      zoomLayer.attr('transform', event.transform);
    });
    svg.call(zoomBehavior).on('dblclick.zoom', null);

    sim.on('end', () => {
      fitToView(nodes, width, height, svg, zoomBehavior, d3sel);
    });
    setTimeout(() => fitToView(nodes, width, height, svg, zoomBehavior, d3sel), 900);

    const zoomInBtn = document.getElementById('graph-zoom-in');
    const zoomOutBtn = document.getElementById('graph-zoom-out');
    const resetBtn = document.getElementById('graph-reset');
    if (zoomInBtn) zoomInBtn.onclick = () => svg.transition().call(zoomBehavior.scaleBy, 1.3);
    if (zoomOutBtn) zoomOutBtn.onclick = () => svg.transition().call(zoomBehavior.scaleBy, 0.75);
    if (resetBtn) resetBtn.onclick = () => {
      hideGraphInfo();
      buildForceGraph(data);
    };
  }

  function fitToView(nodes, width, height, svg, zoomBehavior, d3sel, animate) {
    if (!nodes.length) return;
    const pad = 50;
    const xs = nodes.map(n => n.x).filter(v => typeof v === 'number');
    const ys = nodes.map(n => n.y).filter(v => typeof v === 'number');
    if (!xs.length) return;
    const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
    const w = maxX - minX, h = maxY - minY;
    const scale = Math.max(0.4, Math.min(1.4, Math.min(width / w, height / h)));
    const tx = width / 2 - scale * (minX + maxX) / 2;
    const ty = height / 2 - scale * (minY + maxY) / 2;
    const transform = d3sel.zoomIdentity.translate(tx, ty).scale(scale);
    const sel = animate ? svg.transition().duration(400) : svg;
    sel.call(zoomBehavior.transform, transform);
  }

  function clearHighlight(nodeGroup, linkGroup) {
    nodeGroup.classed('dim', false);
    linkGroup.classed('dim', false);
  }

  function showGraphInfo(d, nodeGroup, linkGroup) {
    const card = document.getElementById('graph-infocard');
    if (!card) return;
    const sectionObj = SECTIONS.find(s => s.id === d.section);
    const sectionTitle = sectionObj ? stripTags(sectionObj.title) : '';
    if (d.isEdge) {
      card.innerHTML = `
        <div class="gi-type">Object property</div>
        <div class="gi-name">${escapeHtml(d.id)}</div>
        <div class="gi-detail">${escapeHtml(d.from)} → ${escapeHtml(d.to)}</div>
        ${sectionObj ? `<a class="gi-link" href="#${d.section}">Read in "${escapeHtml(sectionTitle)}" →</a>` : ''}
      `;
      nodeGroup.classed('dim', true);
      linkGroup.classed('dim', l => l.label !== d.id);
    } else {
      const connected = new Set([d.id]);
      linkGroup.each(function (l) {
        const s = l.source.id || l.source, t = l.target.id || l.target;
        if (s === d.id) connected.add(t);
        if (t === d.id) connected.add(s);
      });
      nodeGroup.classed('dim', n => !connected.has(n.id));
      linkGroup.classed('dim', l => {
        const s = l.source.id || l.source, t = l.target.id || l.target;
        return s !== d.id && t !== d.id;
      });
      card.innerHTML = `
        <div class="gi-type">Class</div>
        <div class="gi-name">${escapeHtml(d.id)}</div>
        ${sectionObj ? `<a class="gi-link" href="#${d.section}">Read in "${escapeHtml(sectionTitle)}" →</a>` : ''}
      `;
    }
    card.hidden = false;
  }
  function hideGraphInfo() {
    const card = document.getElementById('graph-infocard');
    if (card) card.hidden = true;
  }

  // -------- landscape graph (Appendix A.2 domain-ontology bipartite view) --------
  let landscapeRefs = null;

  function buildLandscapeGraph(data) {
    const svgEl = document.getElementById('graph-svg');
    const wrap = document.getElementById('graph-canvas-wrap');
    if (!svgEl || !wrap) return;
    const d3sel = window.d3;
    const width = wrap.clientWidth;
    const height = wrap.clientHeight || 560;
    const cx = width / 2, cy = height / 2;

    const svg = d3sel.select(svgEl).attr('viewBox', [0, 0, width, height]).attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    const zoomLayer = svg.append('g').attr('class', 'zoom-layer');

    const domainNodes = data.nodes.filter(n => n.type === 'domain').map(d => Object.assign({}, d));
    const ontologyNodesRaw = data.nodes.filter(n => n.type === 'ontology').map(d => Object.assign({}, d));

    const domainIndex = {};
    domainNodes.forEach((d, i) => { domainIndex[d.id] = i; });

    const primaryDomain = {};
    data.edges.forEach(e => {
      if (!(e.source in primaryDomain)) primaryDomain[e.source] = e.target;
    });

    const ontologyNodes = ontologyNodesRaw.slice().sort((a, b) => {
      const da = domainIndex[primaryDomain[a.id]] ?? 999;
      const db = domainIndex[primaryDomain[b.id]] ?? 999;
      if (da !== db) return da - db;
      return a.id.localeCompare(b.id);
    });

    const innerR = Math.min(width, height) * 0.19;
    const outerR = Math.min(width, height) * 0.44;

    domainNodes.forEach((d, i) => {
      const angle = (i / domainNodes.length) * 2 * Math.PI - Math.PI / 2;
      d.x = cx + innerR * Math.cos(angle);
      d.y = cy + innerR * Math.sin(angle);
    });
    ontologyNodes.forEach((d, i) => {
      const angle = (i / ontologyNodes.length) * 2 * Math.PI - Math.PI / 2;
      d.x = cx + outerR * Math.cos(angle);
      d.y = cy + outerR * Math.sin(angle);
    });

    const allNodes = [...domainNodes, ...ontologyNodes];
    const nodeById = {};
    allNodes.forEach(n => { nodeById[n.id] = n; });

    const links = data.edges.map(e => ({ source: nodeById[e.source], target: nodeById[e.target] })).filter(l => l.source && l.target);

    function arcPath(d) {
      return `M${d.source.x},${d.source.y} Q${cx},${cy} ${d.target.x},${d.target.y}`;
    }

    const linkSel = zoomLayer.append('g').attr('class', 'links')
      .selectAll('path').data(links).join('path')
      .attr('class', 'landscape-link')
      .attr('d', arcPath)
      .attr('fill', 'none');

    const nodeGroup = zoomLayer.append('g').attr('class', 'nodes')
      .selectAll('g').data(allNodes).join('g')
      .attr('class', d => 'node-group ' + (d.type === 'domain' ? 'domain-node' : 'ontology-node'))
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .call(landscapeDrag(linkSel));

    nodeGroup.append('circle')
      .attr('r', d => d.type === 'domain' ? 22 : 11)
      .attr('class', d => 'node-circle ' + (d.type === 'domain' ? 'domain-circle' : 'ontology-circle'));

    nodeGroup.append('text')
      .attr('class', d => 'node-label ' + (d.type === 'domain' ? '' : 'small-label'))
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.type === 'domain' ? '0.32em' : '-16px')
      .text(d => d.type === 'domain' ? d.id : (d.id.length > 13 ? d.id.slice(0, 12) + '…' : d.id));

    nodeGroup.style('cursor', 'pointer').on('click', (event, d) => {
      event.stopPropagation();
      showLandscapeInfo(d, nodeGroup, linkSel);
    });

    svg.on('click', () => { hideGraphInfo(); nodeGroup.classed('dim', false); linkSel.classed('dim', false); });

    function landscapeDrag() {
      function dragged(event, d) {
        d.x = event.x; d.y = event.y;
        d3sel.select(this).attr('transform', `translate(${d.x},${d.y})`);
        linkSel.attr('d', l => (l.source === d || l.target === d) ? arcPath(l) : l._d || arcPath(l));
      }
      return d3sel.drag().on('drag', dragged);
    }

    const zoomBehavior = d3sel.zoom().scaleExtent([0.4, 3]).on('zoom', (event) => {
      zoomLayer.attr('transform', event.transform);
    });
    svg.call(zoomBehavior).on('dblclick.zoom', null);

    const zoomInBtn = document.getElementById('graph-zoom-in');
    const zoomOutBtn = document.getElementById('graph-zoom-out');
    const resetBtn = document.getElementById('graph-reset');
    if (zoomInBtn) zoomInBtn.onclick = () => svg.transition().call(zoomBehavior.scaleBy, 1.3);
    if (zoomOutBtn) zoomOutBtn.onclick = () => svg.transition().call(zoomBehavior.scaleBy, 0.75);
    if (resetBtn) resetBtn.onclick = () => {
      hideGraphInfo();
      const filterInput = document.getElementById('graph-filter');
      if (filterInput) filterInput.value = '';
      buildLandscapeGraph(data);
    };

    landscapeRefs = { nodeGroup, linkSel };
  }

  function showLandscapeInfo(d, nodeGroup, linkSel) {
    const card = document.getElementById('graph-infocard');
    if (!card) return;
    const connected = new Set([d.id]);
    linkSel.each(function (l) {
      if (l.source.id === d.id) connected.add(l.target.id);
      if (l.target.id === d.id) connected.add(l.source.id);
    });
    nodeGroup.classed('dim', n => !connected.has(n.id));
    linkSel.classed('dim', l => l.source.id !== d.id && l.target.id !== d.id);

    if (d.type === 'domain') {
      const count = connected.size - 1;
      card.innerHTML = `
        <div class="gi-type">Domain</div>
        <div class="gi-name">${escapeHtml(d.label)} <span class="gi-abbr">(${escapeHtml(d.id)})</span></div>
        <div class="gi-detail">${count} ontolog${count === 1 ? 'y' : 'ies'} cover this domain</div>
        <a class="gi-link" href="#sec-A-2">See the full comparison table →</a>
      `;
    } else {
      const refs = (d.ref || '').replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean);
      const refLinksHtml = refs.length ? `<a class="gi-link" href="#ref-domtab-${refs[0]}">Reference ${refs.map(r => '[' + r + ']').join(' ')} →</a>` : '';
      card.innerHTML = `
        <div class="gi-type">${d.classif === 'SM' ? 'Semantic Model' : 'Ontology'}</div>
        <div class="gi-name">${escapeHtml(d.id)}</div>
        <a class="gi-link" href="#sec-A-2">See in the comparison table →</a>
        ${refLinksHtml}
      `;
    }
    card.hidden = false;
  }

  function filterLandscapeNodes(query) {
    if (!landscapeRefs) return;
    const { nodeGroup, linkSel } = landscapeRefs;
    const q = query.trim().toLowerCase();
    if (!q) {
      nodeGroup.classed('dim', false);
      linkSel.classed('dim', false);
      hideGraphInfo();
      return;
    }
    hideGraphInfo();
    nodeGroup.classed('dim', d => d.type === 'ontology' && !d.id.toLowerCase().includes(q));
    linkSel.classed('dim', l => {
      const oNode = l.source.type === 'ontology' ? l.source : l.target;
      return !oNode.id.toLowerCase().includes(q);
    });
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
      <div class="page-toolbar">
        <button class="toolbar-btn" data-action="copy-link" data-id="${s.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.5"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L12.5 19.5"/></svg>
          Copy link
        </button>
        <button class="toolbar-btn" data-action="copy-md" data-id="${s.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16v16H4z"/><path d="M8 16v-6l3 3 3-3v6M17 9v6"/></svg>
          Copy as Markdown
        </button>
      </div>
      <div class="section">${body}</div>
      ${buildPageNav(s)}
      ${buildFeedbackWidget(s)}
    </article>`;
  }

  // -------- fillable templates (Section 6): tables & forms, autosaved locally --------
  function loadTemplateData(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (e) {
      return fallback;
    }
  }
  function saveTemplateData(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* storage full or blocked */ }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvEscape(v) {
    return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  }

  function renderTemplateTable(b) {
    const rows = loadTemplateData(b.storageKey, null) || [{}, {}, {}];
    const colsJson = escapeAttr(JSON.stringify(b.columns));
    const headerHtml = b.columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('') + '<th class="tmpl-th-remove"></th>';
    const rowsHtml = rows.map((row, i) => `<tr data-row="${i}">
        ${b.columns.map(c => `<td><input type="text" data-col="${c.key}" value="${escapeAttr(row[c.key] || '')}" placeholder="${escapeAttr(c.placeholder || '')}"></td>`).join('')}
        <td class="tmpl-row-remove"><button data-action="remove-row" aria-label="Remove row">×</button></td>
      </tr>`).join('');
    return `<div class="tmpl-wrap" data-storage-key="${escapeAttr(b.storageKey)}" data-columns="${colsJson}" data-filename="${escapeAttr(b.filenameBase)}" data-kind="table">
      <div class="tmpl-toolbar">
        <span class="tmpl-hint">Saved only in your browser — nothing is uploaded.</span>
        <div class="tmpl-actions">
          <button class="tmpl-btn" data-action="export-csv">Export CSV</button>
          <button class="tmpl-btn" data-action="export-md">Export Markdown</button>
          <button class="tmpl-btn tmpl-btn-ghost" data-action="clear-table">Clear all</button>
        </div>
      </div>
      <div class="tmpl-table-scroll">
        <table class="tmpl-table">
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
      <button class="tmpl-add-row" data-action="add-row">+ Add row</button>
    </div>`;
  }

  function renderTemplateForm(b) {
    const data = loadTemplateData(b.storageKey, {}) || {};
    const fieldsJson = escapeAttr(JSON.stringify(b.fields));
    const fieldsHtml = b.fields.map(f => `
      <div class="tmpl-field">
        <label class="tmpl-field-label">${escapeHtml(f.label)}</label>
        <textarea data-field="${escapeAttr(f.key)}" placeholder="${escapeAttr(f.placeholder || '')}" rows="2">${escapeHtml(data[f.key] || '')}</textarea>
      </div>`).join('');
    return `<div class="tmpl-wrap tmpl-form" data-storage-key="${escapeAttr(b.storageKey)}" data-fields="${fieldsJson}" data-filename="${escapeAttr(b.filenameBase)}" data-kind="form">
      <div class="tmpl-toolbar">
        <span class="tmpl-hint">Saved only in your browser — nothing is uploaded.</span>
        <div class="tmpl-actions">
          <button class="tmpl-btn" data-action="export-md">Export Markdown</button>
          <button class="tmpl-btn tmpl-btn-ghost" data-action="clear-form">Clear all</button>
        </div>
      </div>
      ${fieldsHtml}
    </div>`;
  }

  function readTableData(wrap) {
    const rows = [];
    wrap.querySelectorAll('tbody tr').forEach(tr => {
      const row = {};
      tr.querySelectorAll('input[data-col]').forEach(inp => { row[inp.dataset.col] = inp.value; });
      rows.push(row);
    });
    return rows;
  }

  function attachTemplateHandlers() {
    const wrap = document.querySelector('.tmpl-wrap');
    if (!wrap) return;
    const storageKey = wrap.dataset.storageKey;
    const kind = wrap.dataset.kind;

    if (kind === 'table') {
      const columns = JSON.parse(wrap.dataset.columns);

      function persist() {
        saveTemplateData(storageKey, readTableData(wrap));
      }

      wrap.addEventListener('input', (e) => {
        if (e.target.matches('input[data-col]')) persist();
      });

      wrap.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === 'add-row') {
          const tbody = wrap.querySelector('tbody');
          const idx = tbody.children.length;
          const tr = document.createElement('tr');
          tr.dataset.row = idx;
          tr.innerHTML = columns.map(c => `<td><input type="text" data-col="${escapeAttr(c.key)}" value="" placeholder="${escapeAttr(c.placeholder || '')}"></td>`).join('') +
            `<td class="tmpl-row-remove"><button data-action="remove-row" aria-label="Remove row">×</button></td>`;
          tbody.appendChild(tr);
          tr.querySelector('input').focus();
        } else if (action === 'remove-row') {
          const tr = btn.closest('tr');
          const tbody = wrap.querySelector('tbody');
          if (tbody.children.length > 1) {
            tr.remove();
          } else {
            tr.querySelectorAll('input').forEach(inp => inp.value = '');
          }
          persist();
        } else if (action === 'export-csv') {
          const rows = readTableData(wrap);
          const lines = [columns.map(c => csvEscape(c.label)).join(',')];
          rows.forEach(r => lines.push(columns.map(c => csvEscape(r[c.key])).join(',')));
          downloadBlob(new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), wrap.dataset.filename + '.csv');
        } else if (action === 'export-md') {
          const rows = readTableData(wrap);
          const head = '| ' + columns.map(c => c.label).join(' | ') + ' |';
          const sep = '| ' + columns.map(() => '---').join(' | ') + ' |';
          const body = rows.filter(r => columns.some(c => (r[c.key] || '').trim())).map(r => '| ' + columns.map(c => (r[c.key] || '').replace(/\|/g, '\\|')).join(' | ') + ' |').join('\n');
          downloadBlob(new Blob([`${head}\n${sep}\n${body}\n`], { type: 'text/markdown;charset=utf-8' }), wrap.dataset.filename + '.md');
        } else if (action === 'clear-table') {
          if (confirm('Clear all rows in this table? This can\'t be undone.')) {
            saveTemplateData(storageKey, [{}, {}, {}]);
            const tbody = wrap.querySelector('tbody');
            tbody.innerHTML = [0, 1, 2].map(i => `<tr data-row="${i}">` +
              columns.map(c => `<td><input type="text" data-col="${escapeAttr(c.key)}" value="" placeholder="${escapeAttr(c.placeholder || '')}"></td>`).join('') +
              `<td class="tmpl-row-remove"><button data-action="remove-row" aria-label="Remove row">×</button></td></tr>`).join('');
          }
        }
      });
    } else if (kind === 'form') {
      const fields = JSON.parse(wrap.dataset.fields);

      function persist() {
        const data = {};
        wrap.querySelectorAll('textarea[data-field]').forEach(ta => { data[ta.dataset.field] = ta.value; });
        saveTemplateData(storageKey, data);
      }

      wrap.addEventListener('input', (e) => {
        if (e.target.matches('textarea[data-field]')) persist();
      });

      wrap.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        if (btn.dataset.action === 'export-md') {
          const lines = fields.map(f => {
            const val = wrap.querySelector(`textarea[data-field="${f.key}"]`).value.trim();
            return `## ${f.label}\n\n${val || '_(not filled in)_'}\n`;
          });
          downloadBlob(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }), wrap.dataset.filename + '.md');
        } else if (btn.dataset.action === 'clear-form') {
          if (confirm('Clear all fields in this form? This can\'t be undone.')) {
            saveTemplateData(storageKey, {});
            wrap.querySelectorAll('textarea[data-field]').forEach(ta => ta.value = '');
          }
        }
      });
    }
  }


  function buildFeedbackWidget(s) {
    return `<div class="feedback" data-section="${s.id}">
      <p class="feedback-q">Was this page helpful?</p>
      <div class="feedback-btns">
        <button class="fb-btn" data-val="up">👍 Yes</button>
        <button class="fb-btn" data-val="down">👎 No</button>
      </div>
      <p class="feedback-thanks" hidden>Thanks for the feedback!</p>
    </div>`;
  }

  function attachFeedbackHandlers() {
    const widget = document.querySelector('.feedback');
    if (!widget) return;
    const sectionId = widget.dataset.section;
    const key = 'fb:' + sectionId;
    const saved = localStorage.getItem(key);
    const btns = widget.querySelectorAll('.fb-btn');
    const thanks = widget.querySelector('.feedback-thanks');
    const q = widget.querySelector('.feedback-q');

    function applyVoted(val) {
      btns.forEach(b => {
        b.disabled = true;
        b.classList.toggle('selected', b.dataset.val === val);
      });
      q.hidden = true;
      thanks.hidden = false;
    }

    if (saved) applyVoted(saved);

    btns.forEach(b => {
      b.addEventListener('click', () => {
        localStorage.setItem(key, b.dataset.val);
        applyVoted(b.dataset.val);
      });
    });
  }

  // -------- copy link / copy as markdown --------
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove('show'), 1800);
  }

  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(successMsg)).catch(() => showToast('Could not copy — try again'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showToast(successMsg); } catch (e) { showToast('Could not copy — try again'); }
      document.body.removeChild(ta);
    }
  }

  function mdEscape(s) {
    return (s || '').replace(/[*_`]/g, '\\$&');
  }

  function blockToMarkdown(b, depth) {
    depth = depth || 0;
    const pad = '  '.repeat(depth);
    switch (b.type) {
      case 'p':
        return stripTags(b.html) + '\n';
      case 'concept':
        return '> _' + stripTags(b.html) + '_\n' + (b.image ? `\n![](${b.image})\n` : '');
      case 'citation':
        return '```bibtex\n' + b.bibtex + '\n```\n\n' + b.plain + '\n';
      case 'callout': {
        const label = { remark: 'Remark', note: 'Note', hint: 'Hint', facts: 'Facts' }[b.kind] || 'Note';
        return `> **${label}:** ${stripTags(b.html)}\n`;
      }
      case 'callout-blocks': {
        const label = { facts: 'Facts' }[b.kind] || 'Note';
        return `> **${label}:**\n` + b.blocks.map(bb => '> ' + blockToMarkdown(bb, depth)).join('');
      }
      case 'ul':
        return b.items.map(it => `${pad}- ${stripTags(it.html)}\n` + (it.blocks || []).map(bb => blockToMarkdown(bb, depth + 1)).join('')).join('');
      case 'ol':
        return b.items.map((it, i) => `${pad}${(b.start || 1) + i}. ${stripTags(it.html)}\n` + (it.blocks || []).map(bb => blockToMarkdown(bb, depth + 1)).join('')).join('');
      case 'figure':
        return `**Figure ${b.num}.** ${stripTags(b.caption)}\n\n![Figure ${b.num}](${b.src})\n`;
      case 'figure-group':
        return `**Figure ${b.num}.** ${stripTags(b.caption)}\n\n` + b.images.map(im => `![](${im.src})`).join(' ') + '\n';
      case 'inline-image':
        return `![](${b.src})\n`;
      case 'table': {
        if (!b.header || !b.header.length) return '';
        const cap = b.num ? `**Table ${b.num}.** ${stripTags(b.caption)}\n\n` : '';
        const head = '| ' + b.header.map(h => stripTags(h)).join(' | ') + ' |';
        const sep = '| ' + b.header.map(() => '---').join(' | ') + ' |';
        const rows = b.rows.map(r => '| ' + r.map(c => stripTags(c).replace(/\|/g, '\\|')).join(' | ') + ' |').join('\n');
        return `${cap}${head}\n${sep}\n${rows}\n`;
      }
      case 'abbreviations':
        return b.items.map(it => `- **${it.abbr}** — ${stripTags(it.full)}`).join('\n') + '\n';
      case 'reflist':
        return b.items.map(it => `[${it.num}] ${stripTags(it.text)}${it.url ? ' ' + it.url : ''}`).join('\n') + '\n';
      case 'ontology-matrix': {
        const cols = b.columns.map(c => c.key);
        const head = '| Ontology | ' + cols.join(' | ') + ' | Type | Ref |';
        const sep = '| --- ' + cols.map(() => '| :-: ').join('') + '| --- | --- |';
        const rows = b.items.map(r => `| ${r.name} | ` + cols.map(c => r.domains.includes(c) ? '✓' : '').join(' | ') + ` | ${r.classif} | ${r.ref} |`).join('\n');
        return `${head}\n${sep}\n${rows}\n`;
      }
      case 'raw':
        return b.blocks.map(bb => blockToMarkdown(bb, depth)).join('');
      default:
        return '';
    }
  }

  function sectionToMarkdown(s) {
    const heading = '#'.repeat(Math.min(s.level + 1, 6)) + ' ' + (s.number ? s.number + ' ' : '') + stripTags(s.title);
    const body = s.blocks.map(b => blockToMarkdown(b, 0)).join('\n');
    return `${heading}\n\n${body}`.trim() + '\n';
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
    const graphLink = `<a class="toc-link toc-graph" data-target="graph" data-text="ontology graph explorer class diagram" href="#graph">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><circle cx="12" cy="12" r="2.5"/><line x1="8" y1="7" x2="10" y2="10.5"/><line x1="16" y1="7" x2="14" y2="10.5"/><line x1="8" y1="17" x2="10" y2="13.5"/><line x1="16" y1="17" x2="14" y2="13.5"/></svg>
      Ontology Graph
    </a>`;
    els.toc.innerHTML = home + graphLink + sections.map(s => {
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
    const apply = () => renderSectionDOM(id, scrollToAnchor);
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  }

  function renderSectionDOM(id, scrollToAnchor) {
    currentSectionId = id || null;
    if (!id) {
      els.content.innerHTML = buildDocHeader();
      document.title = 'Guidelines for the Creation of Semantic Models in the IoP';
      els.pageOutline.innerHTML = '';
      els.main.classList.remove('has-outline');
    } else if (id === 'graph') {
      els.content.innerHTML = renderGraphPage();
      document.title = 'Ontology Graph Explorer · Semantic Models in the IoP';
      els.pageOutline.innerHTML = '';
      els.main.classList.remove('has-outline');
      initOntologyGraph();
    } else {
      const s = SECTIONS.find(x => x.id === id);
      if (!s) { renderSectionDOM(null); return; }
      els.content.innerHTML = renderSectionPage(s);
      document.title = stripTags(s.title) + ' · Semantic Models in the IoP';
      renderPageOutline(s);
    }
    setActiveTOC(currentSectionId);
    attachLightboxHandlers();
    attachMatrixHandlers();
    attachFeedbackHandlers();
    attachTemplateHandlers();
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
        onScroll();
      });
    } else {
      window.scrollTo(0, 0);
      onScroll();
    }
  }

  function navigateToHash(hash) {
    if (!hash) { showSection(null); return; }
    if (hash === 'graph') { showSection('graph'); return; }
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
        <span><strong>Source</strong> 43-page PDF, converted for the web</span>
      </div>
      <a class="start-reading" href="#sec-1">Start reading — 1. Introduction <span aria-hidden="true">→</span></a>
      <a class="graph-cta" href="#graph">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><circle cx="12" cy="12" r="2.5"/><line x1="8" y1="7" x2="10" y2="10.5"/><line x1="16" y1="7" x2="14" y2="10.5"/><line x1="8" y1="17" x2="10" y2="13.5"/><line x1="16" y1="17" x2="14" y2="13.5"/></svg>
        Explore the ontology as an interactive graph
      </a>
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
    const doc = document.documentElement;
    const total = doc.scrollHeight - doc.clientHeight;
    const pct = total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0;
    els.pageProgress.style.width = pct + '%';
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
      const text = s.blocks.map(blockText).join(' ').replace(/\s+/g, ' ').trim();
      const plainTitle = stripTags(s.title);
      return {
        id: s.id, number: s.number, title: plainTitle,
        rawText: text,
        haystack: ((s.number || '') + ' ' + plainTitle + ' ' + text).toLowerCase(),
      };
    });
  }

  // -------- snippet extraction (Algolia-style highlighted excerpt) --------
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function getSnippet(rawText, query, radius) {
    radius = radius || 70;
    if (!rawText || !query) return '';
    const lower = rawText.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) return '';
    const start = Math.max(0, idx - radius);
    const end = Math.min(rawText.length, idx + query.length + radius);
    let snippet = rawText.slice(start, end).trim();
    if (start > 0) snippet = '…' + snippet;
    if (end < rawText.length) snippet = snippet + '…';
    const escaped = escapeHtml(snippet);
    const re = new RegExp('(' + escapeRegExp(escapeHtml(query)) + ')', 'ig');
    return escaped.replace(re, '<mark>$1</mark>');
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
      removeTocEmptyState();
      return;
    }
    let matchCount = 0;
    const matchedIds = new Set(searchIndex.filter(s => s.haystack.includes(q)).map(s => s.id));
    matchCount = matchedIds.size;

    links.forEach(a => {
      const id = a.dataset.target;
      a.classList.toggle('hidden', !matchedIds.has(id));
    });

    if (matchCount === 0) {
      els.searchCount.textContent = '0 sections found';
      showTocEmptyState(q);
    } else {
      els.searchCount.textContent = `${matchCount} section${matchCount === 1 ? '' : 's'} found`;
      removeTocEmptyState();
    }
  }

  function showTocEmptyState(q) {
    let el = document.getElementById('toc-empty');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toc-empty';
      el.className = 'toc-empty';
      els.toc.appendChild(el);
    }
    el.innerHTML = `No sections match <strong>"${escapeHtml(q)}"</strong>.<br>Try a different term, or ask below.`;
  }
  function removeTocEmptyState() {
    const el = document.getElementById('toc-empty');
    if (el) el.remove();
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
      closeCmdk();
      closeAsk();
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

  // -------- display settings (reading width / text size) --------
  function applyDisplaySetting(kind, value) {
    const root = document.documentElement;
    const classPrefix = kind === 'width' ? 'width-' : 'text-';
    ['narrow', 'normal', 'wide', 'small', 'large'].forEach(v => root.classList.remove(classPrefix + v));
    root.classList.add(classPrefix + value);
    localStorage.setItem('iop-' + kind, value);
    els.displaySettingsPanel.querySelectorAll(`.settings-options[data-setting="${kind}"] .settings-opt`).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === value);
    });
  }

  els.displaySettingsPanel.querySelectorAll('.settings-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.settings-options');
      applyDisplaySetting(group.dataset.setting, btn.dataset.value);
    });
  });

  els.displaySettingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    els.displaySettingsPanel.classList.toggle('show');
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#display-settings')) {
      els.displaySettingsPanel.classList.remove('show');
    }
  });

  (function initDisplaySettings() {
    applyDisplaySetting('width', localStorage.getItem('iop-width') || 'normal');
    applyDisplaySetting('text', localStorage.getItem('iop-text') || 'normal');
  })();

  // -------- ask this guide (extractive Q&A, no LLM) --------
  const ASK_STOPWORDS = new Set(['what','whats',"what's",'is','are','the','a','an','of','in','on','how','do','does','i','to','for','and','or',
    'which','when','where','why','can','could','should','would','it','its',"it's",'this','that','these','those','be','been','being',
    'with','as','by','from','have','has','had','you','your','we','our','me','my','about','tell','explain','define','definition',
    'mean','means','meaning','please','use','used','using']);

  function tokenizeAsk(text) {
    return (text.toLowerCase().match(/[a-z0-9]+/g) || []);
  }

  function splitSentences(text) {
    return text.split(/(?<=[.!?])\s+(?=[A-Z(])/).map(s => s.trim()).filter(s => s.length > 15);
  }

  function answerQuestion(question) {
    const qTokens = [...new Set(tokenizeAsk(question).filter(t => !ASK_STOPWORDS.has(t) && t.length > 1))];
    if (!qTokens.length) return null;

    let best = null;
    searchIndex.forEach(entry => {
      const titleTokens = tokenizeAsk(entry.title);
      let score = 0;
      qTokens.forEach(t => {
        const re = new RegExp('\\b' + escapeRegExp(t) + '\\b', 'gi');
        const bodyMatches = (entry.rawText.match(re) || []).length;
        score += bodyMatches;
        if (titleTokens.includes(t)) score += 4;
      });
      if (score > 0 && (!best || score > best.score)) {
        best = { entry, score };
      }
    });
    if (!best || best.score < 1) return null;

    const sentences = splitSentences(best.entry.rawText);
    let bestSentence = null, bestSentScore = -1;
    sentences.forEach(sent => {
      let sc = 0;
      qTokens.forEach(t => {
        const re = new RegExp('\\b' + escapeRegExp(t) + '\\b', 'i');
        if (re.test(sent)) sc++;
      });
      if (sc > bestSentScore) { bestSentScore = sc; bestSentence = sent; }
    });

    const section = SECTIONS.find(s => s.id === best.entry.id);
    return {
      section,
      sentence: bestSentence || sentences[0] || best.entry.rawText.slice(0, 200),
      queryTerms: qTokens,
    };
  }

  function highlightTerms(text, terms) {
    let escaped = escapeHtml(text);
    terms.forEach(t => {
      const re = new RegExp('(' + escapeRegExp(t) + ')', 'ig');
      escaped = escaped.replace(re, '<mark>$1</mark>');
    });
    return escaped;
  }

  function addAskMessage(role, html) {
    const div = document.createElement('div');
    div.className = 'ask-msg ask-msg-' + role;
    div.innerHTML = html;
    els.askMessages.appendChild(div);
    els.askMessages.scrollTop = els.askMessages.scrollHeight;
  }

  function handleAskSubmit(question) {
    question = question.trim();
    if (!question) return;
    addAskMessage('user', escapeHtml(question));
    const result = answerQuestion(question);
    if (!result || !result.section) {
      addAskMessage('bot', `I couldn't find a clear match for that in the guideline. Try different words, or browse the sidebar — the search box and ⌘K palette can help too.`);
      return;
    }
    const snippetHtml = highlightTerms(result.sentence, result.queryTerms);
    const titlePlain = stripTags(result.section.title);
    addAskMessage('bot', `${snippetHtml}
      <span class="ask-source">${result.section.number ? result.section.number + ' · ' : ''}${escapeHtml(titlePlain)}</span>
      <a class="ask-answer-link" href="#${result.section.id}">Read the full section →</a>`);
  }

  function openAsk() {
    els.askPanel.classList.add('show');
    els.askFab.classList.add('open');
    if (!els.askMessages.children.length) {
      addAskMessage('bot', `Ask a question about this guideline — e.g. "What is a competency question?" or "How do I reuse an existing ontology?" — and I'll pull the most relevant passage and point you to the right section.`);
    }
    setTimeout(() => els.askInput.focus(), 50);
  }
  function closeAsk() {
    els.askPanel.classList.remove('show');
    els.askFab.classList.remove('open');
  }

  els.askFab.addEventListener('click', openAsk);
  els.askClose.addEventListener('click', closeAsk);
  els.askForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleAskSubmit(els.askInput.value);
    els.askInput.value = '';
  });
  els.askMessages.addEventListener('click', (e) => {
    if (e.target.closest('.ask-answer-link')) closeAsk();
  });

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
    const toolbarBtn = e.target.closest('.toolbar-btn');
    if (toolbarBtn) {
      if (toolbarBtn.classList.contains('citation-copy')) {
        const pre = toolbarBtn.closest('.citation-block').querySelector('.citation-pre code');
        if (pre) copyToClipboard(pre.textContent, 'BibTeX copied');
      } else {
        const s = SECTIONS.find(x => x.id === toolbarBtn.dataset.id);
        if (s) {
          if (toolbarBtn.dataset.action === 'copy-link') {
            copyToClipboard(location.origin + location.pathname + '#' + s.id, 'Link copied');
          } else if (toolbarBtn.dataset.action === 'copy-md') {
            copyToClipboard(sectionToMarkdown(s), 'Copied as Markdown');
          }
        }
      }
    }
  });

  // -------- command palette (⌘K / Ctrl+K) --------
  let cmdkActiveIndex = -1;
  let cmdkItems = [];

  function openCmdk() {
    els.cmdkOverlay.classList.add('show');
    els.cmdkInput.value = '';
    els.cmdkInput.focus();
    renderCmdkResults('');
  }
  function closeCmdk() {
    els.cmdkOverlay.classList.remove('show');
  }

  const GRAPH_PSEUDO_SECTION = { id: 'graph', number: null, title: 'Ontology Graph Explorer', level: 1 };
  const GRAPH_HAYSTACK = 'ontology graph explorer interactive class diagram relations subclassof visualize';

  function cmdkMatches(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [GRAPH_PSEUDO_SECTION, ...SECTIONS.slice(0, 7)];
    }
    const results = searchIndex.filter(s => s.haystack.includes(q)).map(s => SECTIONS.find(x => x.id === s.id)).filter(Boolean);
    if (GRAPH_HAYSTACK.includes(q)) results.unshift(GRAPH_PSEUDO_SECTION);
    return results.slice(0, 20);
  }

  function renderCmdkResults(query) {
    cmdkItems = cmdkMatches(query);
    cmdkActiveIndex = cmdkItems.length ? 0 : -1;
    if (!cmdkItems.length) {
      els.cmdkResults.innerHTML = `<div class="cmdk-empty">No matches for "${escapeHtml(query)}"</div>`;
      return;
    }
    const q = query.trim();
    els.cmdkResults.innerHTML = cmdkItems.map((s, i) => {
      const crumb = breadcrumbFor(s).replace(/<[^>]+>/g, '').trim();
      const entry = searchIndex.find(x => x.id === s.id);
      const snippet = (q && entry) ? getSnippet(entry.rawText, q) : '';
      return `<div class="cmdk-item${i === 0 ? ' active' : ''}" data-index="${i}" data-id="${s.id}">
        <div class="cmdk-title">${s.number ? `<span class="cmdk-num">${escapeHtml(s.number)}</span>` : ''}${stripTags(s.title)}</div>
        ${crumb ? `<div class="cmdk-crumb">${escapeHtml(crumb)}</div>` : ''}
        ${snippet ? `<div class="cmdk-snippet">${snippet}</div>` : ''}
      </div>`;
    }).join('');
  }

  function cmdkSetActive(idx) {
    const items = els.cmdkResults.querySelectorAll('.cmdk-item');
    items.forEach(el => el.classList.remove('active'));
    if (items[idx]) {
      items[idx].classList.add('active');
      items[idx].scrollIntoView({ block: 'nearest' });
    }
    cmdkActiveIndex = idx;
  }

  function cmdkGo(idx) {
    const s = cmdkItems[idx];
    if (!s) return;
    closeCmdk();
    location.hash = s.id;
  }

  els.cmdkInput.addEventListener('input', (e) => renderCmdkResults(e.target.value));
  els.cmdkInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); cmdkSetActive(Math.min(cmdkActiveIndex + 1, cmdkItems.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); cmdkSetActive(Math.max(cmdkActiveIndex - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); cmdkGo(cmdkActiveIndex); }
    if (e.key === 'Escape') { e.preventDefault(); closeCmdk(); }
  });
  els.cmdkResults.addEventListener('click', (e) => {
    const item = e.target.closest('.cmdk-item');
    if (item) cmdkGo(Number(item.dataset.index));
  });
  els.cmdkOverlay.addEventListener('click', (e) => {
    if (e.target === els.cmdkOverlay) closeCmdk();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (els.cmdkOverlay.classList.contains('show')) closeCmdk(); else openCmdk();
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
