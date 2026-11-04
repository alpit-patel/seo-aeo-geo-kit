# Editorial scan: hidden Unicode (Layer A), em/en dashes, stock AI phrasing. Usage: python ai_marks_scan.py '{"name":["glob",...]}' <out.json>
# Read hits in context: "Elevate" (monday event) and dash-only table cells are false positives.
import re, sys, glob, json, collections
def _usage_exit(code):
    print('Usage: python ai_marks_scan.py \'{"name":["glob",...]}\' <out.json>')
    sys.exit(code)
if len(sys.argv) > 1 and sys.argv[1] in ('-h', '--help'): _usage_exit(0)
if len(sys.argv) < 3: _usage_exit(2)

HIDDEN = re.compile('[\u200b-\u200f\u2060-\u2064\ufeff\u202a-\u202e\u2066-\u2069\u00ad\u180e\U000e0000-\U000e007f]')
DASH = re.compile('[\u2014\u2013]')
WORDS = r"delve|tapestry|testament|pivotal|seamless(?:ly)?|game[- ]changer|unlock(?:s|ing)?|elevate|in today's|fast-paced|ever-evolving|evolving landscape|landscape of|it'?s important to note|let'?s dive|dive in|deep dive|navigate the|embark|realm|cutting-edge|harness|underscore[sd]?|showcas(?:e|es|ing)|vibrant|meticulous(?:ly)?|fostering|bolster(?:ed)?|intricate|crucial|robust|additionally|moreover|furthermore|in conclusion|whether you'?re|not just|not only|more than just|here'?s the thing|the real question|at its core|stands as|serves as|plays a (?:key|crucial|pivotal) role|look no further|rest assured|peace of mind|supercharge|empower(?:s|ing)?|revolutioniz\w+|transformative|in the world of"
PAT = re.compile(r'\b(?:' + WORDS + r')\b', re.I)
def strip_code(t): return re.sub(r'```.*?```|<script.*?</script>|<style.*?</style>|`[^`]*`|https?://\S+', ' ', t, flags=re.S)
res = {}
for site, globs in json.loads(sys.argv[1]).items():
    files = sorted({f for g in globs for f in glob.glob(g, recursive=True)})
    tot = collections.Counter(); per = []
    for f in files:
        raw = open(f, encoding='utf-8', errors='ignore').read(); t = strip_code(raw)
        h = len(HIDDEN.findall(raw)); d = len(DASH.findall(t)); hits = [m.group(0).lower() for m in PAT.finditer(t)]
        words = len(re.findall(r'\w+', re.sub(r'<[^>]+>', ' ', t)))
        tot['files'] += 1; tot['hidden'] += h; tot['dash'] += d; tot['pattern'] += len(hits)
        for w in hits: tot['w:'+w] += 1
        per.append((len(hits)*1000/max(words,1), len(hits), d, h, words, f, collections.Counter(hits).most_common(4)))
    per.sort(reverse=True)
    print(f'##### {site}: files {tot["files"]}, hidden-unicode {tot["hidden"]}, dashes {tot["dash"]}, pattern hits {tot["pattern"]}')
    print('  top words:', [(k[2:], v) for k, v in tot.most_common(40) if k.startswith('w:')][:22])
    print('  files with hidden unicode:', [p[5] for p in per if p[3]][:20])
    print('  files with dashes:', len([p for p in per if p[2]]), [ (p[5].split('/')[-1], p[2]) for p in sorted(per, key=lambda x:-x[2]) if p[2]][:15])
    print('  worst density (hits per 1k words):')
    for p in per[:15]: print(f'   {p[0]:5.1f} {p[1]:3d} hits {p[4]:6d}w  {p[5]}  {p[6]}')
    res[site] = per
json.dump({k:[list(map(str,p)) for p in v] for k,v in res.items()}, open(sys.argv[2],'w'))
