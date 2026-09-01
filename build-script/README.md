# Regenerating content.json

If the source PDF changes, regenerate the site's content:

```bash
pdftotext -layout Guideline_OntologiesDevelopment_IOP-V3.pdf guideline_layout.txt
pdftoppm -jpeg -r 130 -jpegopt quality=82 Guideline_OntologiesDevelopment_IOP-V3.pdf assets/pages/page
python3 build_content.py
```

`build_content.py` expects `guideline_layout.txt` in the same directory and
writes `content.json` into `../` (the site root). Adjust the paths at the
top of the script if your layout differs. The parser is tuned to this
specific document's heading numbering (chapters 1–7, Bibliography, Appendix
A) — if the source structure changes significantly, the heading regexes
near the top of the script may need small tweaks.
