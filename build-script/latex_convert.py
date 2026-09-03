"""Convert main.tex (this specific guideline document) into content.json blocks."""
import re
import json
import sys
sys.path.insert(0, '/home/claude')
from latex_utils import find_matching_brace, extract_arg, extract_command, find_env, find_all_envs, strip_comments

REPO = '/home/claude/repo'

# ---------------------------------------------------------------------------
# Load supporting data
# ---------------------------------------------------------------------------
image_resolve = json.load(open('/home/claude/image_resolve.json'))
matrix_rows = json.load(open('/home/claude/matrix_final.json'))

import bibtexparser
with open(f'{REPO}/bibliography.bib', encoding='utf-8') as f:
    bibdb = bibtexparser.load(f)
BIB = {e['ID']: e for e in bibdb.entries}

COLOR_HEX = {
    'blue': '#0000ee',
    'sapphire': '#08264d',
    'phthalogreen': '#123723',
    'arsenic': '#3b454a',
    'bananamania': '#faE8B5',
    'officegreen': '#008000',
    'oceanboatblue': '#0078BF',
    'unitednationsblue': '#5c91e6',
    'mediumtealblue': '#0054B5',
    'junglegreen': '#29AB87',
    'pastelred': '#FF6961',
    'magicmint': '#AAF0D1',
}

# ---------------------------------------------------------------------------
# Load acronyms
# ---------------------------------------------------------------------------
tex_raw = open(f'{REPO}/main.tex', encoding='utf-8').read()
tex_raw = strip_comments(tex_raw)

ACRONYMS = {}
acro_env = find_env(tex_raw, 'acronym')
if acro_env:
    inner = acro_env[0]
    for m in re.finditer(r'\\acro\{([^}]+)\}\{([^}]*)\}', inner):
        ACRONYMS[m.group(1)] = m.group(2)

_acro_seen = set()

def reset_acronym_state():
    _acro_seen.clear()

def expand_acronym(key, plural=False):
    full = ACRONYMS.get(key, key)
    disp = key
    if key not in _acro_seen:
        _acro_seen.add(key)
        return f'<abbr class="acro-full" title="{esc(full)}">{esc(full)} ({esc(disp)})</abbr>'
    return f'<abbr class="acro" title="{esc(full)}">{esc(disp)}</abbr>'


# ---------------------------------------------------------------------------
# Label registry (populated during block parse; \ref resolved in a 2nd pass)
# ---------------------------------------------------------------------------
LABELS = {}  # label -> {'kind':..., 'number': '2.4', 'anchor': 'sec-2-4', 'text': 'Title'}
CITE_ORDER = []  # list of bib keys in first-cite order


def esc(s):
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))


# ---------------------------------------------------------------------------
# Inline LaTeX -> HTML converter
# ---------------------------------------------------------------------------

def convert_inline(text):
    """Convert a run of LaTeX (no block-level environments) to HTML."""
    s = text

    s = s.replace('\\singlespacing', '').replace('\\sloppy', '')
    s = s.replace('\\newpage', '').replace('\\clearpage', '').replace('\\noindent', '')

    out = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c == '\\':
            m = re.match(r'\\([a-zA-Z]+)\*?', s[i:])
            if m:
                cmd = m.group(1)
                cmd_end = i + m.end()
                if cmd in ('textbf',):
                    arg, end = extract_arg(s, cmd_end)
                    out.append(f'<strong>{convert_inline(arg)}</strong>')
                    i = end; continue
                if cmd in ('textit', 'emph'):
                    arg, end = extract_arg(s, cmd_end)
                    out.append(f'<em>{convert_inline(arg)}</em>')
                    i = end; continue
                if cmd == 'texttt':
                    arg, end = extract_arg(s, cmd_end)
                    out.append(f'<code>{convert_inline(arg)}</code>')
                    i = end; continue
                if cmd == 'textcolor':
                    arg1, end1 = extract_arg(s, cmd_end)
                    arg2, end2 = extract_arg(s, end1)
                    hexcol = COLOR_HEX.get(arg1, '#333')
                    out.append(f'<span style="color:{hexcol}">{convert_inline(arg2)}</span>')
                    i = end2; continue
                if cmd == 'colorbox':
                    arg1, end1 = extract_arg(s, cmd_end)
                    colname = re.split(r'[!]', arg1)[0]
                    hexcol = COLOR_HEX.get(colname, '#eee')
                    arg2, end2 = extract_arg(s, end1)
                    out.append(f'<span class="chip" style="background:{hexcol}22;border:1px solid {hexcol}66">{convert_inline(arg2)}</span>')
                    i = end2; continue
                if cmd == 'href':
                    arg1, end1 = extract_arg(s, cmd_end)
                    arg2, end2 = extract_arg(s, end1)
                    url = arg1.replace('\\%', '%').replace('\\_', '_').replace('\\#', '#')
                    out.append(f'<a href="{esc(url)}" target="_blank" rel="noopener">{convert_inline(arg2)}</a>')
                    i = end2; continue
                if cmd == 'url':
                    arg, end = extract_arg(s, cmd_end)
                    url = arg.replace('\\%', '%').replace('\\_', '_')
                    out.append(f'<a href="{esc(url)}" target="_blank" rel="noopener">{esc(url)}</a>')
                    i = end; continue
                if cmd in ('ac', 'acp', 'acs', 'acl'):
                    arg, end = extract_arg(s, cmd_end)
                    out.append(expand_acronym(arg, plural=(cmd == 'acp')))
                    i = end; continue
                if cmd in ('cite', 'citep', 'citet'):
                    arg, end = extract_arg(s, cmd_end)
                    keys = [k.strip() for k in arg.split(',')]
                    for k in keys:
                        if k not in CITE_ORDER:
                            CITE_ORDER.append(k)
                    marker = ','.join(keys)
                    out.append(f'<span class="cite-marker" data-keys="{esc(marker)}">@@CITE@@</span>')
                    i = end; continue
                if cmd == 'ref':
                    arg, end = extract_arg(s, cmd_end)
                    out.append(f'<span class="ref-marker" data-label="{esc(arg)}">@@REF@@</span>')
                    i = end; continue
                if cmd == 'label':
                    arg, end = extract_arg(s, cmd_end)
                    i = end; continue
                if cmd == 'footnote':
                    arg, end = extract_arg(s, cmd_end)
                    clean = re.sub('<[^>]+>', '', convert_inline(arg))
                    out.append(f'<sup class="footnote-marker" title="{esc(clean)}">note</sup>')
                    i = end; continue
                arg, end = extract_arg(s, cmd_end)
                if arg is not None:
                    out.append(convert_inline(arg))
                    i = end; continue
                i = cmd_end; continue
            if i + 1 < n and s[i+1] in '%&_#${}':
                out.append(s[i+1])
                i += 2; continue
            if s[i:i+2] == '\\\\':
                out.append('<br>')
                i += 2; continue
            i += 1
            continue
        if c == '~':
            out.append(' ')
            i += 1; continue
        if s[i:i+2] == '``':
            out.append('&ldquo;')
            i += 2; continue
        if s[i:i+2] == "''":
            out.append('&rdquo;')
            i += 2; continue
        if c == '{' or c == '}':
            i += 1; continue
        out.append(esc(c) if c in '&<>' else c)
        i += 1
    html = ''.join(out)
    html = re.sub(r'[ \t]+', ' ', html)
    html = re.sub(r'\n\s*\n', '\n\n', html)
    html = html.strip()
    return html


def inline_to_text_block(text):
    html = convert_inline(text)
    html = re.sub(r'\s*\n\s*', ' ', html).strip()
    return html


# ---------------------------------------------------------------------------
# Block-level parsing
# ---------------------------------------------------------------------------

class Counters:
    def __init__(self):
        self.chapter = 0
        self.sub = 0
        self.subsub = 0
        self.fig = 0
        self.table = 0
        self.in_appendix = False
        self.appendix_letter_used = False
        self.current_item_stack = []  # stack of [index] lists for nested enumerates

    def chapter_label(self):
        if self.in_appendix:
            return 'A'
        return str(self.chapter)

    def heading_number(self, level):
        if level == 1:
            return self.chapter_label()
        if level == 2:
            return f'{self.chapter_label()}.{self.sub}'
        return f'{self.chapter_label()}.{self.sub}.{self.subsub}'


CTR = Counters()


def slugify_id(number):
    return 'sec-' + number.replace('.', '-')


BLOCK_START_RE = re.compile(
    r'(?m)^[ \t]*('
    r'\\section\*?\{|\\subsection\*?\{|\\subsubsection\*?\{|'
    r'\\begin\{itemize\}|\\begin\{enumerate\}|\\begin\{figure\}|\\begin\{sidewaysfigure\}|'
    r'\\begin\{table\}|\\begin\{beware\}|\\begin\{mdframed\}|'
    r'\\begin\{SampleEnv\}|'
    r'\\appendix\b|\\MyBibliography\b|\\includepdf'
    r')'
)


def next_block_boundary(text, start):
    m = BLOCK_START_RE.search(text, start)
    return m.start() if m else len(text)


def split_top_level_items(text):
    """Split an itemize/enumerate body into \\item chunks, respecting nested
    begin/end environments (so nested \\item inside a sub-list isn't split)."""
    items = []
    pos = 0
    # find first \item
    first = re.search(r'\\item\b', text)
    if not first:
        return []
    pos = first.start()
    item_re = re.compile(r'\\item\b')
    begin_re = re.compile(r'\\begin\{(\w+)\}')
    end_re = re.compile(r'\\end\{(\w+)\}')
    n = len(text)
    cursor = pos
    depth = 0
    current_start = None
    i = pos
    while i < n:
        bm = begin_re.match(text, i)
        em = end_re.match(text, i)
        if depth == 0:
            m = item_re.match(text, i)
            if m:
                if current_start is not None:
                    items.append(text[current_start:i])
                current_start = m.end()
                i = m.end()
                continue
        if bm:
            depth += 1
            i = bm.end()
            continue
        if em:
            depth -= 1
            i = em.end()
            continue
        i += 1
    if current_start is not None:
        items.append(text[current_start:])
    return items


def parse_paragraphs(text):
    blocks = []
    for para in re.split(r'\n\s*\n', text):
        html = inline_to_text_block(para)
        if html:
            blocks.append({'type': 'p', 'html': html})
    return blocks


def parse_list(text, ordered):
    items_raw = split_top_level_items(text)
    items = []
    CTR.current_item_stack.append(0)
    for raw in items_raw:
        CTR.current_item_stack[-1] += 1
        idx = CTR.current_item_stack[-1]
        # capture a leading label on the item text itself, e.g "\item ... \label{step1}"
        # find first nested block boundary within this item
        boundary = next_block_boundary(raw, 0)
        head_text = raw[:boundary]
        rest = raw[boundary:]
        # register any \label{...} found in head_text against this item's index
        for lm in re.finditer(r'\\label\{([^}]+)\}', head_text):
            LABELS[lm.group(1)] = {'kind': 'item', 'display': str(idx)}
        head_html = inline_to_text_block(head_text)
        sub_blocks = parse_blocks(rest) if rest.strip() else []
        items.append({'html': head_html, 'blocks': sub_blocks})
    CTR.current_item_stack.pop()
    return {'type': 'ol' if ordered else 'ul', 'items': items}


def strip_leading_brace_arg(s):
    """If s (after leading whitespace) starts with a balanced {...} group,
    remove it (used for \\begin{tabular}{colspec} / \\begin{minipage}{width})."""
    i = 0
    while i < len(s) and s[i] in ' \t\n':
        i += 1
    if i < len(s) and s[i] == '{':
        end = find_matching_brace(s, i)
        return s[end+1:]
    return s


def resolve_image(raw_path):
    key = 'images/' + raw_path.split('/')[-1] if not raw_path.startswith('images/') else raw_path
    return image_resolve.get(key)


def parse_figure(inner, opt):
    """inner is the content of a \\begin{figure}...\\end{figure}."""
    subfigs = find_all_envs(inner, 'subfigure')
    search_from = max((e for (_, s, e, _) in subfigs), default=0)
    caption, _, _ = extract_command(inner, 'caption', search_from) or (None, None, None)
    label = None
    lm = re.search(r'\\label\{([^}]+)\}', inner[search_from:])
    if lm:
        label = lm.group(1)

    if subfigs:
        images = []
        for sub_inner, s, e, sopt in subfigs:
            img_m = re.search(r'\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}', sub_inner)
            cap = extract_command(sub_inner, 'caption', 0)
            sub_label = None
            slm = re.search(r'\\label\{([^}]+)\}', sub_inner)
            if slm:
                sub_label = slm.group(1)
            img_asset = resolve_image(img_m.group(1)) if img_m else None
            cap_html = inline_to_text_block(cap[0]) if cap else ''
            images.append({'src': img_asset, 'caption': cap_html, 'label': sub_label})
        CTR.fig += 1
        num = CTR.fig
        cap_html = inline_to_text_block(caption) if caption else ''
        if label:
            LABELS[label] = {'kind': 'fig', 'display': str(num), 'anchor': f'figure-{num}'}
        for im in images:
            if im['label']:
                LABELS[im['label']] = {'kind': 'fig', 'display': str(num), 'anchor': f'figure-{num}'}
        return {'type': 'figure-group', 'num': num, 'caption': cap_html, 'images': images}

    # check for a "concept" mdframed (SampleEnv pattern): may contain just text,
    # or text plus an illustrative image (both minipages inside one mdframed)
    mdf = find_env(inner, 'mdframed')
    if mdf:
        mdf_inner, _, _, mdf_opt = mdf
        colname_m = re.search(r'backgroundcolor=([a-zA-Z]+)', mdf_opt or '')
        if colname_m and colname_m.group(1) == 'mediumtealblue':
            mps = find_all_envs(mdf_inner, 'minipage')
            text_parts = []
            image_src = None
            if mps:
                for mp_inner, s, e, mp_opt in mps:
                    mp_inner = strip_leading_brace_arg(mp_inner)
                    img_in_mp = re.search(r'\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}', mp_inner)
                    if img_in_mp:
                        image_src = resolve_image(img_in_mp.group(1))
                    else:
                        t = inline_to_text_block(mp_inner)
                        if t:
                            text_parts.append(t)
            else:
                text_parts.append(inline_to_text_block(mdf_inner))
            block = {'type': 'concept', 'html': '<br>'.join(text_parts)}
            if image_src:
                block['image'] = image_src
            if label:
                LABELS[label] = {'kind': 'item', 'display': 'below'}
            return block

    if not mdf:
        img_m = re.search(r'\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}', inner)
        if not img_m:
            # unrecognized figure content; fall back to paragraph blocks
            return {'type': 'raw', 'blocks': parse_blocks(inner)}

        img_asset = resolve_image(img_m.group(1))
        if caption is None:
            # uncaptioned illustrative image (e.g. small implication graphics)
            return {'type': 'inline-image', 'src': img_asset}

        CTR.fig += 1
        num = CTR.fig
        cap_html = inline_to_text_block(caption)
        if label:
            LABELS[label] = {'kind': 'fig', 'display': str(num), 'anchor': f'figure-{num}'}
        return {'type': 'figure', 'num': num, 'caption': cap_html, 'src': img_asset}

    # mdframed present but not the mediumtealblue "concept" pattern (e.g. a
    # figure wrapping some other framed content) - fall back to raw blocks
    return {'type': 'raw', 'blocks': parse_blocks(inner)}


def parse_table(inner):
    tab = find_env(inner, 'tabular')
    caption = extract_command(inner, 'caption', 0)
    label = None
    lm = re.search(r'\\label\{([^}]+)\}', inner)
    if lm:
        label = lm.group(1)
    if not tab:
        return {'type': 'raw', 'blocks': parse_blocks(inner)}
    tab_inner = strip_leading_brace_arg(tab[0])
    tab_inner = re.sub(r'\\hline', '', tab_inner)
    tab_inner = re.sub(r'\\rowcolor\{[^}]*\}', '', tab_inner)
    rows_raw = [r for r in tab_inner.split('\\\\') if r.strip()]
    rows = []
    for r in rows_raw:
        cells = [inline_to_text_block(c) for c in r.split('&')]
        rows.append(cells)
    header = rows[0] if rows else []
    body = rows[1:] if len(rows) > 1 else []
    if caption is None:
        return {'type': 'table', 'num': None, 'caption': '', 'header': header, 'rows': body}
    CTR.table += 1
    num = CTR.table
    cap_html = inline_to_text_block(caption[0])
    if label:
        LABELS[label] = {'kind': 'tab', 'display': str(num), 'anchor': f'table-{num}'}
    return {'type': 'table', 'num': num, 'caption': cap_html, 'header': header, 'rows': body}


def parse_beware(inner, opt):
    kind = (opt or 'Remark').strip().lower()
    html = inline_to_text_block(inner)
    return {'type': 'callout', 'kind': kind, 'html': html}


def parse_mdframed(inner, opt):
    colname = 'officegreen'
    m = re.search(r'backgroundcolor=([a-zA-Z]+)', opt or '')
    if m:
        colname = m.group(1)
    mp = find_env(inner, 'minipage')
    content = strip_leading_brace_arg(mp[0]) if mp else inner
    if colname == 'officegreen':
        content = re.sub(r'\\textbf\{Hint:?\}', '', content, count=1)
        html = inline_to_text_block(content)
        return {'type': 'callout', 'kind': 'hint', 'html': html}
    if colname == 'mediumtealblue':
        html = inline_to_text_block(content)
        return {'type': 'concept', 'html': html}
    if colname == 'arsenic':
        blocks = parse_blocks(content)
        return {'type': 'callout-blocks', 'kind': 'facts', 'blocks': blocks}
    html = inline_to_text_block(content)
    return {'type': 'callout', 'kind': 'note', 'html': html}


def parse_blocks(text):
    blocks = []
    pos = 0
    n = len(text)
    while pos < n:
        # skip whitespace
        while pos < n and text[pos] in ' \t\n':
            pos += 1
        if pos >= n:
            break
        rest = text[pos:]

        m = re.match(r'\\section(\*?)\{', rest)
        if m:
            arg, end = extract_arg(text, pos + m.end() - 1)
            starred = bool(m.group(1))
            if not starred:
                CTR.chapter += 1
                CTR.sub = 0
                CTR.subsub = 0
                num = CTR.heading_number(1)
            else:
                num = None
            lbl = re.match(r'[ \t]*\n?[ \t]*\\label\{([^}]+)\}', text[end:])
            title_html = inline_to_text_block(arg)
            block = {'type': 'heading', 'level': 1, 'number': num, 'html': title_html, 'starred': starred}
            blocks.append(block)
            if lbl and num:
                LABELS[lbl.group(1)] = {'kind': 'sec', 'display': str(num), 'title': title_html}
                end += lbl.end()
            pos = end
            continue

        m = re.match(r'\\subsection(\*?)\{', rest)
        if m:
            arg, end = extract_arg(text, pos + m.end() - 1)
            starred = bool(m.group(1))
            if not starred:
                CTR.sub += 1
                CTR.subsub = 0
                num = CTR.heading_number(2)
            else:
                num = None
            lbl = re.match(r'[ \t]*\n?[ \t]*\\label\{([^}]+)\}', text[end:])
            title_html = inline_to_text_block(arg)
            blocks.append({'type': 'heading', 'level': 2, 'number': num, 'html': title_html, 'starred': starred})
            if lbl and num:
                LABELS[lbl.group(1)] = {'kind': 'sec', 'display': str(num), 'title': title_html}
                end += lbl.end()
            pos = end
            continue

        m = re.match(r'\\subsubsection(\*?)\{', rest)
        if m:
            arg, end = extract_arg(text, pos + m.end() - 1)
            starred = bool(m.group(1))
            if not starred:
                CTR.subsub += 1
                num = CTR.heading_number(3)
            else:
                num = None
            lbl = re.match(r'[ \t]*\n?[ \t]*\\label\{([^}]+)\}', text[end:])
            title_html = inline_to_text_block(arg)
            blocks.append({'type': 'heading', 'level': 3, 'number': num, 'html': title_html, 'starred': starred})
            if lbl and num:
                LABELS[lbl.group(1)] = {'kind': 'sec', 'display': str(num), 'title': title_html}
                end += lbl.end()
            pos = end
            continue

        if rest.startswith('\\appendix'):
            CTR.in_appendix = True
            pos += len('\\appendix')
            continue

        if rest.startswith('\\MyBibliography'):
            blocks.append({'type': 'bibliography'})
            pos += len('\\MyBibliography')
            continue

        if rest.startswith('\\includepdf'):
            m2 = re.match(r'\\includepdf(\[[^\]]*\])?\{([^}]+)\}', rest)
            blocks.append({'type': 'ontology-matrix'})
            pos += m2.end()
            continue

        if rest.startswith('\\begin{acronym}'):
            inner, s, e, opt = find_env(text, 'acronym', pos)
            items = []
            for m in re.finditer(r'\\acro\{([^}]+)\}\{([^}]*)\}', inner):
                items.append({'abbr': m.group(1), 'full': convert_inline(m.group(2))})
            blocks.append({'type': 'abbreviations', 'items': items})
            pos = e
            continue

        if rest.startswith('\\begin{itemize}'):
            inner, s, e, opt = find_env(text, 'itemize', pos)
            blocks.append(parse_list(inner, ordered=False))
            pos = e
            continue

        if rest.startswith('\\begin{enumerate}'):
            inner, s, e, opt = find_env(text, 'enumerate', pos)
            blocks.append(parse_list(inner, ordered=True))
            pos = e
            continue

        if rest.startswith('\\begin{SampleEnv}'):
            inner, s, e, opt = find_env(text, 'SampleEnv', pos)
            sub = parse_blocks(inner)
            blocks.extend(sub)
            # a \label{} can appear after \end{figure} but still inside
            # \end{SampleEnv}; attach any such orphan label to the last block
            for lm in re.finditer(r'\\label\{([^}]+)\}', inner):
                if lm.group(1) not in LABELS and sub:
                    LABELS[lm.group(1)] = {'kind': 'item', 'display': 'below'}
            pos = e
            continue

        if rest.startswith('\\begin{figure}') or rest.startswith('\\begin{sidewaysfigure}'):
            envname = 'sidewaysfigure' if rest.startswith('\\begin{sidewaysfigure}') else 'figure'
            inner, s, e, opt = find_env(text, envname, pos)
            blocks.append(parse_figure(inner, opt))
            pos = e
            continue

        if rest.startswith('\\begin{table}'):
            inner, s, e, opt = find_env(text, 'table', pos)
            blocks.append(parse_table(inner))
            pos = e
            continue

        if rest.startswith('\\begin{beware}'):
            inner, s, e, opt = find_env(text, 'beware', pos)
            blocks.append(parse_beware(inner, opt))
            pos = e
            continue

        if rest.startswith('\\begin{mdframed}'):
            inner, s, e, opt = find_env(text, 'mdframed', pos)
            blocks.append(parse_mdframed(inner, opt))
            pos = e
            continue

        # otherwise: consume paragraph text up to next boundary
        boundary = next_block_boundary(text, pos + 1)
        chunk = text[pos:boundary]
        blocks.extend(parse_paragraphs(chunk))
        pos = boundary

    return blocks


# ---------------------------------------------------------------------------
# Bibliography formatting
# ---------------------------------------------------------------------------

LATEX_ACCENTS = {
    "\\'a": 'á', "\\'e": 'é', "\\'i": 'í', "\\'o": 'ó', "\\'u": 'ú', "\\'y": 'ý',
    "\\'A": 'Á', "\\'E": 'É', "\\'I": 'Í', "\\'O": 'Ó', "\\'U": 'Ú',
    '\\"a': 'ä', '\\"e': 'ë', '\\"i': 'ï', '\\"o': 'ö', '\\"u': 'ü',
    '\\"A': 'Ä', '\\"O': 'Ö', '\\"U': 'Ü',
    '\\`a': 'à', '\\`e': 'è', '\\`i': 'ì', '\\`o': 'ò', '\\`u': 'ù',
    '\\^a': 'â', '\\^e': 'ê', '\\^i': 'î', '\\^o': 'ô', '\\^u': 'û',
    '\\~n': 'ñ', '\\~a': 'ã', '\\~o': 'õ',
    '\\c{c}': 'ç', '\\c c': 'ç',
    '\\ss': 'ß', '\\o ': 'ø', '\\O ': 'Ø',
    "\\'\\i": 'í', "\\'\\I": 'Í', '\\"\\i': 'ï',
}


def fix_latex_accents(s):
    for k, v in LATEX_ACCENTS.items():
        s = s.replace(k, v)
    # generic pattern: \'X or \"X or \^X where braces were used, e.g. \'{i}
    s = re.sub(r"\\'\{([a-zA-Z])\}", lambda m: LATEX_ACCENTS.get("\\'" + m.group(1), m.group(1)), s)
    s = re.sub(r'\\"\{([a-zA-Z])\}', lambda m: LATEX_ACCENTS.get('\\"' + m.group(1), m.group(1)), s)
    s = s.replace('{', '').replace('}', '')
    return s


def format_bib_entry(entry):
    authors = entry.get('author', '')
    authors = fix_latex_accents(authors)
    authors = re.sub(r'\s+and\s+', ', ', authors)
    year = entry.get('year', '')
    title = fix_latex_accents(entry.get('title', ''))
    venue = fix_latex_accents(entry.get('journal') or entry.get('booktitle') or entry.get('publisher') or '')
    url = entry.get('url', '')
    if not url:
        note = entry.get('note', '')
        um = re.search(r'\\url\{([^}]+)\}', note)
        if um:
            url = um.group(1)
    doi = entry.get('doi', '')
    parts = [f'{authors}.' if authors else '', f'{title}.' if title else '']
    if venue:
        parts.append(f'{venue}.')
    if year:
        parts.append(f'({year}).')
    text = ' '.join(p for p in parts if p)
    return {'text': text, 'url': url or (f'https://doi.org/{doi}' if doi else '')}


LABELS_CITE = {}


def build_bibliography_block():
    items = []
    for i, key in enumerate(CITE_ORDER, start=1):
        entry = BIB.get(key)
        LABELS_CITE[key] = i
        if not entry:
            items.append({'num': i, 'key': key, 'text': key, 'url': ''})
            continue
        formatted = format_bib_entry(entry)
        items.append({'num': i, 'key': key, **formatted})
    return items


# ---------------------------------------------------------------------------
# Second pass: resolve @@REF@@ / @@CITE@@ markers
# ---------------------------------------------------------------------------

def resolve_markers_in_html(html):
    def ref_sub(m):
        label = m.group(1)
        info = LABELS.get(label)
        if not info:
            return f'<span class="xref-broken">{esc(label)}</span>'
        disp = info['display']
        if info['kind'] == 'item':
            return esc(disp)
        if info['kind'] == 'sec':
            href = '#' + slugify_id(disp)
        elif info['kind'] == 'fig':
            href = '#' + info.get('anchor', '')
        elif info['kind'] == 'tab':
            href = '#' + info.get('anchor', '')
        else:
            href = '#'
        return f'<a class="xref" href="{href}">{esc(disp)}</a>'

    def cite_sub(m):
        keys = m.group(1).split(',')
        nums = []
        for k in keys:
            k = k.strip()
            num = LABELS_CITE.get(k)
            if num:
                nums.append(f'<a href="#ref-{esc(k)}" class="cite">[{num}]</a>')
        return ''.join(nums) if nums else ''

    html = re.sub(r'<span class="ref-marker" data-label="([^"]+)">@@REF@@</span>', ref_sub, html)
    html = re.sub(r'<span class="cite-marker" data-keys="([^"]+)">@@CITE@@</span>', cite_sub, html)
    return html


def resolve_markers_in_blocks(blocks):
    for b in blocks:
        if b.get('html'):
            b['html'] = resolve_markers_in_html(b['html'])
        if b.get('caption'):
            b['caption'] = resolve_markers_in_html(b['caption'])
        if b.get('type') in ('ul', 'ol'):
            for it in b['items']:
                it['html'] = resolve_markers_in_html(it['html'])
                resolve_markers_in_blocks(it['blocks'])
        if b.get('type') == 'callout-blocks':
            resolve_markers_in_blocks(b['blocks'])
        if b.get('type') == 'raw':
            resolve_markers_in_blocks(b['blocks'])
        if b.get('type') == 'figure-group':
            for im in b['images']:
                im['caption'] = resolve_markers_in_html(im['caption'])
        if b.get('type') == 'table':
            b['header'] = [resolve_markers_in_html(c) for c in b['header']]
            b['rows'] = [[resolve_markers_in_html(c) for c in row] for row in b['rows']]
    return blocks
