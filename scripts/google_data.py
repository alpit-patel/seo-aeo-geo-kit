"""Read-only Google data pipeline for any set of sites: Search Console + URL Inspection + GA4.

Uses the service account key path set via the GOOGLE_DATA_KEY env var (or --key),
never printed, never committed. Reads your sites from a sites.json config next to
this script (or passed via --sites); see sites.example.json for the format.
Writes JSON + a short Markdown summary to projects/<project>/reports/google-data-<date>.*

  python scripts/google_data.py myproject                 # last 28 days vs previous 28, all reports
  python scripts/google_data.py myproject --days 90
  python scripts/google_data.py myproject --inspect /some-page/ /another-page/
  python scripts/google_data.py --list                   # registered sites

What it reports:
  * GSC totals and per-page clicks/impressions/CTR/position, current vs previous period
  * top queries per page, with junk/bot queries flagged and excluded from CTR
  * pages ranking 4-20 with CTR far below position norms (title/snippet work)
  * GA4 sessions and key events by landing page, and AI-assistant referrals
    (chatgpt.com, perplexity.ai, copilot, gemini, claude.ai) as their own channel
  * optional URL Inspection verdicts (index status, last crawl, canonical, rich results)
"""
import argparse, datetime as dt, json, os, re, sys, urllib.parse
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_KEY = os.environ.get('GOOGLE_DATA_KEY', os.path.join(ROOT, 'secrets', 'service-account.json'))
DEFAULT_SITES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sites.json')


def load_sites(path):
    if not os.path.exists(path):
        example = path.replace('sites.json', 'sites.example.json')
        hint = f' (see {example})' if os.path.exists(example) else ''
        sys.exit(f'No sites config at {path}{hint}. Create one: '
                 '{"myproject": {"gsc": "https://example.com/", "ga4": "<GA4 property id>"}}')
    return json.load(open(path, encoding='utf-8'))


SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/analytics.readonly']
AI_REFERRERS = r'chatgpt\.com|chat\.openai\.com|perplexity\.ai|copilot\.microsoft\.com|gemini\.google\.com|claude\.ai|you\.com'
# Rough position -> expected CTR floor (well below published curves on purpose); used only to flag, never reported as fact.
CTR_FLOOR = {1: 0.10, 2: 0.06, 3: 0.04, 5: 0.02, 10: 0.008, 20: 0.003}


def session(key):
    creds = service_account.Credentials.from_service_account_file(key, scopes=SCOPES)
    return AuthorizedSession(creds)


def is_junk(q):
    """Bot/rank-tracker queries: single opaque tokens, search operators, very long keyword strings."""
    q = q.strip().lower()
    w = q.split()
    function_words = {'a', 'an', 'the', 'for', 'to', 'in', 'of', 'on', 'how', 'what', 'why', 'is', 'are', 'can', 'do', 'does',
                      'with', 'and', 'or', 'my', 'i', 'vs', 'best', 'near', 'me', 'much', 'cost'}
    return bool(re.fullmatch(r'[a-z]*\d+[a-z\d]*', q) and ' ' not in q) or bool(re.search(r'(^|\s)-?(site|inurl|intitle):', q)) \
        or bool(re.search(r'[a-z0-9]{12,}\.|\.pending\.|[a-z]+-[a-z0-9]{14,}', q)) \
        or len(w) >= 9 or (len(w) >= 6 and not function_words & set(w))


def gsc(s, site, start, end, dims, limit=25000):
    url = f'https://searchconsole.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(site, safe="")}/searchAnalytics/query'
    r = s.post(url, json={'startDate': str(start), 'endDate': str(end), 'dimensions': dims, 'rowLimit': limit})
    r.raise_for_status()
    return r.json().get('rows', [])


def ga4(s, prop, start, end, dims, metrics):
    r = s.post(f'https://analyticsdata.googleapis.com/v1beta/properties/{prop}:runReport', json={
        'dateRanges': [{'startDate': str(start), 'endDate': str(end)}],
        'dimensions': [{'name': d} for d in dims], 'metrics': [{'name': m} for m in metrics], 'limit': 10000})
    if r.status_code != 200:
        return {'error': f'{r.status_code} {r.text[:200]}'}
    return [{**{d: row['dimensionValues'][i]['value'] for i, d in enumerate(dims)},
             **{m: float(row['metricValues'][i]['value']) for i, m in enumerate(metrics)}} for row in r.json().get('rows', [])]


def inspect(s, site, urls):
    out = []
    for u in urls:
        u = re.sub(r'^[A-Za-z]:/Program Files/Git', '', u.replace('\\', '/'))  # undo Git Bash path conversion
        full = u if u.startswith('http') else site.rstrip('/') + u
        r = s.post('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', json={'inspectionUrl': full, 'siteUrl': site})
        if r.status_code != 200:
            out.append({'url': full, 'error': r.status_code}); continue
        ir = r.json().get('inspectionResult', {})
        ix = ir.get('indexStatusResult', {})
        out.append({'url': full, 'verdict': ix.get('verdict'), 'coverage': ix.get('coverageState'), 'lastCrawl': ix.get('lastCrawlTime'),
                    'googleCanonical': ix.get('googleCanonical'), 'rich': ir.get('richResultsResult', {}).get('verdict')})
    return out


def floor(pos):
    for p in sorted(CTR_FLOOR):
        if pos <= p:
            return CTR_FLOOR[p]
    return 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('project', nargs='?')
    ap.add_argument('--days', type=int, default=28)
    ap.add_argument('--inspect', nargs='*', default=None)
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--sites', default=DEFAULT_SITES_FILE, help='path to sites.json config')
    ap.add_argument('--key', default=DEFAULT_KEY, help='path to the Google service account JSON key')
    a = ap.parse_args()
    sites = load_sites(a.sites)
    if a.list or not a.project:
        print(json.dumps(sites, indent=1)); return
    site = sites[a.project]
    s = session(a.key)
    end = dt.date.today() - dt.timedelta(days=3)  # GSC data lags ~2-3 days
    start = end - dt.timedelta(days=a.days - 1)
    pend, pstart = start - dt.timedelta(days=1), start - dt.timedelta(days=a.days)
    rep = {'project': a.project, 'period': [str(start), str(end)], 'previous': [str(pstart), str(pend)]}

    cur = {r['keys'][0]: r for r in gsc(s, site['gsc'], start, end, ['page'])}
    prev = {r['keys'][0]: r for r in gsc(s, site['gsc'], pstart, pend, ['page'])}
    pq = gsc(s, site['gsc'], start, end, ['page', 'query'])
    real = [r for r in pq if not is_junk(r['keys'][1])]
    junk = [r for r in pq if is_junk(r['keys'][1])]
    tot = lambda rows, k: sum(r[k] for r in rows)
    rep['totals'] = {'clicks': tot(cur.values(), 'clicks'), 'impressions': tot(cur.values(), 'impressions'),
                     'prev_clicks': tot(prev.values(), 'clicks'), 'prev_impressions': tot(prev.values(), 'impressions'),
                     'junk_query_impressions': tot(junk, 'impressions'), 'real_query_impressions': tot(real, 'impressions'),
                     'real_query_clicks': tot(real, 'clicks')}
    pages = []
    for p, r in cur.items():
        rq = [x for x in real if x['keys'][0] == p]
        ri = tot(rq, 'impressions'); rc = tot(rq, 'clicks')
        pos = (sum(x['position'] * x['impressions'] for x in rq) / ri) if ri else r['position']
        pages.append({'page': p, 'clicks': r['clicks'], 'impressions': r['impressions'], 'position': round(r['position'], 1),
                      'real_impressions': ri, 'real_ctr': round(rc / ri, 4) if ri else None, 'real_position': round(pos, 1),
                      'prev_clicks': prev.get(p, {}).get('clicks', 0), 'prev_impressions': prev.get(p, {}).get('impressions', 0),
                      'top_queries': [[x['keys'][1], x['impressions'], round(x['position'], 1)] for x in sorted(rq, key=lambda x: -x['impressions'])[:5]]})
    pages.sort(key=lambda x: -x['real_impressions'])
    rep['pages'] = pages
    rep['ctr_opportunities'] = [p for p in pages if p['real_impressions'] >= 50 and 3.5 <= p['real_position'] <= 20
                                and p['real_ctr'] is not None and p['real_ctr'] < floor(p['real_position'])]
    conv = [r for r in real if re.match(r'(how|what|why|when|where|who|which|can|do|does|is|are|should|will)\b', r['keys'][1])
            or len(r['keys'][1].split()) >= 6]
    rep['conversational'] = {'impressions': tot(conv, 'impressions'),
                             'share': tot(conv, 'impressions') / rep['totals']['real_query_impressions'] if rep['totals']['real_query_impressions'] else 0,
                             'top': [[r['keys'][1], r['impressions'], round(r['position'], 1)] for r in sorted(conv, key=lambda x: -x['impressions'])[:20]]}
    rep['junk_queries'] =[[r['keys'][1], r['impressions']] for r in sorted(junk, key=lambda x: -x['impressions'])[:20]]

    if site.get('ga4'):
        rep['ga4_landing'] = ga4(s, site['ga4'], start, end, ['landingPage'], ['sessions', 'keyEvents'])
        src = ga4(s, site['ga4'], start, end, ['sessionSource'], ['sessions', 'keyEvents'])
        rep['ga4_sources'] = src
        rep['ga4_ai_referrals'] = [r for r in src if isinstance(r, dict) and re.search(AI_REFERRERS, r.get('sessionSource', ''))] if isinstance(src, list) else src
    if a.inspect is not None:
        rep['inspection'] = inspect(s, site['gsc'], a.inspect or [p['page'] for p in pages[:10]])

    out = os.path.join(ROOT, 'projects', a.project, 'reports')
    os.makedirs(out, exist_ok=True)
    stem = os.path.join(out, f'google-data-{dt.date.today()}')
    json.dump(rep, open(stem + '.json', 'w', encoding='utf-8'), indent=1)
    t = rep['totals']
    md = [f"# Google data: {a.project}, {start} to {end} (vs {pstart} to {pend})", '',
          f"- GSC clicks {t['clicks']:.0f} (prev {t['prev_clicks']:.0f}), impressions {t['impressions']:.0f} (prev {t['prev_impressions']:.0f})",
          f"- Junk/bot query impressions excluded from CTR: {t['junk_query_impressions']:.0f}",
          f"- Real-query CTR: {(t['real_query_clicks'] / t['real_query_impressions'] * 100) if t['real_query_impressions'] else 0:.2f}%", '',
          '## CTR opportunities (position 4-20, CTR under floor, real queries only)', '']
    md += [f"- {p['page']}: pos {p['real_position']}, {p['real_impressions']:.0f} impr, CTR {p['real_ctr']:.2%}; top query \"{p['top_queries'][0][0] if p['top_queries'] else ''}\"" for p in rep['ctr_opportunities'][:15]] or ['- none']
    if isinstance(rep.get('ga4_ai_referrals'), list):
        md += ['', '## AI assistant referrals (GA4)', ''] + ([f"- {r['sessionSource']}: {r['sessions']:.0f} sessions, {r['keyEvents']:.0f} key events" for r in rep['ga4_ai_referrals']] or ['- none in period'])
    if rep.get('inspection'):
        md += ['', '## URL Inspection', ''] + [f"- {i['url']}: {i.get('verdict')} / {i.get('coverage')} / last crawl {i.get('lastCrawl')}" for i in rep['inspection']]
    open(stem + '.md', 'w', encoding='utf-8').write('\n'.join(md) + '\n')
    print('\n'.join(md)); print('\nwrote', stem + '.json')


if __name__ == '__main__':
    sys.exit(main())
