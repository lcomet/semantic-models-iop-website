"""Utilities for scanning LaTeX source: balanced braces, command args, environments."""
import re


def find_matching_brace(s, start):
    """s[start] must be '{'. Returns index of the matching '}'."""
    assert s[start] == '{'
    depth = 0
    i = start
    n = len(s)
    while i < n:
        c = s[i]
        if c == '\\' and i + 1 < n:
            i += 2
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise ValueError('unbalanced braces from %d: %r' % (start, s[start:start+80]))


def extract_arg(s, pos):
    """Given pos pointing at or before a '{', skip whitespace/optional [..] and
    return (arg_text, end_pos_after_closing_brace)."""
    i = pos
    n = len(s)
    while i < n and s[i] in ' \t\n':
        i += 1
    if i < n and s[i] == '[':
        j = s.find(']', i)
        i = j + 1
        while i < n and s[i] in ' \t\n':
            i += 1
    if i >= n or s[i] != '{':
        return None, pos
    end = find_matching_brace(s, i)
    return s[i+1:end], end + 1


def extract_command(s, cmd, pos=0):
    """Find first occurrence of \\cmd{...} at or after pos. Returns
    (arg_text, start_index, end_index) or None."""
    m = re.compile(r'\\' + re.escape(cmd) + r'\*?').search(s, pos)
    if not m:
        return None
    arg, end = extract_arg(s, m.end())
    if arg is None:
        return None
    return arg, m.start(), end


def find_all_commands(s, cmd):
    """Yield (arg_text, start, end) for every \\cmd{...} in s."""
    out = []
    pos = 0
    pat = re.compile(r'\\' + re.escape(cmd) + r'\*?')
    while True:
        m = pat.search(s, pos)
        if not m:
            break
        arg, end = extract_arg(s, m.end())
        if arg is None:
            pos = m.end()
            continue
        out.append((arg, m.start(), end))
        pos = end
    return out


def find_env(s, name, pos=0):
    """Find the first \\begin{name}...\\end{name} at or after pos, honoring
    nested environments of the same name. Returns
    (inner_text, begin_start, end_finish) or None.
    Also captures the optional [..] / {..} immediately after \\begin{name}."""
    begin_re = re.compile(r'\\begin\{' + re.escape(name) + r'\}')
    end_re = re.compile(r'\\end\{' + re.escape(name) + r'\}')
    m = begin_re.search(s, pos)
    if not m:
        return None
    i = m.end()
    # skip an optional [...] argument right after \begin{name}
    opt = None
    j = i
    while j < len(s) and s[j] in ' \t\n':
        j += 1
    if j < len(s) and s[j] == '[':
        k = s.find(']', j)
        opt = s[j+1:k]
        i = k + 1
    depth = 1
    pos2 = i
    while depth > 0:
        b = begin_re.search(s, pos2)
        e = end_re.search(s, pos2)
        if not e:
            raise ValueError('unterminated environment %s' % name)
        if b and b.start() < e.start():
            depth += 1
            pos2 = b.end()
        else:
            depth -= 1
            pos2 = e.end()
    inner_start = i
    inner_end = pos2 - len(('\\end{%s}' % name))
    return s[inner_start:inner_end], m.start(), pos2, opt


def find_all_envs(s, name):
    out = []
    pos = 0
    while True:
        r = find_env(s, name, pos)
        if not r:
            break
        inner, start, end, opt = r
        out.append((inner, start, end, opt))
        pos = end
    return out


def strip_comments(s):
    """Remove LaTeX % comments (not escaped \\%) line by line."""
    out_lines = []
    for line in s.split('\n'):
        # find an unescaped %
        i = 0
        res = []
        while i < len(line):
            if line[i] == '\\' and i + 1 < len(line):
                res.append(line[i:i+2])
                i += 2
                continue
            if line[i] == '%':
                break
            res.append(line[i])
            i += 1
        out_lines.append(''.join(res))
    return '\n'.join(out_lines)
