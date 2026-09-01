# Semantic Models in the IoP — Guideline Website

A dynamic, searchable website generated from *Guidelines for the Creation of
Semantic Models in the IoP* (Lina Molinas Comet, RWTH Aachen). It turns the
43‑page PDF into a browsable documentation site with a live table of
contents, full‑text search, dark mode, and click‑to‑zoom figures/tables.

## What's in this folder

```
index.html        the page shell
styles.css         all styling (design tokens at the top)
script.js          renders content.json into the page, search, dark mode, etc.
content.json       the guideline's full text, structured into sections/blocks
assets/pages/      each PDF page rasterized as a JPEG (used for figures & tables)
```

Nothing here needs a build step or a server-side language — it's a static
site. The only requirement is that `content.json` and `assets/` are fetched
over HTTP, so you can't just double‑click `index.html` from your file
system (browsers block `fetch()` on `file://` URLs). Any of the options
below solves that.

## View it locally

From this folder, run a tiny local server and open the printed URL:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Any static server works — `npx serve`, VS Code's "Live Server" extension,
etc.)

## Publish it as a real website

Because it's plain HTML/CSS/JS, you can drop this folder onto **any** static
host. A few easy options:

**GitHub Pages** (free, and keeps it next to the original PDF's repo)
1. Commit this folder's contents to a repo (e.g. a `docs/` folder or a
   `gh-pages` branch).
2. In the repo settings → Pages, point GitHub Pages at that folder/branch.
3. Your site is live at `https://<user>.github.io/<repo>/`.

**Netlify / Vercel** — drag-and-drop this folder onto their web dashboard,
or connect the repo; no build command is needed (leave it blank / "static").

**Cloudflare Pages** — same idea: no framework, no build command, publish
directory is this folder.

## How the content was generated

The PDF's text was extracted (`pdftotext -layout`) and parsed into a tree of
sections/subsections, with paragraphs, bullet/numbered lists, "Remark /
Note / Hint / Example" call‑outs, and figure/table captions each turned
into a typed block in `content.json`. Every PDF page was also rasterized to
`assets/pages/page-NN.jpg` at ~130 dpi so that figures and tables — which
are diagrams, not reflowable text — render with full visual fidelity; click
any figure/table thumbnail to zoom into the source page.

If the underlying PDF is revised, the same pipeline can be re-run to
regenerate `content.json` and the page images; ask and I can hand you that
script too.

## Customizing

- **Colors, type, spacing** — all defined as CSS variables at the top of
  `styles.css` (`:root` for light mode, `html.dark` for dark mode).
- **Content** — edit `content.json` directly (it's plain JSON: sections
  with `blocks` of type `p`, `ul`, `ol`, `callout`, `figure`, `table`,
  `reflist`, `concept`) — no need to touch `script.js` for text changes.
- **Front page cards / intro copy** — in `script.js`, see `buildDocHeader()`.
