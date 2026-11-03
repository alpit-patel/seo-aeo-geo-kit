# Google Autocomplete harvest. Usage: python autocomplete_harvest.py <seeds.json {"site":[seeds]}> <out.json>
# Prefixes + a-z per seed via suggestqueries.google.com (client=firefox). No volumes: autocomplete shows demand exists, not size.
import json, sys, time, urllib.request, urllib.parse, concurrent.futures as cf
seeds = json.load(open(sys.argv[1], encoding='utf-8'))
PRE = ['how to', 'how much', 'what is', 'why is', 'why does', 'can', 'does', 'is', 'which', 'best']
def q(term):
    url = 'https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=us&q=' + urllib.parse.quote(term)
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=10) as r:
                return json.loads(r.read().decode('utf-8', 'ignore'))[1]
        except Exception as e:
            time.sleep(1.5*(i+1))
    return []
out = {}
for site, ss in seeds.items():
    terms = []
    for s in ss:
        terms += [s] + [f'{p} {s}' for p in PRE] + [f'{s} {c}' for c in 'abcdefghijklmnopqrstuvwxyz'] + [f'{s} vs', f'{s} for', f'{s} not']
    res = set()
    with cf.ThreadPoolExecutor(6) as ex:
        for sug in ex.map(q, terms):
            res.update(x.lower().strip() for x in sug)
    out[site] = sorted(res)
    print(site, len(terms), 'calls', len(res), 'suggestions', flush=True)
json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), indent=0)
