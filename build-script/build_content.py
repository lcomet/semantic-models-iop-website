import re, json, html

data = open('/home/claude/guideline_layout.txt', encoding='utf-8').read()
pages = data.split(chr(12))

flat = []  # (page_idx0based, line)
for idx, p in enumerate(pages):
    for line in p.split('\n'):
        flat.append((idx, line))

num_heading_re = re.compile(r'^(\d+(?:\.\d+){0,2})\s{1,10}([A-Z].{2,90})')
appx_heading_re = re.compile(r'^(A(?:\.\d+)?)\s{1,10}([A-Z].{2,90})')

heading_positions = []
for i, (pg, line) in enumerate(flat):
    if pg <= 3:  # skip cover + TOC + list of figures/tables pages
        continue
    l = line.rstrip()
    m = num_heading_re.match(l)
    if m:
        num = m.group(1)
        if '.' not in num and int(num) > 7:
            continue
        heading_positions.append((i, pg, num, m.group(2).strip()))
        continue
    if l.strip() == 'References' and pg >= 33:
        label = 'Bibliography' if len(heading_positions) and heading_positions[-1][2] != 'A.2' else 'Appendix References'
        # First occurrence -> main Bibliography; second (after A.2) -> Appendix refs
        already_bib = any(h[2] == 'BIB' for h in heading_positions)
        code = 'BIB' if not already_bib else 'BIB2'
        title = 'Bibliography' if code == 'BIB' else 'Appendix References'
        heading_positions.append((i, pg, code, title))
        continue
    m2 = appx_heading_re.match(l.strip())
    if m2 and pg >= 36 and ('“' not in l) and ('"' not in l):
        heading_positions.append((i, pg, m2.group(1), m2.group(2).strip()))

# sort just in case (already sequential)
heading_positions.sort(key=lambda h: h[0])

HEADER_RE = re.compile(r'^\s*Guidelines for the creation of semantic models in the IoP\s*$')
FOOTER_RE = re.compile(r'^\s*\d+\s*/\s*43\s*$')

def clean_lines(lines_with_pg):
    out = []
    for pg, line in lines_with_pg:
        if HEADER_RE.match(line):
            continue
        if FOOTER_RE.match(line.strip()):
            continue
        out.append((pg, line))
    return out

FIG_CAP_RE = re.compile(r'^Figure\s+(\d+)\.\s*(.*)$')
TABLE_CAP_RE = re.compile(r'^Table\s+(\d+)\.\s*(.*)$')
REMARK_RE = re.compile(r'^\s*Remark\s*:\s*(.*)$')
NOTE_RE = re.compile(r'^\s*Note\s*:\s*(.*)$')
HINT_RE = re.compile(r'^\s*Hint\s*:\s*(.*)$')
EXAMPLE_RE = re.compile(r'^\s*(Example\s+\d+\.\d+\.?)\s*(.*)$')
BULLET_RE = re.compile(r'^\s*[•–]\s+(.*)$')
NUM_ITEM_RE = re.compile(r'^\s*(\d{1,2})\.\s+(.*)$')
SUBITEM_RE = re.compile(r'^\s*\(([a-z])\)\s+(.*)$')

def paragraphs_from(lines_with_pg):
    """Group cleaned lines into paragraphs (list of (pg_of_first_line, text))."""
    paras = []
    cur = []
    cur_pg = None
    for pg, line in lines_with_pg:
        if line.strip() == '':
            if cur:
                paras.append((cur_pg, ' '.join(cur).strip()))
                cur = []
                cur_pg = None
        else:
            if cur_pg is None:
                cur_pg = pg
            cur.append(line.strip())
    if cur:
        paras.append((cur_pg, ' '.join(cur).strip()))
    # split run-together paragraphs that hide multiple list markers inline
    split_re = re.compile(r'(?<=[a-z.\)])(?<!Figure)(?<!Table)\s(?=\([a-z]\)\s|\d{1,2}\.\s[A-Z])')
    expanded = []
    for pg, text in paras:
        last = 0
        pieces = []
        for m in split_re.finditer(text):
            pieces.append(text[last:m.start()])
            last = m.end()
        pieces.append(text[last:])
        for p in pieces:
            p = p.strip()
            if p:
                expanded.append((pg, p))
    return expanded

def esc(s):
    return html.escape(s, quote=False)

def classify_paragraph(text):
    m = FIG_CAP_RE.match(text)
    if m:
        return ('figure', m.group(1), m.group(2))
    m = TABLE_CAP_RE.match(text)
    if m:
        return ('table', m.group(1), m.group(2))
    m = REMARK_RE.match(text)
    if m:
        return ('remark', None, m.group(1))
    m = NOTE_RE.match(text)
    if m:
        return ('note', None, m.group(1))
    m = HINT_RE.match(text)
    if m:
        return ('hint', None, m.group(1))
    m = EXAMPLE_RE.match(text)
    if m:
        return ('example', m.group(1), m.group(2))
    if BULLET_RE.match(text):
        return ('bullet', None, text)
    m = NUM_ITEM_RE.match(text)
    if m and int(m.group(1)) <= 15:
        return ('numitem', m.group(1), m.group(2))
    m = SUBITEM_RE.match(text)
    if m:
        return ('subitem', m.group(1), m.group(2))
    words = text.split()
    if (2 <= len(words) <= 13 and text[0:1].isupper() and text.rstrip().endswith('.')
            and not text.startswith(('Hint', 'Note', 'Remark'))
            and ':' not in text and ';' not in text):
        return ('concept', None, text)
    return ('p', None, text)

def build_blocks(paras):
    blocks = []
    i = 0
    n = len(paras)
    while i < n:
        pg, text = paras[i]
        kind, num, body = classify_paragraph(text)
        if kind == 'figure':
            blocks.append({'type': 'figure', 'num': num, 'caption': body, 'page': pg + 1})
            i += 1
        elif kind == 'table':
            # drop the previous paragraph block if it looks like raw tabular junk
            if blocks and blocks[-1]['type'] == 'p' and len(blocks[-1]['text']) > 0:
                blocks.pop()
            blocks.append({'type': 'table', 'num': num, 'caption': body, 'page': pg + 1})
            i += 1
        elif kind == 'remark':
            blocks.append({'type': 'callout', 'kind': 'remark', 'text': body})
            i += 1
        elif kind == 'note':
            blocks.append({'type': 'callout', 'kind': 'note', 'text': body})
            i += 1
        elif kind == 'hint':
            blocks.append({'type': 'callout', 'kind': 'hint', 'text': body})
            i += 1
        elif kind == 'example':
            blocks.append({'type': 'callout', 'kind': 'example', 'label': num, 'text': body})
            i += 1
        elif kind == 'bullet':
            items = []
            while i < n:
                pgx, textx = paras[i]
                m = BULLET_RE.match(textx)
                if not m:
                    break
                items.append(m.group(1))
                i += 1
            blocks.append({'type': 'ul', 'items': items})
        elif kind == 'numitem':
            start_num = num
            items = []
            while i < n:
                pgx, textx = paras[i]
                m = NUM_ITEM_RE.match(textx)
                if not (m and int(m.group(1)) <= 15):
                    break
                items.append(m.group(2))
                i += 1
            blocks.append({'type': 'ol', 'items': items, 'start': int(start_num)})
        elif kind == 'subitem':
            items = []
            while i < n:
                pgx, textx = paras[i]
                m = SUBITEM_RE.match(textx)
                if not m:
                    break
                items.append(m.group(2))
                i += 1
            blocks.append({'type': 'ol_alpha', 'items': items})
        elif kind == 'concept':
            blocks.append({'type': 'concept', 'text': body})
            i += 1
        else:
            if text.strip():
                blocks.append({'type': 'p', 'text': text})
            i += 1
    return blocks

def is_diagram_noise(text):
    t = text.strip()
    if not t:
        return True
    if '.' in t or '?' in t:
        return False
    words = t.split()
    if len(words) > 22:
        return False
    return True

def strip_diagram_noise(blocks):
    out = []
    i = 0
    n = len(blocks)
    while i < n:
        b = blocks[i]
        if b['type'] == 'figure':
            # remove trailing noise paragraphs already appended to out
            while out and out[-1]['type'] == 'p' and is_diagram_noise(out[-1]['text']):
                out.pop()
        out.append(b)
        i += 1
    return out

sections = []
for idx in range(len(heading_positions)):
    start_i, pg, num, title = heading_positions[idx]
    end_i = heading_positions[idx + 1][0] if idx + 1 < len(heading_positions) else len(flat)
    body_lines = flat[start_i + 1:end_i]
    body_lines = clean_lines(body_lines)
    paras = paragraphs_from(body_lines)
    blocks = build_blocks(paras)
    blocks = strip_diagram_noise(blocks)
    level = 1 if '.' not in num and num not in ('BIB', 'BIB2') else (num.count('.') + 1)
    if num in ('BIB', 'BIB2', 'A'):
        level = 1
    sections.append({
        'id': 'sec-' + num.replace('.', '-'),
        'number': num,
        'title': title,
        'level': level,
        'page': pg + 1,
        'blocks': blocks
    })

REF_SPLIT_RE = re.compile(r'\[(\d+)\]\s+')

def split_refs(text):
    parts = REF_SPLIT_RE.split(text)
    # parts = ['', '1', 'entry text', '2', 'entry text', ...]
    items = []
    it = iter(parts[1:])
    for num, body in zip(it, it):
        body = re.sub(r'\s+', ' ', body).strip()
        items.append({'num': num, 'text': body})
    return items

for s in sections:
    if s['number'] == 'A.2':
        keep_intro = None
        for b in s['blocks']:
            if b['type'] == 'p' and b['text'].startswith('The following content'):
                keep_intro = b
        import json as _json
        matrix_rows = _json.load(open('/home/claude/matrix_final.json', encoding='utf-8'))
        MATRIX_COLS = ['MFG', 'PROD', 'PROC', 'RES', 'P.COMP', 'ACTV', 'SHED', 'MAINT', 'SENS', 'ROBT', 'ENG', 'BATCH', 'MSMT', 'STD', 'SIM']
        MATRIX_FULLNAMES = {
            'MFG': 'Manufacturing', 'PROD': 'Products', 'PROC': 'Processes', 'RES': 'Resources',
            'P.COMP': 'Plant Components', 'ACTV': 'Activities', 'SHED': 'Scheduling', 'MAINT': 'Maintenance',
            'SENS': 'Sensors', 'ROBT': 'Robotics', 'ENG': 'Engineering', 'BATCH': 'Batch Processing',
            'MSMT': 'Measurements', 'STD': 'Standards', 'SIM': 'Simulation'
        }
        matrix_block = {
            'type': 'ontology-matrix',
            'columns': [{'key': k, 'full': MATRIX_FULLNAMES[k]} for k in MATRIX_COLS],
            'items': matrix_rows,
            'sourcePages': [40, 41]
        }
        legend_p = {'type': 'p', 'text': 'Legend: MFG: Manufacturing, PROD: Products, PROC: Processes, RES: Resources, P.COMP: Plant Components, ACTV: Activities, SHED: Scheduling, MAINT: Maintenance, SENS: Sensors, ROBT: robotics, ENG: Engineering, BATCH: Batch Processing, MSMT: Measurements, STD: Standards, SIM: Simulation. Type: SM = Semantic Model, O = Ontology.'}
        s['blocks'] = [b for b in [keep_intro, matrix_block, legend_p] if b]
    if s['number'] == 'A.1':
        figs = [b for b in s['blocks'] if b['type'] == 'figure']
        intro = {'type': 'p', 'text': 'This section reproduces the LOT (Linked Open Terms) Methodology diagrams referenced throughout this guideline, by the Ontology Engineering Group (OEG), licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.'}
        s['blocks'] = [intro] + figs
    if s['number'] in ('BIB', 'BIB2'):
        full_text = ' '.join(b['text'] for b in s['blocks'] if b['type'] == 'p')
        items = split_refs(full_text)
        if items:
            s['blocks'] = [{'type': 'reflist', 'items': items}]

with open('/home/claude/site/content.json', 'w', encoding='utf-8') as f:
    json.dump(sections, f, indent=1, ensure_ascii=False)

print('Sections built:', len(sections))
for s in sections:
    print(s['number'], s['level'], s['title'], '| blocks:', len(s['blocks']), '| page:', s['page'])
