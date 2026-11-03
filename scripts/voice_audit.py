"""VEO (voice engine optimization) audit for any built static site. Read-only.

  python scripts/voice_audit.py dist/
  python scripts/voice_audit.py dist/ --gsc projects/myproject/reports/google-data-2026-09-30.json
  python scripts/voice_audit.py dist/ --out projects/myproject/reports/voice-audit-2026-09-30.md

Checks per page (see seo-voice/SKILL.md):
  * question headings (H2/H3 ending in "?") and whether the first answer sentence stands alone
    when read aloud: 8-45 words, not pointing at a table/chart/"above"/"below"
  * a call path: tel: link or booking link on the page
  * JSON-LD: Organization/LocalBusiness telephone, address, opening hours (site level)
  * speakable markup on non-news pages (should not be there)
Site level: robots.txt access for Googlebot, Bingbot, OAI-SearchBot, PerplexityBot; conversational
query share from a google_data.py report when given.
"""
import argparse, html, json, os, re, sys

POINTERS = re.compile(r'\b(see (the )?(table|chart|figure|below|above)|as shown|the table below|below:)\b', re.I)
BOTS = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'PerplexityBot']


def text(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()


def first_sentence(p):
    t = text(p)
    m = re.match(r'(.+?[.!?])(\s|$)', t)
    return (m.group(1) if m else t)


def jsonld(doc):
    out = []
    for block in re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', doc, flags=re.S):
        try:
            d = json.loads(block)
        except ValueError:
            continue
        stack = d if isinstance(d, list) else [d]
        while stack:
            x = stack.pop()
            if isinstance(x, dict):
                out.append(x)
                stack.extend(v for v in x.values() if isinstance(v, (dict, list)))
            elif isinstance(x, list):
                stack.extend(x)
    return out


def robots_access(root):
    p = os.path.join(root, 'robots.txt')
    if not os.path.exists(p):
        return {b: 'no robots.txt (allowed)' for b in BOTS}
    groups, cur = {}, []
    for line in open(p, encoding='utf-8', errors='ignore'):
        line = line.split('#')[0].strip()
        if not line:
            continue
        k, _, v = line.partition(':')
        k, v = k.strip().lower(), v.strip()
        if k == 'user-agent':
            if cur and groups.get(cur[-1]) is not None and groups[cur[-1]]:
                cur = []
            cur.append(v.lower()); groups.setdefault(v.lower(), [])
        elif k in ('allow', 'disallow') and cur:
            for ua in cur:
                groups[ua].append((k, v))
    res = {}
    for b in BOTS:
        rules = groups.get(b.lower(), groups.get('*', []))
        blocked = any(k == 'disallow' and v == '/' for k, v in rules) and not any(k == 'allow' and v == '/' for k, v in rules)
        res[b] = 'BLOCKED' if blocked else ('explicit' if b.lower() in groups else 'allowed via *')
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('root')
    ap.add_argument('--gsc')
    ap.add_argument('--out')
    a = ap.parse_args()
    pages, org = [], {}
    for d, _, files in os.walk(a.root):
        for f in files:
            if f != 'index.html':
                continue
            path = os.path.join(d, f)
            url = '/' + os.path.relpath(d, a.root).replace(os.sep, '/').strip('.') + '/'
            url = re.sub(r'/+', '/', url)
            doc = open(path, encoding='utf-8', errors='ignore').read()
            if re.search(r'<meta[^>]+name="robots"[^>]+noindex', doc):
                continue
            main_html = re.search(r'<main[\s>].*?</main>', doc, flags=re.S)
            body = main_html.group(0) if main_html else doc
            qs = []
            # CTA blocks ("Want a second pair of eyes?" + "Book a free call") are not FAQs
            body_faq = re.sub(r'<section[^>]*class="[^"]*\bcta\b[^"]*"[^>]*>.*?</section>', '', body, flags=re.S)
            for m in re.finditer(r'<h([23])[^>]*>(.*?)</h\1>\s*(?:<figure.*?</figure>\s*)?<p[^>]*>(.*?)</p>', body_faq, flags=re.S):
                q = text(m.group(2))
                if not q.endswith('?'):
                    continue
                s = first_sentence(m.group(3))
                n = len(s.split())
                qs.append({'q': q, 'words': n, 'ok': 8 <= n <= 45 and not POINTERS.search(s)})
            nodes = jsonld(doc)
            types = {t for n in nodes for t in ([n.get('@type')] if isinstance(n.get('@type'), str) else n.get('@type') or [])}
            for n in nodes:
                t = n.get('@type')
                if t in ('Organization', 'LocalBusiness', 'ProfessionalService') or (isinstance(t, list) and set(t) & {'Organization', 'LocalBusiness'}):
                    for k in ('telephone', 'address', 'openingHoursSpecification', 'openingHours', 'areaServed'):
                        if n.get(k):
                            org[k] = True
            pages.append({'url': url, 'questions': len(qs), 'bad_answers': [x for x in qs if not x['ok']],
                          'tel': 'href="tel:' in doc, 'booking': bool(re.search(r'href="[^"]*(cal\.com|calendly|/contact/|book)', doc)),
                          'speakable_non_news': 'speakable' in doc and 'NewsArticle' not in types})
    pages.sort(key=lambda p: p['url'])
    qpages = [p for p in pages if p['questions']]
    bad = sum(len(p['bad_answers']) for p in pages)
    allq = sum(p['questions'] for p in pages)
    lines = [f'# VEO audit: {a.root}', '',
             f'- Indexable pages scanned: {len(pages)}; pages with question headings: {len(qpages)}',
             f'- Question headings: {allq}; answers that do not stand alone when spoken: {bad} ({(bad / allq * 100) if allq else 0:.0f}%)',
             f'- Pages without a tel: link: {sum(not p["tel"] for p in pages)}; without any booking/contact path: {sum(not p["booking"] for p in pages)}',
             f'- Organization/LocalBusiness schema fields present: {", ".join(sorted(org)) or "none"}; missing: {", ".join(k for k in ("telephone", "address", "openingHoursSpecification", "areaServed") if k not in org) or "none"}',
             f'- Speakable on non-news pages: {sum(p["speakable_non_news"] for p in pages)}', '',
             '## AI and search crawler access (robots.txt)', ''] + [f'- {b}: {v}' for b, v in robots_access(a.root).items()]
    if a.gsc:
        g = json.load(open(a.gsc, encoding='utf-8'))
        conv = g.get('conversational', {})
        lines += ['', '## Conversational queries (Search Console proxy for voice-style search)', '',
                  f"- Share of real-query impressions: {conv.get('share', 0):.1%} ({conv.get('impressions', 0):.0f} of {g['totals']['real_query_impressions']:.0f})"]
        lines += [f'- "{q}" ({i:.0f} impr, pos {p})' for q, i, p in conv.get('top', [])[:10]]
    lines += ['', '## Pages to fix first (most spoken-answer problems)', '']
    for p in sorted(pages, key=lambda p: -len(p['bad_answers']))[:15]:
        if not p['bad_answers']:
            break
        ex = p['bad_answers'][0]
        lines.append(f"- {p['url']}: {len(p['bad_answers'])} of {p['questions']}; e.g. \"{ex['q']}\" first sentence {ex['words']} words")
    out = '\n'.join(lines) + '\n'
    if a.out:
        open(a.out, 'w', encoding='utf-8').write(out)
        json.dump(pages, open(os.path.splitext(a.out)[0] + '.json', 'w', encoding='utf-8'), indent=1)
    print(out)


if __name__ == '__main__':
    sys.exit(main())
