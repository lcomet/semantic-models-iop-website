# Regenerating content.json from the LaTeX source

These scripts convert `main.tex` (from the
[UnifiedGuidelinesOntologyDevelopmentForIoP](https://github.com/lcomet/UnifiedGuidelinesOntologyDevelopmentForIoP)
repo) into the site's `content.json`, without going through the compiled PDF.

## Requirements

```bash
pip install bibtexparser pillow --break-system-packages
# poppler-utils (pdftocairo) must be installed for figure conversion
```

## Steps

1. Clone the source repo so you have `main.tex`, `bibliography.bib`, and `images/` locally.
2. Edit the `REPO` path at the top of `latex_convert.py` to point at your clone.
3. Convert the figures (run once, or whenever images change):
   ```bash
   python3 - <<'PY'
   # see the figure-conversion logic referenced in the site's build notes:
   # for each images/*.pdf referenced by \includegraphics in main.tex,
   # pdftocairo -png -transp -r 300 -singlefile <file> <slug>
   # then trim whitespace and resize with Pillow (max dim ~1800px).
   PY
   ```
   This produces `image_resolve.json` (maps `images/Foo.pdf` → the site's
   `assets/figures/foo.png`) and the PNGs themselves.
4. Extract the Appendix domain-ontology matrix from
   `images/domainontologiestable.pdf` — this needs pdfplumber to read the
   table's vector text positions (checkmark glyphs, column headers, row
   labels) since it's a drawn table, not reflowable text. Produces
   `matrix_final.json` and `domain_table_refs.json`.
5. Run the converter:
   ```bash
   python3 run_convert.py       # parses main.tex -> raw_parsed.json
   python3 assemble_content.py  # groups blocks into content.json sections
   ```
6. Copy the resulting `content.json` and `assets/figures/` into the site root.

## Notes on the parser

`latex_convert.py` is a **document-specific** LaTeX→HTML converter, not a
general LaTeX processor. It knows this guideline's particular conventions:
`\begin{beware}[Remark|Note]` for callouts, `\textbf{Hint:}` for hints,
`\begin{mdframed}[backgroundcolor=...]` for the three colored box types
(hint / concept-example / facts-list, distinguished by background color
name), and `\begin{SampleEnv}` wrapping "conceptual example" figures. If
the source document's conventions change, the relevant branches in
`parse_figure`, `parse_mdframed`, and `parse_blocks` in `latex_convert.py`
will need updating to match.

Known minor limitation: one `\ref{}` in the source points to a figure with
no `\caption` (so it has no real figure number in LaTeX either); it's
special-cased to resolve to the word "below" rather than a fabricated
number. Otherwise the parser resolves every cross-reference and citation
in the document — see the `raw_parsed.json` broken-ref count (0) as a
regression check after any changes.
