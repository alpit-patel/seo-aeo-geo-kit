# Replace prose em/en dashes: number ranges -> hyphen or "to", dash pairs -> parentheses, single dash -> colon (period if the sentence already has one).
# Skips code fences, CSS content:, regex/split lines, // comments. Usage: python fix_prose_dashes.py <files...>. ALWAYS review git diff and rebuild: range parsers may expect dashes.
import re, sys, glob
def _usage_exit(code):
    print('Usage: python fix_prose_dashes.py <files...>  (review git diff afterwards)')
    sys.exit(code)
if len(sys.argv) > 1 and sys.argv[1] in ('-h', '--help'): _usage_exit(0)
if len(sys.argv) < 2: _usage_exit(2)

D = '\u2014\u2013'
def fix_sentence(s):
    # punctuation dashes: between word chars/quotes/parens, spaced or tight, not lone table cells
    pat = re.compile(r'(?<=[\w\)\]"\'%’,.])\s*[' + D + r']\s*(?=[\w\("\'$])')
    ms = list(pat.finditer(s))
    if not ms: return s
    if len(ms) >= 2:
        a, b = ms[0], ms[1]
        inner = s[a.end():b.start()]
        if '(' in inner or ')' in inner:
            return s[:a.start()] + ', ' + inner + ', ' + fix_sentence(s[b.end():])
        return s[:a.start()] + ' (' + inner + ') ' + fix_sentence(s[b.end():])
    m = ms[0]
    before, after = s[:m.start()], s[m.end():]
    b2 = re.sub(r'^\s*-?\s*[\w-]+:\s*["\']?', '', before)
    b2 = re.sub(r'https?://\S+', '', b2); a2 = re.sub(r'https?://\S+', '', after)
    if ':' in b2 or ':' in a2.split('. ')[0]:
        after = after[:1].upper() + after[1:]
        return before.rstrip(',') + '. ' + after
    return before + ': ' + after
def fix_line(l):
    l = re.sub(r'(?<=\d)[' + D + r'](?=\d)', '-', l)   # 1-2
    l = re.sub(r'(?<=[\d$%kKM+])\s*[' + D + r']\s*(?=[$\d])', ' to ', l)   # $10k to $25k
    l = re.sub(r'(?<=[a-z])\s*–\s*(?=[$\d])', ' to ', l)   # 8 weeks to 6 months
    l = re.sub(r'(?<=[A-Za-z])[' + D + r'](?=\d)', '-', l)          # Q1–4 style
    if not re.search('[' + D + ']', l): return l
    parts = re.split(r'(?<=[.!?])(\s+)', l)
    return ''.join(fix_sentence(p) if not p.isspace() else p for p in parts)
changed = 0
for f in sys.argv[1:]:
    t = open(f, encoding='utf-8', newline='').read()
    if not re.search('[' + D + ']', t): continue
    out = []
    in_code = False
    for line in t.split('\n'):
        if line.strip().startswith('```'): in_code = not in_code
        skip = re.search(r'content:\s*["\']|\.match\(|\.split\(|/\^|(^|\s)//|\$\{', line)
        out.append(line if in_code or skip or 'http' in line and re.search(r'https?://\S*[' + D + ']', line) else fix_line(line))
    n = '\n'.join(out)
    if n != t:
        open(f, 'w', encoding='utf-8', newline='').write(n); changed += 1
print('files changed', changed)
