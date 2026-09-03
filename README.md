# Semantic Models in the IoP — Guideline Website

A dynamic, searchable website for *Guidelines for the Creation of Semantic
Models in the IoP* (Lina Molinas Comet, RWTH Aachen), built directly from
the **LaTeX source** in
[lcomet/UnifiedGuidelinesOntologyDevelopmentForIoP](https://github.com/lcomet/UnifiedGuidelinesOntologyDevelopmentForIoP)
rather than from the compiled PDF. That means real text (not OCR), the
actual vector figures rendered at full resolution, a properly parsed
bibliography, and working cross-references — matching what the LaTeX
document itself defines.

## What's in this folder

```
index.html        the page shell
styles.css         all styling (design tokens at the top)
script.js          renders content.json into the page, search, dark mode, etc.
content.json       the guideline's full structured content
assets/figures/    each figure, converted from the source PDFs to high-res PNG
```

Static site, no build step. `content.json` and `assets/` are fetched over
HTTP, so you can't just double-click `index.html` — see "View it locally"
below.

## View it locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Publish it as a real website

Drop this folder onto any static host:

- **GitHub Pages** — commit it to a `docs/` folder or `gh-pages` branch, then enable Pages in repo settings.
- **Netlify / Vercel / Cloudflare Pages** — connect the repo or drag-and-drop the folder; no build command needed.

## How the content was generated

Rather than extracting text from the PDF, this site parses `main.tex`
directly with a small custom LaTeX→HTML converter:

- Headings, numbering (including the lettered Appendix), and the full
  table of contents come from the real `\section`/`\subsection` structure.
- Citations are resolved against `bibliography.bib` and numbered by
  first-appearance order, exactly as a numeric bibliography style would.
- Cross-references (`\ref{}`) resolve to real section/figure/table numbers
  and become clickable jump links.
- The 30 figures used in the document were converted from their original
  vector PDFs (in the repo's `images/` folder) to high-resolution PNGs —
  no OCR, no screenshotting.
- The Appendix's domain-ontology comparison table (42 ontologies × 15
  domain columns) was reconstructed from the repository's standalone
  `images/domainontologiestable.pdf`, including its own 30-item reference
  list, and rendered as an interactive, filterable table instead of an
  image.
- Tables, callouts (Remark/Note/Hint), the "conceptual example" boxes, and
  acronym expansions all come from the document's own LaTeX macros
  (`\begin{beware}[...]`, `\begin{mdframed}`, `\ac{}`), not guesswork.

If the source repository is updated, this pipeline can be re-run to
regenerate `content.json` and the figure assets — see `build-script/` for
the conversion scripts.

## Customizing

- **Colors, type, spacing** — CSS variables at the top of `styles.css`
  (`:root` for light mode, `html.dark` for dark mode).
- **Content** — `content.json` is plain JSON; each section has typed
  `blocks` (`p`, `ul`/`ol`, `callout`, `figure`, `figure-group`, `table`,
  `reflist`, `concept`, `abbreviations`, `ontology-matrix`). Editing text
  there doesn't require touching `script.js`.
- **Front page intro/cards** — in `script.js`, see `buildDocHeader()`.
