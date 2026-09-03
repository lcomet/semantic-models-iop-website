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
special_ids = {'Version Control Table': 'front-version', 'List of Abbreviations': 'front-abbrev', 'How to use Ontology Design Patterns?': None}

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

    # expand bibliography / ontology-matrix placeholders within body
    expanded = []
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
            expanded.append({
                'type': 'reflist',
                'items': [{'num': it['num'], 'key': f'domtab-{it["num"]}', 'text': it['text'], 'url': it['url']} for it in domain_refs]
            })
        else:
            expanded.append(b)

    sections.append({
        'id': sec_id,
        'number': display_number,
        'title': title_html,
        'level': level,
        'blocks': expanded,
    })

json.dump(sections, open('/home/claude/site2/content.json', 'w'), indent=1)
print('wrote', len(sections), 'sections')
for s in sections:
    print(s['id'], '|', s['level'], '|', s['number'], '|', s['title'][:50], '| blocks:', len(s['blocks']))
