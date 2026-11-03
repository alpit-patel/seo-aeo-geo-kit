# Diff autocomplete suggestions against your site's existing headings/titles/FAQs.
# Usage: python autocomplete_gap_diff.py <ac.json> <out-prefix> [--config <sites.json>]
#
# <ac.json> maps a site key to a list of autocomplete suggestion strings, e.g.:
#   {"mysite": ["gohighlevel pricing", "gohighlevel vs hubspot", ...]}
#
# <sites.json> (see autocomplete_sites.example.json) maps each site key to:
#   - "globs": file globs to scan for existing headings/titles/FAQs
#   - "relevance": optional regex; suggestions that don't match are skipped
#
# Covered = 75%+ of a suggestion's words already appear in one existing heading/title/FAQ.
import json, re, sys, glob, argparse

STOP = set('a an the to of for in on is it can i do does how what why which with and or vs my your you be are best not com'.split())
HPATS = [r'<h[1-3][^>]*>(.*?)</h[1-3]>', r'^#{1,3} (.+)$',
         r'(?:title|h1|metaTitle|primaryKeyword|question|q|keyword|name|label):\s*[\'"](.+?)[\'"]',
         r'^title:\s*(.+)$', r'^\s*-\s*q(?:uestion)?:\s*(.+)$', r'secondary:\s*\[(.*?)\]']


def norm(t):
    return [w.rstrip('s') for w in re.findall(r'[a-z0-9]+', t.lower()) if w not in STOP]


def corpus(paths_globs, pats):
    lines = []
    for g in paths_globs:
        for f in glob.glob(g, recursive=True):
            txt = open(f, encoding='utf-8', errors='ignore').read()
            for p in pats:
                lines += [re.sub(r'<[^>]+>', ' ', m) for m in re.findall(p, txt, re.S | re.I)]
    return [set(norm(l)) for l in lines if l.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('ac_json')
    ap.add_argument('out_prefix')
    ap.add_argument('--config', default='autocomplete_sites.json')
    a = ap.parse_args()

    ac = json.load(open(a.ac_json, encoding='utf-8'))
    try:
        cfg = json.load(open(a.config, encoding='utf-8'))
    except FileNotFoundError:
        sys.exit(f'No site config at {a.config}. See autocomplete_sites.example.json for the format.')

    for site, sugs in ac.items():
        if site not in cfg:
            print(f'##### {site}: no entry in {a.config}, skipping'); continue
        site_cfg = cfg[site]
        extra_pats = site_cfg.get('extra_patterns', [])
        relevance = re.compile(site_cfg['relevance'], re.I) if site_cfg.get('relevance') else None
        c = corpus(site_cfg['globs'], HPATS + extra_pats)
        print(f'##### {site}: corpus {len(c)} lines')
        gaps = []
        for s in sugs:
            toks = norm(s)
            if len(toks) < 2 or (relevance and not relevance.search(' '.join(toks))):
                continue
            tk = set(toks)
            best = max((len(tk & cl) / len(tk) for cl in c), default=0)
            if best < 0.75:
                gaps.append((round(best, 2), s))
        print(len(gaps), 'gaps')
        open(f'{a.out_prefix}_{site}.txt', 'w', encoding='utf-8').write(
            '\n'.join(f'{b}\t{s}' for b, s in sorted(gaps, key=lambda x: x[1])))


if __name__ == '__main__':
    main()
