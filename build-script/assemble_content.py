import json

d = json.load(open('/home/claude/raw_parsed.json'))
blocks = d['blocks']
bib_items = d['bibliography']
matrix_rows = json.load(open('/home/claude/matrix_final.json'))
domain_refs = json.load(open('/home/claude/domain_table_refs.json'))

MATRIX_COLS = ['MFG', 'PROD', 'PROC', 'RES', 'P.COMP', 'ACTV', 'SHED', 'MAINT', 'SENS', 'ROBT', 'ENG', 'BATCH', 'MSMT', 'STD', 'SIM']
MATRIX_FULLNAMES = {
    'MFG': 'Manufacturing', 'PROD': 'Products', 'PROC': 'Processes', 'RES': 'Resources',
    'P.COMP': 'Plant Components', 'ACTV': 'Activities', 'SHED': 'Scheduling', 'MAINT': 'Maintenance',
    'SENS': 'Sensors', 'ROBT': 'Robotics', 'ENG': 'Engineering', 'BATCH': 'Batch Processing',
    'MSMT': 'Measurements', 'STD': 'Standards', 'SIM': 'Simulation'
}

# Find indices of heading blocks
heading_idxs = [i for i, b in enumerate(blocks) if b['type'] == 'heading']

sections = []
special_ids = {'List of Abbreviations': 'front-abbrev', 'How to use Ontology Design Patterns?': None}

for hi, idx in enumerate(heading_idxs):
    h = blocks[idx]
    end = heading_idxs[hi + 1] if hi + 1 < len(heading_idxs) else len(blocks)
    body = blocks[idx + 1:end]

    number = h['number']
    title_html = h['html']
    level = h['level']

    if number is None:
        # unnumbered heading - derive a slug id
        if title_html in special_ids and special_ids[title_html]:
            sec_id = special_ids[title_html]
        else:
            sec_id = 'sec-' + ''.join(c.lower() if c.isalnum() else '-' for c in title_html).strip('-')
            sec_id = '-'.join(filter(None, sec_id.split('-')))
        display_number = None
    else:
        sec_id = 'sec-' + str(number).replace('.', '-')
        display_number = number

    if title_html == 'Version Control Table':
        title_html = 'Contact'
        sec_id = 'front-contact'
        body = [
            {'type': 'p', 'html': 'In case of questions regarding this guideline, please feel free to contact me.'},
            {'type': 'ul', 'items': [{
                'html': 'Lina Teresa Molinas Comet',
                'blocks': [{'type': 'ul', 'items': [{
                    'html': '<a href="mailto:linamolinascomet@gmail.com" target="_blank" rel="noopener">linamolinascomet@gmail.com</a>',
                    'blocks': []
                }]}]
            }]},
        ]

    # expand bibliography / ontology-matrix placeholders within body
    expanded = []
    trailing_section = None
    for b in body:
        if b['type'] == 'bibliography':
            expanded.append({'type': 'reflist', 'items': bib_items})
        elif b['type'] == 'ontology-matrix':
            expanded.append({
                'type': 'ontology-matrix',
                'columns': [{'key': k, 'full': MATRIX_FULLNAMES[k]} for k in MATRIX_COLS],
                'items': matrix_rows,
                'sourceNote': 'Reconstructed from images/domainontologiestable.pdf in the guideline repository.'
            })
            # this table's reference list is only loosely related to the
            # narrative prose on this page (A.2) - it's its own printed
            # bibliography in the source, so give it its own page too.
            trailing_section = {
                'id': sec_id + '-refs',
                'number': None,
                'title': 'References (Domain Ontologies Catalogue)',
                'level': level,
                'blocks': [{
                    'type': 'reflist',
                    'items': [{'num': it['num'], 'key': f'domtab-{it["num"]}', 'text': it['text'], 'url': it['url']} for it in domain_refs]
                }],
            }
        else:
            expanded.append(b)

    sections.append({
        'id': sec_id,
        'number': display_number,
        'title': title_html,
        'level': level,
        'blocks': expanded,
    })
    if trailing_section:
        sections.append(trailing_section)

# ---------------------------------------------------------------------------
# "How to Cite" — manually authored, not derived from the LaTeX source.
# Inserted right after the Contact page.
# ---------------------------------------------------------------------------
BIBTEX = """@misc{molinascomet2022semanticmodels,
  author       = {Molinas Comet, Lina Teresa},
  title        = {Guidelines for the Creation of Semantic Models in the {IoP}},
  year         = {2022},
  institution  = {RWTH Aachen University},
  note         = {Internet of Production},
  url          = {https://github.com/lcomet/UnifiedGuidelinesOntologyDevelopmentForIoP}
}"""

PLAIN_CITATION = ("Molinas Comet, L. T. (2022). Guidelines for the Creation of Semantic Models "
                   "in the IoP. RWTH Aachen University, Internet of Production. "
                   "https://github.com/lcomet/UnifiedGuidelinesOntologyDevelopmentForIoP")

cite_section = {
    'id': 'front-cite',
    'number': None,
    'title': 'How to Cite',
    'level': 1,
    'blocks': [
        {'type': 'p', 'html': 'If you use this guideline in your own work, please cite it as:'},
        {'type': 'citation', 'bibtex': BIBTEX, 'plain': PLAIN_CITATION},
    ],
}
contact_idx = next((i for i, s in enumerate(sections) if s['id'] == 'front-contact'), None)
if contact_idx is not None:
    sections.insert(contact_idx + 1, cite_section)
else:
    sections.insert(0, cite_section)

json.dump(sections, open('/home/claude/site2/content.json', 'w'), indent=1)
print('wrote', len(sections), 'sections')
for s in sections:
    print(s['id'], '|', s['level'], '|', s['number'], '|', s['title'][:50], '| blocks:', len(s['blocks']))
