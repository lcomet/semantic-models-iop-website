import sys, json, re
sys.path.insert(0, '/home/claude')
import latex_convert as L
from latex_utils import find_env

tex = L.tex_raw

# isolate document body
doc = find_env(tex, 'document')
body = doc[0]

# Split off the Version Control table and List of Abbreviations (front matter)
# they are \section* blocks; just let the generic parser handle them but mark
# as front matter based on the heading text.

blocks = L.parse_blocks(body)

# Build bibliography from citation order collected during parse
bib_items = L.build_bibliography_block()

# resolve refs/cites
blocks = L.resolve_markers_in_blocks(blocks)
for it in bib_items:
    pass  # bib text itself has no refs/cites to resolve

print('Total top-level blocks:', len(blocks))
type_counts = {}
for b in blocks:
    type_counts[b['type']] = type_counts.get(b['type'], 0) + 1
print(type_counts)
print('Labels registered:', len(L.LABELS))
print('Citations:', len(bib_items))

json.dump({'blocks': blocks, 'bibliography': bib_items}, open('/home/claude/raw_parsed.json', 'w'), indent=1)
print('wrote raw_parsed.json')
